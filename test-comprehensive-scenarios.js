/**
 * Comprehensive Test Suite for WhatsApp Car Dealership Bot
 * Tests all 20 test cases from the specification
 */

const dynamicFlowManager = require('./utils/dynamicFlowManager');
const geminiFlowService = require('./utils/geminiFlowService');
const suggestionEngine = require('./utils/suggestionEngine');
const comparisonEngine = require('./utils/comparisonEngine');

// Enhanced mock database with more comprehensive data
const mockPool = {
  query: async (sql, params) => {
    console.log('🔍 Mock DB Query:', sql, params);
    
    // Get all available types
    if (sql.includes('SELECT DISTINCT type FROM cars')) {
      return { rows: [
        { type: 'SUV' }, { type: 'Sedan' }, { type: 'Hatchback' },
        { type: 'Coupe' }, { type: 'Convertible' }, { type: 'Wagon' },
        { type: 'Pickup' }, { type: 'MUV' }
      ]};
    }
    
    // Get all available brands
    if (sql.includes('SELECT DISTINCT brand FROM cars')) {
      return { rows: [
        { brand: 'Honda' }, { brand: 'Maruti' }, { brand: 'Hyundai' },
        { brand: 'Toyota' }, { brand: 'Tata' }, { brand: 'Kia' },
        { brand: 'Mahindra' }, { brand: 'Skoda' }, { brand: 'Renault' },
        { brand: 'Ford' }, { brand: 'Volkswagen' }, { brand: 'BMW' },
        { brand: 'Audi' }, { brand: 'Mercedes' }
      ]};
    }

    // Comprehensive car data for testing
    const mockCars = [
      // SUVs under 15 lakhs
      { id: 1, brand: 'Tata', model: 'Nexon', variant: 'XZ+', year: 2021, fuel_type: 'Petrol', price: 1200000, registration_number: 'KA01AB1234', type: 'SUV', transmission: 'Manual' },
      { id: 2, brand: 'Maruti', model: 'Vitara Brezza', variant: 'VDI', year: 2021, fuel_type: 'Diesel', price: 800000, registration_number: 'KA01CD5678', type: 'SUV', transmission: 'Manual' },
      { id: 3, brand: 'Kia', model: 'Sonet', variant: 'HTX', year: 2021, fuel_type: 'Diesel', price: 1100000, registration_number: 'KA01EF9012', type: 'SUV', transmission: 'Automatic' },
      { id: 4, brand: 'Hyundai', model: 'Creta', variant: 'SX', year: 2020, fuel_type: 'Petrol', price: 1100000, registration_number: 'KA01GH3456', type: 'SUV', transmission: 'Manual' },
      { id: 5, brand: 'Kia', model: 'Seltos', variant: 'HTX', year: 2021, fuel_type: 'Diesel', price: 1050000, registration_number: 'KA01IJ7890', type: 'SUV', transmission: 'Automatic' },
      
      // Maruti cars with automatic
      { id: 6, brand: 'Maruti', model: 'Swift', variant: 'VDI', year: 2021, fuel_type: 'Diesel', price: 750000, registration_number: 'KA01KL1234', type: 'Hatchback', transmission: 'Manual' },
      { id: 7, brand: 'Maruti', model: 'Baleno', variant: 'Delta', year: 2020, fuel_type: 'Petrol', price: 850000, registration_number: 'KA01MN5678', type: 'Hatchback', transmission: 'Automatic' },
      { id: 8, brand: 'Maruti', model: 'Ciaz', variant: 'Delta', year: 2020, fuel_type: 'Petrol', price: 950000, registration_number: 'KA01OP9012', type: 'Sedan', transmission: 'Automatic' },
      
      // Petrol hatchbacks with good mileage
      { id: 9, brand: 'Maruti', model: 'Swift', variant: 'VDI', year: 2021, fuel_type: 'Petrol', price: 750000, registration_number: 'KA01QR3456', type: 'Hatchback', transmission: 'Manual' },
      { id: 10, brand: 'Maruti', model: 'Baleno', variant: 'Delta', year: 2020, fuel_type: 'Petrol', price: 850000, registration_number: 'KA01ST7890', type: 'Hatchback', transmission: 'Manual' },
      
      // Honda cars
      { id: 11, brand: 'Honda', model: 'City', variant: 'VX', year: 2020, fuel_type: 'Petrol', price: 950000, registration_number: 'KA01UV1234', type: 'Sedan', transmission: 'Manual' },
      { id: 12, brand: 'Honda', model: 'Amaze', variant: 'VX', year: 2021, fuel_type: 'Petrol', price: 750000, registration_number: 'KA01WX5678', type: 'Sedan', transmission: 'Manual' },
      
      // Tata Nexon EV
      { id: 13, brand: 'Tata', model: 'Nexon EV', variant: 'XZ+', year: 2021, fuel_type: 'Electric', price: 1500000, registration_number: 'KA01YZ9012', type: 'SUV', transmission: 'Automatic' },
      
      // Hyundai Verna
      { id: 14, brand: 'Hyundai', model: 'Verna', variant: 'SX', year: 2020, fuel_type: 'Petrol', price: 900000, registration_number: 'KA01AB3456', type: 'Sedan', transmission: 'Manual' }
    ];

    // Handle various query patterns
    if (sql.includes('SELECT * FROM cars WHERE')) {
      let filteredCars = mockCars;
      
      // Apply filters based on query parameters
      if (params.includes('SUV')) {
        filteredCars = filteredCars.filter(car => car.type === 'SUV');
      }
      if (params.includes('Hatchback')) {
        filteredCars = filteredCars.filter(car => car.type === 'Hatchback');
      }
      if (params.includes('Sedan')) {
        filteredCars = filteredCars.filter(car => car.type === 'Sedan');
      }
      if (params.includes('Maruti')) {
        filteredCars = filteredCars.filter(car => car.brand === 'Maruti');
      }
      if (params.includes('Honda')) {
        filteredCars = filteredCars.filter(car => car.brand === 'Honda');
      }
      if (params.includes('Petrol')) {
        filteredCars = filteredCars.filter(car => car.fuel_type === 'Petrol');
      }
      if (params.includes('Diesel')) {
        filteredCars = filteredCars.filter(car => car.fuel_type === 'Diesel');
      }
      if (params.includes('Electric')) {
        filteredCars = filteredCars.filter(car => car.fuel_type === 'Electric');
      }
      if (params.includes('Automatic')) {
        filteredCars = filteredCars.filter(car => car.transmission === 'Automatic');
      }
      
      // Price range filtering
      if (params.length >= 2 && typeof params[0] === 'number' && typeof params[1] === 'number') {
        const minPrice = params[0];
        const maxPrice = params[1];
        filteredCars = filteredCars.filter(car => car.price >= minPrice && car.price <= maxPrice);
      }
      
      // Limit results
      const limit = sql.includes('LIMIT') ? parseInt(sql.match(/LIMIT (\d+)/)[1]) : 10;
      filteredCars = filteredCars.slice(0, limit);
      
      return { rows: filteredCars };
    }

    // Handle comparison queries
    if (sql.includes('LOWER(model) LIKE') || sql.includes('LOWER(brand) LIKE')) {
      const searchTerm = params[0].toLowerCase();
      const filteredCars = mockCars.filter(car => 
        car.brand.toLowerCase().includes(searchTerm) || 
        car.model.toLowerCase().includes(searchTerm) ||
        `${car.brand} ${car.model}`.toLowerCase().includes(searchTerm)
      );
      return { rows: filteredCars };
    }

    return { rows: [] };
  }
};

