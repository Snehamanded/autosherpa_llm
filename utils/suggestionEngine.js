const { getCarsByFilter, getAvailableTypes, getAvailableBrands } = require('./carData');

class SuggestionEngine {
  constructor() {
    this.pool = null;
    this.suggestionPatterns = this.initializeSuggestionPatterns();
  }

  setPool(pool) {
    this.pool = pool;
  }

  initializeSuggestionPatterns() {
    return {
      // Budget-based suggestions
      budget: {
        'under 5 lakhs': { min: 0, max: 500000, label: 'Under ₹5 Lakhs' },
        'under 5 lakh': { min: 0, max: 500000, label: 'Under ₹5 Lakhs' },
        '5 to 10 lakhs': { min: 500000, max: 1000000, label: '₹5-10 Lakhs' },
        '5-10 lakhs': { min: 500000, max: 1000000, label: '₹5-10 Lakhs' },
        '10 to 15 lakhs': { min: 1000000, max: 1500000, label: '₹10-15 Lakhs' },
        '10-15 lakhs': { min: 1000000, max: 1500000, label: '₹10-15 Lakhs' },
        '15 to 20 lakhs': { min: 1500000, max: 2000000, label: '₹15-20 Lakhs' },
        '15-20 lakhs': { min: 1500000, max: 2000000, label: '₹15-20 Lakhs' },
        'above 20 lakhs': { min: 2000000, max: 999999999, label: 'Above ₹20 Lakhs' },
        'above 20 lakh': { min: 2000000, max: 999999999, label: 'Above ₹20 Lakhs' },
        'budget': { min: 0, max: 999999999, label: 'Any Budget' }
      },

      // Car type suggestions
      type: {
        'suv': 'SUV',
        'suvs': 'SUV',
        'sedan': 'Sedan',
        'sedans': 'Sedan',
        'hatchback': 'Hatchback',
        'hatchbacks': 'Hatchback',
        'coupe': 'Coupe',
        'coupes': 'Coupe',
        'convertible': 'Convertible',
        'convertibles': 'Convertible',
        'wagon': 'Wagon',
        'wagons': 'Wagon',
        'pickup': 'Pickup',
        'pickups': 'Pickup',
        'muv': 'MUV',
        'muvs': 'MUV',
        'family car': 'SUV',
        'family cars': 'SUV',
        'sports car': 'Coupe',
        'sports cars': 'Coupe',
        'luxury car': 'Sedan',
        'luxury cars': 'Sedan'
      },

      // Brand suggestions
      brand: {
        'honda': 'Honda',
        'maruti': 'Maruti',
        'hyundai': 'Hyundai',
        'toyota': 'Toyota',
        'tata': 'Tata',
        'kia': 'Kia',
        'mahindra': 'Mahindra',
        'skoda': 'Skoda',
        'renault': 'Renault',
        'ford': 'Ford',
        'volkswagen': 'Volkswagen',
        'vw': 'Volkswagen',
        'bmw': 'BMW',
        'audi': 'Audi',
        'mercedes': 'Mercedes',
        'mercedes-benz': 'Mercedes',
        'japanese': ['Honda', 'Toyota', 'Maruti', 'Nissan', 'Mitsubishi'],
        'german': ['BMW', 'Audi', 'Mercedes', 'Volkswagen'],
        'korean': ['Hyundai', 'Kia'],
        'indian': ['Tata', 'Mahindra'],
        'european': ['BMW', 'Audi', 'Mercedes', 'Volkswagen', 'Skoda', 'Renault']
      },

      // Feature-based suggestions
      features: {
        'automatic': 'automatic_transmission',
        'manual': 'manual_transmission',
        'diesel': 'Diesel',
        'petrol': 'Petrol',
        'cng': 'CNG',
        'electric': 'Electric',
        'hybrid': 'Hybrid',
        'sunroof': 'sunroof',
        'leather': 'leather_seats',
        'navigation': 'navigation',
        'bluetooth': 'bluetooth',
        'camera': 'camera',
        'safety': 'safety_features',
        'airbag': 'airbags',
        'abs': 'abs',
        'cruise control': 'cruise_control',
        'parking sensor': 'parking_sensor',
        'rear camera': 'rear_camera'
      },

      // Usage-based suggestions
      usage: {
        'family': { type: 'SUV', features: ['safety', 'space', 'comfort'] },
        'city': { type: 'Hatchback', features: ['fuel_efficient', 'compact'] },
        'highway': { type: 'Sedan', features: ['comfort', 'stability'] },
        'off road': { type: 'SUV', features: ['4wd', 'ground_clearance'] },
        'business': { type: 'Sedan', features: ['luxury', 'comfort'] },
        'first car': { type: 'Hatchback', features: ['affordable', 'easy_driving'] },
        'luxury': { type: 'Sedan', features: ['luxury', 'premium'] },
        'sporty': { type: 'Coupe', features: ['performance', 'style'] },
        'economical': { type: 'Hatchback', features: ['fuel_efficient', 'affordable'] }
      },

      // Age-based suggestions
      age: {
        'new': { minYear: 2020, label: 'New (2020+)' },
        'recent': { minYear: 2018, label: 'Recent (2018+)' },
        'old': { maxYear: 2015, label: 'Older (2015 and below)' },
        'vintage': { maxYear: 2010, label: 'Vintage (2010 and below)' }
      }
    };
  }

