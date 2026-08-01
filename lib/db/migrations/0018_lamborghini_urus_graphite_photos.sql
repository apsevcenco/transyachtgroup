-- Replace the Lamborghini Urus Graphite Edition gallery with first-party,
-- privacy-safe catalogue images. Visible registration plates are covered.

UPDATE "vehicles"
SET
  "image" = 'https://www.transyachtgroup.com/images/vehicles/lamborghini-urus-graphite-edition/00.webp',
  "images" = '[
    "https://www.transyachtgroup.com/images/vehicles/lamborghini-urus-graphite-edition/00.webp",
    "https://www.transyachtgroup.com/images/vehicles/lamborghini-urus-graphite-edition/01.webp",
    "https://www.transyachtgroup.com/images/vehicles/lamborghini-urus-graphite-edition/02.webp",
    "https://www.transyachtgroup.com/images/vehicles/lamborghini-urus-graphite-edition/03.webp"
  ]'::jsonb
WHERE "id" = 144
  AND "category" = 'car'
  AND "name" = 'Lamborghini Urus Graphite Edition';
