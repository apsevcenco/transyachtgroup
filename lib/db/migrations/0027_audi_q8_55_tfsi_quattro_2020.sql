-- Add the company-owned Audi Q8 55 TFSI quattro catalogue card.
-- Registration data is intentionally excluded from the public vehicle record.
-- The insert is idempotent and can be applied safely more than once.

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
  'Audi Q8 55 TFSI quattro 2020',
  'car',
  'A refined five-seat luxury SUV with a 340 PS turbocharged V6, quattro all-wheel drive, S line styling and a panoramic leather interior for confident travel across the French Riviera.',
  'https://www.transyachtgroup.com/images/vehicles/audi-q8-55-tfsi-quattro-2020/01.webp',
  '[
    "https://www.transyachtgroup.com/images/vehicles/audi-q8-55-tfsi-quattro-2020/01.webp",
    "https://www.transyachtgroup.com/images/vehicles/audi-q8-55-tfsi-quattro-2020/02.webp",
    "https://www.transyachtgroup.com/images/vehicles/audi-q8-55-tfsi-quattro-2020/03.webp",
    "https://www.transyachtgroup.com/images/vehicles/audi-q8-55-tfsi-quattro-2020/04.webp",
    "https://www.transyachtgroup.com/images/vehicles/audi-q8-55-tfsi-quattro-2020/05.webp",
    "https://www.transyachtgroup.com/images/vehicles/audi-q8-55-tfsi-quattro-2020/06.webp",
    "https://www.transyachtgroup.com/images/vehicles/audi-q8-55-tfsi-quattro-2020/07.webp",
    "https://www.transyachtgroup.com/images/vehicles/audi-q8-55-tfsi-quattro-2020/08.webp",
    "https://www.transyachtgroup.com/images/vehicles/audi-q8-55-tfsi-quattro-2020/09.webp"
  ]'::jsonb,
  FALSE,
  TRUE,
  jsonb_build_object(
    'engine', '3.0L turbocharged V6 with 48V mild-hybrid system',
    'horsepower', '340 PS (250 kW)',
    'torque', '500 Nm',
    'acceleration', '5.6 s',
    'topSpeed', '250 km/h (electronically limited)',
    'transmission', '8-speed tiptronic automatic',
    'drivetrain', 'quattro permanent all-wheel drive',
    'seats', '5',
    'fuelType', 'Petrol mild hybrid',
    'year', '2020',
    'bodyType', 'Luxury SUV coupe',
    'colour', 'White',
    'length', '4,986 mm',
    'luggageCapacity', '605–1,755 litres',
    'unitSystem', 'metric',
    'fullDescription', 'The Audi Q8 55 TFSI quattro combines the presence and versatility of a large luxury SUV with the flowing profile of a four-door coupe. Its 3.0-litre turbocharged V6 produces 340 PS and 500 Nm, working with an eight-speed tiptronic transmission, quattro permanent all-wheel drive and a 48-volt mild-hybrid system for smooth, assured progress. Acceleration from 0 to 100 km/h takes 5.6 seconds, while the electronically limited maximum speed is 250 km/h. This white example pairs S line exterior detailing and black alloy wheels with a warm brown leather cabin, dual touchscreen controls, digital instrumentation and a panoramic glass roof. Five-seat comfort, generous luggage space and confident all-weather traction make it equally suited to airport transfers, coastal journeys, family travel and elegant arrivals in Monaco, Cannes, Nice and Saint-Tropez.'
  ),
  jsonb_build_object(
    'fr', jsonb_build_object(
      'name', 'Audi Q8 55 TFSI quattro 2020',
      'description', 'Un SUV de luxe raffiné à cinq places, doté d''un V6 turbo de 340 ch, de la transmission intégrale quattro, d''un style S line et d''un habitacle cuir panoramique.',
      'fullDescription', 'L''Audi Q8 55 TFSI quattro associe la présence et la polyvalence d''un grand SUV de luxe aux lignes fluides d''un coupé quatre portes. Son V6 turbo de 3,0 litres développe 340 ch et 500 Nm, avec une boîte tiptronic à huit rapports, la transmission intégrale permanente quattro et un système hybride léger 48 volts. Le 0 à 100 km/h est réalisé en 5,6 secondes et la vitesse maximale est limitée électroniquement à 250 km/h. Cet exemplaire blanc réunit des détails extérieurs S line, des jantes noires, un intérieur en cuir brun, une instrumentation numérique, deux écrans tactiles et un toit panoramique. Ses cinq places, son coffre généreux et sa motricité en font un choix élégant pour les transferts, les trajets côtiers et les séjours sur la Côte d''Azur.'
    ),
    'ru', jsonb_build_object(
      'name', 'Audi Q8 55 TFSI quattro 2020',
      'description', 'Премиальный пятиместный SUV с турбированным V6 мощностью 340 л.с., полным приводом quattro, пакетом S line и панорамным кожаным салоном.',
      'fullDescription', 'Audi Q8 55 TFSI quattro сочетает солидность и практичность большого премиального SUV с динамичным силуэтом четырёхдверного купе. Турбированный V6 объёмом 3,0 литра развивает 340 л.с. и 500 Нм и работает вместе с восьмиступенчатой коробкой tiptronic, постоянным полным приводом quattro и 48-вольтовой системой mild hybrid. Разгон до 100 км/ч занимает 5,6 секунды, максимальная скорость электронно ограничена на отметке 250 км/ч. Белый кузов с элементами S line и чёрными колёсными дисками дополнен коричневым кожаным салоном, цифровой приборной панелью, двумя сенсорными экранами и панорамной крышей. Пять полноценных мест, вместительный багажник и уверенная тяга делают автомобиль удобным для трансферов, семейных поездок и путешествий по Лазурному Берегу.'
    ),
    'ro', jsonb_build_object(
      'name', 'Audi Q8 55 TFSI quattro 2020',
      'description', 'Un SUV premium cu cinci locuri, motor V6 turbo de 340 CP, tracțiune integrală quattro, design S line și interior panoramic din piele.',
      'fullDescription', 'Audi Q8 55 TFSI quattro îmbină prezența și versatilitatea unui SUV premium de mari dimensiuni cu profilul fluid al unui coupé cu patru uși. Motorul V6 turbo de 3,0 litri dezvoltă 340 CP și 500 Nm și este asociat cu o transmisie tiptronic cu opt trepte, tracțiune integrală permanentă quattro și un sistem mild-hybrid de 48 V. Accelerația de la 0 la 100 km/h durează 5,6 secunde, iar viteza maximă este limitată electronic la 250 km/h. Exemplarul alb oferă detalii S line, jante negre, interior din piele maro, instrumentar digital, două ecrane tactile și plafon panoramic. Cele cinci locuri, portbagajul generos și tracțiunea sigură îl recomandă pentru transferuri, călătorii de familie și deplasări elegante pe Riviera Franceză.'
    ),
    'ar', jsonb_build_object(
      'name', 'Audi Q8 55 TFSI quattro 2020',
      'description', 'سيارة SUV فاخرة بخمسة مقاعد ومحرك V6 توربو بقوة 340 حصاناً ودفع quattro رباعي وتصميم S line ومقصورة جلدية بانورامية.',
      'fullDescription', 'تجمع Audi Q8 55 TFSI quattro بين حضور سيارة SUV فاخرة كبيرة وتعدد استخداماتها وبين الخطوط الانسيابية لسيارة كوبيه بأربعة أبواب. يولد محرك V6 توربو سعة 3.0 لترات قوة 340 حصاناً وعزم 500 نيوتن متر، ويعمل مع ناقل tiptronic من ثماني سرعات ونظام quattro للدفع الرباعي الدائم ونظام هجين خفيف بجهد 48 فولت. تتسارع من صفر إلى 100 كم/س خلال 5.6 ثوانٍ وتبلغ سرعتها القصوى المحددة إلكترونياً 250 كم/س. وتتميز هذه النسخة البيضاء بتفاصيل S line وعجلات سوداء ومقصورة من الجلد البني وشاشات رقمية وسقف زجاجي بانورامي. توفر خمسة مقاعد ومساحة أمتعة كبيرة وثباتاً ممتازاً للرحلات والتنقلات الراقية على الريفييرا الفرنسية.'
    )
  ),
  'own',
  NULL
WHERE NOT EXISTS (
  SELECT 1 FROM "vehicles"
  WHERE "category" = 'car'
    AND "name" = 'Audi Q8 55 TFSI quattro 2020'
);

