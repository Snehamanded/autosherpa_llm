const geminiFlowService = require('./geminiFlowService');
const { logError } = require('./errorHandler');
const { FLOW_STEPS, STEP_CONFIGURATIONS, FLOW_TRANSITIONS, VALIDATION_RULES } = require('./flowConfiguration');
const { getAvailableTypes, getAvailableBrands, getCarsByFilter, getCarImagesByRegistration } = require('./carData');
const { validateBudget, validateCarType, validateBrand } = require('./inputValidation');
const { getNextAvailableDays, getTimeSlots, getActualDateFromSelection, getActualDateFromDaySelection } = require('./timeUtils');

class DynamicFlowManager {
  constructor() {
    this.pool = null;
  }

  setPool(pool) {
    this.pool = pool;
  }

  async processMessage(session, userMessage) {
    try {
      console.log('🤖 Dynamic Flow Manager processing message:', userMessage);
      console.log('📊 Current session state:', JSON.stringify(session, null, 2));

      // Fast-path: handle direct selection of budget to avoid repeating the same question
      const BUDGET_OPTIONS = [
        'Under ₹5 Lakhs',
        '₹5-10 Lakhs',
        '₹10-15 Lakhs',
        '₹15-20 Lakhs',
        'Above ₹20 Lakhs'
      ];
      const trimmedMsg = (userMessage || '').trim();
      if ((session.step === 'browse_budget' || !session.step) && BUDGET_OPTIONS.includes(trimmedMsg)) {
        session.budget = trimmedMsg;
        session.step = FLOW_STEPS.BROWSE_TYPE;
        const types = await getAvailableTypes(this.pool, session.budget);
        const response = {
          message: `Perfect! ${session.budget} gives you excellent options. What type of car do you prefer?`,
          options: ['all Type', ...types],
          nextStep: FLOW_STEPS.BROWSE_TYPE,
          extractedData: { intent: 'browse', budget: session.budget }
        };
        console.log('✅ Fast-path budget handled:', JSON.stringify(response, null, 2));
        return response;
      }

      // Get available data for context
      const availableData = await this.getAvailableData(session);
      
      // Use Gemini to analyze intent and determine next step
      const geminiResponse = await geminiFlowService.analyzeUserIntent(userMessage, session, availableData);
      
      if (geminiResponse.success) {
        return await this.processGeminiResponse(session, geminiResponse.data, availableData);
      } else {
        console.log('⚠️ Gemini failed, using fallback response');
        return await this.processFallbackResponse(session, userMessage, availableData);
      }
    } catch (error) {
      logError(error, { scope: 'DynamicFlowManager.processMessage', userMessage, sessionSnapshot: {
        step: session?.step, budget: session?.budget, type: session?.type, brand: session?.brand
      }});
      return await this.processFallbackResponse(session, userMessage, {});
    }
  }

