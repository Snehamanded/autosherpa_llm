const { getCarsByFilter } = require('./carData');

class ComparisonEngine {
  constructor() {
    this.pool = null;
    this.comparisonKeywords = this.initializeComparisonKeywords();
  }

  setPool(pool) {
    this.pool = pool;
  }

  initializeComparisonKeywords() {
    return {
      // Direct comparison keywords
      'compare': true,
      'comparison': true,
      'vs': true,
      'versus': true,
      'difference': true,
      'better': true,
      'which is better': true,
      'which one': true,
      'pros and cons': true,
      
      // Car model specific
      'honda city vs': true,
      'maruti swift vs': true,
      'hyundai creta vs': true,
      'toyota innova vs': true,
      
      // Feature comparison
      'fuel efficiency': true,
      'mileage': true,
      'price': true,
      'features': true,
      'safety': true,
      'performance': true,
      'maintenance': true,
      'resale value': true
    };
  }

  async analyzeComparisonRequest(userMessage, session) {
    console.log('🔍 Analyzing comparison request:', userMessage);
    
    const comparison = {
      type: 'comparison',
      cars: [],
      criteria: [],
      message: '',
      requiresDatabaseQuery: true,
      confidence: 0
    };

    // Extract cars to compare
    const extractedCars = this.extractCarsFromMessage(userMessage);
    console.log('📊 Extracted cars:', extractedCars);

    // Extract comparison criteria
    const extractedCriteria = this.extractComparisonCriteria(userMessage);
    console.log('📊 Extracted criteria:', extractedCriteria);

    // Get car details from database
    if (this.pool && extractedCars.length > 0) {
      comparison.cars = await this.getCarsForComparison(extractedCars);
      comparison.criteria = extractedCriteria;
      comparison.confidence = this.calculateComparisonConfidence(extractedCars, extractedCriteria);
    }

    // Generate comparison response
    comparison.message = this.generateComparisonMessage(comparison.cars, comparison.criteria);
    
    console.log('✅ Comparison analysis complete:', comparison);
    return comparison;
  }

  extractCarsFromMessage(userMessage) {
    const lowerMessage = userMessage.toLowerCase();
    const cars = [];

    // Common car model patterns
    const carPatterns = {
      'honda city': 'Honda City',
      'honda civic': 'Honda Civic',
      'honda cr-v': 'Honda CR-V',
      'honda wr-v': 'Honda WR-V',
      'maruti swift': 'Maruti Swift',
      'maruti baleno': 'Maruti Baleno',
      'maruti vitara brezza': 'Maruti Vitara Brezza',
      'maruti dzire': 'Maruti Dzire',
      'hyundai creta': 'Hyundai Creta',
      'hyundai i20': 'Hyundai i20',
      'hyundai verna': 'Hyundai Verna',
      'hyundai venue': 'Hyundai Venue',
      'toyota innova': 'Toyota Innova',
      'toyota fortuner': 'Toyota Fortuner',
      'toyota camry': 'Toyota Camry',
      'tata nexon': 'Tata Nexon',
      'tata harrier': 'Tata Harrier',
      'tata altroz': 'Tata Altroz',
      'kia seltos': 'Kia Seltos',
      'kia sonet': 'Kia Sonet',
      'kia carnival': 'Kia Carnival',
      'mahindra xuv300': 'Mahindra XUV300',
      'mahindra scorpio': 'Mahindra Scorpio',
      'skoda rapid': 'Skoda Rapid',
      'skoda octavia': 'Skoda Octavia',
      'renault kwid': 'Renault Kwid',
      'renault triber': 'Renault Triber',
      'ford ecoSport': 'Ford EcoSport',
      'ford endeavour': 'Ford Endeavour',
      'volkswagen polo': 'Volkswagen Polo',
      'volkswagen vento': 'Volkswagen Vento',
      'bmw 3 series': 'BMW 3 Series',
      'bmw x1': 'BMW X1',
      'audi a4': 'Audi A4',
      'audi q3': 'Audi Q3',
      'mercedes c-class': 'Mercedes C-Class',
      'mercedes gla': 'Mercedes GLA'
    };

    // Extract car models
    for (const [pattern, carName] of Object.entries(carPatterns)) {
      if (lowerMessage.includes(pattern)) {
        cars.push(carName);
      }
    }

    // Extract brand names for broader comparison
    const brandPatterns = {
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
      'bmw': 'BMW',
      'audi': 'Audi',
      'mercedes': 'Mercedes'
    };

    // If no specific models found, look for brands
    if (cars.length === 0) {
      for (const [pattern, brand] of Object.entries(brandPatterns)) {
        if (lowerMessage.includes(pattern)) {
          cars.push(brand);
        }
      }
    }

    return cars;
  }