  async analyzeSuggestionRequest(userMessage, session) {
    console.log('🔍 Analyzing suggestion request:', userMessage);
    
    const suggestion = {
      type: 'suggestion',
      parameters: {},
      confidence: 0,
      suggestions: [],
      message: '',
      requiresDatabaseQuery: true
    };

    // Extract parameters from user message
    const extractedParams = this.extractParameters(userMessage);
    console.log('📊 Extracted parameters:', extractedParams);

    // Build suggestion query based on extracted parameters
    const queryParams = this.buildQueryParameters(extractedParams, session);
    console.log('🔍 Query parameters:', queryParams);

    // Get suggestions from database
    if (this.pool && Object.keys(queryParams).length > 0) {
      suggestion.suggestions = await this.getSuggestionsFromDatabase(queryParams);
      suggestion.confidence = this.calculateConfidence(extractedParams, suggestion.suggestions.length);
    }

    // Generate response message
    suggestion.message = this.generateSuggestionMessage(extractedParams, suggestion.suggestions);
    suggestion.parameters = extractedParams;

    console.log('✅ Suggestion analysis complete:', suggestion);
    return suggestion;
  }

  extractParameters(userMessage) {
    const lowerMessage = userMessage.toLowerCase();
    const parameters = {};

    // Extract budget
    for (const [pattern, config] of Object.entries(this.suggestionPatterns.budget)) {
      if (lowerMessage.includes(pattern)) {
        parameters.budget = config;
        break;
      }
    }

    // Extract car type
    for (const [pattern, type] of Object.entries(this.suggestionPatterns.type)) {
      if (lowerMessage.includes(pattern)) {
        parameters.type = type;
        break;
      }
    }

    // Extract brand
    for (const [pattern, brand] of Object.entries(this.suggestionPatterns.brand)) {
      if (lowerMessage.includes(pattern)) {
        if (Array.isArray(brand)) {
          parameters.brands = brand;
        } else {
          parameters.brand = brand;
        }
        break;
      }
    }

    // Extract features
    const features = [];
    for (const [pattern, feature] of Object.entries(this.suggestionPatterns.features)) {
      if (lowerMessage.includes(pattern)) {
        features.push(feature);
      }
    }
    if (features.length > 0) {
      parameters.features = features;
    }

    // Extract usage
    for (const [pattern, config] of Object.entries(this.suggestionPatterns.usage)) {
      if (lowerMessage.includes(pattern)) {
        parameters.usage = config;
        break;
      }
    }

    // Extract age preference
    for (const [pattern, config] of Object.entries(this.suggestionPatterns.age)) {
      if (lowerMessage.includes(pattern)) {
        parameters.age = config;
        break;
      }
    }

    // Extract specific budget amounts
    const budgetMatch = lowerMessage.match(/(\d+(?:\.\d+)?)\s*lakh/i);
    if (budgetMatch) {
      const amount = parseFloat(budgetMatch[1]) * 100000;
      parameters.customBudget = {
        min: Math.max(0, amount - 100000),
        max: amount + 100000,
        label: `Around ₹${budgetMatch[1]} Lakhs`
      };
    }

    return parameters;
  }

