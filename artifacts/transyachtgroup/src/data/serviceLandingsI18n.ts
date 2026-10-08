/**
 * Translations of the main copy of the service landing pages (title, eyebrow, description, intro,
 * details and the custom FAQ). The generic page chrome (steps, FAQ headings, buttons) lives in
 * UI[lang] in serviceLandings.ts. Pure data, no imports, so the build-time prerender can load it
 * on its own. A language page is only published when its entry exists here.
 */
export type TranslatedLanding = {
  title: string;
  eyebrow: string;
  description: string;
  intro: string;
  details: string;
  faq?: Array<{ q: string; a: string }>;
};

export type LandingLang = "fr" | "ru" | "ro" | "ar";
export const LANDING_LANGS: readonly LandingLang[] = ["fr", "ru", "ro", "ar"];

const FR: Record<string, TranslatedLanding> = {
  "luxury-car-rental-cannes": {
    title: "Location de voitures de luxe à Cannes",
    eyebrow: "Livraison privée à Cannes",
    description: "Location de voitures de luxe à Cannes avec livraison discrète à l’hôtel, à la villa, au Port Canto et sur la Croisette, assurée par une conciergerie dédiée.",
    intro: "Choisissez une berline raffinée, un SUV ou une supercar pour votre séjour à Cannes. Nous traitons chaque demande individuellement et organisons la livraison à l’heure et à l’adresse convenues.",
    details: "Des arrivées à l’aéroport aux rendez-vous d’affaires, en passant par les événements sur la Croisette, le service s’organise autour de votre emploi du temps. La disponibilité, les conditions de location et le devis final sont confirmés personnellement avant la réservation.",
  },
  "luxury-car-rental-monaco": {
    title: "Location de voitures de luxe à Monaco",
    eyebrow: "Livraison privée à Monaco",
    description: "Location de voitures de luxe et de supercars à Monaco avec livraison privée à Monte-Carlo, Fontvieille et au Port Hercule.",
    intro: "Accédez à une sélection de véhicules de prestige pour Monaco, avec une conciergerie qui gère tous les détails pratiques, de la demande à la remise des clés.",
    details: "Nous coordonnons la livraison autour des hôtels, résidences, marinas et programmes d’événements. Chaque proposition tient compte de la disponibilité actuelle de la flotte ainsi que des dates, du trajet et des exigences de chauffeur que vous indiquez.",
  },
  "luxury-car-rental-nice": {
    title: "Location de voitures de luxe à Nice",
    eyebrow: "Livraison à l’aéroport et en ville à Nice",
    description: "Location de voitures de luxe à Nice avec livraison à l’aéroport Nice Côte d’Azur, à l’hôtel ou à une adresse privée sur la Côte d’Azur.",
    intro: "Commencez votre séjour sur la Riviera avec un véhicule livré à l’aéroport de Nice ou à l’adresse de votre choix. Notre équipe coordonne l’horaire, le choix du modèle et les besoins de déplacement ultérieurs.",
    details: "Nice est un point d’arrivée pratique pour Cannes, Monaco, Antibes et Saint-Tropez. Indiquez-nous l’itinéraire complet afin que la proposition intègre la livraison, la restitution et la catégorie de véhicule souhaitée.",
  },
  "luxury-car-rental-saint-tropez": {
    title: "Location de voitures de luxe à Saint-Tropez",
    eyebrow: "Saint-Tropez et Pampelonne",
    description: "Location de voitures de luxe et de supercars à Saint-Tropez avec livraison privée à la villa, à l’hôtel, au port et à Pampelonne.",
    intro: "Organisez un véhicule de luxe pour votre séjour à Saint-Tropez, Ramatuelle ou Pampelonne, avec une livraison planifiée selon votre arrivée et votre hébergement.",
    details: "La demande est forte en saison : chaque modèle est donc confirmé selon la disponibilité réelle. Notre concierge peut associer la location à des transferts aéroport, à vos projets de yacht et à la restitution en fin de séjour.",
  },
  "luxury-car-rental-antibes": {
    title: "Location de voitures de luxe à Antibes",
    eyebrow: "Antibes, Cap d’Antibes et Juan-les-Pins",
    description: "Location de voitures de luxe à Antibes et au Cap d’Antibes avec livraison discrète à l’hôtel, à la villa, à la marina ou à une résidence privée.",
    intro: "Organisez une location de voiture de luxe à Antibes autour de votre villa, de votre hôtel, de votre arrivée en marina ou de votre itinéraire privé entre Cannes, Nice et Monaco.",
    details: "Le service est préparé selon vos dates exactes, le lieu de livraison, vos besoins en bagages et la catégorie de véhicule souhaitée. La disponibilité, la caution, le kilométrage et les modalités de restitution sont confirmés dans votre offre individuelle avant la réservation.",
  },
  "luxury-car-rental-courchevel": {
    title: "Location de voitures de luxe à Courchevel",
    eyebrow: "Mobilité de luxe d’hiver à Courchevel",
    description: "Location de voitures de luxe à Courchevel avec SUV premium, véhicules de direction et livraison discrète pour les séjours en chalet ou à l’hôtel.",
    intro: "Organisez votre location de voiture de luxe à Courchevel autour de votre chalet, de votre hôtel, de votre transfert aéroport ou de votre programme privé d’hiver, avec des véhicules confirmés pour vos dates.",
    details: "Les demandes de haute saison sont traitées individuellement. Nous confirmons la disponibilité réelle, les conditions de livraison, la caution, le kilométrage, les besoins en bagages et l’adéquation du véhicule aux routes d’hiver avant la réservation.",
  },
  "courchevel-private-transfers": {
    title: "Transferts privés vers Courchevel",
    eyebrow: "Aéroports de Genève, Lyon, Chambéry et Turin",
    description: "Transferts privés de luxe vers Courchevel depuis les aéroports de Genève, Lyon, Chambéry et Turin, avec véhicules de direction et coordination personnelle du trajet.",
    intro: "Rejoignez Courchevel en toute discrétion depuis l’aéroport de Genève, Lyon, Chambéry ou Turin. Nous coordonnons l’horaire de prise en charge, les besoins des passagers, les bagages et la destination avant de confirmer votre transfert sur mesure.",
    details: "Les véhicules de direction sont choisis selon votre groupe et votre trajet, avec des Mercedes-Benz Classe V et des options premium comparables, selon disponibilité. Communiquez vos détails de vol, le nombre de passagers, vos bagages et votre adresse à Courchevel pour recevoir un devis individuel clair.",
    faq: [
      { q: "Depuis quels aéroports le transfert peut-il partir ?", a: "Les transferts peuvent être organisés depuis Genève, Lyon, Chambéry ou Turin, selon la disponibilité du véhicule et du chauffeur à la date et à l’heure souhaitées." },
      { q: "Le véhicule est-il confirmé avant la réservation ?", a: "Oui. La catégorie de véhicule, la prise en charge, le trajet et le prix final sont confirmés dans votre offre individuelle avant la réservation du transfert." },
    ],
  },
  "geneva-airport-to-courchevel-transfer": {
    title: "Transfert de l’aéroport de Genève à Courchevel",
    eyebrow: "Transfert privé de Genève à Courchevel",
    description: "Transfert privé de l’aéroport de Genève à Courchevel avec véhicules de direction, organisation des bagages et coordination discrète par la conciergerie.",
    intro: "Organisez un transfert privé de l’aéroport de Genève à Courchevel avec un véhicule choisi selon vos passagers, vos bagages, l’heure de votre vol et l’adresse finale de votre chalet ou hôtel.",
    details: "Le trajet est planifié avant votre arrivée afin que le lieu de prise en charge, l’horaire, la catégorie de véhicule et l’itinéraire soient clairs. Des Mercedes-Benz Classe V et des véhicules de direction comparables peuvent être proposés selon la taille du groupe et la disponibilité.",
    faq: [
      { q: "Le transfert peut-il être organisé de l’aéroport de Genève à Courchevel 1850 ?", a: "Oui. Communiquez le numéro de vol, le nombre de passagers, les bagages et l’adresse finale afin que la prise en charge et la destination soient confirmées dans l’offre individuelle." },
      { q: "Pouvez-vous organiser un retour de Courchevel à l’aéroport de Genève ?", a: "Oui. Les transferts retour peuvent être coordonnés, avec l’horaire de prise en charge, les bagages et les détails du vol de départ intégrés au plan." },
    ],
  },
  "lyon-airport-to-courchevel-transfer": {
    title: "Transfert de l’aéroport de Lyon à Courchevel",
    eyebrow: "Transfert privé de Lyon à Courchevel",
    description: "Transfert privé de l’aéroport de Lyon à Courchevel avec véhicules de direction, planification du trajet et accompagnement personnel de la conciergerie.",
    intro: "Organisez un transfert privé de l’aéroport de Lyon à Courchevel pour vos vacances au ski, votre arrivée en chalet ou votre séjour à l’hôtel, avec l’horaire et la catégorie de véhicule préparés autour de votre voyage.",
    details: "Nous confirmons le lieu de prise en charge, l’itinéraire, le nombre de passagers, les bagages et l’adresse finale à Courchevel avant la réservation. Des vans premium et des véhicules de direction sont proposés selon la disponibilité et les besoins du groupe.",
    faq: [
      { q: "Pouvez-vous prendre en charge les bagages de ski sur un transfert Lyon – Courchevel ?", a: "Oui. Indiquez le nombre de passagers et le volume de bagages, y compris le matériel de ski, afin de proposer une catégorie de véhicule adaptée." },
      { q: "Le trajet peut-il inclure un arrêt en route vers Courchevel ?", a: "Oui. Les arrêts prévus peuvent être inclus dans le devis individuel une fois l’horaire et l’itinéraire confirmés." },
    ],
  },
  "private-jet-to-car-transfer-courchevel": {
    title: "Transfert jet privé – voiture à Courchevel",
    eyebrow: "Coordination aéroport, héliport et chalet",
    description: "Transfert du jet privé à la voiture à Courchevel avec véhicules de direction, prise en charge adaptée à votre vol et coordination discrète jusqu’au chalet.",
    intro: "Passez de l’aviation privée à un véhicule de direction qui vous attend, avec un transfert préparé selon votre vol, vos bagages, vos passagers et votre adresse à Courchevel.",
    details: "Nous coordonnons la prise en charge à l’aéroport ou à l’héliport, l’horaire du trajet et la catégorie de véhicule avant le départ. Des Mercedes-Benz Classe V et des options premium comparables peuvent être proposées selon la taille du groupe et la disponibilité.",
    faq: [
      { q: "Le chauffeur peut-il se coordonner avec les horaires de l’aviation privée ?", a: "Oui. Communiquez les détails du vol, les informations sur le terminal ou le handler et la destination afin d’aligner la prise en charge sur l’arrivée réelle." },
      { q: "Le transfert peut-il se poursuivre directement jusqu’au chalet ou à l’hôtel ?", a: "Oui. L’adresse finale à Courchevel, les bagages et le nombre de passagers sont intégrés au devis individuel." },
    ],
  },
  "yacht-charter-cannes": {
    title: "Location de yacht de luxe à Cannes",
    eyebrow: "Charters privés au départ de Cannes",
    description: "Charter de yacht de luxe à Cannes avec itinéraires sur mesure, flotte sélectionnée et accompagnement d’une conciergerie dédiée.",
    intro: "Découvrez la côte depuis Cannes à bord d’un yacht privé choisi selon votre groupe, vos dates et votre style de navigation.",
    details: "Les départs peuvent être coordonnés depuis les ports de la région de Cannes, selon le yacht et la place à quai. Indiquez le nombre d’invités et l’itinéraire souhaité pour recevoir une sélection avec disponibilités actuelles et conditions de charter claires.",
  },
  "yacht-charter-monaco": {
    title: "Location de yacht de luxe à Monaco",
    eyebrow: "Charters privés au départ de Monaco",
    description: "Charter de yacht de luxe à Monaco avec sélection soignée, itinéraires sur mesure et coordination discrète par la conciergerie.",
    intro: "Organisez un charter privé au départ de Monaco avec un yacht adapté à vos invités, à votre programme et à vos attentes pour la vie à bord.",
    details: "Notre concierge coordonne la demande, les yachts disponibles et les détails pratiques d’embarquement. Le point de départ final, l’itinéraire et les services sont confirmés dans la proposition de charter individuelle.",
  },
  "yacht-charter-nice": {
    title: "Location de yacht de luxe à Nice",
    eyebrow: "Charters privés au départ de Nice",
    description: "Charter de yacht de luxe à Nice avec itinéraires sur mesure, yachts sélectionnés et coordination discrète par la conciergerie.",
    intro: "Organisez un charter de yacht privé au départ de Nice pour une croisière côtière, des baignades, des transferts vers un restaurant ou une journée en mer sur mesure sur la Riviera.",
    details: "Indiquez vos dates, le nombre d’invités, le point d’embarquement souhaité et vos attentes à bord. Le yacht, l’itinéraire et les services sont confirmés dans une proposition de charter privée selon la disponibilité.",
  },
  "yacht-charter-saint-tropez": {
    title: "Location de yacht de luxe à Saint-Tropez",
    eyebrow: "Journées privées en yacht à Saint-Tropez",
    description: "Charter de yacht de luxe à Saint-Tropez avec itinéraires privés, organisation des accès aux beach clubs et accompagnement d’une conciergerie dédiée.",
    intro: "Organisez un charter de yacht privé autour de Saint-Tropez, de Pampelonne et du littoral voisin, avec un yacht choisi selon vos invités et votre programme.",
    details: "La demande est forte en saison : chaque demande est donc vérifiée selon la disponibilité réelle. Nous coordonnons l’embarquement, les idées d’itinéraire, les attentes de service à bord et les transferts retour avant de confirmer la proposition.",
  },
  "lamborghini-rental-french-riviera": {
    title: "Location de Lamborghini sur la Côte d’Azur",
    eyebrow: "Location de Lamborghini avec conciergerie",
    description: "Louez une Lamborghini sur la Côte d’Azur avec livraison privée à Cannes, Monaco, Nice et Saint-Tropez.",
    intro: "Demandez une Lamborghini pour un séjour sur la Riviera, une occasion spéciale ou une expérience de conduite hors du commun, avec une livraison coordonnée par notre conciergerie.",
    details: "Les modèles ne sont présentés que lorsqu’ils figurent dans la flotte actuelle. La disponibilité exacte, la caution, le kilométrage autorisé et les conditions de livraison dépendent du véhicule choisi et des dates de location, et sont confirmés avant la réservation.",
  },
  "lamborghini-rental-courchevel": {
    title: "Location de Lamborghini à Courchevel",
    eyebrow: "Location d’hiver de Lamborghini avec conciergerie",
    description: "Location de Lamborghini à Courchevel avec coordination de la livraison privée, vérification de la disponibilité réelle et accompagnement de la conciergerie.",
    intro: "Demandez une Lamborghini pour un séjour à Courchevel, une arrivée en chalet ou un itinéraire en montagne, avec livraison et restitution planifiées selon vos dates.",
    details: "Chaque demande de Lamborghini est vérifiée selon la disponibilité réelle de la flotte avant confirmation. La caution, le kilométrage, les conditions d’assurance, l’adéquation au contexte hivernal et les détails de livraison figurent dans l’offre individuelle.",
  },
  "mercedes-rental-french-riviera": {
    title: "Location de Mercedes-Benz sur la Côte d’Azur",
    eyebrow: "Location de prestige Mercedes-Benz",
    description: "Location de voitures de luxe Mercedes-Benz sur la Côte d’Azur, avec livraison privée de Nice à Cannes, Monaco et Saint-Tropez.",
    intro: "Choisissez le confort Mercedes-Benz pour vos déplacements professionnels, vos arrivées à l’aéroport et vos longs séjours sur la Riviera, avec un modèle sélectionné selon vos priorités.",
    details: "Notre collection actuelle peut comprendre des berlines de luxe, des modèles sportifs et des SUV. Le concierge confirme le véhicule exact, le plan de livraison et les conditions de location pour les dates demandées.",
  },
  "mercedes-rental-courchevel": {
    title: "Location de Mercedes-Benz à Courchevel",
    eyebrow: "Mercedes-Benz et Classe V à Courchevel",
    description: "Location de Mercedes-Benz à Courchevel pour transferts privés, séjours en chalet et mobilité d’hiver, avec coordination par la conciergerie.",
    intro: "Organisez le confort Mercedes-Benz pour Courchevel, de la planification d’un transfert en Classe V aux SUV premium et aux modèles de direction choisis selon votre séjour.",
    details: "Nous confirmons la catégorie exacte de modèle, la prise en charge, les besoins en bagages et les conditions de livraison avant la réservation. Les options Mercedes-Benz sont particulièrement utiles pour les transferts privés depuis Genève, Lyon et les aéroports vers Courchevel.",
  },
  "ferrari-rental-french-riviera": {
    title: "Location de Ferrari sur la Côte d’Azur",
    eyebrow: "Location de Ferrari avec conciergerie",
    description: "Location de Ferrari sur la Côte d’Azur avec livraison privée à Cannes, Monaco, Nice et Saint-Tropez.",
    intro: "Demandez une Ferrari choisie pour une conduite d’exception le long de la Riviera, avec une livraison discrète et un accompagnement personnel pour la réservation.",
    details: "Chaque demande est vérifiée selon la disponibilité actuelle de la flotte. Les exigences propres au véhicule, le kilométrage, la caution, l’assurance et les itinéraires autorisés sont présentés en toute transparence dans l’offre individuelle.",
  },
  "ferrari-rental-courchevel": {
    title: "Location de Ferrari à Courchevel",
    eyebrow: "Location de Ferrari avec conciergerie à Courchevel",
    description: "Location de Ferrari à Courchevel avec disponibilité vérifiée individuellement et livraison coordonnée pour des séjours d’hiver haut de gamme.",
    intro: "Demandez une Ferrari pour un itinéraire à Courchevel, une arrivée remarquée ou un séjour privé, avec une proposition préparée selon la disponibilité réelle et les conditions applicables.",
    details: "La disponibilité en saison de montagne et l’adéquation du véhicule pouvant varier, chaque demande de Ferrari est confirmée individuellement. L’offre précise les conditions de location, la livraison, la caution, le kilométrage et la restitution.",
  },
  "rolls-royce-rental-french-riviera": {
    title: "Location de Rolls-Royce sur la Côte d’Azur",
    eyebrow: "Location privée de Rolls-Royce",
    description: "Location de Rolls-Royce sur la Côte d’Azur avec livraison discrète pour séjours, événements et déplacements privés à Cannes et Monaco.",
    intro: "Organisez une Rolls-Royce pour un déplacement privé raffiné, un événement particulier ou une arrivée importante, avec l’appui d’une conciergerie dédiée.",
    details: "Les modèles disponibles et les conditions de location sont confirmés pour chaque demande. Nous coordonnons le lieu et l’horaire de livraison choisis, tout en préservant un service personnel et discret.",
  },
  "rolls-royce-rental-courchevel": {
    title: "Location de Rolls-Royce à Courchevel",
    eyebrow: "Service d’arrivée hivernal en Rolls-Royce",
    description: "Location de Rolls-Royce à Courchevel pour des arrivées discrètes en chalet, des séjours à l’hôtel et une mobilité privée en hiver.",
    intro: "Organisez une Rolls-Royce ou un véhicule d’ultra-luxe comparable pour Courchevel, avec une conciergerie qui gère l’horaire, la livraison et les conditions.",
    details: "La disponibilité est vérifiée pour vos dates exactes avant confirmation. L’offre individuelle précise le modèle, le lieu de livraison, la caution, le kilométrage, les conditions d’assurance et d’éventuelles limitations d’itinéraire.",
  },
  "bentley-rental-courchevel": {
    title: "Location de Bentley à Courchevel",
    eyebrow: "Bentley et SUV de luxe comparables",
    description: "Location de Bentley à Courchevel, ou d’options comparables de SUV de luxe, pour séjours en chalet, transferts et voyages privés en hiver.",
    intro: "Demandez une Bentley ou un SUV de luxe comparable pour Courchevel, avec des options proposées selon la disponibilité réelle et votre trajet.",
    details: "Le concierge confirme si une Bentley ou un modèle comparable adapté est disponible pour vos dates. La proposition inclut la livraison, la restitution, la caution, le kilométrage et les conditions de route hivernale avant la réservation.",
    faq: [
      { q: "Une Bentley est-elle toujours disponible à Courchevel ?", a: "La disponibilité est confirmée individuellement pour vos dates. Si une Bentley n’est pas disponible, un SUV d’ultra-luxe comparable peut être proposé." },
      { q: "La voiture peut-elle être livrée à un chalet ou à un hôtel ?", a: "Oui. L’adresse de livraison, l’horaire et le lieu de restitution sont confirmés dans l’offre privée." },
    ],
  },
};

