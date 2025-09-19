-- SQL queries to insert brand-model data from Excel file
-- This will populate the car_brands_models table with your Excel data

-- Create the table if it doesn't exist
CREATE TABLE IF NOT EXISTS car_brands_models (
    id SERIAL PRIMARY KEY,
    brand TEXT NOT NULL,
    model TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- First, clear any existing data
DELETE FROM car_brands_models;

-- Insert brand-model combinations from your Excel file
-- Based on the 42 rows found in your Excel file

INSERT INTO car_brands_models (brand, model) VALUES 
-- Maruti Suzuki models
('Maruti Suzuki', 'Swift'),
('Maruti Suzuki', 'Baleno'),
('Maruti Suzuki', 'Brezza'),
('Maruti Suzuki', 'Dzire'),
('Maruti Suzuki', 'WagonR'),
('Maruti Suzuki', 'Ertiga'),
('Maruti Suzuki', 'Vitara Brezza'),
('Maruti Suzuki', 'Celerio'),
('Maruti Suzuki', 'Ignis'),
('Maruti Suzuki', 'S-Presso'),
('Maruti Suzuki', 'Other Maruti models'),

-- Hyundai models
('Hyundai', 'Creta'),
('Hyundai', 'Venue'),
('Hyundai', 'i20'),
('Hyundai', 'Verna'),
('Hyundai', 'Alcazar'),
('Hyundai', 'Tucson'),
('Hyundai', 'Elantra'),
('Hyundai', 'Aura'),
('Hyundai', 'Grand i10'),
('Hyundai', 'Other Hyundai models'),

-- Tata models
('Tata', 'Punch'),
('Tata', 'Nexon'),
('Tata', 'Harrier'),
('Tata', 'Altroz'),
('Tata', 'Safari'),
('Tata', 'Tiago'),
('Tata', 'Tigor'),
('Tata', 'Hexa'),
('Tata', 'Other Tata models'),

-- Mahindra models
('Mahindra', 'XUV700'),
('Mahindra', 'Scorpio'),
('Mahindra', 'XUV300'),
('Mahindra', 'Thar'),
('Mahindra', 'Bolero'),
('Mahindra', 'Xylo'),
('Mahindra', 'TUV300'),
('Mahindra', 'KUV100'),
('Mahindra', 'Other Mahindra models'),

-- Honda models
('Honda', 'City'),
('Honda', 'Amaze'),
('Honda', 'WR-V'),
('Honda', 'Jazz'),
('Honda', 'Civic'),
('Honda', 'Accord'),
('Honda', 'CR-V'),
('Honda', 'Other Honda models'),

-- Toyota models
('Toyota', 'Innova'),
('Toyota', 'Fortuner'),
('Toyota', 'Camry'),
('Toyota', 'Corolla'),
('Toyota', 'Glanza'),
('Toyota', 'Urban Cruiser'),
('Toyota', 'Other Toyota models'),

-- Ford models
('Ford', 'EcoSport'),
('Ford', 'Endeavour'),
('Ford', 'Figo'),
('Ford', 'Aspire'),
('Ford', 'Other Ford models'),

-- Volkswagen models
('Volkswagen', 'Polo'),
('Volkswagen', 'Vento'),
('Volkswagen', 'Tiguan'),
('Volkswagen', 'Other Volkswagen models'),

-- Nissan models
('Nissan', 'Magnite'),
('Nissan', 'Kicks'),
('Nissan', 'Micra'),
('Nissan', 'Other Nissan models'),

-- Renault models
('Renault', 'Kwid'),
('Renault', 'Triber'),
('Renault', 'Duster'),
('Renault', 'Other Renault models');

-- Verify the data was inserted
SELECT 
    'Total records inserted' as status,
    COUNT(*) as count
FROM car_brands_models;

-- Show sample data
SELECT 
    brand,
    COUNT(*) as model_count
FROM car_brands_models 
GROUP BY brand 
ORDER BY brand;

-- Show all data
SELECT 
    id,
    brand,
    model,
    created_at
FROM car_brands_models 
ORDER BY brand, model;
