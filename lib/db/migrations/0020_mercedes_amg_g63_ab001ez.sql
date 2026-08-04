-- Add the company-owned 2020 Mercedes-AMG G 63 catalogue card.
-- The insert is idempotent and uses the VIN from the Slovak registration certificate.

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
  'Mercedes-AMG G 63 White 2020',
  'car',
  'The Mercedes-AMG G 63 combines iconic design, handcrafted 585 PS V8 performance and genuine all-terrain capability with the comfort and presence expected of a luxury SUV.',
  '',
  '[]'::jsonb,
  FALSE,
  TRUE,
  jsonb_build_object(
    'engine', '4.0L AMG twin-turbo V8',
    'horsepower', '585 PS (430 kW)',
    'torque', '850 Nm',
    'acceleration', '4.5 s',
    'topSpeed', '220 km/h',
    'transmission', 'AMG SPEEDSHIFT TCT 9G 9-speed automatic',
    'drivetrain', 'Permanent all-wheel drive with three differential locks',
    'seats', '5',
    'fuelType', 'Petrol',
    'year', '2020',
    'bodyType', 'Luxury performance SUV',
    'registrationPlate', 'AB001EZ',
    'vin', 'W1N4632761X355057',
    'colour', 'White',
    'unitSystem', 'metric',
    'fullDescription', 'Few vehicles combine unmistakable presence, handcrafted performance and authentic off-road engineering like the Mercedes-AMG G 63. This white 2020 example is powered by a 4.0-litre AMG twin-turbocharged V8 producing 585 PS and 850 Nm, paired with the fast-shifting AMG SPEEDSHIFT TCT 9G automatic transmission and permanent all-wheel drive. The ladder-frame construction, low-range gearing and three selectable differential locks preserve the G-Class'' legendary ability beyond the road, while AMG chassis tuning delivers confident control and exceptional character on the Riviera. Inside, five occupants enjoy the commanding seating position, premium materials, modern connectivity and everyday practicality of a luxury SUV. With its signature side-exit exhaust note, imposing proportions and effortless V8 performance, the G 63 is an exceptional choice for prestigious transfers, special occasions and distinctive coastal journeys.'
  ),
  '{}'::jsonb,
  'own',
  NULL
WHERE NOT EXISTS (
  SELECT 1
  FROM "vehicles"
  WHERE "category" = 'car'
    AND "specs"->>'vin' = 'W1N4632761X355057'
);

-- Make a previously inserted hidden copy visible when the migration is rerun.
UPDATE "vehicles"
SET "visible" = TRUE
WHERE "category" = 'car'
  AND "specs"->>'vin' = 'W1N4632761X355057';
