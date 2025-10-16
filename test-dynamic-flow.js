#!/usr/bin/env node

/**
 * Test script for Dynamic Flow System
 * Run with: node test-dynamic-flow.js
 */

const dynamicFlowManager = require('./utils/dynamicFlowManager');
const geminiFlowService = require('./utils/geminiFlowService');
const suggestionEngine = require('./utils/suggestionEngine');
const comparisonEngine = require('./utils/comparisonEngine');

// Mock database pool
const mockPool = {
  query: async (sql, params) => {
    console.log('🔍 Mock DB Query:', sql, params);
    
    // Mock responses based on query - More comprehensive data
    if (sql.includes('SELECT DISTINCT type FROM cars')) {
      return { rows: [
        { type: 'SUV' },
        { type: 'Sedan' },
        { type: 'Hatchback' },
        { type: 'Coupe' },
        { type: 'Convertible' },
        { type: 'Wagon' },
        { type: 'Pickup' },
        { type: 'MUV' }
      ]};
    }
    
    if (sql.includes('SELECT DISTINCT brand FROM cars')) {
      return { rows: [
        { brand: 'Honda' },
        { brand: 'Maruti' },
        { brand: 'Hyundai' },
        { brand: 'Toyota' },
        { brand: 'Tata' },
        { brand: 'Kia' },
        { brand: 'Mahindra' },
        { brand: 'Skoda' },
        { brand: 'Renault' },
        { brand: 'Ford' },
        { brand: 'Volkswagen' },
        { brand: 'BMW' },
        { brand: 'Audi' },
        { brand: 'Mercedes' }
      ]};
    }
    
    if (sql.includes('SELECT * FROM cars WHERE brand =') && sql.includes('AND type =')) {
      const brand = params[0];
      const type = params[1];
      const minPrice = params[2];
      const maxPrice = params[3];
      
      // Return different cars based on brand and type
      if (brand === 'Honda' && type === 'SUV') {
        return { rows: [
          {
            id: 1,
            brand: 'Honda',
            model: 'CR-V',
            variant: 'VX',
            year: 2020,
            fuel_type: 'Petrol',
            price: 850000,
            registration_number: 'KA01AB1234'
          },
          {
            id: 2,
            brand: 'Honda',
            model: 'WR-V',
            variant: 'VX',
            year: 2019,
            fuel_type: 'Diesel',
            price: 750000,
            registration_number: 'KA01CD5678'
          }
        ]};
      } else if (brand === 'Maruti' && type === 'SUV') {
        return { rows: [
          {
            id: 3,
            brand: 'Maruti',
            model: 'Vitara Brezza',
            variant: 'VDI',
            year: 2021,
            fuel_type: 'Diesel',
            price: 800000,
            registration_number: 'KA01EF9012'
          }
        ]};
      } else if (brand === 'Honda' && type === 'Sedan') {
        return { rows: [
          {
            id: 4,
            brand: 'Honda',
            model: 'City',
            variant: 'VX',
            year: 2020,
            fuel_type: 'Petrol',
            price: 950000,
            registration_number: 'KA01GH3456'
          }
        ]};
      }
      
      return { rows: [] };
    }

    // Handle comparison queries
    if (sql.includes('SELECT * FROM cars WHERE LOWER(model) LIKE') || sql.includes('SELECT * FROM cars WHERE LOWER(brand) LIKE')) {
      const searchTerm = params[0].toLowerCase();
      
      // Mock car data for comparison
      const mockCars = [
        {
          id: 1,
          brand: 'Honda',
          model: 'City',
          variant: 'VX',
          year: 2020,
          fuel_type: 'Petrol',
          price: 950000,
          registration_number: 'KA01AB1234'
        },
        {
          id: 2,
          brand: 'Maruti',
          model: 'Swift',
          variant: 'VDI',
          year: 2021,
          fuel_type: 'Diesel',
          price: 750000,
          registration_number: 'KA01CD5678'
        },
        {
          id: 3,
          brand: 'Hyundai',
          model: 'Creta',
          variant: 'SX',
          year: 2020,
          fuel_type: 'Petrol',
          price: 1100000,
          registration_number: 'KA01EF9012'
        },
        {
          id: 4,
          brand: 'Kia',
          model: 'Seltos',
          variant: 'HTX',
          year: 2021,
          fuel_type: 'Diesel',
          price: 1050000,
          registration_number: 'KA01GH3456'
        },
        {
          id: 5,
          brand: 'Toyota',
          model: 'Innova',
          variant: 'Crysta',
          year: 2020,
          fuel_type: 'Diesel',
          price: 1800000,
          registration_number: 'KA01IJ7890'
        },
        {
          id: 6,
          brand: 'Mahindra',
          model: 'XUV300',
          variant: 'W8',
          year: 2021,
          fuel_type: 'Diesel',
          price: 1200000,
          registration_number: 'KA01KL1234'
        }
      ];

      // Filter cars based on search term
      const filteredCars = mockCars.filter(car => 
        car.brand.toLowerCase().includes(searchTerm) || 
        car.model.toLowerCase().includes(searchTerm) ||
        `${car.brand} ${car.model}`.toLowerCase().includes(searchTerm)
      );

      return { rows: filteredCars };
    }

    if (sql.includes('SELECT * FROM cars WHERE LOWER(brand) =')) {
      const brand = params[0].toLowerCase();
      
      // Return top 3 cars for the brand
      const brandCars = {
        'honda': [
          { id: 1, brand: 'Honda', model: 'City', variant: 'VX', year: 2020, fuel_type: 'Petrol', price: 950000, registration_number: 'KA01AB1234' },
          { id: 2, brand: 'Honda', model: 'CR-V', variant: 'VX', year: 2020, fuel_type: 'Petrol', price: 1850000, registration_number: 'KA01CD5678' },
          { id: 3, brand: 'Honda', model: 'WR-V', variant: 'VX', year: 2019, fuel_type: 'Diesel', price: 750000, registration_number: 'KA01EF9012' }
        ],
        'maruti': [
          { id: 4, brand: 'Maruti', model: 'Swift', variant: 'VDI', year: 2021, fuel_type: 'Diesel', price: 750000, registration_number: 'KA01GH3456' },
          { id: 5, brand: 'Maruti', model: 'Baleno', variant: 'Delta', year: 2020, fuel_type: 'Petrol', price: 850000, registration_number: 'KA01IJ7890' },
          { id: 6, brand: 'Maruti', model: 'Vitara Brezza', variant: 'VDI', year: 2021, fuel_type: 'Diesel', price: 800000, registration_number: 'KA01KL1234' }
        ]
      };

      return { rows: brandCars[brand] || [] };
    }
    
    return { rows: [] };
  }
};

