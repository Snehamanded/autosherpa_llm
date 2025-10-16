const { formatRupees, getAvailableTypes, getAvailableBrands, getCarsByFilter , getCarImagesByRegistration} = require('./carData');
const { extractBrowseSlots } = require('./intentExtractor');
const { getNextAvailableDays, getTimeSlots, getActualDateFromSelection, getActualDateFromDaySelection } = require('./timeUtils');
const { validateBudget, validateCarType, validateBrand, createValidationErrorMessage } = require('./inputValidation');
const dynamicFlowManager = require('./dynamicFlowManager');
const geminiFlowService = require('./geminiFlowService');
const fs = require('fs');
const path = require('path');

// Import database connection
const pool = require('../db');

// Helper function to construct image URL using the new naming convention
// Only returns URL if image exists in database
async function constructImageUrl(registrationNumber, sequenceNumber, baseUrl = null) {
  try {
    const pool = require('../db');
    
    // Check if this specific image exists in the database
    const res = await pool.query(`
      SELECT ci.image_path
      FROM car_images ci
      JOIN cars c ON ci.car_id = c.id
      WHERE c.registration_number = $1 AND ci.image_type = $2 
      LIMIT 1
    `, [registrationNumber, ['front', 'back', 'side', 'interior'][sequenceNumber - 1]]);
    
    if (res.rows.length === 0) {
      console.log(`📸 No image found for ${registrationNumber} sequence ${sequenceNumber}`);
      return null;
    }
    
    const base ='http://27.111.72.50:3000';
    const imagePath = res.rows[0].image_path;
    
    // Return Cloudinary URL if it's already a full URL, otherwise construct local URL
    if (imagePath.startsWith('http')) {
      return imagePath;
    } else {
      return `${base}/${imagePath}`;
    }
    
  } catch (error) {
    console.error('Error constructing image URL:', error);
    return null;
  }
}

// Helper function to check if an image URL is publicly accessible
function isPubliclyAccessible(baseUrl) {
  return baseUrl && !baseUrl.includes('localhost') && !baseUrl.includes('127.0.0.1');
}

async function handleBrowseUsedCars(session, userMessage) {
  console.log("📩 Entered handleBrowseUsedCars with Dynamic Flow");
  
  // Initialize dynamic flow manager with database pool
  dynamicFlowManager.setPool(pool);
  
  // Check for greeting keywords FIRST - before any step processing
  const lowerMsg = (userMessage || '').toLowerCase().trim();
  if (['hi', 'hello', 'hey', 'hy', 'start', 'begin', 'restart', 'menu', 'main'].includes(lowerMsg)) {
    // Clear selected session fields and show main menu
    session.step = 'main_menu';
    session.carIndex = 0;
    session.filteredCars = [];
    session.selectedCar = null;
    session.budget = null;
    session.type = null;
    session.brand = null;
    session.testDriveDate = null;
    session.testDriveTime = null;
    session.td_name = null;
    session.td_phone = null;
    session.td_license = null;
    session.td_location_mode = null;
    session.td_home_address = null;
    session.td_drop_location = null;
    
    console.log("🔁 Greeting detected in browse flow - resetting session and showing main menu");
    return {
      message: "Hello! 👋 Welcome to Sherpa Hyundai. How can I assist you today?",
      options: [
        "🚗 Browse Used Cars",
        "💰 Get Car Valuation",
        "📞 Contact Our Team",
        "ℹ️ About Us"
      ]
    };
  }
  
  console.log("🧠 Current step:", session.step || 'browse_start');
  console.log("📝 User input:", userMessage);
  console.log("🔍 Session object:", JSON.stringify(session, null, 2));

  // Use dynamic flow manager to process the message
  try {
    const response = await dynamicFlowManager.processMessage(session, userMessage);
    console.log("✅ Dynamic flow response:", JSON.stringify(response, null, 2));
    return response;
  } catch (error) {
    console.error("❌ Dynamic flow error:", error);
              return {
      message: "I ran into a temporary issue processing your request. Please try again.",
      options: ["Main Menu"]
    };
  }
}