  buildQueryParameters(extractedParams, session) {
    const queryParams = {};

    // Use extracted budget or session budget
    if (extractedParams.budget) {
      queryParams.budget = extractedParams.budget;
    } else if (extractedParams.customBudget) {
      queryParams.budget = extractedParams.customBudget;
    } else if (session.budget) {
      queryParams.budget = this.parseSessionBudget(session.budget);
    }

    // Use extracted type or session type
    if (extractedParams.type) {
      queryParams.type = extractedParams.type;
    } else if (extractedParams.usage && extractedParams.usage.type) {
      queryParams.type = extractedParams.usage.type;
    } else if (session.type && session.type !== 'all') {
      queryParams.type = session.type;
    }

    // Use extracted brand or session brand
    if (extractedParams.brand) {
      queryParams.brand = extractedParams.brand;
    } else if (extractedParams.brands) {
      queryParams.brands = extractedParams.brands;
    } else if (session.brand && session.brand !== 'all') {
      queryParams.brand = session.brand;
    }

    // Add features
    if (extractedParams.features) {
      queryParams.features = extractedParams.features;
    }

    // Add age constraints
    if (extractedParams.age) {
      queryParams.age = extractedParams.age;
    }

    return queryParams;
  }

  parseSessionBudget(budgetString) {
    const budgetMap = {
      'Under ₹5 Lakhs': { min: 0, max: 500000 },
      '₹5-10 Lakhs': { min: 500000, max: 1000000 },
      '₹10-15 Lakhs': { min: 1000000, max: 1500000 },
      '₹15-20 Lakhs': { min: 1500000, max: 2000000 },
      'Above ₹20 Lakhs': { min: 2000000, max: 999999999 }
    };
    return budgetMap[budgetString] || { min: 0, max: 999999999 };
  }

  async getSuggestionsFromDatabase(queryParams) {
    try {
      let sql = 'SELECT * FROM cars WHERE 1=1';
      const params = [];
      let paramIndex = 1;

      // Add budget filter
      if (queryParams.budget) {
        sql += ` AND CAST(price AS NUMERIC) >= $${paramIndex} AND CAST(price AS NUMERIC) <= $${paramIndex + 1}`;
        params.push(queryParams.budget.min, queryParams.budget.max);
        paramIndex += 2;
      }

      // Add type filter
      if (queryParams.type) {
        sql += ` AND type = $${paramIndex}`;
        params.push(queryParams.type);
        paramIndex++;
      }

      // Add brand filter
      if (queryParams.brand) {
        sql += ` AND brand = $${paramIndex}`;
        params.push(queryParams.brand);
        paramIndex++;
      } else if (queryParams.brands) {
        const brandPlaceholders = queryParams.brands.map((_, index) => `$${paramIndex + index}`).join(',');
        sql += ` AND brand IN (${brandPlaceholders})`;
        params.push(...queryParams.brands);
        paramIndex += queryParams.brands.length;
      }

      // Add age filter
      if (queryParams.age) {
        if (queryParams.age.minYear) {
          sql += ` AND year >= $${paramIndex}`;
          params.push(queryParams.age.minYear);
          paramIndex++;
        }
        if (queryParams.age.maxYear) {
          sql += ` AND year <= $${paramIndex}`;
          params.push(queryParams.age.maxYear);
          paramIndex++;
        }
      }

      // Add fuel type filter
      if (queryParams.features) {
        const fuelTypes = queryParams.features.filter(f => ['Diesel', 'Petrol', 'CNG', 'Electric', 'Hybrid'].includes(f));
        if (fuelTypes.length > 0) {
          const fuelPlaceholders = fuelTypes.map((_, index) => `$${paramIndex + index}`).join(',');
          sql += ` AND fuel_type IN (${fuelPlaceholders})`;
          params.push(...fuelTypes);
          paramIndex += fuelTypes.length;
        }
      }

      sql += ' ORDER BY price LIMIT 10';

      console.log('🔍 Suggestion query:', sql, params);
      const result = await this.pool.query(sql, params);
      
      return result.rows.map(car => ({
        ...car,
        displayName: `${car.brand} ${car.model} ${car.variant}`,
        priceFormatted: this.formatPrice(car.price),
        yearFormatted: car.year.toString()
      }));
    } catch (error) {
      console.error('❌ Error getting suggestions from database:', error);
      return [];
    }
  }