  async getAvailableData(session) {
    const availableData = {
      budgetOptions: ['Under ₹5 Lakhs', '₹5-10 Lakhs', '₹10-15 Lakhs', '₹15-20 Lakhs', 'Above ₹20 Lakhs'],
      availableTypes: [],
      availableBrands: [],
      availableCars: [],
      pool: this.pool // Pass database pool for suggestion engine
    };

    try {
      if (this.pool) {
        // ALWAYS fetch fresh data from database for Gemini to use
        console.log('🔍 Fetching fresh database data for Gemini...');
        
        // Get ALL available types (not filtered by budget initially)
        const allTypesResult = await this.pool.query(`
          SELECT DISTINCT type FROM cars 
          WHERE type IS NOT NULL 
          ORDER BY type
        `);
        availableData.availableTypes = allTypesResult.rows.map(row => row.type);
        console.log('📊 Available types from DB:', availableData.availableTypes);

        // Get ALL available brands (not filtered initially)
        const allBrandsResult = await this.pool.query(`
          SELECT DISTINCT brand FROM cars 
          WHERE brand IS NOT NULL 
          ORDER BY brand
        `);
        availableData.availableBrands = allBrandsResult.rows.map(row => row.brand);
        console.log('📊 Available brands from DB:', availableData.availableBrands);

        // If we have specific filters, get filtered data too
        if (session.budget || session.type || session.brand) {
          console.log('🔍 Getting filtered data based on session:', { 
            budget: session.budget, 
            type: session.type, 
            brand: session.brand 
          });
          
          // Get filtered types if budget is set
          if (session.budget) {
            const budgetRange = this.getBudgetRange(session.budget);
            const filteredTypesResult = await this.pool.query(`
              SELECT DISTINCT type FROM cars 
              WHERE type IS NOT NULL 
              AND CAST(price AS NUMERIC) >= $1 
              AND CAST(price AS NUMERIC) <= $2 
              ORDER BY type
            `, [budgetRange.min, budgetRange.max]);
            console.log('📊 Filtered types for budget:', filteredTypesResult.rows.map(row => row.type));
          }

          // Get filtered brands if budget and type are set
          if (session.budget && session.type) {
            const budgetRange = this.getBudgetRange(session.budget);
            const filteredBrandsResult = await this.pool.query(`
              SELECT DISTINCT brand FROM cars 
              WHERE brand IS NOT NULL 
              AND type = $1 
              AND CAST(price AS NUMERIC) >= $2 
              AND CAST(price AS NUMERIC) <= $3 
              ORDER BY brand
            `, [session.type, budgetRange.min, budgetRange.max]);
            console.log('📊 Filtered brands for budget+type:', filteredBrandsResult.rows.map(row => row.brand));
          }

          // Get filtered cars if all filters are set
          if (session.budget && session.type && session.brand) {
            const budgetRange = this.getBudgetRange(session.budget);
            const filteredCarsResult = await this.pool.query(`
              SELECT * FROM cars 
              WHERE brand = $1 
              AND type = $2 
              AND CAST(price AS NUMERIC) >= $3 
              AND CAST(price AS NUMERIC) <= $4 
              ORDER BY price
            `, [session.brand, session.type, budgetRange.min, budgetRange.max]);
            availableData.availableCars = filteredCarsResult.rows;
            console.log('📊 Filtered cars found:', availableData.availableCars.length);
          }
        }
      }
    } catch (error) {
      logError(error, { scope: 'DynamicFlowManager.getAvailableData', sessionSnapshot: {
        step: session?.step, budget: session?.budget, type: session?.type, brand: session?.brand
      }});
    }

    return availableData;
  }

  getBudgetRange(budget) {
    const ranges = {
      'Under ₹5 Lakhs': { min: 0, max: 500000 },
      '₹5-10 Lakhs': { min: 500000, max: 1000000 },
      '₹10-15 Lakhs': { min: 1000000, max: 1500000 },
      '₹15-20 Lakhs': { min: 1500000, max: 2000000 },
      'Above ₹20 Lakhs': { min: 2000000, max: 999999999 }
    };
    return ranges[budget] || { min: 0, max: 999999999 };
  }

