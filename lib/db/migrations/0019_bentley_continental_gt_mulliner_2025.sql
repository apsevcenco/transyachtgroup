-- Add the company-owned 2025 Bentley Continental GT Mulliner catalogue card.
-- The vehicle is visible immediately; gallery images and rental rates can be added in admin.
-- The insert is idempotent and uses the VIN from the French registration certificate.

INSERT INTO "vehicles" (
  "name",
  "category",
  "description",
  "image",
  "images",
  "featured",
  "visible",
  "specs",
  "translations",
  "ownership",
  "agent_id"
)
SELECT
  'Bentley Continental GT Mulliner V8 Hybrid 2025',
  'car',
  'The Bentley Continental GT Mulliner pairs handcrafted grand-touring luxury with a 782 PS Ultra Performance Hybrid powertrain, all-wheel drive and effortless Riviera performance.',
  '',
  '[]'::jsonb,
  FALSE,
  TRUE,
  jsonb_build_object(
    'engine', '4.0L twin-turbo V8 plug-in hybrid with 140 kW electric motor',
    'horsepower', '782 PS (575 kW) combined',
    'torque', '1000 Nm combined',
    'acceleration', '3.2 s',
    'topSpeed', '335 km/h',
    'transmission', '8-speed dual-clutch automatic',
    'drivetrain', 'All-wheel drive',
    'seats', '4',
    'fuelType', 'Plug-in hybrid (petrol/electric)',
    'year', '2025',
    'bodyType', 'Luxury grand tourer coupe',
    'registrationPlate', 'HH-808-LT',
    'vin', 'SCBCF13S1SC023158',
    'colour', 'Peacock',
    'unitSystem', 'metric',
    'fullDescription', 'Created by Bentley Mulliner as the pinnacle of the Continental GT range, this 2025 Continental GT Mulliner combines bespoke craftsmanship with extraordinary hybrid performance. Its 4.0-litre twin-turbocharged V8 works with a 140 kW electric motor to produce a combined 782 PS and 1,000 Nm, delivering seamless acceleration from 0 to 100 km/h in 3.2 seconds and a maximum speed of 335 km/h with the appropriate factory-specified tyres. The all-wheel-drive chassis, dual-clutch transmission, active suspension technology and four-seat grand-touring layout balance confidence, comfort and driver engagement. Finished in distinctive Peacock paint with a Linen primary hide, Imperial Blue secondary hide and Grand Black veneer with Mulliner overlays, this Continental GT is equally suited to an elegant Monaco arrival, a special occasion or an effortless journey along the French Riviera.'
  ),
  '{}'::jsonb,
  'own',
  NULL
WHERE NOT EXISTS (
  SELECT 1
  FROM "vehicles"
  WHERE "category" = 'car'
    AND (
      "name" = 'Bentley Continental GT Mulliner V8 Hybrid 2025'
      OR "specs"->>'vin' = 'SCBCF13S1SC023158'
    )
);

-- Make a previously inserted hidden copy visible when the migration is rerun.
UPDATE "vehicles"
SET "visible" = TRUE
WHERE "category" = 'car'
  AND (
    "name" = 'Bentley Continental GT Mulliner V8 Hybrid 2025'
    OR "specs"->>'vin' = 'SCBCF13S1SC023158'
  );