const RU: Record<string, TranslatedLanding> = {
  "luxury-car-rental-cannes": {
    title: "Аренда премиальных автомобилей в Каннах",
    eyebrow: "Частная доставка в Каннах",
    description: "Аренда премиальных автомобилей в Каннах с деликатной доставкой в отель, на виллу, в порт Канто и на Круазетт — с персональным консьержем.",
    intro: "Выберите изысканный седан, внедорожник или суперкар для поездки в Канны. Мы рассматриваем каждую заявку индивидуально и организуем доставку в согласованное время по нужному адресу.",
    details: "От встречи в аэропорту и деловых встреч до мероприятий на Круазетт — сервис строится вокруг вашего расписания. Наличие автомобиля, условия аренды и итоговая стоимость подтверждаются лично до бронирования.",
  },
  "luxury-car-rental-monaco": {
    title: "Аренда премиальных автомобилей в Монако",
    eyebrow: "Частная доставка в Монако",
    description: "Аренда премиальных автомобилей и суперкаров в Монако с частной доставкой в Монте-Карло, Фонвьей и порт Эркюль.",
    intro: "Выбирайте из отобранных автомобилей премиум-класса для Монако: консьерж берёт на себя все практические вопросы — от заявки до передачи ключей.",
    details: "Мы организуем доставку к отелям, резиденциям, маринам и местам проведения мероприятий. Каждое предложение учитывает актуальное наличие автомобилей, а также указанные вами даты, маршрут и требования к водителю.",
  },
  "luxury-car-rental-nice": {
    title: "Аренда премиальных автомобилей в Ницце",
    eyebrow: "Доставка в аэропорт и по городу Ницца",
    description: "Аренда премиальных автомобилей в Ницце с доставкой в аэропорт Ницца — Лазурный Берег, отель или по частному адресу на Лазурном Берегу.",
    intro: "Начните путешествие по Ривьере с автомобиля, поданного в аэропорт Ниццы или по выбранному адресу. Наша команда согласует время, подбор модели и дальнейшие потребности в поездках.",
    details: "Ницца — удобная точка прибытия для поездок в Канны, Монако, Антиб и Сен-Тропе. Сообщите нам полный маршрут, чтобы предложение учитывало доставку, возврат и нужную категорию автомобиля.",
  },
  "luxury-car-rental-saint-tropez": {
    title: "Аренда премиальных автомобилей в Сен-Тропе",
    eyebrow: "Сен-Тропе и Пампелонн",
    description: "Аренда премиальных автомобилей и суперкаров в Сен-Тропе с частной доставкой на виллу, в отель, в порт и на пляж Пампелонн.",
    intro: "Закажите премиальный автомобиль на время отдыха в Сен-Тропе, Рамату или Пампелонне: доставку мы планируем под ваш приезд и место проживания.",
    details: "В сезон спрос высок, поэтому каждая модель подтверждается по актуальному наличию. Консьерж может объединить аренду с трансферами из аэропорта, планами по яхте и возвратом автомобиля в конце поездки.",
  },
  "luxury-car-rental-antibes": {
    title: "Аренда премиальных автомобилей в Антибе",
    eyebrow: "Антиб, мыс Антиб и Жуан-ле-Пен",
    description: "Аренда премиальных автомобилей в Антибе и на мысе Антиб с деликатной доставкой в отель, на виллу, в марину или частную резиденцию.",
    intro: "Организуйте аренду премиального автомобиля в Антибе с учётом виллы, отеля, прибытия в марину или частного маршрута между Каннами, Ниццей и Монако.",
    details: "Сервис готовится под ваши точные даты, место доставки, объём багажа и желаемую категорию автомобиля. Наличие, залог, лимит пробега и условия возврата подтверждаются в индивидуальном предложении до бронирования.",
  },
  "luxury-car-rental-courchevel": {
    title: "Аренда премиальных автомобилей в Куршевеле",
    eyebrow: "Зимняя премиальная мобильность в Куршевеле",
    description: "Аренда премиальных автомобилей в Куршевеле: внедорожники премиум-класса, представительские автомобили и деликатная доставка для проживания в шале или отеле.",
    intro: "Спланируйте аренду премиального автомобиля в Куршевеле с учётом шале, отеля, трансфера из аэропорта или частного зимнего маршрута; варианты подтверждаются на ваши даты.",
    details: "Заявки в горный сезон рассматриваются индивидуально. До бронирования мы подтверждаем актуальное наличие, условия доставки, залог, пробег, потребности в багаже и пригодность автомобиля для зимних дорог.",
  },
  "courchevel-private-transfers": {
    title: "Частные трансферы в Куршевель",
    eyebrow: "Аэропорты Женевы, Лиона, Шамбери и Турина",
    description: "Частные трансферы премиум-класса в Куршевель из аэропортов Женевы, Лиона, Шамбери и Турина на представительских автомобилях с персональной организацией поездки.",
    intro: "Добирайтесь до Куршевеля приватно из аэропорта Женевы, Лиона, Шамбери или Турина. Мы согласуем время подачи, потребности пассажиров, багаж и пункт назначения, прежде чем подтвердить ваш индивидуальный трансфер.",
    details: "Представительские автомобили подбираются под вашу группу и маршрут: Mercedes-Benz V-Class и сопоставимые варианты премиум-класса — при наличии. Сообщите данные рейса, число пассажиров, багаж и адрес в Куршевеле, чтобы получить понятное индивидуальное предложение.",
    faq: [
      { q: "Из каких аэропортов возможен трансфер?", a: "Трансфер можно организовать из Женевы, Лиона, Шамбери или Турина — при наличии автомобиля и водителя на ваши дату и время." },
      { q: "Автомобиль подтверждается до бронирования?", a: "Да. Категория автомобиля, план встречи, маршрут и итоговая цена подтверждаются в индивидуальном предложении до бронирования трансфера." },
    ],
  },
  "geneva-airport-to-courchevel-transfer": {
    title: "Трансфер из аэропорта Женевы в Куршевель",
    eyebrow: "Частный трансфер из Женевы в Куршевель",
    description: "Частный трансфер из аэропорта Женевы в Куршевель на представительских автомобилях с продуманным багажом и деликатной координацией консьержа.",
    intro: "Закажите частный трансфер из аэропорта Женевы в Куршевель на автомобиле, подобранном под число пассажиров, багаж, время рейса и итоговый адрес шале или отеля.",
    details: "Поездка планируется заранее: место встречи, время, категория автомобиля и маршрут ясны ещё до прилёта. В зависимости от размера группы и наличия мы можем предложить Mercedes-Benz V-Class и сопоставимые представительские варианты.",
    faq: [
      { q: "Можно ли организовать трансфер из аэропорта Женевы в Куршевель 1850?", a: "Да. Сообщите номер рейса, число пассажиров, багаж и итоговый адрес — встреча и пункт назначения будут подтверждены в индивидуальном предложении." },
      { q: "Можно ли заказать обратный трансфер из Куршевеля в аэропорт Женевы?", a: "Да. Обратный трансфер организуется с учётом времени подачи, багажа и данных вылетающего рейса." },
    ],
  },
  "lyon-airport-to-courchevel-transfer": {
    title: "Трансфер из аэропорта Лиона в Куршевель",
    eyebrow: "Частный трансфер из Лиона в Куршевель",
    description: "Частный трансфер из аэропорта Лиона в Куршевель на представительских автомобилях с планированием маршрута и персональной поддержкой консьержа.",
    intro: "Организуйте частный трансфер из аэропорта Лиона в Куршевель для горнолыжного отпуска, приезда в шале или проживания в отеле: время и категория автомобиля подбираются под вашу поездку.",
    details: "До бронирования мы подтверждаем место встречи, маршрут, число пассажиров, требования к багажу и итоговый адрес в Куршевеле. Премиальные минивэны и представительские автомобили предлагаются по актуальному наличию и в зависимости от группы.",
    faq: [
      { q: "Можно ли перевезти горнолыжный багаж при трансфере Лион — Куршевель?", a: "Да. Сообщите число пассажиров и объём багажа, включая лыжное снаряжение, — мы предложим подходящую категорию автомобиля." },
      { q: "Можно ли сделать остановку по пути в Куршевель?", a: "Да. Запланированные остановки включаются в индивидуальный расчёт после подтверждения времени и маршрута." },
    ],
  },
  "private-jet-to-car-transfer-courchevel": {
    title: "Трансфер от частного самолёта до автомобиля в Куршевеле",
    eyebrow: "Аэропорт, вертолётная площадка и шале",
    description: "Трансфер от частного самолёта до автомобиля в Куршевеле: представительские автомобили, встреча с учётом рейса и деликатная координация до шале.",
    intro: "Переходите из частной авиации сразу в ожидающий вас автомобиль: трансфер готовится с учётом рейса, багажа, пассажиров и вашего адреса в Куршевеле.",
    details: "До поездки мы согласуем встречу в аэропорту или на вертолётной площадке, время в пути и категорию автомобиля. В зависимости от размера группы и наличия можно предложить Mercedes-Benz V-Class и сопоставимые варианты премиум-класса.",
    faq: [
      { q: "Может ли водитель подстроиться под время частного рейса?", a: "Да. Сообщите данные рейса, информацию о терминале или хендлере и пункт назначения — встреча будет согласована с фактическим прибытием." },
      { q: "Можно ли доехать сразу до шале или отеля?", a: "Да. Итоговый адрес в Куршевеле, багаж и число пассажиров учитываются в индивидуальном предложении." },
    ],
  },
  "yacht-charter-cannes": {
    title: "Аренда роскошных яхт в Каннах",
    eyebrow: "Частные чартеры из Канн",
    description: "Частный чартер роскошных яхт в Каннах с индивидуальными маршрутами, отобранным флотом и персональной поддержкой консьержа.",
    intro: "Откройте для себя побережье из Канн на частной яхте, подобранной под вашу компанию, даты и предпочитаемый стиль круиза.",
    details: "Отправление можно организовать из портов района Канн — в зависимости от яхты и места у причала. Сообщите число гостей и желаемый маршрут, чтобы получить подборку с актуальным наличием и понятными условиями чартера.",
  },
  "yacht-charter-monaco": {
    title: "Аренда роскошных яхт в Монако",
    eyebrow: "Частные чартеры из Монако",
    description: "Чартер роскошных яхт в Монако: тщательная подборка, индивидуальные маршруты и деликатная координация консьержа.",
    intro: "Спланируйте частный чартер из Монако на яхте, подходящей вашим гостям, программе и ожиданиям от жизни на борту.",
    details: "Наш консьерж координирует заявку, доступные яхты и практические детали посадки. Точка отправления, маршрут и услуги подтверждаются в индивидуальном предложении по чартеру.",
  },
  "yacht-charter-nice": {
    title: "Аренда роскошных яхт в Ницце",
    eyebrow: "Частные чартеры из Ниццы",
    description: "Чартер роскошных яхт в Ницце с индивидуальными маршрутами, отобранными яхтами и деликатной координацией консьержа.",
    intro: "Спланируйте частный чартер яхты из Ниццы: прогулка вдоль побережья, купание, поездка в ресторан или особенный день на море на Ривьере.",
    details: "Сообщите даты, число гостей, желаемый порт посадки и ожидания от жизни на борту. Яхта, маршрут и услуги подтверждаются в частном предложении по чартеру в зависимости от наличия.",
  },
  "yacht-charter-saint-tropez": {
    title: "Аренда роскошных яхт в Сен-Тропе",
    eyebrow: "Частные дни на яхте в Сен-Тропе",
    description: "Чартер роскошных яхт в Сен-Тропе с частными маршрутами, организацией визитов в бич-клубы и персональной поддержкой консьержа.",
    intro: "Организуйте частный чартер яхты у Сен-Тропе, Пампелонна и соседнего побережья на яхте, подобранной под ваших гостей и расписание.",
    details: "Сезонный спрос высок, поэтому каждая заявка проверяется по актуальному наличию. До подтверждения предложения мы согласуем посадку, идеи маршрута, ожидания от сервиса на борту и обратные трансферы.",
  },
  "lamborghini-rental-french-riviera": {
    title: "Аренда Lamborghini на Лазурном Берегу",
    eyebrow: "Аренда Lamborghini с консьерж-сервисом",
    description: "Аренда Lamborghini на Лазурном Берегу с частной доставкой в Каннах, Монако, Ницце и Сен-Тропе.",
    intro: "Закажите Lamborghini для поездки по Ривьере, особого случая или яркого опыта за рулём — доставку организует наш консьерж.",
    details: "Модели показываются только если они есть в актуальном автопарке. Точное наличие, залог, допустимый пробег и условия доставки зависят от выбранного автомобиля и дат аренды и подтверждаются до бронирования.",
  },
  "lamborghini-rental-courchevel": {
    title: "Аренда Lamborghini в Куршевеле",
    eyebrow: "Зимняя аренда Lamborghini с консьерж-сервисом",
    description: "Аренда Lamborghini в Куршевеле с организацией частной доставки, проверкой актуального наличия и поддержкой консьержа.",
    intro: "Закажите Lamborghini для отдыха в Куршевеле, приезда в шале или горного маршрута: доставка и возврат планируются под ваши даты.",
    details: "Каждая заявка на Lamborghini проверяется по актуальному наличию в автопарке до подтверждения. Залог, пробег, условия страхования, пригодность для зимних дорог и детали доставки указываются в индивидуальном предложении.",
  },
  "mercedes-rental-french-riviera": {
    title: "Аренда Mercedes-Benz на Лазурном Берегу",
    eyebrow: "Премиальная аренда Mercedes-Benz",
    description: "Аренда автомобилей Mercedes-Benz премиум-класса на Лазурном Берегу с частной доставкой из Ниццы в Канны, Монако и Сен-Тропе.",
    intro: "Выберите комфорт Mercedes-Benz для деловых поездок, встреч в аэропорту и длительного отдыха на Ривьере: модель подбирается под ваши приоритеты.",
    details: "В нашей актуальной коллекции могут быть роскошные седаны, спортивные модели и внедорожники. Консьерж подтверждает конкретный автомобиль, план доставки и условия аренды на запрошенные даты.",
  },
  "mercedes-rental-courchevel": {
    title: "Аренда Mercedes-Benz в Куршевеле",
    eyebrow: "Mercedes-Benz и V-Class в Куршевеле",
    description: "Аренда Mercedes-Benz в Куршевеле для частных трансферов, проживания в шале и зимней мобильности с координацией консьержа.",
    intro: "Организуйте комфорт Mercedes-Benz для Куршевеля — от планирования трансфера на V-Class до внедорожников премиум-класса и представительских моделей, подобранных под вашу поездку.",
    details: "До бронирования мы подтверждаем точную категорию модели, план встречи, требования к багажу и условия доставки. Варианты Mercedes-Benz особенно удобны для частных трансферов из Женевы, Лиона и других аэропортов в Куршевель.",
  },
  "ferrari-rental-french-riviera": {
    title: "Аренда Ferrari на Лазурном Берегу",
    eyebrow: "Аренда Ferrari с консьерж-сервисом",
    description: "Аренда Ferrari на Лазурном Берегу с частной доставкой в Каннах, Монако, Ницце и Сен-Тропе.",
    intro: "Закажите Ferrari для исключительной поездки вдоль Ривьеры с деликатной доставкой и персональной поддержкой при бронировании.",
    details: "Каждая заявка проверяется по актуальному наличию в автопарке. Требования к конкретному автомобилю, пробег, залог, страховка и допустимые маршруты прозрачно указываются в индивидуальном предложении.",
  },
  "ferrari-rental-courchevel": {
    title: "Аренда Ferrari в Куршевеле",
    eyebrow: "Аренда Ferrari с консьерж-сервисом в Куршевеле",
    description: "Аренда Ferrari в Куршевеле: наличие проверяется индивидуально, доставка координируется для премиального зимнего отдыха.",
    intro: "Закажите Ferrari для маршрута по Куршевелю, эффектного приезда или частного отдыха: предложение готовится с учётом актуального наличия и условий.",
    details: "Поскольку наличие в горный сезон и пригодность автомобиля могут различаться, каждая заявка на Ferrari подтверждается индивидуально. В предложении указаны условия аренды, детали доставки, залог, пробег и план возврата.",
  },
  "rolls-royce-rental-french-riviera": {
    title: "Аренда Rolls-Royce на Лазурном Берегу",
    eyebrow: "Частная аренда Rolls-Royce",
    description: "Аренда Rolls-Royce на Лазурном Берегу с деликатной доставкой для отдыха, мероприятий и частных поездок в Каннах и Монако.",
    intro: "Закажите Rolls-Royce для изысканной частной поездки, особого мероприятия или важного приезда — с поддержкой персонального консьержа.",
    details: "Доступные модели и условия аренды подтверждаются по каждой заявке. Мы координируем выбранное место и время доставки, сохраняя сервис персональным и деликатным.",
  },
  "rolls-royce-rental-courchevel": {
    title: "Аренда Rolls-Royce в Куршевеле",
    eyebrow: "Зимний сервис приезда на Rolls-Royce",
    description: "Аренда Rolls-Royce в Куршевеле для деликатного приезда в шале, проживания в отеле и частной зимней мобильности.",
    intro: "Закажите Rolls-Royce или сопоставимый автомобиль ультрапремиум-класса для Куршевеля: консьерж берёт на себя время, доставку и условия.",
    details: "Перед подтверждением наличие проверяется на ваши точные даты. В индивидуальном предложении указаны модель, место доставки, залог, пробег, условия страхования и возможные ограничения по маршруту.",
  },
  "bentley-rental-courchevel": {
    title: "Аренда Bentley в Куршевеле",
    eyebrow: "Bentley и сопоставимые роскошные внедорожники",
    description: "Аренда Bentley в Куршевеле или сопоставимых роскошных внедорожников для проживания в шале, трансферов и частных зимних поездок.",
    intro: "Закажите Bentley или сопоставимый роскошный внедорожник для Куршевеля: варианты предлагаются по актуальному наличию и с учётом вашего маршрута.",
    details: "Консьерж подтверждает, доступен ли Bentley или подходящая сопоставимая модель на ваши даты. До бронирования в предложении указываются доставка, возврат, залог, пробег и условия зимних дорог.",
    faq: [
      { q: "Всегда ли в Куршевеле есть Bentley?", a: "Наличие подтверждается индивидуально на ваши даты. Если Bentley недоступен, можно предложить сопоставимый внедорожник ультрапремиум-класса." },
      { q: "Можно ли доставить автомобиль в шале или отель?", a: "Да. Адрес доставки, время и место возврата подтверждаются в частном предложении." },
    ],
  },
};