  extractComparisonCriteria(userMessage) {
    const lowerMessage = userMessage.toLowerCase();
    const criteria = [];

    // Price comparison
    if (lowerMessage.includes('price') || lowerMessage.includes('cost') || lowerMessage.includes('expensive') || lowerMessage.includes('cheap')) {
      criteria.push('price');
    }

    // Fuel efficiency
    if (lowerMessage.includes('fuel') || lowerMessage.includes('mileage') || lowerMessage.includes('efficiency') || lowerMessage.includes('kmpl')) {
      criteria.push('fuel_efficiency');
    }

    // Features
    if (lowerMessage.includes('features') || lowerMessage.includes('specifications') || lowerMessage.includes('specs')) {
      criteria.push('features');
    }

    // Safety
    if (lowerMessage.includes('safety') || lowerMessage.includes('airbag') || lowerMessage.includes('abs') || lowerMessage.includes('crash')) {
      criteria.push('safety');
    }

    // Performance
    if (lowerMessage.includes('performance') || lowerMessage.includes('power') || lowerMessage.includes('speed') || lowerMessage.includes('engine')) {
      criteria.push('performance');
    }

    // Maintenance
    if (lowerMessage.includes('maintenance') || lowerMessage.includes('service') || lowerMessage.includes('repair')) {
      criteria.push('maintenance');
    }

    // Resale value
    if (lowerMessage.includes('resale') || lowerMessage.includes('depreciation') || lowerMessage.includes('value')) {
      criteria.push('resale_value');
    }

    // Space
    if (lowerMessage.includes('space') || lowerMessage.includes('room') || lowerMessage.includes('seating') || lowerMessage.includes('boot')) {
      criteria.push('space');
    }

    // Comfort
    if (lowerMessage.includes('comfort') || lowerMessage.includes('ride') || lowerMessage.includes('smooth')) {
      criteria.push('comfort');
    }

    // If no specific criteria mentioned, use default
    if (criteria.length === 0) {
      criteria.push('price', 'fuel_efficiency', 'features');
    }

    return criteria;
  }

  async getCarsForComparison(carNames) {
    try {
      const cars = [];
      
      for (const carName of carNames) {
        // Search for cars by model name
        let sql = 'SELECT * FROM cars WHERE LOWER(model) LIKE $1 OR LOWER(brand) LIKE $1';
        let params = [`%${carName.toLowerCase()}%`];

        // If it's a brand name, search by brand
        if (carName.split(' ').length === 1) {
          sql = 'SELECT * FROM cars WHERE LOWER(brand) = $1 ORDER BY price LIMIT 3';
          params = [carName.toLowerCase()];
        }

        const result = await this.pool.query(sql, params);
        
        if (result.rows.length > 0) {
          cars.push(...result.rows.map(car => ({
            ...car,
            displayName: `${car.brand} ${car.model} ${car.variant}`,
            priceFormatted: this.formatPrice(car.price),
            yearFormatted: car.year.toString(),
            fuelEfficiency: this.getFuelEfficiency(car),
            safetyRating: this.getSafetyRating(car),
            features: this.getFeatures(car),
            maintenanceCost: this.getMaintenanceCost(car),
            resaleValue: this.getResaleValue(car)
          })));
        }
      }

      return cars;
    } catch (error) {
      console.error('❌ Error getting cars for comparison:', error);
      return [];
    }
  }

