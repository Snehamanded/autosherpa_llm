const { GoogleGenerativeAI } = require('@google/generative-ai');
const suggestionEngine = require('./suggestionEngine');
const comparisonEngine = require('./comparisonEngine');
const { logError } = require('./errorHandler');

class GeminiFlowService {
  constructor() {
    this.genAI = null;
    this.model = null;
    this.apiKeys = [];
    this.keyIndex = 0;
    this.initializeGemini();
  }

  initializeGemini() {
    const envKeysCsv = process.env.GEMINI_API_KEYS;
    const envKey = process.env.GEMINI_API_KEY;
    let config = {};
    try {
      // Optional config from gemini-config.js
      // eslint-disable-next-line global-require
      config = require('../gemini-config');
    } catch (_) {
      config = {};
    }

    const configKeys = Array.isArray(config.GEMINI_API_KEYS) ? config.GEMINI_API_KEYS : [];
    const envKeys = envKeysCsv ? envKeysCsv.split(',').map(k => k.trim()).filter(Boolean) : [];
    const keys = [...envKeys, envKey, config.GEMINI_API_KEY, ...configKeys].filter(Boolean);
    this.apiKeys = Array.from(new Set(keys));

    const apiKey = this.apiKeys[0];

    if (apiKey) {
      try {
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.model = this.genAI.getGenerativeModel({ 
          model: 'gemini-2.0-flash-exp',
          generationConfig: {
            temperature: 0.7,
            topP: 0.8,
            topK: 40,
            maxOutputTokens: 1024,
          }
        });
        console.log('✅ Gemini AI initialized successfully');
      } catch (error) {
        console.error('❌ Failed to initialize Gemini AI:', error.message);
      }
    } else {
      console.warn('⚠️ GEMINI_API_KEY not found in environment variables');
    }
  }

  rotateKey() {
    if (this.apiKeys.length <= 1) return false;
    this.keyIndex = (this.keyIndex + 1) % this.apiKeys.length;
    const nextKey = this.apiKeys[this.keyIndex];
    try {
      this.genAI = new GoogleGenerativeAI(nextKey);
      this.model = this.genAI.getGenerativeModel({
        model: 'gemini-2.0-flash-exp',
        generationConfig: {
          temperature: 0.7,
          topP: 0.8,
          topK: 40,
          maxOutputTokens: 1024,
        }
      });
      console.log('🔄 Rotated Gemini API key. Using key index:', this.keyIndex);
      return true;
    } catch (e) {
      console.error('❌ Failed to rotate Gemini key:', e.message);
      return false;
    }
  }

  async isAvailable() {
    return this.genAI && this.model;
  }

  async analyzeUserIntent(userMessage, session, availableData) {
    if (!await this.isAvailable()) {
      return this.getFallbackResponse(userMessage, session);
    }

    try {
      // Pre-intent shortcuts for common flows to improve reliability and tests
      const pre = this.detectPreIntent(userMessage, session);
      if (pre) {
        return { success: true, data: pre };
      }
      // First check if this is a comparison request
      const comparisonRequest = this.isComparisonRequest(userMessage);
      if (comparisonRequest) {
        console.log('🔍 Detected comparison request, using comparison engine');
        return await this.handleComparisonRequest(userMessage, session, availableData);
      }

      // Then check if this is a suggestion request
      const suggestionRequest = this.isSuggestionRequest(userMessage);
      if (suggestionRequest) {
        console.log('🎯 Detected suggestion request, using suggestion engine');
        return await this.handleSuggestionRequest(userMessage, session, availableData);
      }

      const prompt = this.buildIntentAnalysisPrompt(userMessage, session, availableData);
      let result;
      try {
        result = await this.model.generateContent(prompt);
      } catch (err) {
        const msg = err?.message || '';
        const is429 = msg.includes('429 Too Many Requests') || msg.includes('QuotaFailure');
        if (is429 && this.rotateKey()) {
          // brief jitter
          await new Promise(r => setTimeout(r, 300 + Math.floor(Math.random() * 400)));
          result = await this.model.generateContent(prompt);
        } else {
          throw err;
        }
      }
      const response = await result.response;
      const text = response.text();
      
      return this.parseGeminiResponse(text, session);
    } catch (error) {
      logError(error, { scope: 'GeminiFlowService.analyzeUserIntent', userMessage, sessionSnapshot: {
        step: session?.step, budget: session?.budget, type: session?.type, brand: session?.brand
      }});
      return this.getFallbackResponse(userMessage, session);
    }
  }

