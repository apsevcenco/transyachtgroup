-- Curated luxury car-rental competitors serving the French Riviera and Monaco.
-- Sources were checked against the operators' public websites on 2026-08-19.
-- This seed is intentionally additive: existing SEO Intelligence records are preserved.

INSERT INTO seo_competitors (name, base_url, notes, active)
VALUES
  (
    'Luxury & Services / Excellence Rent Monaco',
    'https://www.luxuryrent.fr/',
    'Verified 2026-08-19. Luxury and sports car rental with agencies or delivery in Monaco, Nice, Cannes and Saint-Tropez.',
    TRUE
  ),
  (
    'Supercar Sharing',
    'https://www.supercarsharing.com/',
    'Verified 2026-08-19. Supercar rental serving Monaco and the French Riviera with local delivery and collection.',
    TRUE
  ),
  (
    'Cannes Luxury Car Rental',
    'https://cannesluxurycarrental.fr/',
    'Verified 2026-08-19. Luxury and prestige car rental focused on Cannes, the Cote d''Azur and Monaco.',
    TRUE
  ),
  (
    'LUXELANE',
    'https://luxelane.fr/',
    'Verified 2026-08-19. Luxury vehicles with or without chauffeur in Cannes, Monaco, Saint-Tropez, Nice and Antibes.',
    TRUE
  ),
  (
    'MontecarloSupercars',
    'https://montecarlosupercars.com/',
    'Verified 2026-08-19. Luxury and supercar rental in Monaco and across the French Riviera.',
    TRUE
  ),
  (
    'Performance GT',
    'https://www.performance-gt.com/',
    'Verified 2026-08-19. Prestige, sports and exceptional vehicle rental with service in Cannes, Nice and Monaco.',
    TRUE
  ),
  (
    'MC Luxury Car',
    'https://www.mcluxurycar.com/',
    'Verified 2026-08-19. Prestige and supercar rental serving Monaco, Monte-Carlo, Nice and Cannes.',
    TRUE
  ),
  (
    'First Class Rentals',
    'https://firstclass-rentals.rentals/',
    'Verified 2026-08-19. Private luxury and exceptional car rental from Nice with service to Monaco, Cannes and Saint-Tropez.',
    TRUE
  ),
  (
    'Monaco Super Car Rental',
    'https://monacosupercarrental.com/',
    'Verified 2026-08-19. Luxury and supercar fleet based in Monaco with hotel, port and Riviera delivery.',
    TRUE
  ),
  (
    'MC Car Riviera',
    'https://www.mccarriviera.com/',
    'Verified 2026-08-19. Luxury car rental based in Antibes and Juan-les-Pins, serving Monaco, Cannes, Nice and Saint-Tropez.',
    TRUE
  ),
  (
    'Need GT',
    'https://needgt.fr/',
    'Verified 2026-08-19. Luxury, prestige and sports car rental with delivery in Nice, Cannes, Monaco and Saint-Tropez.',
    TRUE
  ),
  (
    'Azur Tropez',
    'https://azurtropez.com/',
    'Verified 2026-08-19. Luxury and sports car fleet serving Saint-Tropez, Cannes, Monaco and the wider Riviera.',
    TRUE
  ),
  (
    'Alpine & Riviera',
    'https://alpineriviera.fr/',
    'Verified 2026-08-19. Luxury rental and chauffeur services across Monaco, Saint-Tropez, Cannes and Nice.',
    TRUE
  ),
  (
    'Excellence Riviera',
    'https://excellenceriviera.com/',
    'Verified 2026-08-19. Luxury vehicle rental and concierge coverage from Saint-Tropez to Monaco.',
    TRUE
  ),
  (
    'Riviera Prestige Cars',
    'https://rivieraprestigecars.com/',
    'Verified 2026-08-19. Prestige and sports car rental covering the French Riviera from Monaco to Saint-Tropez.',
    TRUE
  ),
  (
    'Evasion GT',
    'https://evasion-gt.com/',
    'Verified 2026-08-19. Luxury and supercar rental on the Cote d''Azur with delivery to hotels, villas and airports.',
    TRUE
  ),
  (
    'Azur Luxury Rent',
    'https://azur-luxury-rent.fr/',
    'Verified 2026-08-19. Prestige and GT vehicle rental operating in Cannes and across the Cote d''Azur.',
    TRUE
  ),
  (
    'Riviera Services Agency',
    'https://www.rivieraservicesagency.com/',
    'Verified 2026-08-19. High-end car rental and concierge service in Cannes, Saint-Tropez, Nice and Monaco.',
    TRUE
  ),
  (
    'Elite Rent-a-Car Monaco',
    'https://www.eliterent.com/',
    'Verified 2026-08-19. International luxury and supercar rental operator with dedicated Monaco delivery and service.',
    TRUE
  ),
  (
    'AAA Luxury & Sport Car Rental',
    'https://www.aaarentcars.fr/',
    'Verified 2026-08-19. Luxury and sports car rental operating in Cannes and Monaco.',
    TRUE
  ),
  (
    'King Rent Monaco',
    'https://www.kingrent.com/',
    'Verified 2026-08-19. Luxury, sports and supercar rental with door-to-door service in Monaco.',
    TRUE
  )
ON CONFLICT (base_url) DO NOTHING;