const RO: Record<string, TranslatedLanding> = {
  "luxury-car-rental-cannes": {
    title: "Închirieri auto de lux în Cannes",
    eyebrow: "Livrare privată în Cannes",
    description: "Închirieri auto de lux în Cannes, cu livrare discretă la hoteluri, vile, Port Canto și pe Croisette, cu sprijinul unui concierge dedicat.",
    intro: "Alegeți o berlină rafinată, un SUV sau un supercar pentru șederea în Cannes. Tratăm fiecare solicitare individual și organizăm livrarea la ora și adresa convenite.",
    details: "De la sosirile pe aeroport și întâlnirile de afaceri până la evenimentele de pe Croisette, serviciul este construit în jurul programului dvs. Disponibilitatea, condițiile de închiriere și oferta finală sunt confirmate personal înainte de rezervare.",
  },
  "luxury-car-rental-monaco": {
    title: "Închirieri auto de lux în Monaco",
    eyebrow: "Livrare privată în Monaco",
    description: "Închirieri de automobile de lux și supercaruri în Monaco, cu livrare privată în Monte-Carlo, Fontvieille și Port Hercule.",
    intro: "Accesați o selecție de vehicule de prestigiu pentru Monaco, cu un concierge care se ocupă de toate detaliile practice, de la solicitare până la predarea cheilor.",
    details: "Coordonăm livrarea în jurul hotelurilor, reședințelor, marinelor și programului evenimentelor. Fiecare ofertă ține cont de disponibilitatea actuală a flotei și de datele, traseul și cerințele privind șoferul pe care le comunicați.",
  },
  "luxury-car-rental-nice": {
    title: "Închirieri auto de lux în Nisa",
    eyebrow: "Livrare la aeroportul și în orașul Nisa",
    description: "Închirieri auto de lux în Nisa, cu livrare la Aeroportul Nice Côte d’Azur, la hotel sau la adrese private de pe Riviera Franceză.",
    intro: "Începeți călătoria pe Riviera cu un vehicul livrat la aeroportul din Nisa sau la adresa dorită. Echipa noastră coordonează ora, alegerea modelului și nevoile ulterioare de deplasare.",
    details: "Nisa este un punct de sosire practic pentru Cannes, Monaco, Antibes și Saint-Tropez. Comunicați-ne itinerariul complet, astfel încât oferta să includă livrarea, returnarea și categoria de vehicul preferată.",
  },
  "luxury-car-rental-saint-tropez": {
    title: "Închirieri auto de lux în Saint-Tropez",
    eyebrow: "Saint-Tropez și Pampelonne",
    description: "Închirieri de automobile de lux și supercaruri în Saint-Tropez, cu livrare privată la vile, hoteluri, port și Pampelonne.",
    intro: "Rezervați un vehicul de lux pentru șederea în Saint-Tropez, Ramatuelle sau Pampelonne, cu livrarea planificată în funcție de sosirea și cazarea dvs.",
    details: "Cererea sezonieră este mare, așa că fiecare model este confirmat în funcție de disponibilitatea reală. Concierge-ul nostru poate coordona închirierea cu transferuri de la aeroport, planurile cu iahtul și returnarea la finalul șederii.",
  },
  "luxury-car-rental-antibes": {
    title: "Închirieri auto de lux în Antibes",
    eyebrow: "Antibes, Cap d’Antibes și Juan-les-Pins",
    description: "Închirieri auto de lux în Antibes și Cap d’Antibes, cu livrare discretă la hoteluri, vile, marine și reședințe private.",
    intro: "Organizați o închiriere auto de lux în Antibes în funcție de vila, hotelul, sosirea în marină sau itinerariul dvs. privat între Cannes, Nisa și Monaco.",
    details: "Serviciul este pregătit în funcție de datele exacte, locul de livrare, nevoile de bagaje și categoria de vehicul preferată. Disponibilitatea, garanția, kilometrajul și detaliile returnării sunt confirmate în oferta individuală înainte de rezervare.",
  },
  "luxury-car-rental-courchevel": {
    title: "Închirieri auto de lux în Courchevel",
    eyebrow: "Mobilitate de lux de iarnă în Courchevel",
    description: "Închirieri auto de lux în Courchevel, cu SUV-uri premium, vehicule executive și livrare discretă pentru șederi la chalet sau hotel.",
    intro: "Planificați închirierea unui automobil de lux în Courchevel în funcție de chalet, hotel, transferul de la aeroport sau itinerariul privat de iarnă, cu opțiuni confirmate pentru datele dvs.",
    details: "Solicitările din sezonul montan sunt tratate individual. Confirmăm disponibilitatea reală, condițiile de livrare, garanția, kilometrajul, nevoile de bagaje și potrivirea vehiculului pentru drumurile de iarnă înainte de rezervare.",
  },
  "courchevel-private-transfers": {
    title: "Transferuri private către Courchevel",
    eyebrow: "Aeroporturile Geneva, Lyon, Chambéry și Torino",
    description: "Transferuri private de lux către Courchevel de la aeroporturile Geneva, Lyon, Chambéry și Torino, cu vehicule executive și coordonare personală a călătoriei.",
    intro: "Ajungeți privat la Courchevel de la aeroportul din Geneva, Lyon, Chambéry sau Torino. Coordonăm ora preluării, nevoile pasagerilor, bagajele și destinația înainte de a confirma transferul personalizat.",
    details: "Vehiculele executive sunt alese în funcție de grup și traseu, cu Mercedes-Benz V-Class și opțiuni premium comparabile, în funcție de disponibilitate. Trimiteți-ne detaliile zborului, numărul de pasageri, bagajele și adresa din Courchevel pentru a primi o ofertă individuală clară.",
    faq: [
      { q: "De la ce aeroporturi poate începe transferul?", a: "Transferurile pot fi organizate de la Geneva, Lyon, Chambéry sau Torino, în funcție de disponibilitatea vehiculului și a șoferului la data și ora dorite." },
      { q: "Este vehiculul confirmat înainte de rezervare?", a: "Da. Categoria vehiculului, planul de preluare, traseul și prețul final sunt confirmate în oferta individuală înainte de rezervarea transferului." },
    ],
  },
  "geneva-airport-to-courchevel-transfer": {
    title: "Transfer de la Aeroportul Geneva la Courchevel",
    eyebrow: "Transfer privat de la Geneva la Courchevel",
    description: "Transfer privat de la Aeroportul Geneva la Courchevel, cu vehicule executive, planificarea bagajelor și coordonare discretă din partea concierge-ului.",
    intro: "Organizați un transfer privat de la Aeroportul Geneva la Courchevel, cu un vehicul ales în funcție de pasageri, bagaje, ora zborului și adresa finală a chaletului sau hotelului.",
    details: "Călătoria este planificată înainte de sosire, astfel încât locul preluării, ora, categoria vehiculului și traseul să fie clare. Pot fi propuse Mercedes-Benz V-Class și opțiuni executive comparabile, în funcție de mărimea grupului și de disponibilitate.",
    faq: [
      { q: "Se poate organiza transferul de la Aeroportul Geneva la Courchevel 1850?", a: "Da. Comunicați numărul zborului, numărul de pasageri, bagajele și adresa finală, astfel încât preluarea și destinația să fie confirmate în oferta individuală." },
      { q: "Puteți organiza și întoarcerea de la Courchevel la Aeroportul Geneva?", a: "Da. Transferurile de întoarcere pot fi coordonate, cu ora preluării, nevoile de bagaje și detaliile zborului de plecare incluse în plan." },
    ],
  },
  "lyon-airport-to-courchevel-transfer": {
    title: "Transfer de la Aeroportul Lyon la Courchevel",
    eyebrow: "Transfer privat de la Lyon la Courchevel",
    description: "Transfer privat de la Aeroportul Lyon la Courchevel, cu vehicule executive, planificarea traseului și sprijin personal din partea concierge-ului.",
    intro: "Coordonați un transfer privat de la Aeroportul Lyon la Courchevel pentru vacanțe la schi, sosiri la chalet sau șederi la hotel, cu ora și categoria vehiculului pregătite în jurul călătoriei dvs.",
    details: "Confirmăm locul preluării, traseul, numărul de pasageri, cerințele de bagaje și adresa finală din Courchevel înainte de rezervare. Minivanuri premium și vehicule executive sunt propuse în funcție de disponibilitatea reală și de nevoile grupului.",
    faq: [
      { q: "Puteți transporta echipamentul de schi la un transfer Lyon–Courchevel?", a: "Da. Spuneți-ne numărul de pasageri și volumul bagajelor, inclusiv echipamentul de schi, pentru a propune o categorie de vehicul potrivită." },
      { q: "Poate traseul să includă o oprire pe drumul spre Courchevel?", a: "Da. Opririle planificate pot fi incluse în oferta individuală după confirmarea orei și a traseului." },
    ],
  },
  "private-jet-to-car-transfer-courchevel": {
    title: "Transfer de la avionul privat la mașină în Courchevel",
    eyebrow: "Coordonare aeroport, heliport și chalet",
    description: "Transfer de la avionul privat la mașină în Courchevel, cu vehicule executive, preluare planificată în funcție de zbor și coordonare discretă până la chalet.",
    intro: "Treceți de la aviația privată direct într-un vehicul executiv care vă așteaptă, cu un transfer pregătit în jurul zborului, bagajelor, pasagerilor și adresei dvs. din Courchevel.",
    details: "Coordonăm preluarea de la aeroport sau heliport, durata traseului și categoria vehiculului înainte de călătorie. Pot fi propuse Mercedes-Benz V-Class și opțiuni premium comparabile, în funcție de mărimea grupului și de disponibilitate.",
    faq: [
      { q: "Poate șoferul să se adapteze orelor aviației private?", a: "Da. Comunicați detaliile zborului, informațiile despre terminal sau handler și destinația, pentru ca preluarea să fie aliniată cu sosirea reală." },
      { q: "Poate transferul continua direct până la un chalet sau hotel?", a: "Da. Adresa finală din Courchevel, nevoile de bagaje și numărul de pasageri sunt incluse în oferta individuală." },
    ],
  },
  "yacht-charter-cannes": {
    title: "Charter de iahturi de lux în Cannes",
    eyebrow: "Charter privat din Cannes",
    description: "Charter privat de iahturi de lux în Cannes, cu itinerarii personalizate, o flotă atent selectată și sprijin dedicat din partea concierge-ului.",
    intro: "Descoperiți litoralul din Cannes la bordul unui iaht privat ales în funcție de grupul, datele și stilul dvs. preferat de croazieră.",
    details: "Plecările pot fi coordonate din porturile din zona Cannes, în funcție de iaht și de locul de acostare. Comunicați numărul de invitați și itinerariul dorit pentru a primi o selecție cu disponibilitate actuală și condiții de charter clare.",
  },
  "yacht-charter-monaco": {
    title: "Charter de iahturi de lux în Monaco",
    eyebrow: "Charter privat din Monaco",
    description: "Charter de iahturi de lux în Monaco, cu o selecție atent aleasă, itinerarii personalizate și coordonare discretă din partea concierge-ului.",
    intro: "Planificați un charter privat din Monaco, cu un iaht potrivit invitaților, programului și așteptărilor dvs. privind viața la bord.",
    details: "Concierge-ul nostru coordonează solicitarea, iahturile disponibile și detaliile practice ale îmbarcării. Punctul final de plecare, itinerariul și serviciile sunt confirmate în propunerea individuală de charter.",
  },
  "yacht-charter-nice": {
    title: "Charter de iahturi de lux în Nisa",
    eyebrow: "Charter privat din Nisa",
    description: "Charter de iahturi de lux în Nisa, cu itinerarii personalizate, iahturi atent selectate și coordonare discretă din partea concierge-ului.",
    intro: "Planificați un charter privat de iaht din Nisa pentru croaziere de-a lungul coastei, opriri pentru scaldă, transferuri la restaurant sau o zi personalizată pe mare, pe Riviera.",
    details: "Comunicați datele, numărul de invitați, punctul de îmbarcare preferat și așteptările de la bord. Iahtul, traseul și serviciile sunt confirmate într-o propunere privată de charter, în funcție de disponibilitate.",
  },
  "yacht-charter-saint-tropez": {
    title: "Charter de iahturi de lux în Saint-Tropez",
    eyebrow: "Zile private pe iaht în Saint-Tropez",
    description: "Charter de iahturi de lux în Saint-Tropez, cu itinerarii private, planificarea accesului la beach cluburi și sprijin dedicat din partea concierge-ului.",
    intro: "Organizați un charter privat de iaht în jurul Saint-Tropez, al plajei Pampelonne și al litoralului din apropiere, cu un iaht ales pentru invitații și programul dvs.",
    details: "Cererea sezonieră este mare, așa că fiecare solicitare este verificată în funcție de disponibilitatea reală. Coordonăm îmbarcarea, ideile de traseu, așteptările privind serviciile la bord și transferurile de întoarcere înainte de a confirma propunerea.",
  },
  "lamborghini-rental-french-riviera": {
    title: "Închirieri Lamborghini pe Riviera Franceză",
    eyebrow: "Închiriere Lamborghini prin concierge",
    description: "Închiriați un Lamborghini pe Riviera Franceză, cu livrare privată în Cannes, Monaco, Nisa și Saint-Tropez.",
    intro: "Solicitați un Lamborghini pentru un itinerariu pe Riviera, o ocazie specială sau o experiență de condus deosebită, cu livrarea coordonată de concierge-ul nostru.",
    details: "Modelele sunt afișate doar atunci când se află în flota actuală. Disponibilitatea exactă, garanția, kilometrajul permis și condițiile de livrare depind de vehiculul ales și de datele închirierii și sunt confirmate înainte de rezervare.",
  },
  "lamborghini-rental-courchevel": {
    title: "Închirieri Lamborghini în Courchevel",
    eyebrow: "Închiriere de iarnă Lamborghini prin concierge",
    description: "Închirieri Lamborghini în Courchevel, cu coordonarea livrării private, verificarea disponibilității reale și sprijin din partea concierge-ului.",
    intro: "Solicitați un Lamborghini pentru o ședere în Courchevel, o sosire la chalet sau un itinerariu montan, cu livrarea și returnarea planificate în jurul datelor dvs.",
    details: "Fiecare solicitare pentru un Lamborghini este verificată în raport cu disponibilitatea reală a flotei înainte de confirmare. Garanția, kilometrajul, condițiile de asigurare, potrivirea pentru iarnă și detaliile livrării sunt prezentate în oferta individuală.",
  },
  "mercedes-rental-french-riviera": {
    title: "Închirieri Mercedes-Benz pe Riviera Franceză",
    eyebrow: "Închiriere de prestigiu Mercedes-Benz",
    description: "Închirieri de automobile de lux Mercedes-Benz pe Riviera Franceză, cu livrare privată din Nisa la Cannes, Monaco și Saint-Tropez.",
    intro: "Alegeți confortul Mercedes-Benz pentru călătorii de afaceri, sosiri pe aeroport și șederi mai lungi pe Riviera, cu un model ales în funcție de prioritățile dvs.",
    details: "Colecția noastră actuală poate include berline de lux, modele sport și SUV-uri. Concierge-ul confirmă vehiculul exact, planul de livrare și condițiile de închiriere pentru datele solicitate.",
  },
  "mercedes-rental-courchevel": {
    title: "Închirieri Mercedes-Benz în Courchevel",
    eyebrow: "Mercedes-Benz și V-Class în Courchevel",
    description: "Închirieri Mercedes-Benz în Courchevel pentru transferuri private, șederi la chalet și mobilitate de iarnă, cu coordonare din partea concierge-ului.",
    intro: "Organizați confortul Mercedes-Benz pentru Courchevel, de la planificarea unui transfer cu V-Class la SUV-uri premium și modele executive alese în funcție de călătoria dvs.",
    details: "Confirmăm categoria exactă a modelului, planul de preluare, nevoile de bagaje și condițiile de livrare înainte de rezervare. Opțiunile Mercedes-Benz sunt utile mai ales pentru transferuri private de la Geneva, Lyon și alte aeroporturi către Courchevel.",
  },
  "ferrari-rental-french-riviera": {
    title: "Închirieri Ferrari pe Riviera Franceză",
    eyebrow: "Închiriere Ferrari prin concierge",
    description: "Închirieri Ferrari pe Riviera Franceză, cu livrare privată în Cannes, Monaco, Nisa și Saint-Tropez.",
    intro: "Solicitați un Ferrari ales pentru o plimbare de excepție de-a lungul Rivierei, cu livrare discretă și sprijin personal la rezervare.",
    details: "Fiecare solicitare este verificată în raport cu disponibilitatea actuală a flotei. Cerințele specifice vehiculului, kilometrajul, garanția, asigurarea și traseele permise sunt prezentate transparent în oferta individuală.",
  },
  "ferrari-rental-courchevel": {
    title: "Închirieri Ferrari în Courchevel",
    eyebrow: "Închiriere Ferrari prin concierge în Courchevel",
    description: "Închirieri Ferrari în Courchevel, cu disponibilitate verificată individual și livrare coordonată pentru șederi de iarnă premium.",
    intro: "Solicitați un Ferrari pentru un itinerariu în Courchevel, o sosire remarcabilă sau o ședere privată, cu o propunere pregătită în funcție de disponibilitatea reală și de condiții.",
    details: "Deoarece disponibilitatea din sezonul montan și potrivirea vehiculului pot varia, fiecare solicitare pentru un Ferrari este confirmată individual. Oferta include condițiile de închiriere, detaliile livrării, garanția, kilometrajul și planificarea returnării.",
  },
  "rolls-royce-rental-french-riviera": {
    title: "Închirieri Rolls-Royce pe Riviera Franceză",
    eyebrow: "Închiriere privată Rolls-Royce",
    description: "Închirieri Rolls-Royce pe Riviera Franceză, cu livrare discretă pentru șederi, evenimente și călătorii private în Cannes și Monaco.",
    intro: "Rezervați un Rolls-Royce pentru o călătorie privată rafinată, un eveniment special sau o sosire importantă, cu sprijinul unui concierge dedicat.",
    details: "Modelele disponibile și condițiile de închiriere sunt confirmate pentru fiecare solicitare. Coordonăm locul și ora livrării alese, păstrând serviciul personal și discret.",
  },
  "rolls-royce-rental-courchevel": {
    title: "Închirieri Rolls-Royce în Courchevel",
    eyebrow: "Serviciu de sosire de iarnă cu Rolls-Royce",
    description: "Închirieri Rolls-Royce în Courchevel pentru sosiri discrete la chalet, șederi la hotel și mobilitate privată de iarnă.",
    intro: "Rezervați un Rolls-Royce sau un vehicul ultra-luxos comparabil pentru Courchevel, cu un concierge care se ocupă de oră, livrare și condiții.",
    details: "Disponibilitatea este verificată pentru datele dvs. exacte înainte de confirmare. Oferta individuală detaliază modelul, locul livrării, garanția, kilometrajul, condițiile de asigurare și eventualele limitări de traseu.",
  },
  "bentley-rental-courchevel": {
    title: "Închirieri Bentley în Courchevel",
    eyebrow: "Bentley și SUV-uri de lux comparabile",
    description: "Închirieri Bentley în Courchevel sau opțiuni comparabile de SUV de lux, pentru șederi la chalet, transferuri și călătorii private de iarnă.",
    intro: "Solicitați un Bentley sau un SUV de lux comparabil pentru Courchevel, cu opțiuni propuse în funcție de disponibilitatea reală și de traseul dvs.",
    details: "Concierge-ul confirmă dacă un Bentley sau un model comparabil potrivit este disponibil pentru datele dvs. Propunerea include livrarea, returnarea, garanția, kilometrajul și condițiile drumurilor de iarnă înainte de rezervare.",
    faq: [
      { q: "Este un Bentley mereu disponibil în Courchevel?", a: "Disponibilitatea este confirmată individual pentru datele dvs. Dacă un Bentley nu este disponibil, poate fi propus un SUV ultra-luxos comparabil." },
      { q: "Poate fi mașina livrată la un chalet sau la un hotel?", a: "Da. Adresa de livrare, ora și punctul de returnare sunt confirmate în oferta privată." },
    ],
  },
};