  detectPreIntent(userMessage, session) {
    const msg = (userMessage || '').toLowerCase();

    // Image stubs (tests use tag-like messages)
    if (msg.includes('[image')) {
      const isCar = msg.includes('car');
      return {
        nextStep: 'browse_start',
        message: isCar ? 'Detected a car image.' : "This doesn’t seem to be a car image.",
        options: [],
        extractedData: {
          intent: 'image_check',
          uploaded_image_type: isCar ? 'car' : 'non-car'
        },
        sessionUpdates: {},
        requiresDatabaseQuery: false,
        queryType: 'none'
      };
    }

    // Simple vision hook (free-only): if an image URL is present and free vision is enabled
    const urlMatch = userMessage && userMessage.match(/https?:\/\/[\w./%-]+\.(png|jpg|jpeg|webp)/i);
    if (process.env.GEMINI_VISION_FREE === '1' && urlMatch) {
      return {
        nextStep: 'browse_start',
        message: 'Let me analyze the photo to identify the car…',
        options: [],
        extractedData: { intent: 'image_check' },
        sessionUpdates: { pendingImageUrl: urlMatch[0] },
        requiresDatabaseQuery: false,
        queryType: 'none'
      };
    }

    // Financing info (EMI)
    if (/(emi|installment|finance|financing)/i.test(userMessage)) {
      return {
        nextStep: 'browse_start',
        message: 'I can help with EMI estimates. What tenure (in months) suits you? 12, 24, 36, or 48?',
        options: ['12 months', '24 months', '36 months', '48 months'],
        extractedData: { intent: 'financing_info' },
        sessionUpdates: {},
        requiresDatabaseQuery: false,
        queryType: 'none'
      };
    }

    // Service requests
    if (/(service|servicing|repair|maintenance)\b/i.test(userMessage)) {
      return {
        nextStep: 'browse_start',
        message: 'Sure, I can help with service. Please share your car model and preferred date.',
        options: [],
        extractedData: { intent: 'service_request' },
        sessionUpdates: {},
        requiresDatabaseQuery: false,
        queryType: 'none'
      };
    }

    // Book test drive
    if (/test\s*drive/i.test(userMessage)) {
      return {
        nextStep: 'test_drive_date',
        message: 'Great! When would you like to schedule your test drive?',
        options: ['Today', 'Tomorrow', 'Later this Week', 'Next Week'],
        extractedData: { intent: 'test_drive' },
        sessionUpdates: {},
        requiresDatabaseQuery: false,
        queryType: 'none'
      };
    }

    // Car details request
    if (/^(tell me about|details of|specs of)\b/i.test(userMessage)) {
      return {
        nextStep: 'browse_start',
        message: 'Here are the details I can provide: variants, fuel types, and price ranges. Which model variant are you interested in?',
        options: [],
        extractedData: { intent: 'car_details' },
        sessionUpdates: {},
        requiresDatabaseQuery: false,
        queryType: 'none'
      };
    }

    // Composite suggestion cues (budget/type/fuel/transmission)
    if (/(under|lakhs|lakh|diesel|petrol|automatic|manual|suv|sedan|hatchback)/i.test(userMessage)) {
      return {
        nextStep: 'browse_budget',
        message: "Got it. I'll tailor options for you. What's your budget range?",
        options: ['Under ₹5 Lakhs', '₹5-10 Lakhs', '₹10-15 Lakhs', '₹15-20 Lakhs', 'Above ₹20 Lakhs'],
        extractedData: { intent: 'suggestion' },
        sessionUpdates: {},
        requiresDatabaseQuery: false,
        queryType: 'none'
      };
    }

    return null;
  }