async function getCarDisplayChunk(session, pool) {
  const cars = session.filteredCars || [];
  
  if (cars.length === 0) {
    return { message: "No more cars to display.", options: ["Change criteria"] };
  }

  // Show up to 3 cars at a time
  const startIndex = session.carIndex;
  const endIndex = Math.min(startIndex + 3, cars.length);
  const carsToShow = cars.slice(startIndex, endIndex);

  console.log(`📊 Processing ${carsToShow.length} cars (${startIndex + 1}-${endIndex} of ${cars.length})`);

  const messages = [];
  
  for (let i = 0; i < carsToShow.length; i++) {
    const car = carsToShow[i];
    
    // Get car images by registration number for the new naming convention
    let imagesByRegistration = [];
    try {
      imagesByRegistration = await getCarImagesByRegistration(pool, car.registration_number);
      console.log(`📸 Retrieved ${imagesByRegistration.length} images by registration for ${car.registration_number}`);
    } catch (error) {
      console.error(`❌ Error fetching images by registration for ${car.registration_number}:`, error);
    }
    
    // Use images by registration if available
    const finalCarImages = imagesByRegistration;

    
    const caption =
      `🚗 ${car.brand} ${car.model} ${car.variant}\n` +
      `📅 Year: ${car.year}\n` +
      `⛽ Fuel: ${car.fuel_type}\n` +
      `💰 Price: ${formatRupees(car.price)}`;
    
    if (finalCarImages && finalCarImages.length > 0) {
      // Validate that we have valid image data
      const validImages = finalCarImages.filter(img => img && img.path && typeof img.path === 'string');
      
      if (validImages.length === 0) {
        console.log(`⚠️ No valid images found for car ${car.id}, falling back to text-only`);
        // Fall back to text-only message
        const enhancedCaption = caption + '\n\n📸 Images: Not available at the moment 1';
        messages.push({
          type: 'text',
          text: { body: enhancedCaption }
        });
      } else {
        // Add image message with first available image
        const firstImage = validImages[0];
        
        // Use the new naming convention helper function
        let imageUrl = null;
        if (firstImage.sequence && car.registration_number) {
          // Use the new naming convention: registrationNumber_1.jpg
          imageUrl = await constructImageUrl(car.registration_number, firstImage.sequence);
          console.log(`📸 Using new naming convention for image: ${imageUrl}`);
        } else {
          // Fall back to the old path-based method
          if (firstImage.path.startsWith('uploads/')) {
            // imageUrl = `${process.env.NGROK_URL || process.env.PUBLIC_URL || 'http://27.111.72.50:3000'}/${firstImage.path}`;
            imageUrl = 'http://27.111.72.50:3000'
          } else {
            // imageUrl = `${process.env.NGROK_URL || process.env.PUBLIC_URL || 'http://27.111.72.50:3000'}/uploads/${firstImage.path}`;
            imageUrl = 'http://27.111.72.50:3000'
          }
          console.log(`📸 Using fallback path method for image: ${imageUrl}`);
        }
        
        // Guard: if URL couldn't be constructed, fall back to text
        if (!imageUrl || typeof imageUrl !== 'string') {
          console.log('⚠️ Image URL missing, falling back to text message');
          const enhancedCaption = caption + '\n\n📸 Images: Not available at the moment 2';
          messages.push({
            type: 'text',
            text: { body: enhancedCaption }
          });
          continue;
        }
        
        // Check if the image URL is publicly accessible
        if (isPubliclyAccessible(imageUrl)) {
          console.log(`📸 Adding car image (publicly accessible): ${imageUrl}`);
          messages.push({
            type: 'image',
            image: { link: imageUrl, caption: caption }
          });
        } else {
          console.log(`⚠️ Image URL not publicly accessible, falling back to text-only: ${imageUrl}`);
          // Fall back to text-only message with enhanced caption
          const enhancedCaption = caption + '\n\n📸 Images: Available but not publicly accessible. Please visit our website to view images.';
          messages.push({
            type: 'text',
            text: { body: enhancedCaption }
          });
        }
        
        // Removed additional images to show only one image with details
        // Previously, we sent up to 3 images per car. Now, we only send the first image.
      }
    } else {
      // No images available - show text-only message with enhanced caption
      console.log(`📸 No images found for car ${car.id}, showing text-only message`);
      
      // Enhanced caption for cars without images
      const enhancedCaption = caption + '\n\n📸 Images: Not available at the moment 3';
      
      // Add text message instead of image
      messages.push({
        type: 'text',
        text: { body: enhancedCaption }
      });
      
      // Try to find image in static images directory as fallback (only if no uploaded images)
      const staticImageFile = `${car.brand}_${car.model}_${car.variant}`.replace(/\s+/g, '_') + '.png';
      const staticImageUrl = `${process.env.NGROK_URL || process.env.PUBLIC_URL || 'http://27.111.72.50:3000'}/images/${staticImageFile}`;
      
      console.log(`📸 Trying static image fallback: ${staticImageFile}`);
      
      // Note: We don't add the static image here since WhatsApp doesn't support mixed message types
      // The text message above will be sufficient
    }

    // Add SELECT button message for each car
    const carId = `book_${car.brand}_${car.model}_${car.variant}`.replace(/\s+/g, '_');
    messages.push({
      type: 'interactive',
      interactive: {
        type: 'button',
        body: { text: 'SELECT' },
        action: {
          buttons: [
            {
              type: 'reply',
              reply: {
                id: carId,
                title: 'SELECT'
              }
            }
          ]
        }
      }
    });
  }

  // Add "Browse More Cars" button if there are more cars to show
  const hasMoreCars = endIndex < cars.length;
  
  let messageText = `Showing cars ${startIndex + 1}-${endIndex} of ${cars.length}:`;
  
  console.log(`📸 Created ${messages.length} messages for cars`);
  console.log(`📸 Message types:`, messages.map(m => m.type));
  
  const final = {
    message: messageText,
    messages: messages
  };
  
  // Always add "Browse More Cars" option if there are more cars
  if (hasMoreCars) {
    final.options = ["Browse More Cars"];
    console.log("🔍 Adding Browse More Cars button - hasMoreCars:", hasMoreCars, "cars.length:", cars.length, "endIndex:", endIndex);
  } else {
    final.message += "\n\nNo more cars available.";
    final.options = ["Change criteria"];
    console.log("🔍 No more cars to show - hasMoreCars:", hasMoreCars, "cars.length:", cars.length, "endIndex:", endIndex);
  }
  
  console.log("🔍 Final response structure:", JSON.stringify(final, null, 2));
  
  session.step = 'show_more_cars';
  return final;
}