  async processGeminiResponse(session, geminiData, availableData) {
    console.log('🎯 Processing Gemini response:', JSON.stringify(geminiData, null, 2));

    // GEMINI HAS COMPLETE CONTROL - Update session with extracted data
    if (geminiData.sessionUpdates) {
      Object.keys(geminiData.sessionUpdates).forEach(key => {
        if (geminiData.sessionUpdates[key] !== null) {
          session[key] = geminiData.sessionUpdates[key];
          console.log(`📝 Updated session.${key}:`, geminiData.sessionUpdates[key]);
        }
      });
    }

    // Update session step as determined by Gemini
    session.step = geminiData.nextStep;
    console.log(`🔄 Updated session step to: ${geminiData.nextStep}`);

    // Handle database queries if Gemini requests them
    if (geminiData.requiresDatabaseQuery && geminiData.queryType) {
      console.log(`🔍 Gemini requested database query: ${geminiData.queryType}`);
      await this.handleDatabaseQuery(session, geminiData.queryType, availableData);
    }

    // Generate final response - Gemini controls everything
    const response = {
      message: geminiData.message,
      options: geminiData.options || [],
      nextStep: geminiData.nextStep,
      extractedData: geminiData.extractedData || {}
    };

    // Multi-turn linking: handle index references like "first", "second", etc.
    if (geminiData.extractedData && Array.isArray(geminiData.extractedData.indexReferences) && (session.filteredCars || []).length > 0) {
      const indexes = geminiData.extractedData.indexReferences;
      const cars = session.filteredCars;
      const selected = [];
      indexes.forEach(i => {
        const idx = i - 1;
        if (idx >= 0 && idx < cars.length) selected.push(cars[idx]);
      });
      if (selected.length === 1) {
        session.selectedCar = `${selected[0].brand} ${selected[0].model} ${selected[0].variant}`;
        session.step = FLOW_STEPS.CAR_SELECTED_OPTIONS;
        response.message = `Great! You selected ${session.selectedCar}. What would you like to do next?`;
        response.options = ["Book Test Drive", "Change My Criteria"];
      } else if (selected.length >= 2) {
        // Trigger comparison flow via comparison engine if two or more selected
        response.message = `Comparing the selected cars for you...`;
        response.options = ["Book Test Drive", "Compare More Cars", "Get Details"];
      }
    }

    // If Gemini wants to show cars, fetch fresh data and display
    if (geminiData.nextStep === FLOW_STEPS.SHOW_CARS || geminiData.nextStep === FLOW_STEPS.SHOW_MORE_CARS) {
      console.log('🚗 Gemini wants to show cars - fetching fresh data...');
      
      // Fetch fresh car data based on current session
      if (session.budget && session.type && session.brand) {
        const budgetRange = this.getBudgetRange(session.budget);
        const carsResult = await this.pool.query(`
          SELECT * FROM cars 
          WHERE brand = $1 
          AND type = $2 
          AND CAST(price AS NUMERIC) >= $3 
          AND CAST(price AS NUMERIC) <= $4 
          ORDER BY price
        `, [session.brand, session.type, budgetRange.min, budgetRange.max]);
        
        session.filteredCars = carsResult.rows;
        session.carIndex = 0;
        console.log(`📊 Found ${carsResult.rows.length} cars matching criteria`);
      }
      
      const carDisplay = await this.generateCarDisplay(session, availableData);
      if (carDisplay) {
        response.messages = carDisplay.messages;
        response.message = carDisplay.message;
        response.options = carDisplay.options;
      }
    }

    // If Gemini wants test drive confirmation, generate it
    if (geminiData.nextStep === FLOW_STEPS.TEST_DRIVE_CONFIRMATION) {
      console.log('📅 Gemini wants test drive confirmation');
      const confirmation = this.generateTestDriveConfirmation(session);
      response.message = confirmation.message;
      response.options = confirmation.options;
    }

    // If Gemini wants to save test drive, do it
    if (geminiData.nextStep === FLOW_STEPS.BOOKING_COMPLETE && session.td_name && session.td_phone) {
      console.log('💾 Gemini wants to save test drive booking');
      await this.saveTestDriveBooking(session);
    }

    console.log('✅ Generated final response:', JSON.stringify(response, null, 2));
    return response;
  }

  async saveTestDriveBooking(session) {
    try {
      let testDriveDateTime = new Date();
      if (session.testDriveActualDate) {
        testDriveDateTime = session.testDriveActualDate;
        if (session.testDriveTime) {
          if (session.testDriveTime.includes("Morning")) {
            testDriveDateTime.setHours(10, 0, 0, 0);
          } else if (session.testDriveTime.includes("Afternoon")) {
            testDriveDateTime.setHours(13, 0, 0, 0);
          } else if (session.testDriveTime.includes("Evening")) {
            testDriveDateTime.setHours(16, 0, 0, 0);
          }
        }
      }
      
      await this.pool.query(`
        INSERT INTO test_drives 
        (user_id, car, datetime, name, phone, has_dl, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
      `, [
        session.userId || 'unknown',
        session.selectedCar || 'Not selected',
        testDriveDateTime,
        session.td_name || 'Not provided',
        session.td_phone || 'Not provided',
        session.td_license === 'Yes'
      ]);
      
      console.log("✅ Test drive details saved to database");
    } catch (error) {
      logError(error, { scope: 'DynamicFlowManager.saveTestDriveBooking', sessionSnapshot: {
        selectedCar: session?.selectedCar, td_name: session?.td_name, td_phone: session?.td_phone
      }});
    }
  }

  async processFallbackResponse(session, userMessage, availableData) {
    console.log('🔄 Processing fallback response');
    
    const currentStep = session.step || FLOW_STEPS.BROWSE_START;
    const stepConfig = STEP_CONFIGURATIONS[currentStep];
    
    if (!stepConfig) {
      return {
        message: "I'm here to help! What would you like to do today?",
        options: ["🚗 Browse Used Cars", "💰 Get Car Valuation", "📞 Contact Our Team", "ℹ️ About Us"]
      };
    }

    // Use traditional validation and flow logic
    return await this.handleTraditionalFlow(session, userMessage, currentStep, availableData);
  }