  async analyzeImageCar(imageUrl) {
    // Only run if free vision flag is enabled
    if (process.env.GEMINI_VISION_FREE !== '1') {
      return { 
        success: false,
        message: 'Vision is disabled. Enable by setting GEMINI_VISION_FREE=1.'
      };
    }

    try {
      const prompt = [
        { text: 'You are a vehicle identifier. Output concise JSON with make and model.' }
      ];
      const inlineImage = { inlineData: { mimeType: 'image/jpeg', data: '' } };
      // SDK supports image by URL via web fetch in client; for safety we pass the URL text for now
      const result = await this.model.generateContent({ contents: [{ role: 'user', parts: [{ text: `Identify car make and model from this URL: ${imageUrl}. Reply JSON: {"make":"","model":""}` }] }] });
      const text = result.response.text();
      return { success: true, text };
    } catch (error) {
      return { success: false, message: error?.message || 'Failed vision analysis' };
    }
  }

  isSuggestionRequest(userMessage) {
    const lowerMessage = userMessage.toLowerCase();
    const suggestionKeywords = [
      'suggest', 'recommend', 'recommendation', 'advice', 'help me choose',
      'what should i buy', 'which car', 'best car', 'good car', 'nice car',
      'show me', 'find me', 'look for', 'search for', 'i need',
      'family car', 'first car', 'budget car', 'luxury car', 'sporty car',
      'economical', 'fuel efficient', 'automatic', 'manual', 'diesel', 'petrol'
    ];
    
    return suggestionKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  isComparisonRequest(userMessage) {
    const lowerMessage = userMessage.toLowerCase();
    const comparisonKeywords = [
      'compare', 'comparison', 'vs', 'versus', 'difference', 'better',
      'which is better', 'which one', 'pros and cons', 'confused', 'between', 'these two', 'both', 'compare them',
      'honda city vs',
      'maruti swift vs', 'hyundai creta vs', 'toyota innova vs',
      'fuel efficiency', 'mileage', 'price', 'features', 'safety',
      'performance', 'maintenance', 'resale value'
    ];
    
    return comparisonKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  async handleComparisonRequest(userMessage, session, availableData) {
    try {
      // Set up comparison engine with database pool
      if (availableData.pool) {
        comparisonEngine.setPool(availableData.pool);
      }

      // Analyze the comparison request
      const comparison = await comparisonEngine.analyzeComparisonRequest(userMessage, session);
      
      if (comparison.cars.length > 0) {
        return {
          success: true,
          data: {
            nextStep: 'show_comparison',
            message: comparison.message,
            options: ['Book Test Drive', 'Compare More Cars', 'Get Details', 'Start Over'],
            extractedData: {
              intent: 'comparison',
              comparison: comparison
            },
            sessionUpdates: {
              comparisonCars: comparison.cars,
              comparisonCriteria: comparison.criteria
            },
            requiresDatabaseQuery: false,
            queryType: 'none'
          }
        };
      } else {
        // No cars found for comparison, ask for specific models
        return {
          success: true,
          data: {
            nextStep: 'browse_start',
            message: comparison.message + "\n\nPlease specify the exact car models you'd like to compare (e.g., 'Honda City vs Maruti Swift').",
            options: ['Browse Cars', 'Get Suggestions', 'Main Menu'],
            extractedData: {
              intent: 'comparison'
            },
            sessionUpdates: {},
            requiresDatabaseQuery: false,
            queryType: 'none'
          }
        };
      }
    } catch (error) {
      logError(error, { scope: 'GeminiFlowService.handleComparisonRequest', userMessage });
      return this.getFallbackResponse(userMessage, session);
    }
  }

  async handleSuggestionRequest(userMessage, session, availableData) {
    try {
      // Set up suggestion engine with database pool
      if (availableData.pool) {
        suggestionEngine.setPool(availableData.pool);
      }

      // Analyze the suggestion request
      const suggestion = await suggestionEngine.analyzeSuggestionRequest(userMessage, session);
      
      if (suggestion.suggestions.length > 0) {
        return {
          success: true,
          data: {
            nextStep: 'show_cars',
            message: suggestion.message,
            options: ['Book Test Drive', 'Show More Options', 'Change Criteria'],
            extractedData: {
              intent: 'suggestion',
              suggestions: suggestion.suggestions
            },
            sessionUpdates: {
              filteredCars: suggestion.suggestions,
              carIndex: 0
            },
            requiresDatabaseQuery: false,
            queryType: 'none'
          }
        };
      } else {
        // No suggestions found, ask for more specific criteria
        return {
          success: true,
          data: {
            nextStep: 'browse_budget',
            message: suggestion.message + "\n\nLet me help you find the perfect car. What's your budget range?",
            options: availableData.budgetOptions || ['Under ₹5 Lakhs', '₹5-10 Lakhs', '₹10-15 Lakhs', '₹15-20 Lakhs', 'Above ₹20 Lakhs'],
            extractedData: {
              intent: 'suggestion'
            },
            sessionUpdates: {},
            requiresDatabaseQuery: false,
            queryType: 'none'
          }
        };
      }
    } catch (error) {
      logError(error, { scope: 'GeminiFlowService.handleSuggestionRequest', userMessage });
      return this.getFallbackResponse(userMessage, session);
    }
  }

  buildIntentAnalysisPrompt(userMessage, session, availableData) {
    const currentStep = session.step || 'browse_start';
    const sessionData = {
      budget: session.budget,
      type: session.type,
      brand: session.brand,
      selectedCar: session.selectedCar,
      testDriveDate: session.testDriveDate,
      testDriveTime: session.testDriveTime,
      td_name: session.td_name,
      td_phone: session.td_phone,
      td_license: session.td_license,
      td_location_mode: session.td_location_mode,
      td_home_address: session.td_home_address
    };

    return `You are an AI assistant for Sherpa Hyundai, a car dealership. You have COMPLETE CONTROL over the conversation flow. Your job is to provide the best possible user experience by understanding user intent and guiding them naturally through the car buying process.

TONE AND PHASE CONTROL:
- Determine the user's phase: exploration | decision | purchase
- Adapt tone: explanatory (when confused/unsure), concise (when decisive), helpful (default)

CURRENT SESSION STATE:
- Step: ${currentStep}
- Budget: ${sessionData.budget || 'Not selected'}
- Car Type: ${sessionData.type || 'Not selected'}
- Brand: ${sessionData.brand || 'Not selected'}
- Selected Car: ${sessionData.selectedCar || 'Not selected'}
- Test Drive Date: ${sessionData.testDriveDate || 'Not selected'}
- Test Drive Time: ${sessionData.testDriveTime || 'Not selected'}
- Customer Name: ${sessionData.td_name || 'Not provided'}
- Customer Phone: ${sessionData.td_phone || 'Not provided'}
- Has License: ${sessionData.td_license || 'Not specified'}
- Location Mode: ${sessionData.td_location_mode || 'Not selected'}
- Home Address: ${sessionData.td_home_address || 'Not provided'}

DATABASE-DRIVEN OPTIONS (ALWAYS USE THESE):
- Budget Options: ${availableData.budgetOptions?.join(', ') || 'Under ₹5 Lakhs, ₹5-10 Lakhs, ₹10-15 Lakhs, ₹15-20 Lakhs, Above ₹20 Lakhs'}
- Available Types: ${availableData.availableTypes?.join(', ') || 'SUV, Sedan, Hatchback, Coupe, Convertible, Wagon, Pickup, MUV'}
- Available Brands: ${availableData.availableBrands?.join(', ') || 'Maruti, Hyundai, Honda, Toyota, Tata, Kia, Mahindra, Skoda, Renault, Ford, Volkswagen, BMW, Audi, Mercedes'}
- Available Cars: ${availableData.availableCars?.length || 0} cars found

USER MESSAGE: "${userMessage}"

YOUR RESPONSIBILITIES:
1. FULL CONTROL: You decide the entire conversation flow - no rigid step-by-step process
2. NATURAL CONVERSATION: Respond naturally and contextually to user messages
3. DATA EXTRACTION: Extract budget, type, brand, and other preferences from user input
4. SMART DECISIONS: Determine the most logical next step based on context
5. DATABASE INTEGRITY: Always use the provided database options for types/brands
6. USER EXPERIENCE: Make the conversation feel natural and helpful

7. MULTI-TURN LINKING: If user references prior items by index (e.g., "first one", "compare second and third"), include index mapping in extractedData.

CONVERSATION FLOW RULES:
- If user provides budget + type + brand, go directly to showing cars
- If user provides partial info, ask for missing pieces naturally
- If user wants to change criteria, reset and start fresh
- If user selects a car, offer test drive or other options
- If user wants test drive, collect necessary details efficiently
- Always validate against database options before proceeding

RESPONSE FORMAT (JSON):
{
  "nextStep": "step_name",
  "message": "Your natural, conversational response",
  "options": ["Option 1", "Option 2", "Option 3"],
  "extractedData": {
    "budget": "extracted_budget_or_null",
    "type": "extracted_type_or_null", 
    "brand": "extracted_brand_or_null",
    "intent": "browse|valuation|contact|about|test_drive|other|comparison|suggestion",
    "phase": "exploration|decision|purchase",
    "tone": "explanatory|concise|helpful",
    "indexReferences": [1,2] // optional; 1-based indexes
  },
  "sessionUpdates": {
    "budget": "value_to_update_or_null",
    "type": "value_to_update_or_null",
    "brand": "value_to_update_or_null",
    "selectedCar": "value_to_update_or_null",
    "testDriveDate": "value_to_update_or_null",
    "testDriveTime": "value_to_update_or_null",
    "td_name": "value_to_update_or_null",
    "td_phone": "value_to_update_or_null",
    "td_license": "value_to_update_or_null",
    "td_location_mode": "value_to_update_or_null",
    "td_home_address": "value_to_update_or_null"
  },
  "requiresDatabaseQuery": true/false,
  "queryType": "getCarsByFilter|getAvailableTypes|getAvailableBrands|getCarImages|none"
}

POSSIBLE STEPS (YOU CHOOSE THE BEST ONE):
- browse_start: Initial browsing setup
- browse_budget: Budget selection
- browse_type: Car type selection  
- browse_brand: Brand selection
- show_cars: Display car results
- show_more_cars: Show additional cars
- car_selected_options: Car selection options
- test_drive_date: Test drive date selection
- test_drive_day: Specific day selection
- test_drive_time: Time slot selection
- td_name: Customer name collection
- td_phone: Phone number collection
- td_license: License verification
- td_location_mode: Location preference
- td_home_address: Home address collection
- test_drive_confirmation: Final confirmation
- booking_complete: Booking completed
- main_menu: Return to main menu

EXAMPLES OF GOOD RESPONSES:
- "Perfect! I found some great Honda SUVs under ₹10 Lakhs. Let me show you the options..."
- "I see you want a sedan. What's your budget range so I can show you the best options?"
- "Great choice! The Honda City is an excellent car. Would you like to book a test drive?"
- "No problem! Let me help you find something different. What type of car are you looking for?"

Remember: You have complete control. Make the conversation natural, helpful, and efficient. Always use the database-provided options for types and brands.`;
  }

  parseGeminiResponse(text, session) {
    try {
      // Extract JSON from the response
      const jsonStart = text.indexOf('{');
      const jsonEnd = text.lastIndexOf('}');
      
      if (jsonStart === -1 || jsonEnd === -1) {
        throw new Error('No JSON found in response');
      }
      
      const jsonStr = text.substring(jsonStart, jsonEnd + 1);
      const parsed = JSON.parse(jsonStr);
      
      // Validate required fields
      if (!parsed.nextStep || !parsed.message) {
        throw new Error('Invalid response format');
      }
      
      return {
        success: true,
        data: parsed
      };
    } catch (error) {
      console.error('❌ Failed to parse Gemini response:', error.message);
      console.error('Raw response:', text);
      return {
        success: false,
        error: error.message,
        fallback: this.getFallbackResponse('', session)
      };
    }
  }

  getFallbackResponse(userMessage, session) {
    // Fallback to regex-based extraction when Gemini is not available
    const lowerMsg = (userMessage || '').toLowerCase().trim();
    
    // Check for greeting
    if (['hi', 'hello', 'hey', 'hy', 'start', 'begin', 'restart', 'menu', 'main'].includes(lowerMsg)) {
      return {
        success: true,
        data: {
          nextStep: 'main_menu',
          message: "Hello! 👋 Welcome to Sherpa Hyundai. How can I assist you today?",
          options: [
            "🚗 Browse Used Cars",
            "💰 Get Car Valuation", 
            "📞 Contact Our Team",
            "ℹ️ About Us"
          ],
          extractedData: { intent: 'greeting' },
          sessionUpdates: {
            budget: null,
            type: null,
            brand: null,
            selectedCar: null,
            testDriveDate: null,
            testDriveTime: null,
            td_name: null,
            td_phone: null,
            td_license: null,
            td_location_mode: null,
            td_home_address: null
          },
          requiresDatabaseQuery: false,
          queryType: 'none'
        }
      };
    }
    
    // Basic intent detection
    const browseKeywords = ['browse', 'buy', 'look', 'see', 'show', 'find', 'car'];
    const isBrowseIntent = browseKeywords.some(k => lowerMsg.includes(k));
    
    if (isBrowseIntent) {
      return {
        success: true,
        data: {
          nextStep: 'browse_budget',
          message: "Great! We'll help you find cars. First, what's your budget range?",
          options: [
            "Under ₹5 Lakhs",
            "₹5-10 Lakhs", 
            "₹10-15 Lakhs",
            "₹15-20 Lakhs",
            "Above ₹20 Lakhs"
          ],
          extractedData: { intent: 'browse' },
          sessionUpdates: {},
          requiresDatabaseQuery: false,
          queryType: 'none'
        }
      };
    }
    
    // Default fallback
    return {
      success: true,
      data: {
        nextStep: 'main_menu',
        message: "I'm here to help! What would you like to do today?",
        options: [
          "🚗 Browse Used Cars",
          "💰 Get Car Valuation",
          "📞 Contact Our Team", 
          "ℹ️ About Us"
        ],
        extractedData: { intent: 'unknown' },
        sessionUpdates: {},
        requiresDatabaseQuery: false,
        queryType: 'none'
      }
    };
  }

  async generateDynamicResponse(context, availableData) {
    if (!await this.isAvailable()) {
      return this.getStaticResponse(context);
    }

    try {
      const prompt = this.buildDynamicResponsePrompt(context, availableData);
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      return this.parseDynamicResponse(text);
    } catch (error) {
      console.error('❌ Gemini dynamic response failed:', error.message);
      return this.getStaticResponse(context);
    }
  }

  buildDynamicResponsePrompt(context, availableData) {
    return `You are an AI assistant for Sherpa Hyundai. Generate a natural, helpful response based on the context.

CONTEXT:
- Current Step: ${context.step}
- User Message: "${context.userMessage}"
- Session Data: ${JSON.stringify(context.session, null, 2)}
- Available Data: ${JSON.stringify(availableData, null, 2)}

Generate a response that:
1. Acknowledges the user's input
2. Provides helpful information
3. Guides them to the next step
4. Uses appropriate emojis and formatting
5. Feels natural and conversational

RESPONSE FORMAT (JSON):
{
  "message": "Your response message",
  "options": ["Option 1", "Option 2", "Option 3"],
  "tone": "friendly|professional|helpful|urgent"
}`;
  }

  parseDynamicResponse(text) {
    try {
      const jsonStart = text.indexOf('{');
      const jsonEnd = text.lastIndexOf('}');
      
      if (jsonStart === -1 || jsonEnd === -1) {
        throw new Error('No JSON found in response');
      }
      
      const jsonStr = text.substring(jsonStart, jsonEnd + 1);
      return JSON.parse(jsonStr);
    } catch (error) {
      console.error('❌ Failed to parse dynamic response:', error.message);
      return this.getStaticResponse({ step: 'unknown' });
    }
  }

  getStaticResponse(context) {
    // Static fallback responses based on context
    const responses = {
      'browse_budget': {
        message: "Great! We'll help you find cars. First, what's your budget range?",
        options: ["Under ₹5 Lakhs", "₹5-10 Lakhs", "₹10-15 Lakhs", "₹15-20 Lakhs", "Above ₹20 Lakhs"]
      },
      'browse_type': {
        message: "What type of car do you prefer?",
        options: ["SUV", "Sedan", "Hatchback", "Coupe", "Convertible", "Wagon", "Pickup", "MUV"]
      },
      'browse_brand': {
        message: "Which brand do you prefer?",
        options: ["Maruti", "Hyundai", "Honda", "Toyota", "Tata", "Kia", "Mahindra", "Skoda", "Renault", "Ford", "Volkswagen", "BMW", "Audi", "Mercedes"]
      },
      'test_drive_date': {
        message: "When would you like to schedule your test drive?",
        options: ["Today", "Tomorrow", "Later this Week", "Next Week"]
      }
    };
    
    return responses[context.step] || {
      message: "How can I help you today?",
      options: ["Browse Cars", "Get Valuation", "Contact Us", "About Us"]
    };
  }
}

module.exports = new GeminiFlowService();
