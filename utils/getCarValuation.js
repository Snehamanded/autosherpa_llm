const { validateYear, validateFuelType, validateTransmission, validateCondition, validatePhoneNumber, validateName, createValidationErrorMessage } = require('./inputValidation');
const pool = require('../db');

async function getAllBrandsFromDB() {
  const res = await pool.query(`SELECT DISTINCT brand FROM car_brands_models WHERE brand IS NOT NULL ORDER BY brand`);
  return res.rows.map(r => String(r.brand).trim());
}

async function getModelsByBrandFromDB(brand) {
  if (!brand) return [];
  const res = await pool.query(
    `SELECT DISTINCT model FROM car_brands_models WHERE model IS NOT NULL AND brand ILIKE $1 ORDER BY model LIMIT 100`,
    [`%${brand}%`]
  );
  return res.rows.map(r => String(r.model).trim());
}

const YEAR_OPTIONS = [
  "2024", "2023", "2022", "2021", "2020", "Older than 2020"
];

const FUEL_OPTIONS = [
  "Petrol", "Diesel", "CNG", "Electric"
];

const KM_OPTIONS = [
  "Under 10,000 KM",
  "10,000 - 25,000 KM",
  "25,000 - 50,000 KM",
  "50,000 - 75,000 KM",
  "75,000 - 1,00,000",
  "Over 1,00,000 KM"
];

const OWNER_OPTIONS = [
  "1st Owner (Me)",
  "2nd Owner",
  "3rd Owner",
  "More than 3 owners"
];

const CONDITION_OPTIONS = [
  "Excellent (Like new)",
  "Good (Minor wear)",
  "Average (Normal)",
  "Fair (Needs work)"
];