  async handleTraditionalFlow(session, userMessage, currentStep, availableData) {
    switch (currentStep) {
      case FLOW_STEPS.BROWSE_BUDGET:
        return await this.handleBudgetStep(session, userMessage, availableData);
      
      case FLOW_STEPS.BROWSE_TYPE:
        return await this.handleTypeStep(session, userMessage, availableData);
      
      case FLOW_STEPS.BROWSE_BRAND:
        return await this.handleBrandStep(session, userMessage, availableData);
      
      case FLOW_STEPS.SHOW_CARS:
      case FLOW_STEPS.SHOW_MORE_CARS:
        return await this.handleShowCarsStep(session, userMessage, availableData);
      
      case FLOW_STEPS.CAR_SELECTED_OPTIONS:
        return await this.handleCarSelectedStep(session, userMessage);
      
      case FLOW_STEPS.TEST_DRIVE_DATE:
        return await this.handleTestDriveDateStep(session, userMessage);
      
      case FLOW_STEPS.TEST_DRIVE_TIME:
        return await this.handleTestDriveTimeStep(session, userMessage);
      
      case FLOW_STEPS.TD_NAME:
        return await this.handleNameStep(session, userMessage);
      
      case FLOW_STEPS.TD_PHONE:
        return await this.handlePhoneStep(session, userMessage);
      
      case FLOW_STEPS.TD_LICENSE:
        return await this.handleLicenseStep(session, userMessage);
      
      case FLOW_STEPS.TD_LOCATION_MODE:
        return await this.handleLocationModeStep(session, userMessage);
      
      case FLOW_STEPS.TD_HOME_ADDRESS:
        return await this.handleHomeAddressStep(session, userMessage);
      
      case FLOW_STEPS.TEST_DRIVE_CONFIRMATION:
        return await this.handleTestDriveConfirmationStep(session, userMessage);
      
      case FLOW_STEPS.BOOKING_COMPLETE:
        return await this.handleBookingCompleteStep(session, userMessage);
      
      default:
        return {
          message: "Welcome! How can I help you today?",
          options: ["🚗 Browse Used Cars", "💰 Get Car Valuation", "📞 Contact Our Team", "ℹ️ About Us"]
        };
    }
  }

  async handleBudgetStep(session, userMessage, availableData) {
    const budgetValidation = validateBudget(userMessage);
    
    if (!budgetValidation.isValid) {
      return {
        message: `Please select a valid budget range:`,
        options: availableData.budgetOptions
      };
    }
    
    session.budget = budgetValidation.matchedOption;
    session.step = FLOW_STEPS.BROWSE_TYPE;
    
    const types = await getAvailableTypes(this.pool, session.budget);
    return {
      message: `Perfect! ${budgetValidation.matchedOption} gives you excellent options. What type of car do you prefer?`,
      options: ['all Type', ...types]
    };
  }

  async handleTypeStep(session, userMessage, availableData) {
    const typeValidation = validateCarType(userMessage);
    
    if (!typeValidation.isValid) {
      const types = await getAvailableTypes(this.pool, session.budget);
      return {
        message: `Please select a valid car type:`,
        options: ['all Type', ...types]
      };
    }
    
    session.type = typeValidation.matchedOption === 'all Type' ? 'all' : typeValidation.matchedOption;
    session.step = FLOW_STEPS.BROWSE_BRAND;
    
    const brands = await getAvailableBrands(this.pool, session.budget, session.type);
    return {
      message: `Excellent choice! Which brand do you prefer?`,
      options: ['all Brand', ...brands]
    };
  }

  async handleBrandStep(session, userMessage, availableData) {
    const availableBrands = await getAvailableBrands(this.pool, session.budget, session.type);
    const brandValidation = validateBrand(userMessage, availableBrands);
    
    if (!brandValidation.isValid) {
      return {
        message: `Please select a valid brand:`,
        options: ['all Brand', ...availableBrands]
      };
    }
    
    session.brand = brandValidation.matchedOption === 'all Brand' ? 'all' : brandValidation.matchedOption;
    session.step = FLOW_STEPS.SHOW_CARS;
    
    const cars = await getCarsByFilter(this.pool, session.budget, session.type, session.brand);
    session.filteredCars = cars;
    session.carIndex = 0;
    
    if (cars.length === 0) {
      return {
        message: `Sorry, no cars found matching your criteria. Let's try different options.`,
        options: ["Change criteria"]
      };
    }
    
    return await this.generateCarDisplay(session, availableData);
  }