const AR: Record<string, TranslatedLanding> = {
  "luxury-car-rental-cannes": {
    title: "تأجير السيارات الفاخرة في كان",
    eyebrow: "توصيل خاص في كان",
    description: "تأجير سيارات فاخرة في كان مع توصيل سري إلى الفنادق والفلل وميناء كانتو والكروازيت، بدعم من كونسيرج مخصص.",
    intro: "اختاروا سيدان راقية أو سيارة دفع رباعي أو سيارة سوبركار لإقامتكم في كان. ندرس كل طلب على حدة وننظم التوصيل في الوقت والعنوان المتفق عليهما.",
    details: "من استقبال المطار والمواعيد التجارية إلى فعاليات الكروازيت، صُممت الخدمة حول جدولكم. يتم تأكيد التوفر وشروط التأجير والعرض النهائي شخصياً قبل الحجز.",
  },
  "luxury-car-rental-monaco": {
    title: "تأجير السيارات الفاخرة في موناكو",
    eyebrow: "توصيل خاص في موناكو",
    description: "تأجير سيارات فاخرة وسيارات سوبركار في موناكو مع توصيل خاص إلى مونتي كارلو وفونتفييي وميناء هرقل.",
    intro: "احصلوا على سيارات فاخرة مختارة في موناكو، مع كونسيرج يتولى التفاصيل العملية من الطلب حتى تسليم المفاتيح.",
    details: "ننسق التوصيل حول الفنادق والإقامات والمراسي وجداول الفعاليات. يراعي كل عرض التوفر الحالي للأسطول والتواريخ والمسار ومتطلبات السائق التي تزودوننا بها.",
  },
  "luxury-car-rental-nice": {
    title: "تأجير السيارات الفاخرة في نيس",
    eyebrow: "توصيل إلى مطار نيس والمدينة",
    description: "تأجير سيارات فاخرة في نيس مع توصيل إلى مطار نيس كوت دازور أو الفنادق أو العناوين الخاصة على الريفييرا الفرنسية.",
    intro: "ابدأوا رحلتكم على الريفييرا بسيارة تصلكم إلى مطار نيس أو إلى العنوان الذي تختارونه. ينسق فريقنا التوقيت واختيار الطراز واحتياجات التنقل اللاحقة.",
    details: "تُعد نيس نقطة وصول عملية إلى كان وموناكو وأنتيب وسان تروبيه. أخبرونا بخط الرحلة كاملاً ليشمل العرض التوصيل والاستلام وفئة السيارة المفضلة.",
  },
  "luxury-car-rental-saint-tropez": {
    title: "تأجير السيارات الفاخرة في سان تروبيه",
    eyebrow: "سان تروبيه وبامبيلون",
    description: "تأجير سيارات فاخرة وسيارات سوبركار في سان تروبيه مع توصيل خاص إلى الفلل والفنادق والميناء وبامبيلون.",
    intro: "رتبوا سيارة فاخرة لإقامتكم في سان تروبيه أو راماتويل أو بامبيلون، مع توصيل مخطط وفق موعد وصولكم ومكان إقامتكم.",
    details: "الطلب مرتفع في الموسم، لذلك يُؤكد كل طراز وفق التوفر الفعلي. يمكن لفريق الكونسيرج ربط التأجير بالانتقالات من المطار وخطط اليخت والاستلام في نهاية الإقامة.",
  },
  "luxury-car-rental-antibes": {
    title: "تأجير السيارات الفاخرة في أنتيب",
    eyebrow: "أنتيب ورأس أنتيب وخوان ليه بان",
    description: "تأجير سيارات فاخرة في أنتيب ورأس أنتيب مع توصيل سري إلى الفنادق والفلل والمراسي والإقامات الخاصة.",
    intro: "نسقوا تأجير سيارة فاخرة في أنتيب حول فيلتكم أو فندقكم أو وصولكم إلى المرسى أو خط رحلتكم الخاص بين كان ونيس وموناكو.",
    details: "تُعد الخدمة وفق تواريخكم الدقيقة ونقطة التوصيل واحتياجات الأمتعة وفئة السيارة المفضلة. يتم تأكيد التوفر ومبلغ الضمان والمسافة المسموحة وتفاصيل الاستلام في عرضكم الفردي قبل الحجز.",
  },
  "luxury-car-rental-courchevel": {
    title: "تأجير السيارات الفاخرة في كورشوفيل",
    eyebrow: "تنقل شتوي فاخر في كورشوفيل",
    description: "تأجير سيارات فاخرة في كورشوفيل مع سيارات دفع رباعي راقية ومركبات تنفيذية وتوصيل سري لإقامات الشاليه والفنادق.",
    intro: "خططوا لتأجير سيارة فاخرة في كورشوفيل حول الشاليه أو الفندق أو الانتقال من المطار أو برنامجكم الشتوي الخاص، مع خيارات مؤكدة لتواريخكم.",
    details: "تُعالج الطلبات في موسم الجبال بشكل فردي. نؤكد التوفر الفعلي وشروط التوصيل ومبلغ الضمان والمسافة المسموحة واحتياجات الأمتعة وملاءمة السيارة لطرق الشتاء قبل الحجز.",
  },
  "courchevel-private-transfers": {
    title: "انتقالات خاصة إلى كورشوفيل",
    eyebrow: "مطارات جنيف وليون وشامبيري وتورينو",
    description: "انتقالات فاخرة خاصة إلى كورشوفيل من مطارات جنيف وليون وشامبيري وتورينو بمركبات تنفيذية وتنسيق شخصي للرحلة.",
    intro: "سافروا إلى كورشوفيل بخصوصية تامة من مطار جنيف أو ليون أو شامبيري أو تورينو. ننسق وقت الاستقبال واحتياجات الركاب والأمتعة والوجهة قبل تأكيد انتقالكم المخصص.",
    details: "تُختار المركبات التنفيذية وفق مجموعتكم ومساركم، مع مرسيدس-بنز V-Class وخيارات راقية مماثلة بحسب التوفر. أرسلوا تفاصيل الرحلة وعدد الركاب والأمتعة وعنوانكم في كورشوفيل لتحصلوا على عرض فردي واضح.",
    faq: [
      { q: "من أي مطارات يمكن أن يبدأ الانتقال؟", a: "يمكن ترتيب الانتقالات من جنيف أو ليون أو شامبيري أو تورينو، بحسب توفر السيارة والسائق في التاريخ والوقت المطلوبين." },
      { q: "هل تُؤكد السيارة قبل الحجز؟", a: "نعم. تُؤكد فئة السيارة وخطة الاستقبال والمسار والسعر النهائي في عرضكم الفردي قبل حجز الانتقال." },
    ],
  },
  "geneva-airport-to-courchevel-transfer": {
    title: "الانتقال من مطار جنيف إلى كورشوفيل",
    eyebrow: "انتقال خاص من جنيف إلى كورشوفيل",
    description: "انتقال خاص من مطار جنيف إلى كورشوفيل بمركبات تنفيذية وتخطيط للأمتعة وتنسيق سري من فريق الكونسيرج.",
    intro: "رتبوا انتقالاً خاصاً من مطار جنيف إلى كورشوفيل بسيارة تُختار وفق عدد الركاب والأمتعة وموعد الرحلة والعنوان النهائي للشاليه أو الفندق.",
    details: "يُخطط للرحلة قبل الوصول ليكون مكان الاستقبال والتوقيت وفئة السيارة والمسار واضحة. يمكن اقتراح مرسيدس-بنز V-Class وخيارات تنفيذية مماثلة بحسب حجم المجموعة والتوفر.",
    faq: [
      { q: "هل يمكن ترتيب الانتقال من مطار جنيف إلى كورشوفيل 1850؟", a: "نعم. أرسلوا رقم الرحلة وعدد الركاب والأمتعة والعنوان النهائي ليتم تأكيد الاستقبال والوجهة في العرض الفردي." },
      { q: "هل يمكنكم ترتيب العودة من كورشوفيل إلى مطار جنيف؟", a: "نعم. يمكن تنسيق انتقالات العودة مع إدراج وقت الاستقبال واحتياجات الأمتعة وتفاصيل رحلة المغادرة في الخطة." },
    ],
  },
  "lyon-airport-to-courchevel-transfer": {
    title: "الانتقال من مطار ليون إلى كورشوفيل",
    eyebrow: "انتقال خاص من ليون إلى كورشوفيل",
    description: "انتقال خاص من مطار ليون إلى كورشوفيل بمركبات تنفيذية وتخطيط للمسار ودعم شخصي من فريق الكونسيرج.",
    intro: "نسقوا انتقالاً خاصاً من مطار ليون إلى كورشوفيل لعطلات التزلج أو الوصول إلى الشاليه أو الإقامة في الفندق، مع توقيت وفئة سيارة مُعدّين وفق رحلتكم.",
    details: "نؤكد نقطة الاستقبال والمسار وعدد الركاب ومتطلبات الأمتعة والعنوان النهائي في كورشوفيل قبل الحجز. تُقترح حافلات صغيرة فاخرة ومركبات تنفيذية بحسب التوفر الفعلي واحتياجات المجموعة.",
    faq: [
      { q: "هل يمكنكم نقل معدات التزلج في انتقال ليون – كورشوفيل؟", a: "نعم. أخبرونا بعدد الركاب وحجم الأمتعة، بما في ذلك معدات التزلج، لنقترح فئة سيارة مناسبة." },
      { q: "هل يمكن أن يتضمن المسار توقفاً في الطريق إلى كورشوفيل؟", a: "نعم. يمكن إدراج التوقفات المخططة في العرض الفردي بعد تأكيد التوقيت والمسار." },
    ],
  },
  "private-jet-to-car-transfer-courchevel": {
    title: "الانتقال من الطائرة الخاصة إلى السيارة في كورشوفيل",
    eyebrow: "تنسيق المطار ومهبط المروحيات والشاليه",
    description: "انتقال من الطائرة الخاصة إلى السيارة في كورشوفيل بمركبات تنفيذية واستقبال مخطط وفق الرحلة وتنسيق سري حتى الشاليه.",
    intro: "انتقلوا من الطيران الخاص إلى سيارة تنفيذية بانتظاركم، مع انتقال مُعدّ وفق رحلتكم وأمتعتكم وركابكم وعنوانكم في كورشوفيل.",
    details: "ننسق الاستقبال من المطار أو مهبط المروحيات وتوقيت الرحلة وفئة السيارة قبل السفر. يمكن اقتراح مرسيدس-بنز V-Class وخيارات راقية مماثلة بحسب حجم المجموعة والتوفر.",
    faq: [
      { q: "هل يمكن للسائق التنسيق مع مواعيد الطيران الخاص؟", a: "نعم. أرسلوا تفاصيل الرحلة ومعلومات المحطة أو شركة الخدمات الأرضية والوجهة ليتوافق الاستقبال مع الوصول الفعلي." },
      { q: "هل يمكن أن يستمر الانتقال مباشرة إلى الشاليه أو الفندق؟", a: "نعم. يُدرج العنوان النهائي في كورشوفيل واحتياجات الأمتعة وعدد الركاب في العرض الفردي." },
    ],
  },
  "yacht-charter-cannes": {
    title: "استئجار اليخوت الفاخرة في كان",
    eyebrow: "رحلات خاصة من كان",
    description: "استئجار يخوت فاخرة خاصة في كان مع مسارات مصممة خصيصاً وأسطول مختار ودعم من كونسيرج مخصص.",
    intro: "اكتشفوا الساحل انطلاقاً من كان على متن يخت خاص يُختار وفق مجموعتكم وتواريخكم وأسلوب الإبحار الذي تفضلونه.",
    details: "يمكن تنسيق الإبحار من موانئ منطقة كان بحسب اليخت ومكان الرسو. أخبرونا بعدد الضيوف والمسار المرغوب لتحصلوا على مجموعة مختارة مع التوفر الحالي وشروط استئجار واضحة.",
  },
  "yacht-charter-monaco": {
    title: "استئجار اليخوت الفاخرة في موناكو",
    eyebrow: "رحلات خاصة من موناكو",
    description: "استئجار يخوت فاخرة في موناكو مع مجموعة مختارة بعناية ومسارات مصممة خصيصاً وتنسيق سري من فريق الكونسيرج.",
    intro: "خططوا لرحلة خاصة من موناكو على متن يخت يناسب ضيوفكم وبرنامجكم وتوقعاتكم للحياة على متنه.",
    details: "ينسق الكونسيرج الطلب واليخوت المتاحة وتفاصيل الصعود العملية. تُؤكد نقطة الانطلاق النهائية والمسار والخدمات في عرض الاستئجار الفردي.",
  },
  "yacht-charter-nice": {
    title: "استئجار اليخوت الفاخرة في نيس",
    eyebrow: "رحلات خاصة من نيس",
    description: "استئجار يخوت فاخرة في نيس مع مسارات مصممة خصيصاً ويخوت مختارة وتنسيق سري من فريق الكونسيرج.",
    intro: "خططوا لاستئجار يخت خاص من نيس للإبحار على طول الساحل أو التوقف للسباحة أو الانتقال إلى مطعم أو قضاء يوم مميز في البحر على الريفييرا.",
    details: "أخبرونا بالتواريخ وعدد الضيوف ونقطة الصعود المفضلة وتوقعاتكم على متن اليخت. يُؤكد اليخت والمسار والخدمات في عرض استئجار خاص بحسب التوفر.",
  },
  "yacht-charter-saint-tropez": {
    title: "استئجار اليخوت الفاخرة في سان تروبيه",
    eyebrow: "أيام خاصة على اليخت في سان تروبيه",
    description: "استئجار يخوت فاخرة في سان تروبيه مع مسارات خاصة وتخطيط لزيارة النوادي الشاطئية ودعم من كونسيرج مخصص.",
    intro: "رتبوا رحلة يخت خاصة حول سان تروبيه وبامبيلون والساحل المجاور على متن يخت يُختار لضيوفكم وجدولكم.",
    details: "الطلب مرتفع في الموسم، لذلك يُفحص كل طلب وفق التوفر الفعلي. ننسق الصعود وأفكار المسار وتوقعات الخدمة على متن اليخت وانتقالات العودة قبل تأكيد العرض.",
  },
  "lamborghini-rental-french-riviera": {
    title: "تأجير لامبورغيني على الريفييرا الفرنسية",
    eyebrow: "تأجير لامبورغيني عبر الكونسيرج",
    description: "استأجروا لامبورغيني على الريفييرا الفرنسية مع توصيل خاص في كان وموناكو ونيس وسان تروبيه.",
    intro: "اطلبوا لامبورغيني لرحلة على الريفييرا أو مناسبة خاصة أو تجربة قيادة مميزة، مع توصيل ينسقه فريق الكونسيرج لدينا.",
    details: "لا تُعرض الطرازات إلا عندما تكون ضمن الأسطول الحالي. يعتمد التوفر الدقيق ومبلغ الضمان والمسافة المسموحة وشروط التوصيل على السيارة المختارة وتواريخ التأجير، ويتم تأكيدها قبل الحجز.",
  },
  "lamborghini-rental-courchevel": {
    title: "تأجير لامبورغيني في كورشوفيل",
    eyebrow: "تأجير لامبورغيني شتوي عبر الكونسيرج",
    description: "تأجير لامبورغيني في كورشوفيل مع تنسيق التوصيل الخاص والتحقق من التوفر الفعلي ودعم الكونسيرج.",
    intro: "اطلبوا لامبورغيني لإقامة في كورشوفيل أو وصول إلى الشاليه أو خط رحلة جبلي، مع تخطيط التوصيل والاستلام وفق تواريخكم.",
    details: "يُفحص كل طلب لامبورغيني وفق توفر الأسطول الفعلي قبل التأكيد. يُعرض مبلغ الضمان والمسافة المسموحة وشروط التأمين وملاءمة الطقس الشتوي وتفاصيل التوصيل في العرض الفردي.",
  },
  "mercedes-rental-french-riviera": {
    title: "تأجير مرسيدس-بنز على الريفييرا الفرنسية",
    eyebrow: "تأجير فاخر لمرسيدس-بنز",
    description: "تأجير سيارات مرسيدس-بنز الفاخرة على الريفييرا الفرنسية مع توصيل خاص من نيس إلى كان وموناكو وسان تروبيه.",
    intro: "اختاروا راحة مرسيدس-بنز للتنقلات التنفيذية واستقبال المطار والإقامات الأطول على الريفييرا، مع طراز يُختار وفق أولوياتكم.",
    details: "قد تضم مجموعتنا الحالية سيدان فاخرة وطرازات عالية الأداء وسيارات دفع رباعي. يؤكد الكونسيرج السيارة المحددة وخطة التوصيل وشروط التأجير للتواريخ المطلوبة.",
  },
  "mercedes-rental-courchevel": {
    title: "تأجير مرسيدس-بنز في كورشوفيل",
    eyebrow: "مرسيدس-بنز وV-Class في كورشوفيل",
    description: "تأجير مرسيدس-بنز في كورشوفيل للانتقالات الخاصة وإقامات الشاليه والتنقل الشتوي بتنسيق من الكونسيرج.",
    intro: "رتبوا راحة مرسيدس-بنز في كورشوفيل، من تخطيط انتقال بسيارة V-Class إلى سيارات دفع رباعي راقية وطرازات تنفيذية تُختار وفق رحلتكم.",
    details: "نؤكد فئة الطراز الدقيقة وخطة الاستقبال واحتياجات الأمتعة وشروط التوصيل قبل الحجز. خيارات مرسيدس-بنز مفيدة خصوصاً للانتقالات الخاصة من جنيف وليون وسائر المطارات إلى كورشوفيل.",
  },
  "ferrari-rental-french-riviera": {
    title: "تأجير فيراري على الريفييرا الفرنسية",
    eyebrow: "تأجير فيراري عبر الكونسيرج",
    description: "تأجير فيراري على الريفييرا الفرنسية مع توصيل خاص في كان وموناكو ونيس وسان تروبيه.",
    intro: "اطلبوا فيراري مختارة لقيادة استثنائية على طول الريفييرا، مع توصيل سري ودعم شخصي عند الحجز.",
    details: "يُفحص كل طلب وفق توفر الأسطول الحالي. تُعرض بشفافية في العرض الفردي المتطلبات الخاصة بالسيارة والمسافة ومبلغ الضمان والتغطية التأمينية والمسارات المسموحة.",
  },
  "ferrari-rental-courchevel": {
    title: "تأجير فيراري في كورشوفيل",
    eyebrow: "تأجير فيراري عبر الكونسيرج في كورشوفيل",
    description: "تأجير فيراري في كورشوفيل مع التحقق من التوفر بشكل فردي وتنسيق التوصيل لإقامات شتوية راقية.",
    intro: "اطلبوا فيراري لخط رحلة في كورشوفيل أو وصول مميز أو إقامة خاصة، مع عرض يُعدّ وفق التوفر الفعلي والشروط.",
    details: "لأن التوفر في موسم الجبال وملاءمة السيارة قد يختلفان، يُؤكد كل طلب فيراري بشكل فردي. يتضمن العرض شروط التأجير وتفاصيل التوصيل ومبلغ الضمان والمسافة وخطة الاستلام.",
  },
  "rolls-royce-rental-french-riviera": {
    title: "تأجير رولز رويس على الريفييرا الفرنسية",
    eyebrow: "تأجير خاص لرولز رويس",
    description: "تأجير رولز رويس على الريفييرا الفرنسية مع توصيل سري للإقامات والفعاليات والتنقلات الخاصة في كان وموناكو.",
    intro: "رتبوا رولز رويس لتنقل خاص راقٍ أو فعالية خاصة أو وصول مهم، بدعم من كونسيرج مخصص.",
    details: "تُؤكد الطرازات المتاحة وشروط التأجير لكل طلب. ننسق مكان التوصيل ووقته المختارين مع الحفاظ على خدمة شخصية وسرية.",
  },
  "rolls-royce-rental-courchevel": {
    title: "تأجير رولز رويس في كورشوفيل",
    eyebrow: "خدمة الوصول الشتوي برولز رويس",
    description: "تأجير رولز رويس في كورشوفيل لوصول سري إلى الشاليه وإقامات الفنادق والتنقل الشتوي الخاص.",
    intro: "رتبوا رولز رويس أو سيارة فائقة الفخامة مماثلة في كورشوفيل، مع كونسيرج يتولى التوقيت والتوصيل والشروط.",
    details: "يُفحص التوفر لتواريخكم الدقيقة قبل التأكيد. يوضح العرض الفردي الطراز ومكان التوصيل ومبلغ الضمان والمسافة وشروط التأمين وأي قيود على المسار.",
  },
  "bentley-rental-courchevel": {
    title: "تأجير بنتلي في كورشوفيل",
    eyebrow: "بنتلي وسيارات دفع رباعي فاخرة مماثلة",
    description: "تأجير بنتلي في كورشوفيل أو خيارات مماثلة من سيارات الدفع الرباعي الفاخرة لإقامات الشاليه والانتقالات والسفر الشتوي الخاص.",
    intro: "اطلبوا بنتلي أو سيارة دفع رباعي فاخرة مماثلة في كورشوفيل، مع خيارات تُقترح وفق التوفر الفعلي ومساركم.",
    details: "يؤكد الكونسيرج ما إذا كانت بنتلي أو سيارة مماثلة مناسبة متاحة لتواريخكم. يتضمن العرض التوصيل والاستلام ومبلغ الضمان والمسافة وظروف الطرق الشتوية قبل الحجز.",
    faq: [
      { q: "هل تتوفر بنتلي دائماً في كورشوفيل؟", a: "يتم تأكيد التوفر بشكل فردي لتواريخكم. وإن لم تتوفر بنتلي، يمكن اقتراح سيارة دفع رباعي فائقة الفخامة مماثلة." },
      { q: "هل يمكن توصيل السيارة إلى شاليه أو فندق؟", a: "نعم. يُؤكد عنوان التوصيل والتوقيت ونقطة الاستلام في العرض الخاص." },
    ],
  },
};

