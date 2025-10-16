// Dynamic Flow Configuration for WhatsApp Car Dealership Bot
// This file defines the flow structure, validation rules, and step transitions

const FLOW_STEPS = {
  // Main menu and entry points
  MAIN_MENU: 'main_menu',
  BROWSE_START: 'browse_start',
  
  // Browsing flow
  BROWSE_BUDGET: 'browse_budget',
  BROWSE_TYPE: 'browse_type', 
  BROWSE_BRAND: 'browse_brand',
  SHOW_CARS: 'show_cars',
  SHOW_MORE_CARS: 'show_more_cars',
  CAR_SELECTED_OPTIONS: 'car_selected_options',
  
  // Test drive flow
  TEST_DRIVE_DATE: 'test_drive_date',
  TEST_DRIVE_DAY: 'test_drive_day',
  TEST_DRIVE_TIME: 'test_drive_time',
  TD_NAME: 'td_name',
  TD_PHONE: 'td_phone',
  TD_LICENSE: 'td_license',
  TD_LOCATION_MODE: 'td_location_mode',
  TD_HOME_ADDRESS: 'td_home_address',
  TD_DROP_LOCATION: 'td_drop_location',
  TEST_DRIVE_CONFIRMATION: 'test_drive_confirmation',
  BOOKING_COMPLETE: 'booking_complete',
  
  // Other flows
  VALUATION: 'valuation',
  CONTACT: 'contact',
  ABOUT: 'about',
  CHANGE_CRITERIA_CONFIRM: 'change_criteria_confirm'
};