// Test cases from specification
const testCases = [
  {
    id: 'TC-001',
    category: 'Consent / Greeting',
    message: 'Hi, I want to buy a new car.',
    expectedIntent: 'browse_cars',
    description: 'Initial flow test'
  },
  {
    id: 'TC-002',
    category: 'Suggestion (Budget Filter)',
    message: 'Show me the best SUV under 15 lakhs.',
    expectedIntent: 'suggest_car',
    expectedData: { price_range: 'under 15 lakhs', type: 'SUV' },
    description: 'Tests budget parsing + suggestion'
  },
  {
    id: 'TC-003',
    category: 'Suggestion (Brand Filter)',
    message: 'I\'m interested in a Maruti car with automatic transmission.',
    expectedIntent: 'suggest_car',
    expectedData: { brand: 'Maruti', transmission: 'automatic' },
    description: 'Brand + transmission recognition'
  },
  {
    id: 'TC-004',
    category: 'Suggestion (Fuel Type)',
    message: 'Looking for a petrol hatchback with good mileage.',
    expectedIntent: 'suggest_car',
    expectedData: { fuel_type: 'petrol', type: 'Hatchback', feature_preferences: ['good mileage'] },
    description: 'NLP-based intent check'
  },
  {
    id: 'TC-005',
    category: 'Comparison',
    message: 'Compare Kia Seltos and Hyundai Creta.',
    expectedIntent: 'compare_cars',
    expectedData: { car_names: ['Kia Seltos', 'Hyundai Creta'] },
    description: 'Core comparison engine test'
  },
  {
    id: 'TC-006',
    category: 'Comparison (Variant Missing)',
    message: 'Compare Tata Nexon EV with Creta.',
    expectedIntent: 'compare_cars',
    expectedData: { car_names: ['Tata Nexon EV', 'Hyundai Creta'] },
    description: 'Mixed variant handling'
  },
  {
    id: 'TC-007',
    category: 'Car Details',
    message: 'Tell me about Hyundai Verna.',
    expectedIntent: 'car_details',
    expectedData: { car_names: ['Hyundai Verna'] },
    description: 'Detail retrieval test'
  },
  {
    id: 'TC-008',
    category: 'Image Upload (Car)',
    message: '[IMAGE: Car photo]',
    expectedIntent: 'image_check',
    expectedData: { uploaded_image_type: 'car' },
    description: 'Vision integration validation'
  },
  {
    id: 'TC-009',
    category: 'Image Upload (Non-car)',
    message: '[IMAGE: Tree photo]',
    expectedIntent: 'image_check',
    expectedData: { uploaded_image_type: 'non-car' },
    description: 'Image classification negative case'
  },
  {
    id: 'TC-010',
    category: 'Booking',
    message: 'I want to book a test drive for Kia Seltos.',
    expectedIntent: 'book_test_drive',
    expectedData: { car_names: ['Kia Seltos'] },
    description: 'Booking flow check'
  },
  {
    id: 'TC-011',
    category: 'Financing Info',
    message: 'Can you tell me EMI for Tata Nexon?',
    expectedIntent: 'financing_info',
    description: 'Finance-related conversational branch'
  },
  {
    id: 'TC-012',
    category: 'Service Request',
    message: 'I need to service my Baleno.',
    expectedIntent: 'service_request',
    description: 'Post-sale use case validation'
  },
  {
    id: 'TC-013',
    category: 'Multi-intent',
    message: 'Compare Seltos and Creta, and also tell me which gives better mileage.',
    expectedIntent: 'compare_cars',
    expectedData: { car_names: ['Kia Seltos', 'Hyundai Creta'], follow_up_question: 'mileage' },
    description: 'Intent disambiguation test'
  },
  {
    id: 'TC-014',
    category: 'Ambiguous Input',
    message: 'What\'s the best one?',
    expectedIntent: 'unknown',
    description: 'NLP fallback case'
  },
  {
    id: 'TC-015',
    category: 'Out-of-scope',
    message: 'Can you order car accessories?',
    expectedIntent: 'unknown',
    description: 'Graceful degradation'
  },
  {
    id: 'TC-016',
    category: 'Edge – Typo',
    message: 'Compre Kea Seltis and Hundai Cretaa.',
    expectedIntent: 'compare_cars',
    expectedData: { car_names: ['Kia Seltos', 'Hyundai Creta'] },
    description: 'Fuzzy matching resilience'
  },
  {
    id: 'TC-017',
    category: 'Follow-up',
    message: 'Show me the diesel versions.',
    expectedIntent: 'suggest_car',
    expectedData: { fuel_type: 'diesel' },
    description: 'Context retention validation'
  },
  {
    id: 'TC-018',
    category: 'Emotion / UX',
    message: 'I\'m confused between these two.',
    expectedIntent: 'compare_cars',
    description: 'Context memory + empathy test'
  },
  {
    id: 'TC-019',
    category: 'Multiple Filters',
    message: 'SUV under 25 lakhs, automatic, diesel.',
    expectedIntent: 'suggest_car',
    expectedData: { type: 'SUV', price_range: 'under 25 lakhs', transmission: 'automatic', fuel_type: 'diesel' },
    description: 'Composite entity extraction'
  },
  {
    id: 'TC-020',
    category: 'Edge – Empty Input',
    message: '...',
    expectedIntent: 'unknown',
    description: 'Input sanitation case'
  }
];