export const LANDING_I18N: Record<LandingLang, Record<string, TranslatedLanding>> = { fr: FR, ru: RU, ro: RO, ar: AR };

export function isLandingLang(value: string): value is LandingLang {
  return (LANDING_LANGS as readonly string[]).includes(value);
}

/** True when the service page exists in this language (every language needs its translated copy). */
export function landingHasLang(slug: string, lang: string): boolean {
  return isLandingLang(lang) && Boolean(LANDING_I18N[lang][slug]);
}

/**
 * The landing with its translated copy applied, or the landing itself for English. Returns null
 * when `lang` has no translation of this page, so callers never publish an English copy under a
 * language URL.
 */
export function localizeLanding<T extends { slug: string }>(landing: T, lang: string): (T & Partial<TranslatedLanding>) | null {
  if (lang === "en") return landing;
  if (!isLandingLang(lang)) return null;
  const copy = LANDING_I18N[lang][landing.slug];
  return copy ? { ...landing, ...copy } : null;
}

/** Languages in which a service page really exists: English plus every language with a translation. */
export function landingLangs(slug: string): Array<"en" | LandingLang> {
  return ["en", ...LANDING_LANGS.filter((code) => Boolean(LANDING_I18N[code][slug]))];
}

/** Translated title of a service page, or undefined when that language has no translation of it. */
export function landingTitle(slug: string, lang: string): string | undefined {
  return isLandingLang(lang) ? LANDING_I18N[lang][slug]?.title : undefined;
}