const STEP_CONFIGURATIONS = {
  [FLOW_STEPS.MAIN_MENU]: {
    name: 'Main Menu',
    description: 'Initial greeting and main options',
    requiredFields: [],
    optionalFields: [],
    nextSteps: [FLOW_STEPS.BROWSE_START, FLOW_STEPS.VALUATION, FLOW_STEPS.CONTACT, FLOW_STEPS.ABOUT],
    validationRules: {
      greeting: ['hi', 'hello', 'hey', 'start', 'begin', 'restart', 'menu', 'main']
    },
    responseTemplate: {
      message: "Hello! 👋 Welcome to Sherpa Hyundai. How can I assist you today?",
      options: ["🚗 Browse Used Cars", "💰 Get Car Valuation", "📞 Contact Our Team", "ℹ️ About Us"]
    }
  },

  [FLOW_STEPS.BROWSE_START]: {
    name: 'Browse Start',
    description: 'Initialize car browsing process',
    requiredFields: [],
    optionalFields: ['budget', 'type', 'brand'],
    nextSteps: [FLOW_STEPS.BROWSE_BUDGET, FLOW_STEPS.BROWSE_TYPE, FLOW_STEPS.BROWSE_BRAND, FLOW_STEPS.SHOW_CARS],
    validationRules: {
      intent: ['browse', 'buy', 'look', 'see', 'show', 'find', 'car']
    },
    responseTemplate: {
      message: "Great! We'll help you find cars. Let's start with your preferences.",
      options: []
    }
  },

  [FLOW_STEPS.BROWSE_BUDGET]: {
    name: 'Budget Selection',
    description: 'User selects their budget range',
    requiredFields: ['budget'],
    optionalFields: ['type', 'brand'],
    nextSteps: [FLOW_STEPS.BROWSE_TYPE, FLOW_STEPS.BROWSE_BRAND, FLOW_STEPS.SHOW_CARS],
    validationRules: {
      budget: ['Under ₹5 Lakhs', '₹5-10 Lakhs', '₹10-15 Lakhs', '₹15-20 Lakhs', 'Above ₹20 Lakhs'],
      budgetPatterns: [
        /under\s*(\d+(?:\.\d+)?)\s*lakh/i,
        /(\d+(?:\.\d+)?)\s*[-to]+\s*(\d+(?:\.\d+)?)\s*lakh/i,
        /above\s*(\d+(?:\.\d+)?)\s*lakh/i
      ]
    },
    responseTemplate: {
      message: "What's your budget range?",
      options: ["Under ₹5 Lakhs", "₹5-10 Lakhs", "₹10-15 Lakhs", "₹15-20 Lakhs", "Above ₹20 Lakhs"]
    }
  },

  [FLOW_STEPS.BROWSE_TYPE]: {
    name: 'Car Type Selection',
    description: 'User selects preferred car type',
    requiredFields: ['type'],
    optionalFields: ['brand'],
    nextSteps: [FLOW_STEPS.BROWSE_BRAND, FLOW_STEPS.SHOW_CARS],
    validationRules: {
      type: ['SUV', 'Sedan', 'Hatchback', 'Coupe', 'Convertible', 'Wagon', 'Pickup', 'MUV', 'all Type'],
      typePatterns: ['suv', 'sedan', 'hatchback', 'coupe', 'convertible', 'wagon', 'pickup', 'muv']
    },
    responseTemplate: {
      message: "What type of car do you prefer?",
      options: []
    }
  },

  [FLOW_STEPS.BROWSE_BRAND]: {
    name: 'Brand Selection',
    description: 'User selects preferred brand',
    requiredFields: ['brand'],
    optionalFields: [],
    nextSteps: [FLOW_STEPS.SHOW_CARS],
    validationRules: {
      brand: ['Maruti', 'Hyundai', 'Honda', 'Toyota', 'Tata', 'Kia', 'Mahindra', 'Skoda', 'Renault', 'Ford', 'Volkswagen', 'BMW', 'Audi', 'Mercedes', 'all Brand'],
      brandPatterns: ['maruti', 'hyundai', 'honda', 'toyota', 'tata', 'kia', 'mahindra', 'skoda', 'renault', 'ford', 'volkswagen', 'bmw', 'audi', 'mercedes']
    },
    responseTemplate: {
      message: "Which brand do you prefer?",
      options: []
    }
  },

  [FLOW_STEPS.SHOW_CARS]: {
    name: 'Show Cars',
    description: 'Display filtered car results',
    requiredFields: [],
    optionalFields: ['budget', 'type', 'brand'],
    nextSteps: [FLOW_STEPS.SHOW_MORE_CARS, FLOW_STEPS.CAR_SELECTED_OPTIONS, FLOW_STEPS.BROWSE_BUDGET],
    validationRules: {},
    responseTemplate: {
      message: "Here are the cars matching your criteria:",
      options: []
    }
  },

  [FLOW_STEPS.CAR_SELECTED_OPTIONS]: {
    name: 'Car Selected Options',
    description: 'User has selected a car, show options',
    requiredFields: ['selectedCar'],
    optionalFields: [],
    nextSteps: [FLOW_STEPS.TEST_DRIVE_DATE, FLOW_STEPS.BROWSE_BUDGET],
    validationRules: {},
    responseTemplate: {
      message: "Great choice! What would you like to do next?",
      options: ["Book Test Drive", "Change My Criteria"]
    }
  },

  [FLOW_STEPS.TEST_DRIVE_DATE]: {
    name: 'Test Drive Date',
    description: 'User selects test drive date',
    requiredFields: ['testDriveDate'],
    optionalFields: [],
    nextSteps: [FLOW_STEPS.TEST_DRIVE_DAY, FLOW_STEPS.TEST_DRIVE_TIME],
    validationRules: {
      date: ['Today', 'Tomorrow', 'Later this Week', 'Next Week']
    },
    responseTemplate: {
      message: "When would you like to schedule your test drive?",
      options: ["Today", "Tomorrow", "Later this Week", "Next Week"]
    }
  },

  [FLOW_STEPS.TEST_DRIVE_TIME]: {
    name: 'Test Drive Time',
    description: 'User selects test drive time slot',
    requiredFields: ['testDriveTime'],
    optionalFields: [],
    nextSteps: [FLOW_STEPS.TD_NAME],
    validationRules: {
      time: ['Morning (10:00 AM)', 'Afternoon (1:00 PM)', 'Evening (4:00 PM)']
    },
    responseTemplate: {
      message: "What time works best for you?",
      options: ["Morning (10:00 AM)", "Afternoon (1:00 PM)", "Evening (4:00 PM)"]
    }
  },

  [FLOW_STEPS.TD_NAME]: {
    name: 'Customer Name',
    description: 'Collect customer name',
    requiredFields: ['td_name'],
    optionalFields: [],
    nextSteps: [FLOW_STEPS.TD_PHONE],
    validationRules: {
      name: /^[a-zA-Z\s]{2,50}$/
    },
    responseTemplate: {
      message: "Great! I need some details to confirm your booking:\n\n1. Your Name:",
      options: []
    }
  },

  [FLOW_STEPS.TD_PHONE]: {
    name: 'Customer Phone',
    description: 'Collect customer phone number',
    requiredFields: ['td_phone'],
    optionalFields: [],
    nextSteps: [FLOW_STEPS.TD_LICENSE],
    validationRules: {
      phone: /^[6-9]\d{9}$/
    },
    responseTemplate: {
      message: "2. Your Phone Number:",
      options: []
    }
  },

  [FLOW_STEPS.TD_LICENSE]: {
    name: 'Driving License',
    description: 'Verify driving license',
    requiredFields: ['td_license'],
    optionalFields: [],
    nextSteps: [FLOW_STEPS.TD_LOCATION_MODE],
    validationRules: {
      license: ['Yes', 'No']
    },
    responseTemplate: {
      message: "3. Do you have a valid driving license?",
      options: ["Yes", "No"]
    }
  },

  [FLOW_STEPS.TD_LOCATION_MODE]: {
    name: 'Location Mode',
    description: 'Select test drive location preference',
    requiredFields: ['td_location_mode'],
    optionalFields: [],
    nextSteps: [FLOW_STEPS.TD_HOME_ADDRESS, FLOW_STEPS.TEST_DRIVE_CONFIRMATION],
    validationRules: {
      location: ['Showroom pickup', 'Home pickup']
    },
    responseTemplate: {
      message: "Where would you like to take the test drive?",
      options: ["Showroom pickup", "Home pickup"]
    }
  },

  [FLOW_STEPS.TD_HOME_ADDRESS]: {
    name: 'Home Address',
    description: 'Collect home address for pickup',
    requiredFields: ['td_home_address'],
    optionalFields: [],
    nextSteps: [FLOW_STEPS.TEST_DRIVE_CONFIRMATION],
    validationRules: {
      address: /^.{10,200}$/
    },
    responseTemplate: {
      message: "Please share your current address for the test drive:",
      options: []
    }
  },

  [FLOW_STEPS.TEST_DRIVE_CONFIRMATION]: {
    name: 'Test Drive Confirmation',
    description: 'Final confirmation of test drive booking',
    requiredFields: [],
    optionalFields: [],
    nextSteps: [FLOW_STEPS.BOOKING_COMPLETE, FLOW_STEPS.BROWSE_BUDGET],
    validationRules: {
      confirmation: ['Confirm', 'Reject']
    },
    responseTemplate: {
      message: "Please confirm your booking:",
      options: ["Confirm", "Reject"]
    }
  },

  [FLOW_STEPS.BOOKING_COMPLETE]: {
    name: 'Booking Complete',
    description: 'Test drive booking completed',
    requiredFields: [],
    optionalFields: [],
    nextSteps: [FLOW_STEPS.BROWSE_START, FLOW_STEPS.MAIN_MENU],
    validationRules: {},
    responseTemplate: {
      message: "Thank you! Your test drive has been confirmed.",
      options: ["Explore More", "End Conversation"]
    }
  }
};