  calculateComparisonConfidence(cars, criteria) {
    let confidence = 0;
    
    // Base confidence on number of cars and criteria
    confidence += Math.min(cars.length * 20, 60); // Max 60 for cars
    confidence += Math.min(criteria.length * 10, 30); // Max 30 for criteria
    
    // Boost confidence for specific models vs brands
    const specificModels = cars.filter(car => car.split(' ').length > 1);
    if (specificModels.length > 0) {
      confidence += 20;
    }
    
    return Math.min(confidence, 100);
  }

  generateComparisonMessage(cars, criteria) {
    if (cars.length === 0) {
      return "I couldn't find the cars you mentioned for comparison. Could you please specify the exact car models you'd like to compare?";
    }

    if (cars.length === 1) {
      return `I found information about ${cars[0].displayName}. To compare it with another car, please mention the second car model.`;
    }

    let message = `Here's a comparison of ${cars.length} cars:\n\n`;
    
    // Generate comparison table
    const comparisonData = this.generateComparisonTable(cars, criteria);
    message += comparisonData;

    message += `\n💡 **Key Differences:**\n`;
    message += this.generateKeyDifferences(cars, criteria);

    message += `\n\nWould you like me to elaborate on any specific aspect or compare additional features?`;

    return message;
  }

  generateComparisonTable(cars, criteria) {
    let table = '| Feature | ' + cars.map(car => car.displayName).join(' | ') + ' |\n';
    table += '|' + '---|'.repeat(cars.length + 1) + '\n';

    // Price row
    if (criteria.includes('price')) {
      table += '| **Price** | ' + cars.map(car => car.priceFormatted).join(' | ') + ' |\n';
    }

    // Year row
    table += '| **Year** | ' + cars.map(car => car.yearFormatted).join(' | ') + ' |\n';

    // Fuel type row
    table += '| **Fuel Type** | ' + cars.map(car => car.fuel_type).join(' | ') + ' |\n';

    // Fuel efficiency row
    if (criteria.includes('fuel_efficiency')) {
      table += '| **Mileage** | ' + cars.map(car => car.fuelEfficiency).join(' | ') + ' |\n';
    }

    // Safety rating row
    if (criteria.includes('safety')) {
      table += '| **Safety Rating** | ' + cars.map(car => car.safetyRating).join(' | ') + ' |\n';
    }

    // Maintenance cost row
    if (criteria.includes('maintenance')) {
      table += '| **Maintenance Cost** | ' + cars.map(car => car.maintenanceCost).join(' | ') + ' |\n';
    }

    // Resale value row
    if (criteria.includes('resale_value')) {
      table += '| **Resale Value** | ' + cars.map(car => car.resaleValue).join(' | ') + ' |\n';
    }

    return table;
  }

  generateKeyDifferences(cars, criteria) {
    const differences = [];

    // Price comparison
    if (criteria.includes('price')) {
      const prices = cars.map(car => car.price);
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      const priceDiff = maxPrice - minPrice;
      
      if (priceDiff > 0) {
        const expensiveCar = cars.find(car => car.price === maxPrice);
        const cheapCar = cars.find(car => car.price === minPrice);
        differences.push(`💰 **Price**: ${expensiveCar.displayName} is ₹${this.formatPrice(priceDiff)} more expensive than ${cheapCar.displayName}`);
      }
    }

    // Fuel efficiency comparison
    if (criteria.includes('fuel_efficiency')) {
      const efficiencies = cars.map(car => this.parseFuelEfficiency(car.fuelEfficiency));
      const maxEfficiency = Math.max(...efficiencies);
      const minEfficiency = Math.min(...efficiencies);
      
      if (maxEfficiency > minEfficiency) {
        const efficientCar = cars.find(car => this.parseFuelEfficiency(car.fuelEfficiency) === maxEfficiency);
        differences.push(`⛽ **Fuel Efficiency**: ${efficientCar.displayName} offers the best mileage at ${efficientCar.fuelEfficiency}`);
      }
    }

    // Year comparison
    const years = cars.map(car => car.year);
    const newestYear = Math.max(...years);
    const oldestYear = Math.min(...years);
    
    if (newestYear > oldestYear) {
      const newestCar = cars.find(car => car.year === newestYear);
      const oldestCar = cars.find(car => car.year === oldestYear);
      differences.push(`📅 **Age**: ${newestCar.displayName} is ${newestYear - oldestYear} years newer than ${oldestCar.displayName}`);
    }

    return differences.join('\n');
  }