async function testDynamicFlow() {
  console.log('🧪 Testing Dynamic Flow System\n');
  
  // Set up mock database
  dynamicFlowManager.setPool(mockPool);
  
  // Test cases - Gemini + Suggestion Engine + Comparison Engine
  const testCases = [
    {
      name: 'Greeting Test',
      session: { step: 'browse_start' },
      message: 'Hi, I want to buy a car'
    },
    {
      name: 'Comparison Request Test',
      session: { step: 'browse_start' },
      message: 'Compare Honda City vs Maruti Swift'
    },
    {
      name: 'Feature Comparison Test',
      session: { step: 'browse_start' },
      message: 'Which is better for fuel efficiency - Honda City or Maruti Swift?'
    },
    {
      name: 'Brand Comparison Test',
      session: { step: 'browse_start' },
      message: 'Compare Honda vs Maruti cars'
    },
    {
      name: 'Price Comparison Test',
      session: { step: 'browse_start' },
      message: 'Show me price difference between Hyundai Creta and Kia Seltos'
    },
    {
      name: 'Suggestion Request Test',
      session: { step: 'browse_start' },
      message: 'Can you suggest a good family car under 10 lakhs?'
    },
    {
      name: 'Feature-based Suggestion Test',
      session: { step: 'browse_start' },
      message: 'I need an automatic diesel SUV for city driving'
    },
    {
      name: 'Brand Suggestion Test',
      session: { step: 'browse_start' },
      message: 'What Japanese cars do you recommend?'
    },
    {
      name: 'Usage-based Suggestion Test',
      session: { step: 'browse_start' },
      message: 'I need a first car that is economical and easy to drive'
    },
    {
      name: 'Complete Request Test',
      session: { step: 'browse_start' },
      message: 'I want a Honda SUV under 10 lakhs'
    },
    {
      name: 'Partial Request Test',
      session: { step: 'browse_start' },
      message: 'Show me sedans'
    },
    {
      name: 'Brand Specific Test',
      session: { step: 'browse_start' },
      message: 'What Honda cars do you have?'
    },
    {
      name: 'Budget + Type Test',
      session: { step: 'browse_start' },
      message: 'I have 8 lakhs budget and want an SUV'
    },
    {
      name: 'Test Drive Request Test',
      session: { step: 'browse_start' },
      message: 'I want to test drive a Honda City'
    },
    {
      name: 'Change Mind Test',
      session: { step: 'show_cars', budget: '₹5-10 Lakhs', type: 'SUV', brand: 'Honda' },
      message: 'Actually, I prefer Maruti instead'
    }
  ];
  
  for (const testCase of testCases) {
    console.log(`\n📋 Test: ${testCase.name}`);
    console.log(`💬 Message: "${testCase.message}"`);
    console.log(`📊 Session:`, JSON.stringify(testCase.session, null, 2));
    
    try {
      const response = await dynamicFlowManager.processMessage(testCase.session, testCase.message);
      console.log(`✅ Response:`, JSON.stringify(response, null, 2));
    } catch (error) {
      console.error(`❌ Error:`, error.message);
    }
    
    console.log('─'.repeat(80));
  }
}