const FLOW_TRANSITIONS = {
  // Main menu transitions
  [FLOW_STEPS.MAIN_MENU]: {
    '🚗 Browse Used Cars': FLOW_STEPS.BROWSE_START,
    '💰 Get Car Valuation': FLOW_STEPS.VALUATION,
    '📞 Contact Our Team': FLOW_STEPS.CONTACT,
    'ℹ️ About Us': FLOW_STEPS.ABOUT
  },

  // Browse flow transitions
  [FLOW_STEPS.BROWSE_START]: {
    'budget_provided': FLOW_STEPS.BROWSE_TYPE,
    'type_provided': FLOW_STEPS.BROWSE_BRAND,
    'brand_provided': FLOW_STEPS.SHOW_CARS,
    'all_provided': FLOW_STEPS.SHOW_CARS
  },

  [FLOW_STEPS.BROWSE_BUDGET]: {
    'valid_budget': FLOW_STEPS.BROWSE_TYPE,
    'type_also_provided': FLOW_STEPS.BROWSE_BRAND,
    'brand_also_provided': FLOW_STEPS.SHOW_CARS
  },

  [FLOW_STEPS.BROWSE_TYPE]: {
    'valid_type': FLOW_STEPS.BROWSE_BRAND,
    'brand_also_provided': FLOW_STEPS.SHOW_CARS
  },

  [FLOW_STEPS.BROWSE_BRAND]: {
    'valid_brand': FLOW_STEPS.SHOW_CARS
  },

  [FLOW_STEPS.SHOW_CARS]: {
    'car_selected': FLOW_STEPS.CAR_SELECTED_OPTIONS,
    'browse_more': FLOW_STEPS.SHOW_MORE_CARS,
    'change_criteria': FLOW_STEPS.BROWSE_BUDGET
  },

  [FLOW_STEPS.CAR_SELECTED_OPTIONS]: {
    'Book Test Drive': FLOW_STEPS.TEST_DRIVE_DATE,
    'Change My Criteria': FLOW_STEPS.BROWSE_BUDGET
  },

  // Test drive flow transitions
  [FLOW_STEPS.TEST_DRIVE_DATE]: {
    'Today': FLOW_STEPS.TEST_DRIVE_TIME,
    'Tomorrow': FLOW_STEPS.TEST_DRIVE_TIME,
    'Later this Week': FLOW_STEPS.TEST_DRIVE_DAY,
    'Next Week': FLOW_STEPS.TEST_DRIVE_DAY
  },

  [FLOW_STEPS.TEST_DRIVE_DAY]: {
    'day_selected': FLOW_STEPS.TEST_DRIVE_TIME
  },

  [FLOW_STEPS.TEST_DRIVE_TIME]: {
    'time_selected': FLOW_STEPS.TD_NAME
  },

  [FLOW_STEPS.TD_NAME]: {
    'name_provided': FLOW_STEPS.TD_PHONE
  },

  [FLOW_STEPS.TD_PHONE]: {
    'phone_provided': FLOW_STEPS.TD_LICENSE
  },

  [FLOW_STEPS.TD_LICENSE]: {
    'license_yes': FLOW_STEPS.TD_LOCATION_MODE,
    'license_no': FLOW_STEPS.TD_LOCATION_MODE
  },

  [FLOW_STEPS.TD_LOCATION_MODE]: {
    'Showroom pickup': FLOW_STEPS.TEST_DRIVE_CONFIRMATION,
    'Home pickup': FLOW_STEPS.TD_HOME_ADDRESS
  },

  [FLOW_STEPS.TD_HOME_ADDRESS]: {
    'address_provided': FLOW_STEPS.TEST_DRIVE_CONFIRMATION
  },

  [FLOW_STEPS.TEST_DRIVE_CONFIRMATION]: {
    'Confirm': FLOW_STEPS.BOOKING_COMPLETE,
    'Reject': FLOW_STEPS.BROWSE_BUDGET
  },

  [FLOW_STEPS.BOOKING_COMPLETE]: {
    'Explore More': FLOW_STEPS.BROWSE_START,
    'End Conversation': FLOW_STEPS.MAIN_MENU
  }
};