async function runComprehensiveTests() {
  console.log('🧪 Running Comprehensive Test Suite\n');
  console.log('=' * 80);
  
  // Set up mock database
  dynamicFlowManager.setPool(mockPool);
  suggestionEngine.setPool(mockPool);
  comparisonEngine.setPool(mockPool);
  
  let passedTests = 0;
  let totalTests = testCases.length;
  
  for (const testCase of testCases) {
    console.log(`\n📋 ${testCase.id}: ${testCase.category}`);
    console.log(`💬 Input: "${testCase.message}"`);
    console.log(`🎯 Expected: ${testCase.expectedIntent}`);
    console.log(`📝 Description: ${testCase.description}`);
    
    try {
      // Create a fresh session for each test
      const session = {
        step: 'browse_start',
        budget: null,
        type: null,
        brand: null,
        filteredCars: [],
        carIndex: 0,
        selectedCar: null,
        testDriveDate: null,
        testDriveTime: null,
        td_name: null,
        td_phone: null,
        td_license: null,
        td_location_mode: null,
        td_home_address: null,
        td_drop_location: null
      };
      
      // Process the message through dynamic flow manager
      const response = await dynamicFlowManager.processMessage(session, testCase.message);
      
      console.log(`✅ Response: ${response.message}`);
      console.log(`📊 Next Step: ${response.nextStep || 'N/A'}`);
      
      // Check if the response contains expected intent or behavior
      const responseText = response.message.toLowerCase();
      const hasExpectedIntent = checkExpectedIntent(testCase, responseText, response);
      
      if (hasExpectedIntent) {
        console.log(`✅ PASS: Intent correctly identified`);
        passedTests++;
      } else {
        console.log(`❌ FAIL: Intent not as expected`);
        console.log(`   Expected: ${testCase.expectedIntent}`);
        console.log(`   Got: ${response.extractedData?.intent || 'unknown'}`);
      }
      
    } catch (error) {
      console.log(`❌ ERROR: ${error.message}`);
    }
    
    console.log('─'.repeat(80));
  }
  
  console.log(`\n📊 Test Results: ${passedTests}/${totalTests} tests passed`);
  console.log(`🎯 Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All tests passed! System is working perfectly.');
  } else {
    console.log('⚠️ Some tests failed. Review the results above.');
  }
}

function checkExpectedIntent(testCase, responseText, response) {
  const expectedIntent = testCase.expectedIntent;
  const extractedData = response.extractedData || {};
  
  // Check for specific intent matches
  if (expectedIntent === 'browse_cars' && (extractedData.intent === 'browse' || responseText.includes('budget'))) {
    return true;
  }
  
  if (expectedIntent === 'suggest_car' && (extractedData.intent === 'suggestion' || responseText.includes('suggest') || responseText.includes('found'))) {
    return true;
  }
  
  if (expectedIntent === 'compare_cars' && (extractedData.intent === 'comparison' || responseText.includes('compare') || responseText.includes('vs'))) {
    return true;
  }
  
  if (expectedIntent === 'book_test_drive' && (extractedData.intent === 'test_drive' || responseText.includes('test drive'))) {
    return true;
  }
  
  if (expectedIntent === 'car_details' && (responseText.includes('details') || responseText.includes('specifications'))) {
    return true;
  }
  
  if (expectedIntent === 'financing_info' && (responseText.includes('emi') || responseText.includes('financing') || responseText.includes('loan'))) {
    return true;
  }
  
  if (expectedIntent === 'service_request' && (responseText.includes('service') || responseText.includes('maintenance'))) {
    return true;
  }
  
  if (expectedIntent === 'image_check' && (responseText.includes('image') || responseText.includes('photo'))) {
    return true;
  }
  
  if (expectedIntent === 'unknown' && (extractedData.intent === 'unknown' || responseText.includes('clarify') || responseText.includes('help'))) {
    return true;
  }
  
  // Check for specific data matches
  if (testCase.expectedData) {
    for (const [key, value] of Object.entries(testCase.expectedData)) {
      if (key === 'car_names' && Array.isArray(value)) {
        const hasCarNames = value.some(carName => 
          responseText.includes(carName.toLowerCase()) || 
          responseText.includes(carName.split(' ')[0].toLowerCase())
        );
        if (hasCarNames) return true;
      }
      
      if (key === 'brand' && responseText.includes(value.toLowerCase())) {
        return true;
      }
      
      if (key === 'fuel_type' && responseText.includes(value.toLowerCase())) {
        return true;
      }
      
      if (key === 'transmission' && responseText.includes(value.toLowerCase())) {
        return true;
      }
      
      if (key === 'type' && responseText.includes(value.toLowerCase())) {
        return true;
      }
    }
  }
  
  return false;
}

// Run tests if this file is executed directly
if (require.main === module) {
  runComprehensiveTests().catch(console.error);
}

module.exports = { runComprehensiveTests, testCases };