async function testComparisonEngine() {
  console.log('\n🔍 Testing Comparison Engine\n');
  
  // Set up comparison engine with mock database
  comparisonEngine.setPool(mockPool);
  
  const testSession = {
    step: 'browse_start',
    budget: null,
    type: null,
    brand: null
  };
  
  const comparisonTests = [
    {
      name: 'Model Comparison',
      message: 'Compare Honda City vs Maruti Swift'
    },
    {
      name: 'Feature Comparison',
      message: 'Which is better for fuel efficiency - Honda City or Maruti Swift?'
    },
    {
      name: 'Brand Comparison',
      message: 'Compare Honda vs Maruti cars'
    },
    {
      name: 'Price Comparison',
      message: 'Show me price difference between Hyundai Creta and Kia Seltos'
    },
    {
      name: 'Safety Comparison',
      message: 'Compare safety features of Toyota Innova vs Mahindra XUV300'
    },
    {
      name: 'Performance Comparison',
      message: 'Which has better performance - BMW 3 Series or Audi A4?'
    }
  ];
  
  for (const test of comparisonTests) {
    console.log(`\n📋 Test: ${test.name}`);
    console.log(`💬 Message: "${test.message}"`);
    
    try {
      const comparison = await comparisonEngine.analyzeComparisonRequest(test.message, testSession);
      console.log(`✅ Comparison Response:`, JSON.stringify(comparison, null, 2));
    } catch (error) {
      console.error(`❌ Comparison Error:`, error.message);
    }
    
    console.log('─'.repeat(60));
  }
}

async function testSuggestionEngine() {
  console.log('\n🎯 Testing Suggestion Engine\n');
  
  // Set up suggestion engine with mock database
  suggestionEngine.setPool(mockPool);
  
  const testSession = {
    step: 'browse_start',
    budget: null,
    type: null,
    brand: null
  };
  
  const suggestionTests = [
    {
      name: 'Family Car Suggestion',
      message: 'Can you suggest a good family car under 10 lakhs?'
    },
    {
      name: 'Feature-based Suggestion',
      message: 'I need an automatic diesel SUV for city driving'
    },
    {
      name: 'Brand Suggestion',
      message: 'What Japanese cars do you recommend?'
    },
    {
      name: 'Usage Suggestion',
      message: 'I need a first car that is economical and easy to drive'
    },
    {
      name: 'Budget Suggestion',
      message: 'Show me cars around 8 lakhs'
    },
    {
      name: 'Type Suggestion',
      message: 'I want a sporty car with good performance'
    }
  ];
  
  for (const test of suggestionTests) {
    console.log(`\n📋 Test: ${test.name}`);
    console.log(`💬 Message: "${test.message}"`);
    
    try {
      const suggestion = await suggestionEngine.analyzeSuggestionRequest(test.message, testSession);
      console.log(`✅ Suggestion Response:`, JSON.stringify(suggestion, null, 2));
    } catch (error) {
      console.error(`❌ Suggestion Error:`, error.message);
    }
    
    console.log('─'.repeat(60));
  }
}

async function testGeminiService() {
  console.log('\n🤖 Testing Gemini Service\n');
  
  if (!process.env.GEMINI_API_KEY) {
    console.log('⚠️ GEMINI_API_KEY not set, testing fallback mode');
  }
  
  const testSession = {
    step: 'browse_start',
    budget: null,
    type: null,
    brand: null
  };
  
  const availableData = {
    budgetOptions: ['Under ₹5 Lakhs', '₹5-10 Lakhs', '₹10-15 Lakhs', '₹15-20 Lakhs', 'Above ₹20 Lakhs'],
    availableTypes: ['SUV', 'Sedan', 'Hatchback'],
    availableBrands: ['Honda', 'Maruti', 'Hyundai'],
    availableCars: [],
    pool: mockPool
  };
  
  const testMessages = [
    'Hi, I want to buy a car',
    'Can you suggest a good family car?',
    'I need a Honda SUV under 10 lakhs',
    'Show me sedans',
    'What brands do you have?'
  ];
  
  for (const message of testMessages) {
    console.log(`\n💬 Testing: "${message}"`);
    
    try {
      const response = await geminiFlowService.analyzeUserIntent(message, testSession, availableData);
      console.log(`✅ Gemini Response:`, JSON.stringify(response, null, 2));
    } catch (error) {
      console.error(`❌ Gemini Error:`, error.message);
    }
  }
}

async function runTests() {
  try {
    await testDynamicFlow();
    await testComparisonEngine();
    await testSuggestionEngine();
    await testGeminiService();
    
    console.log('\n🎉 All tests completed!');
    console.log('\n📝 Next Steps:');
    console.log('1. Set GEMINI_API_KEY in your .env file');
    console.log('2. Run: npm run whatsapp');
    console.log('3. Test with real WhatsApp messages');
    console.log('4. Try suggestion requests like "suggest a family car"');
    console.log('5. Try comparison requests like "compare Honda City vs Maruti Swift"');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests();
}

module.exports = { testDynamicFlow, testComparisonEngine, testSuggestionEngine, testGeminiService };