  // Helper methods
  formatPrice(price) {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(price);
  }

  getFuelEfficiency(car) {
    // Mock fuel efficiency based on car type and fuel
    const baseEfficiency = {
      'Petrol': { 'Hatchback': 18, 'Sedan': 16, 'SUV': 14, 'Coupe': 15 },
      'Diesel': { 'Hatchback': 22, 'Sedan': 20, 'SUV': 18, 'Coupe': 19 },
      'CNG': { 'Hatchback': 25, 'Sedan': 23, 'SUV': 20, 'Coupe': 22 }
    };
    
    const efficiency = baseEfficiency[car.fuel_type]?.[car.type] || 15;
    return `${efficiency} kmpl`;
  }

  getSafetyRating(car) {
    // Mock safety rating based on brand and year
    const brandRatings = {
      'Honda': 4.5, 'Toyota': 4.6, 'Maruti': 4.2, 'Hyundai': 4.3,
      'Tata': 4.4, 'Kia': 4.3, 'Mahindra': 4.1, 'Skoda': 4.7,
      'Renault': 4.2, 'Ford': 4.4, 'Volkswagen': 4.6, 'BMW': 4.8,
      'Audi': 4.7, 'Mercedes': 4.8
    };
    
    const baseRating = brandRatings[car.brand] || 4.0;
    const yearBonus = car.year >= 2020 ? 0.2 : 0;
    return `${(baseRating + yearBonus).toFixed(1)}/5`;
  }

  getFeatures(car) {
    const features = [];
    if (car.year >= 2020) features.push('Modern Tech');
    if (car.fuel_type === 'Diesel') features.push('High Torque');
    if (car.type === 'SUV') features.push('High Ground Clearance');
    if (car.type === 'Sedan') features.push('Comfortable Seating');
    return features.join(', ');
  }

  getMaintenanceCost(car) {
    const brandCosts = {
      'Honda': 'Medium', 'Toyota': 'Low', 'Maruti': 'Low', 'Hyundai': 'Medium',
      'Tata': 'Medium', 'Kia': 'Medium', 'Mahindra': 'Medium', 'Skoda': 'High',
      'Renault': 'Medium', 'Ford': 'Medium', 'Volkswagen': 'High', 'BMW': 'High',
      'Audi': 'High', 'Mercedes': 'High'
    };
    return brandCosts[car.brand] || 'Medium';
  }

  getResaleValue(car) {
    const brandResale = {
      'Honda': 'High', 'Toyota': 'High', 'Maruti': 'High', 'Hyundai': 'Medium',
      'Tata': 'Medium', 'Kia': 'Medium', 'Mahindra': 'Medium', 'Skoda': 'Low',
      'Renault': 'Low', 'Ford': 'Medium', 'Volkswagen': 'Medium', 'BMW': 'High',
      'Audi': 'High', 'Mercedes': 'High'
    };
    return brandResale[car.brand] || 'Medium';
  }

  parseFuelEfficiency(efficiencyStr) {
    const match = efficiencyStr.match(/(\d+)/);
    return match ? parseInt(match[1]) : 15;
  }

  // Get popular comparisons
  async getPopularComparisons() {
    try {
      const popularComparisons = await this.pool.query(`
        SELECT brand, model, COUNT(*) as comparison_count
        FROM cars 
        GROUP BY brand, model 
        ORDER BY comparison_count DESC 
        LIMIT 10
      `);
      
      return popularComparisons.rows.map(row => ({
        car: `${row.brand} ${row.model}`,
        count: row.comparison_count
      }));
    } catch (error) {
      console.error('❌ Error getting popular comparisons:', error);
      return [];
    }
  }
}

module.exports = new ComparisonEngine();
