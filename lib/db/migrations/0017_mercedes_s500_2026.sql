-- Add the company-owned 2026 Mercedes-Benz S500 4MATIC catalogue card.
-- The insert is idempotent so the migration can be applied safely more than once.

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
  'Mercedes-Benz S500 4MATIC 2026',
  'car',
  'The Mercedes-Benz S500 4MATIC combines effortless six-cylinder mild-hybrid performance, limousine comfort and discreet flagship luxury for refined travel across Monaco and the French Riviera.',
  'https://www.transyachtgroup.com/images/vehicles/mercedes-benz-s500-2026/09.webp',
  '[
    "https://www.transyachtgroup.com/images/vehicles/mercedes-benz-s500-2026/09.webp",
    "https://www.transyachtgroup.com/images/vehicles/mercedes-benz-s500-2026/07.webp",
    "https://www.transyachtgroup.com/images/vehicles/mercedes-benz-s500-2026/14.webp",
    "https://www.transyachtgroup.com/images/vehicles/mercedes-benz-s500-2026/03.webp",
    "https://www.transyachtgroup.com/images/vehicles/mercedes-benz-s500-2026/17.webp",
    "https://www.transyachtgroup.com/images/vehicles/mercedes-benz-s500-2026/08.webp",
    "https://www.transyachtgroup.com/images/vehicles/mercedes-benz-s500-2026/04.webp",
    "https://www.transyachtgroup.com/images/vehicles/mercedes-benz-s500-2026/10.webp",
    "https://www.transyachtgroup.com/images/vehicles/mercedes-benz-s500-2026/13.webp",
    "https://www.transyachtgroup.com/images/vehicles/mercedes-benz-s500-2026/15.webp",
    "https://www.transyachtgroup.com/images/vehicles/mercedes-benz-s500-2026/18.webp",
    "https://www.transyachtgroup.com/images/vehicles/mercedes-benz-s500-2026/16.webp",
    "https://www.transyachtgroup.com/images/vehicles/mercedes-benz-s500-2026/01.webp",
    "https://www.transyachtgroup.com/images/vehicles/mercedes-benz-s500-2026/05.webp",
    "https://www.transyachtgroup.com/images/vehicles/mercedes-benz-s500-2026/02.webp",
    "https://www.transyachtgroup.com/images/vehicles/mercedes-benz-s500-2026/11.webp",
    "https://www.transyachtgroup.com/images/vehicles/mercedes-benz-s500-2026/06.webp",
    "https://www.transyachtgroup.com/images/vehicles/mercedes-benz-s500-2026/12.webp"
  ]'::jsonb,
  TRUE,
  TRUE,
  jsonb_build_object(
    'pricePerDay', '550',
    'pricePerThreeDays', '1650',
    'pricePerMonth', '7000',
    'engine', '3.0L inline-6 turbo with 48V mild-hybrid EQ Boost',
    'horsepower', '435 PS',
    'torque', '520 Nm',
    'acceleration', '4.9 s',
    'topSpeed', '250 km/h (electronically limited)',
    'transmission', '9G-TRONIC 9-speed automatic',
    'drivetrain', '4MATIC all-wheel drive',
    'seats', '5',
    'fuelType', 'Petrol mild hybrid',
    'year', '2026',
    'kmIncluded', '150 km / day',
    'extraPricePerKm', '5',
    'deposit', '5000',
    'bodyType', 'Luxury sedan',
    'colour', 'Obsidian Black',
    'unitSystem', 'metric',
    'fullDescription', 'Travel the Riviera in the benchmark luxury saloon. The 2026 Mercedes-Benz S500 4MATIC blends a turbocharged 3.0-litre inline-six mild-hybrid powertrain with confident all-wheel drive and the exceptionally smooth 9G-TRONIC transmission. AIRMATIC air suspension isolates the cabin from the road, while advanced Mercedes-Benz driver-assistance systems make every journey composed and reassuring. Inside, five passengers enjoy fine materials, generous rear-seat space, panoramic ambience, intuitive MBUX connectivity and the quiet refinement expected from an S-Class. Equally suited to executive transfers, business travel, special occasions and elegant coastal escapes, the S500 delivers discreet authority, effortless performance and first-class comfort.'
  ),
  '{}'::jsonb,
  'own',
  NULL
WHERE NOT EXISTS (
  SELECT 1
  FROM "vehicles"
  WHERE "category" = 'car'
    AND "name" = 'Mercedes-Benz S500 4MATIC 2026'
);