  async handleShowCarsStep(session, userMessage, availableData) {
    if (userMessage === "Browse More Cars") {
      session.carIndex += 3;
      const cars = session.filteredCars || [];
      
      if (session.carIndex >= cars.length) {
        return {
          message: "No more cars available. Would you like to change your criteria?",
          options: ["Change criteria"]
        };
      }
      
      return await this.generateCarDisplay(session, availableData);
    }
    
    if (userMessage === "Change criteria") {
      session.step = FLOW_STEPS.BROWSE_BUDGET;
      session.carIndex = 0;
      session.filteredCars = [];
      session.selectedCar = null;
      return {
        message: "No problem! Let's find you a different car. What's your budget range?",
        options: availableData.budgetOptions
      };
    }
    
    // Handle car selection
    if (userMessage.startsWith("book_")) {
      const cars = session.filteredCars || [];
      const selectedCar = cars.find(car => {
        const carId = `book_${car.brand}_${car.model}_${car.variant}`.replace(/\s+/g, '_');
        return carId === userMessage;
      });
      
      if (selectedCar) {
        session.selectedCar = `${selectedCar.brand} ${selectedCar.model} ${selectedCar.variant}`;
        session.step = FLOW_STEPS.CAR_SELECTED_OPTIONS;
        return {
          message: `Great choice! You've selected ${session.selectedCar}. What would you like to do next?`,
          options: ["Book Test Drive", "Change My Criteria"]
        };
      }
    }
    
    return await this.generateCarDisplay(session, availableData);
  }

  async handleCarSelectedStep(session, userMessage) {
    if (userMessage === "Book Test Drive") {
      session.step = FLOW_STEPS.TEST_DRIVE_DATE;
      return {
        message: `Excellent! Let's schedule your ${session.selectedCar} test drive. When would you prefer?`,
        options: ["Today", "Tomorrow", "Later this Week", "Next Week"]
      };
    }
    
    if (userMessage === "Change My Criteria") {
      session.step = FLOW_STEPS.BROWSE_BUDGET;
      session.carIndex = 0;
      session.filteredCars = [];
      session.selectedCar = null;
      return {
        message: "No problem! Let's find you a different car. What's your budget range?",
        options: ["Under ₹5 Lakhs", "₹5-10 Lakhs", "₹10-15 Lakhs", "₹15-20 Lakhs", "Above ₹20 Lakhs"]
      };
    }
    
    return {
      message: "Please select an option:",
      options: ["Book Test Drive", "Change My Criteria"]
    };
  }