async function handleCarValuationStep(session, userMessage, pool) {
  const state = session.step || 'start';
  console.log("🧠 Current step:", state);
  console.log("📝 User input:", userMessage);

  // Check for greeting keywords FIRST - before any step processing
  const lowerMsg = userMessage.toLowerCase();
  if (['hi', 'hello', 'hey', 'hy', 'start', 'begin', 'restart', 'menu', 'main'].includes(lowerMsg)) {
    // Clear any existing session state to start fresh
    session.step = 'main_menu';
    // session.carIndex = 0;
    // session.filteredCars = [];
    // session.selectedCar = null;
    // session.budget = null;
    // session.type = null;
    // session.brand = null;
    // session.testDriveDate = null;
    // session.testDriveTime = null;
    // session.td_name = null;
    // session.td_phone = null;
    // session.td_license = null;
    // session.td_location_mode = null;
    // session.td_home_address = null;
    // session.td_drop_location = null;
    
    console.log("🔁 Greeting detected in valuation flow - resetting to main menu and cleared all session data");
    return {
      message: "Hello! 👋 Welcome to Sherpa Hyundai. I'm here to help you find your perfect used car. How can I assist you today?",
      options: [
        "🚗 Browse Used Cars",
        "💰 Get Car Valuation", 
        "📞 Contact Our Team",
        "ℹ️ About Us"
      ]
    };
  }

  switch (state) {
    case 'start':
    case 'valuation_start':
      // Skip steps if prefilled
      if (!session.brand) {
        session.step = 'brand';
        return {
          message: "Great! I'll help you get a valuation for your car. Let's start with some basic details.\n\nFirst, which brand is your car?",
          options: [...await getAllBrandsFromDB(), "Other brands"]
        };
      }
      if (!session.model) {
        session.step = 'model';
        const models = await getModelsByBrandFromDB(session.brand);
        return {
          message: `Perfect! Which ${session.brand} model do you have?`,
          options: [...models, `Other ${session.brand} models`]
        };
      }
      if (!session.year) {
        session.step = 'year';
        return {
          message: `Excellent! What year is your ${session.model}?`,
          options: YEAR_OPTIONS
        };
      }
      if (!session.fuel) {
        session.step = 'fuel';
        return {
          message: `Great! What's the fuel type of your ${session.year} ${session.model}?`,
          options: FUEL_OPTIONS
        };
      }
      if (!session.kms) {
        session.step = 'kms';
        return {
          message: "Perfect! How many kilometers has your car been driven?",
          options: KM_OPTIONS
        };
      }
      if (!session.owner) {
        session.step = 'owner';
        return {
          message: "Almost done! How many owners has this car had?",
          options: OWNER_OPTIONS
        };
      }
      if (!session.condition) {
        session.step = 'condition';
        return {
          message: "Last question! How would you rate your car's overall condition?",
          options: CONDITION_OPTIONS
        };
      }
      // If details already provided, jump to name collection
      session.step = 'name';
      return { message: "Great! We'd love to purchase your car. Let me collect your details:\n\n1. Your Name:" };

    case 'brand':
      if (userMessage === 'Other brands') {
        session.step = 'other_brand_input';
        return { message: "Please type the brand name of your car." };
      } else {
        session.brand = userMessage;
        session.step = 'model';
        const models = await getModelsByBrandFromDB(userMessage);
        return {
          message: `Perfect! Which ${userMessage} model do you have?`,
          options: [...models, `Other ${userMessage} models`]
        };
      }

    case 'other_brand_input':
      session.brand = userMessage;
      session.step = 'other_model_input';
      return { message: `Perfect! Please write down which model car you have.` };

    case 'model':
      if (userMessage.toLowerCase().includes("other")) {
        session.step = 'other_model_input';
        return { message: `Perfect! Please write down which model car you have.` };
      } else {
        session.model = userMessage;
        session.step = 'year';
        return {
          message: `Excellent! What year is your ${session.model}?`,
          options: YEAR_OPTIONS
        };
      }

    case 'other_model_input':
      session.model = userMessage;
      session.step = 'year';
      return {
        message: `Excellent! What year is your ${session.model}?`,
        options: YEAR_OPTIONS
      };

    case 'year':
      console.log("📅 Validating year:", userMessage);
      
      const yearValidation = validateYear(userMessage);
      if (!yearValidation.isValid) {
        return {
          message: createValidationErrorMessage("year", yearValidation.suggestions, YEAR_OPTIONS),
          options: YEAR_OPTIONS
        };
      }
      
      console.log("✅ Valid year selected:", yearValidation.matchedOption);
      session.year = yearValidation.matchedOption;
      session.step = 'fuel';
      return {
        message: `Great! What's the fuel type of your ${session.year} ${session.model}?`,
        options: FUEL_OPTIONS
      };

    case 'fuel':
      console.log("⛽ Validating fuel type:", userMessage);
      
      const fuelValidation = validateFuelType(userMessage);
      if (!fuelValidation.isValid) {
        return {
          message: createValidationErrorMessage("fuel type", fuelValidation.suggestions, FUEL_OPTIONS),
          options: FUEL_OPTIONS
        };
      }
      
      console.log("✅ Valid fuel type selected:", fuelValidation.matchedOption);
      session.fuel = fuelValidation.matchedOption;
      session.step = 'kms';
      return {
        message: "Perfect! How many kilometers has your car been driven?",
        options: KM_OPTIONS
      };

    case 'kms':
      session.kms = userMessage;
      session.step = 'owner';
      return {
        message: "Almost done! How many owners has this car had?",
        options: OWNER_OPTIONS
      };

    case 'owner':
      session.owner = userMessage;
      session.step = 'condition';
      return {
        message: "Last question! How would you rate your car's overall condition?",
        options: CONDITION_OPTIONS
      };

    case 'condition':
      console.log("⭐ Validating condition:", userMessage);
      
      const conditionValidation = validateCondition(userMessage);
      if (!conditionValidation.isValid) {
        return {
          message: createValidationErrorMessage("car condition", conditionValidation.suggestions, CONDITION_OPTIONS),
          options: CONDITION_OPTIONS
        };
      }
      
      console.log("✅ Valid condition selected:", conditionValidation.matchedOption);
      session.condition = conditionValidation.matchedOption;
      session.step = 'name';
      return {
        message: "Great! We'd love to purchase your car. Let me collect your details:\n\n1. Your Name:"
      };

    case 'name':
      console.log("👤 Validating name:", userMessage);
      
      const nameValidation = validateName(userMessage);
      if (!nameValidation.isValid) {
        return {
          message: `Please enter a valid name (2-50 characters, letters only).\n\n1. Your Name:`
        };
      }
      
      console.log("✅ Valid name provided:", nameValidation.matchedOption);
      session.name = nameValidation.matchedOption;
      session.step = 'phone';
      return { message: "2. Your Phone Number:" };

    case 'phone':
      console.log("📱 Validating phone number:", userMessage);
      
      const phoneValidation = validatePhoneNumber(userMessage);
      if (!phoneValidation.isValid) {
        return {
          message: `Please enter a valid 10-digit Indian phone number.\n\n2. Your Phone Number:`
        };
      }
      
      console.log("✅ Valid phone number provided:", phoneValidation.matchedOption);
      session.phone = phoneValidation.matchedOption;
      session.step = 'location';
      return { message: "3. Your Current Location/City:" };

    case 'location':
      session.location = userMessage;
      // After collecting location, move to confirmation step
      session.step = 'confirmation';

      const confirmation = {
        name: session.name,
        phone: session.phone,
        location: session.location,
        car_summary: `${session.year} ${session.brand} ${session.model} ${session.fuel}`,
        kms: session.kms,
        owner: session.owner,
        condition: session.condition
      };

      // ✅ Save to database
      try {
        const dbPool = pool || require('../db');
        console.log('🔍 Database connection:', !!dbPool);
        
        // Log the exact query and params for debugging
        const q = `
            INSERT INTO car_valuations
            (name, phone, location, brand, model, year, fuel_type, mileage, owner, condition, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending')
            RETURNING id, status`;
        
        const params = [
            session.name,
            session.phone,
            session.location,
            session.brand,
            session.model,
            session.year,
            session.fuel,
            session.kms,
            session.owner,
            session.condition
        ];

        console.log('📝 SQL Query:', q);
        console.log('📝 Parameters:', params);
        
        const result = await dbPool.query(q, params);
        console.log('✅ Insert successful, returned data:', result.rows[0]);
        session.valuationId = result.rows[0].id;
      } catch (error) {
        console.error('❌ Database error details:', {
            name: error.name,
            message: error.message,
            stack: error.stack,
            code: error.code
        });
        throw error;
      }

      return {
        message:
`Perfect ${confirmation.name}! Here's what we have:
+
📋 SELLER CONFIRMATION:
👤 Name: ${confirmation.name}
📱 Phone: ${confirmation.phone}
🚗 Car: ${confirmation.car_summary}
📍 Location: ${confirmation.location}
+
If the details above are correct, please Confirm to proceed or Reject to cancel.`,
        options: ["Confirm", "Reject"]
      };

    case 'confirmation':
      if (!session.valuationId) {
        return { message: "No booking found to confirm. Say 'start' to begin again." };
      }
      
      if (userMessage === 'Confirm') {
        try {
          const dbPool = pool || require('../db');
          await dbPool.query(`
            UPDATE car_valuations 
            SET status = 'confirmed', 
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
          `, [session.valuationId]);
          
          console.log('✅ Valuation confirmed, id:', session.valuationId);
          
          // Move to final_options step and show next steps
          session.step = 'final_options';
          return {
            message: `Thank you for confirming! Here's what happens next:

📋 Next Steps:
1. Our executive will call you within 2 hours
2. We'll schedule a physical inspection
3. Final price quote after inspection
4. Instant payment if you accept our offer

📞 Questions? Call: +91-9876543210
Thank you for choosing Sherpa Hyundai! 😊`,
            options: ["Explore More", "End Conversation"]
          };
        } catch (err) {
          console.error('❌ Error updating confirmation status:', err);
          return { message: "An error occurred. Please try again." };
        }
      } else if (userMessage === 'Reject') {
        try {
          const dbPool = pool || require('../db');
          
          // Update car_valuations status
          await dbPool.query(`
            UPDATE car_valuations 
            SET status = 'rejected', 
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
          `, [session.valuationId]);
          
          console.log('ℹ️ Valuation rejected in car_valuations table, id:', session.valuationId);
          
          // Get the updated valuation record for rejection details
          const valuationResult = await dbPool.query(`
            SELECT * FROM car_valuations WHERE id = $1
          `, [session.valuationId]);
          
          const valuation = valuationResult.rows[0];
          
          // Save rejection to bot_confirmations table
          const rejectionResult = await dbPool.query(`
            INSERT INTO bot_confirmations (car_id, whatsapp_number, customer_name, confirmation_type, message_content)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id
          `, [
            null, // car_id is null for valuations
            valuation.phone,
            valuation.name,
            'valuation_rejected',
            `Car Valuation Request Rejected: ${valuation.year} ${valuation.brand} ${valuation.model} - ${valuation.name} (${valuation.phone}) - Status: ${valuation.status}`
          ]);
          
          console.log('ℹ️ Rejection saved to bot_confirmations, id:', rejectionResult.rows[0].id);
          console.log('📊 Rejection details:', {
            id: valuation.id,
            name: valuation.name,
            phone: valuation.phone,
            car: `${valuation.year} ${valuation.brand} ${valuation.model}`,
            status: valuation.status
          });
        } catch (err) {
          console.error('❌ Error updating rejection status:', err);
        }
        session.conversationEnded = true;
        return { message: "ℹ️ You have rejected the confirmation. If you change your mind, say 'start' to begin again." };
      } else {
        // If invalid input, show confirmation options again
        return {
          message: "Please select Confirm to proceed or Reject to cancel.",
          options: ["Confirm", "Reject"]
        };
      }

    case 'done':
      if (userMessage === "Explore") {
        // Reset session and go back to main menu
        session.step = 'main_menu';
        return {
          message: "Great! Let's explore more options. What would you like to do?",
          options: [
            "🚗 Browse Used Cars",
            "💰 Get Car Valuation", 
            "📞 Contact Our Team",
            "ℹ️ About Us"
          ]
        };
      } else if (userMessage === "End Conversation") {
        // End conversation with thank you note
        session.step = 'conversation_ended';
        return {
          message: `Thank you for choosing Sherpa Hyundai! 🙏

We appreciate your time and look forward to serving you.

📞 For any queries: +91-9876543210
📍 Visit us: 123 MG Road, Bangalore
🌐 Website: www.sherpahyundai.com

Have a great day! 😊`
        };
      }
      return { message: "Something went wrong. Please try again." };

    // Add new case for final options
    case 'final_options':
      if (userMessage === "Explore More") {
        session.step = 'main_menu';
        return {
          message: "What would you like to explore?",
          options: [
            "🚗 Browse Used Cars",
            "💰 Get Car Valuation", 
            "📞 Contact Our Team",
            "ℹ️ About Us"
          ]
        };
      } else if (userMessage === "End Conversation") {
        session.conversationEnded = true;
        return {
          message: `Thank you for choosing Sherpa Hyundai! 🙏

We appreciate your time and look forward to serving you.

📞 For any queries: +91-9876543210
📍 Visit us: 123 MG Road, Bangalore
🌐 Website: www.sherpahyundai.com

Have a great day! 😊`
        };
      }
      // If invalid option, show options again
      return {
        message: "Please select an option:",
        options: ["Explore More", "End Conversation"]
      };

    default:
      return { message: "Something went wrong. Please try again." };
  }
}

module.exports = { handleCarValuationStep };