  calculateConfidence(extractedParams, suggestionCount) {
    let confidence = 0;
    
    // Base confidence on number of parameters extracted
    const paramCount = Object.keys(extractedParams).length;
    confidence += paramCount * 20;
    
    // Boost confidence if we have suggestions
    if (suggestionCount > 0) {
      confidence += 30;
    }
    
    // Boost confidence for specific parameters
    if (extractedParams.budget) confidence += 10;
    if (extractedParams.type) confidence += 10;
    if (extractedParams.brand) confidence += 10;
    
    return Math.min(confidence, 100);
  }

  generateSuggestionMessage(extractedParams, suggestions) {
    if (suggestions.length === 0) {
      return "I couldn't find any cars matching your criteria. Let me help you explore other options!";
    }

    let message = `I found ${suggestions.length} great car${suggestions.length > 1 ? 's' : ''} for you:\n\n`;
    
    suggestions.slice(0, 5).forEach((car, index) => {
      message += `${index + 1}. ${car.displayName}\n`;
      message += `   📅 ${car.yearFormatted} | ⛽ ${car.fuel_type} | 💰 ${car.priceFormatted}\n\n`;
    });

    if (suggestions.length > 5) {
      message += `... and ${suggestions.length - 5} more options available!\n\n`;
    }

    message += "Would you like to see more details about any of these cars or book a test drive?";
    
    return message;
  }

  formatPrice(price) {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(price);
  }

  // Get popular suggestions based on common patterns
  async getPopularSuggestions() {
    try {
      const popularCars = await this.pool.query(`
        SELECT brand, type, COUNT(*) as count
        FROM cars 
        GROUP BY brand, type 
        ORDER BY count DESC 
        LIMIT 10
      `);
      
      return popularCars.rows.map(row => ({
        suggestion: `${row.brand} ${row.type}`,
        count: row.count
      }));
    } catch (error) {
      console.error('❌ Error getting popular suggestions:', error);
      return [];
    }
  }

  // Get budget-based suggestions
  async getBudgetSuggestions(budget) {
    try {
      const budgetRange = this.parseSessionBudget(budget);
      const suggestions = await this.pool.query(`
        SELECT brand, type, MIN(price) as min_price, MAX(price) as max_price, COUNT(*) as count
        FROM cars 
        WHERE CAST(price AS NUMERIC) >= $1 AND CAST(price AS NUMERIC) <= $2
        GROUP BY brand, type 
        ORDER BY count DESC 
        LIMIT 5
      `, [budgetRange.min, budgetRange.max]);
      
      return suggestions.rows.map(row => ({
        suggestion: `${row.brand} ${row.type}`,
        priceRange: `${this.formatPrice(row.min_price)} - ${this.formatPrice(row.max_price)}`,
        count: row.count
      }));
    } catch (error) {
      console.error('❌ Error getting budget suggestions:', error);
      return [];
    }
  }
}

module.exports = new SuggestionEngine();