const VALIDATION_RULES = {
  budget: {
    patterns: [
      /under\s*(\d+(?:\.\d+)?)\s*lakh/i,
      /(\d+(?:\.\d+)?)\s*[-to]+\s*(\d+(?:\.\d+)?)\s*lakh/i,
      /above\s*(\d+(?:\.\d+)?)\s*lakh/i,
      /(\d+(?:\.\d+)?)\s*lakh/i
    ],
    options: ['Under ₹5 Lakhs', '₹5-10 Lakhs', '₹10-15 Lakhs', '₹15-20 Lakhs', 'Above ₹20 Lakhs']
  },
  
  type: {
    patterns: ['suv', 'sedan', 'hatchback', 'coupe', 'convertible', 'wagon', 'pickup', 'muv'],
    options: ['SUV', 'Sedan', 'Hatchback', 'Coupe', 'Convertible', 'Wagon', 'Pickup', 'MUV', 'all Type']
  },
  
  brand: {
    patterns: ['maruti', 'hyundai', 'honda', 'toyota', 'tata', 'kia', 'mahindra', 'skoda', 'renault', 'ford', 'volkswagen', 'bmw', 'audi', 'mercedes'],
    options: ['Maruti', 'Hyundai', 'Honda', 'Toyota', 'Tata', 'Kia', 'Mahindra', 'Skoda', 'Renault', 'Ford', 'Volkswagen', 'BMW', 'Audi', 'Mercedes', 'all Brand']
  },
  
  phone: {
    pattern: /^[6-9]\d{9}$/,
    description: '10-digit Indian mobile number starting with 6-9'
  },
  
  name: {
    pattern: /^[a-zA-Z\s]{2,50}$/,
    description: '2-50 characters, letters and spaces only'
  },
  
  address: {
    pattern: /^.{10,200}$/,
    description: '10-200 characters'
  }
};

module.exports = {
  FLOW_STEPS,
  STEP_CONFIGURATIONS,
  FLOW_TRANSITIONS,
  VALIDATION_RULES
};