function getTestDriveConfirmation(session) {
  console.log("🔍 Debug - session.td_location_mode:", session.td_location_mode);
  console.log("🔍 Debug - session.td_home_address:", session.td_home_address);
  console.log("🔍 Debug - session.td_drop_location:", session.td_drop_location);
  console.log("🔍 Debug - testDriveDateFormatted:", session.testDriveDateFormatted);
  
  let locationText;
  
  // Check for different location modes
  const locationMode = session.td_location_mode ? session.td_location_mode.toLowerCase() : '';
  console.log("🔍 Debug - Location mode:", locationMode);
  
  if (locationMode === "home pickup") {
    locationText = `\n📍 Test Drive Location: ${session.td_home_address || 'To be confirmed'}`;
    console.log("🔍 Debug - Using home address:", session.td_home_address);
  } else if (locationMode === "showroom pickup") {
    locationText = "\n📍 Showroom Address: Sherpa Hyundai Showroom, 123 MG Road, Bangalore\n🅿️ Free parking available";
    console.log("🔍 Debug - Using showroom address");
  } else if (locationMode.includes("delivery")) {
    locationText = `\n📍 Test Drive Location: ${session.td_drop_location || 'To be confirmed'}`;
    console.log("🔍 Debug - Using delivery address:", session.td_drop_location);
  } else {
    locationText = "\n📍 Test Drive Location: To be confirmed";
    console.log("🔍 Debug - Using default location");
  }

  // Format the date properly
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

module.exports = { handleBrowseUsedCars };