  async handleTestDriveDateStep(session, userMessage) {
    session.testDriveDate = userMessage;
    
    if (["Today", "Tomorrow"].includes(userMessage)) {
      const actualDate = getActualDateFromSelection(userMessage);
      if (actualDate) {
        session.testDriveActualDate = actualDate;
        session.testDriveDateFormatted = actualDate.toLocaleDateString('en-IN', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });
      }
      
      session.step = FLOW_STEPS.TEST_DRIVE_TIME;
      return {
        message: "Perfect! Which time works better for you?",
        options: getTimeSlots()
      };
    } else {
      session.step = FLOW_STEPS.TEST_DRIVE_DAY;
      return {
        message: "Which day works best for you?",
        options: getNextAvailableDays(userMessage)
      };
    }
  }

  async handleTestDriveTimeStep(session, userMessage) {
    session.testDriveTime = userMessage;
    session.step = FLOW_STEPS.TD_NAME;
    return { 
      message: "Great! I need some details to confirm your booking:\n\n1. Your Name:" 
    };
  }

  async handleNameStep(session, userMessage) {
    session.td_name = userMessage;
    session.step = FLOW_STEPS.TD_PHONE;
    return { 
      message: "2. Your Phone Number:" 
    };
  }

  async handlePhoneStep(session, userMessage) {
    session.td_phone = userMessage;
    session.step = FLOW_STEPS.TD_LICENSE;
    return {
      message: "3. Do you have a valid driving license?",
      options: ["Yes", "No"]
    };
  }

  async handleLicenseStep(session, userMessage) {
    session.td_license = userMessage;
    session.step = FLOW_STEPS.TD_LOCATION_MODE;
    return {
      message: "Thank you! Where would you like to take the test drive?",
      options: ["Showroom pickup", "Home pickup"]
    };
  }

  async handleLocationModeStep(session, userMessage) {
    session.td_location_mode = userMessage;
    
    if (userMessage.includes("Home pickup")) {
      session.step = FLOW_STEPS.TD_HOME_ADDRESS;
      return { 
        message: "Please share your current address for the test drive:" 
      };
    } else {
      session.step = FLOW_STEPS.TEST_DRIVE_CONFIRMATION;
      return this.generateTestDriveConfirmation(session);
    }
  }

  async handleHomeAddressStep(session, userMessage) {
    session.td_home_address = userMessage;
    session.step = FLOW_STEPS.TEST_DRIVE_CONFIRMATION;
    return this.generateTestDriveConfirmation(session);
  }

  async handleTestDriveConfirmationStep(session, userMessage) {
    if (userMessage === "Confirm") {
      // Save test drive details to database
      try {
        let testDriveDateTime = new Date();
        if (session.testDriveActualDate) {
          testDriveDateTime = session.testDriveActualDate;
          if (session.testDriveTime) {
            if (session.testDriveTime.includes("Morning")) {
              testDriveDateTime.setHours(10, 0, 0, 0);
            } else if (session.testDriveTime.includes("Afternoon")) {
              testDriveDateTime.setHours(13, 0, 0, 0);
            } else if (session.testDriveTime.includes("Evening")) {
              testDriveDateTime.setHours(16, 0, 0, 0);
            }
          }
        }
        
        await this.pool.query(`
          INSERT INTO test_drives 
          (user_id, car, datetime, name, phone, has_dl, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, NOW())
        `, [
          session.userId || 'unknown',
          session.selectedCar || 'Not selected',
          testDriveDateTime,
          session.td_name || 'Not provided',
          session.td_phone || 'Not provided',
          session.td_license === 'Yes'
        ]);
        
        console.log("✅ Test drive details saved to database");
      } catch (error) {
        logError(error, { scope: 'DynamicFlowManager.handleTestDriveConfirmationStep.insert', sessionSnapshot: {
          selectedCar: session?.selectedCar, td_name: session?.td_name, td_phone: session?.td_phone
        }});
      }
      
      session.step = FLOW_STEPS.BOOKING_COMPLETE;
      return {
        message: "Thank you! Your test drive has been confirmed. We'll contact you shortly to finalize the details.",
        options: ["Explore More", "End Conversation"]
      };
    }
    
    if (userMessage === "Reject") {
      session.step = FLOW_STEPS.BROWSE_BUDGET;
      session.carIndex = 0;
      session.filteredCars = [];
      session.selectedCar = null;
      return {
        message: "No problem! Let's find you a different car. What's your budget range?",
        options: ["Under ₹5 Lakhs", "₹5-10 Lakhs", "₹10-15 Lakhs", "₹15-20 Lakhs", "Above ₹20 Lakhs"]
      };
    }
    
    return this.generateTestDriveConfirmation(session);
  }

  async handleBookingCompleteStep(session, userMessage) {
    if (userMessage === "Explore More") {
      session.step = FLOW_STEPS.BROWSE_BUDGET;
      session.carIndex = 0;
      session.filteredCars = [];
      session.selectedCar = null;
      return {
        message: "Welcome! Let's find your perfect car. What's your budget range?",
        options: ["Under ₹5 Lakhs", "₹5-10 Lakhs", "₹10-15 Lakhs", "₹15-20 Lakhs", "Above ₹20 Lakhs"]
      };
    }
    
    if (userMessage === "End Conversation") {
      session.conversationEnded = true;
      Object.keys(session).forEach(key => {
        delete session[key];
      });
      session.conversationEnded = true;
      return null;
    }
    
    return {
      message: "Please select an option:",
      options: ["Explore More", "End Conversation"]
    };
  }

  async generateCarDisplay(session, availableData) {
    const cars = session.filteredCars || [];
    
    if (cars.length === 0) {
      return {
        message: "No more cars to display.",
        options: ["Change criteria"]
      };
    }

    const startIndex = session.carIndex || 0;
    const endIndex = Math.min(startIndex + 3, cars.length);
    const carsToShow = cars.slice(startIndex, endIndex);

    const messages = [];
    
    for (let i = 0; i < carsToShow.length; i++) {
      const car = carsToShow[i];
      
      const caption = `🚗 ${car.brand} ${car.model} ${car.variant}\n` +
        `📅 Year: ${car.year}\n` +
        `⛽ Fuel: ${car.fuel_type}\n` +
        `💰 Price: ${this.formatRupees(car.price)}`;
      
      // Add car image and details
      messages.push({
        type: 'text',
        text: { body: caption }
      });

      // Add SELECT button
      const carId = `book_${car.brand}_${car.model}_${car.variant}`.replace(/\s+/g, '_');
      messages.push({
        type: 'interactive',
        interactive: {
          type: 'button',
          body: { text: 'SELECT' },
          action: {
            buttons: [{
              type: 'reply',
              reply: {
                id: carId,
                title: 'SELECT'
              }
            }]
          }
        }
      });
    }

    const hasMoreCars = endIndex < cars.length;
    let messageText = `Showing cars ${startIndex + 1}-${endIndex} of ${cars.length}:`;
    
    const response = {
      message: messageText,
      messages: messages
    };
    
    if (hasMoreCars) {
      response.options = ["Browse More Cars"];
    } else {
      response.message += "\n\nNo more cars available.";
      response.options = ["Change criteria"];
    }
    
    session.step = FLOW_STEPS.SHOW_MORE_CARS;
    return response;
  }

  generateTestDriveConfirmation(session) {
    let locationText;
    
    const locationMode = session.td_location_mode ? session.td_location_mode.toLowerCase() : '';
    
    if (locationMode === "home pickup") {
      locationText = `\n📍 Test Drive Location: ${session.td_home_address || 'To be confirmed'}`;
    } else if (locationMode === "showroom pickup") {
      locationText = "\n📍 Showroom Address: Sherpa Hyundai Showroom, 123 MG Road, Bangalore\n🅿️ Free parking available";
    } else {
      locationText = "\n📍 Test Drive Location: To be confirmed";
    }

    let dateDisplay = 'To be confirmed';
    if (session.testDriveDateFormatted) {
      dateDisplay = session.testDriveDateFormatted;
    } else if (session.testDriveDate === 'Today' || session.testDriveDate === 'Tomorrow') {
      dateDisplay = session.testDriveDate;
    } else if (session.testDriveDay) {
      dateDisplay = session.testDriveDay;
    }

    return {
      message: `Perfect! Here's your test drive confirmation:

📋 TEST DRIVE CONFIRMED:
👤 Name: ${session.td_name || 'Not provided'}
📱 Phone: ${session.td_phone || 'Not provided'}
🚗 Car: ${session.selectedCar || 'Not selected'}
📅 Date: ${dateDisplay}
⏰ Time: ${session.testDriveTime || 'Not selected'}
${locationText}

What to bring:
✅ Valid driving license
✅ Photo ID
📞 Need help? Call us: +91-9876543210

Quick reminder: We'll also have financing options ready if you like the car during your test drive!

Please confirm your booking:`,
      options: ["Confirm", "Reject"]
    };
  }

  formatRupees(amount) {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  }

  async handleDatabaseQuery(session, queryType, availableData) {
    try {
      switch (queryType) {
        case 'getCarsByFilter':
          if (session.budget && session.type && session.brand) {
            const cars = await getCarsByFilter(this.pool, session.budget, session.type, session.brand);
            session.filteredCars = cars;
            session.carIndex = 0;
            availableData.availableCars = cars;
          }
          break;
        
        case 'getAvailableTypes':
          if (session.budget) {
            const types = await getAvailableTypes(this.pool, session.budget);
            availableData.availableTypes = types;
          }
          break;
        
        case 'getAvailableBrands':
          if (session.budget && session.type) {
            const brands = await getAvailableBrands(this.pool, session.budget, session.type);
            availableData.availableBrands = brands;
          }
          break;
      }
    } catch (error) {
      logError(error, { scope: 'DynamicFlowManager.handleDatabaseQuery', queryType, sessionSnapshot: {
        budget: session?.budget, type: session?.type, brand: session?.brand
      }});
    }
  }
}

module.exports = new DynamicFlowManager();
