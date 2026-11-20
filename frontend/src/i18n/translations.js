// All text shown in the app, in English and Gujarati.
// Keys are identical in both languages. {name} style placeholders are filled in by t().
// NOTE: have a Gujarati speaker review the "gu" text before the final evaluation.

export const translations = {
  en: {
    // ----- common -----
    farmer: "Farmer",
    logout: "Logout",
    greeting: "Namaste, {name}",
    loadingData: "Loading data for {crop}...",
    selectCrop: "🌾 Select Crop:",
    selectCropPlaceholder: "Select a crop",
    typeToSearch: "Type to search...",
    noMatches: "No matches found",

    // ----- dashboard tabs -----
    tabOverview: "🏠 Overview",
    tabPrices: "📈 Prices & Demand",
    tabWeather: "🌦️ Weather & Harvest",
    tabProduction: "📚 Production",

    // ----- landing -----
    tagline: "ખેડૂત મિત્ર — Your Farming Companion",
    landingP1:
      "Gujarat's farmers face uncertainty every season — will crop prices rise or fall? Which mandi pays the best price? When is the right time to harvest and sell?",
    landingP2:
      " uses real market data and AI to answer these questions for you — giving price forecasts, demand trends, and harvest recommendations for 9 major Gujarat crops, so you can make confident decisions and get the best value for your produce.",
    getStarted: "Get Started",

    // ----- login -----
    loginTitle: "Welcome Back",
    mobileNumber: "Mobile Number",
    mobilePlaceholder: "10-digit mobile number",
    password: "Password",
    passwordPlaceholder: "Enter your password",
    loginBtn: "Login",
    loggingIn: "Logging in...",
    loginFailed: "Login failed. Please try again.",
    connectError: "Could not connect to the server. Please try again.",
    newFarmer: "New farmer?",
    createAccountLink: "Create an account",

    // ----- register -----
    createAccount: "🌱 Create Your Account",
    fullName: "Full Name",
    namePlaceholder: "Enter your full name",
    district: "District",
    districtPlaceholder: "Select your district",
    preferredLanguage: "Preferred Language",
    createPassword: "Create Password",
    passwordHint: "At least 6 characters",
    confirmPassword: "Confirm Password",
    confirmPlaceholder: "Re-enter your password",
    registerBtn: "Register",
    creatingAccount: "Creating account...",
    errMobile: "Please enter a valid 10-digit mobile number.",
    errPasswordShort: "Password must be at least 6 characters long.",
    errPasswordMatch: "Passwords do not match.",
    registerFailed: "Registration failed. Please try again.",
    haveAccount: "Already have an account?",
    loginHere: "Login here",

    // ----- overview -----
    todayGlance: "Today at a glance - {crop}",
    nextWeekPrice: "Next week price",
    sharpTile: "Prices moved sharply last week, so this forecast is unreliable.",
    nowPriceChange: "Now ₹{price} ({change}%)",
    forecastNA: "Forecast not available.",
    viewPrice: "View price details →",
    marketDemand: "Market demand",
    demand_rising: "Arrivals rising",
    demand_stable: "Arrivals stable",
    demand_falling: "Arrivals falling",
    demandText_rising: "More produce is expected at the mandi next week.",
    demandText_stable: "Arrivals are expected to stay about the same next week.",
    demandText_falling: "Less produce is expected at the mandi next week.",
    changeExpected: "{change}% expected next week",
    verySmall: "Very small volumes right now",
    demandNA: "Demand indicator not available.",
    viewDemand: "View demand details →",
    weather7: "7-day weather",
    risk_low: "Low rain risk",
    risk_moderate: "Moderate rain risk",
    risk_high: "High rain risk",
    rainExpected: "{mm} mm expected in 7 days",
    weatherNA: "Weather forecast is not available right now.",
    viewWeather: "View weather →",
    bestMandiTile: "Best mandi right now",
    harvestLine: "{season}, harvest: {months}",
    mandiNA: "Mandi information not available.",
    viewHarvest: "View harvest advice →",
    adviceFor: "Advice for {crop}",

    // ----- prices & demand -----
    priceHistory: "📊 Price History - {crop}",
    daily: "Daily",
    monthly: "Monthly",
    yearly: "Yearly",
    priceSeries: "Price (Rs./Quintal)",
    nextWeekForecast: "Next Week Forecast",
    sharpBold: "Prices moved sharply last week ({pct}%).",
    sharpText:
      "This is unusual and often happens when only a few mandis report, so the forecast below is unreliable. Please check today's price at your local mandi.",
    currentPrice: "Current Price",
    predictedNextWeek: "Predicted Next Week",
    basedOn: "Based on prices up to {date}",
    methodBaseline: " · Method: last week's price (best performer for this crop)",
    methodModel: " · Method: machine learning model",
    demandCard: "Market Demand Indicator",
    lowVolumeText: "Very little produce is arriving at the mandis for this crop right now.",
    arrivedWeek: "Arrived Week Ending {date}",
    expectedWeek: "Expected Week Ending {date}",
    weakSignal: "Volumes this small are a weak signal. ",
    demandNote:
      "Tonnes arriving at the mandis that reported in this district (a demand indicator, not an exact count).",
    demandMethodBaseline: " Method: same as last week (best performer for this crop).",
    demandMethodModel: " Method: machine learning model.",
    unitT: "t",
    bestMandiCard: "Best Mandi Right Now",
    marketLabel: "Market",
    avgPrice90: "Average price (last 90 days)",

    // ----- weather & harvest -----
    weatherTitle: "7-Day Weather Outlook",
    mm: "{mm} mm",
    rainChance: "{pct}% chance",
    forecastUpdated: "Forecast updated: {time} · Source: Open-Meteo",
    harvestTitle: "Harvest & Market Advice",
    season: "Season",
    sowingMonths: "Typical Sowing Months",
    harvestMonths: "Typical Harvest Months",

    // ----- production -----
    prodTitle: "Production Statistics - Gujarat",
    prodByYear: "Gujarat production by year ({unit})",
    topDistricts: "Top producing districts ({basis})",
    prodPerYear: "{value} {unit}/yr · {share}%",
    prodSeries: "Production",
    prodSource: " Source: {source}. District names follow the older boundaries used in this data.",

    // ----- chat -----
    askButton: "💬 Ask KhedutMitra",
    chatTitle: "🌾 Ask KhedutMitra",
    chatAbout: "About: {crop}",
    chatAuto: "Auto",
    chatIntro:
      "Ask me about prices, mandis, rain and harvest timing for {crop}. You can write in English or Gujarati.",
    chatThinking: "Thinking... (the first answer can take up to a minute while the server wakes up)",
    chatSend: "Send",
    chatPlaceholder: "Type your question...",
    chatDisclaimer: "Answers use past data and forecasts. They are suggestions, not guarantees.",
    chatErrDefault: "Sorry, I could not answer that. Please try again.",
    chatErrServer: "Could not reach the server. Please check your internet and try again.",

    // ----- error messages sent by the server (English text -> translated text) -----
    serverErrors: {},
  },

  gu: {
    // ----- common -----
    farmer: "ખેડૂત",
    logout: "લૉગઆઉટ",
    greeting: "નમસ્તે, {name}",
    loadingData: "{crop} માટે માહિતી લોડ થઈ રહી છે...",
    selectCrop: "🌾 પાક પસંદ કરો:",
    selectCropPlaceholder: "પાક પસંદ કરો",
    typeToSearch: "શોધવા માટે લખો...",
    noMatches: "કોઈ પરિણામ મળ્યું નથી",

    // ----- dashboard tabs -----
    tabOverview: "🏠 સારાંશ",
    tabPrices: "📈 ભાવ અને માંગ",
    tabWeather: "🌦️ હવામાન અને કાપણી",
    tabProduction: "📚 ઉત્પાદન",

    // ----- landing -----
    tagline: "ખેડૂત મિત્ર — તમારો ખેતીનો સાથી",
    landingP1:
      "ગુજરાતના ખેડૂતો દર સિઝનમાં અનિશ્ચિતતાનો સામનો કરે છે — પાકના ભાવ વધશે કે ઘટશે? કયું માર્કેટ યાર્ડ સૌથી સારો ભાવ આપે છે? કાપણી અને વેચાણનો યોગ્ય સમય ક્યારે છે?",
    landingP2:
      " વાસ્તવિક બજાર માહિતી અને AI નો ઉપયોગ કરીને આ પ્રશ્નોના જવાબ આપે છે — ગુજરાતના 9 મુખ્ય પાકો માટે ભાવની આગાહી, માંગના વલણો અને કાપણીની ભલામણો આપે છે, જેથી તમે વિશ્વાસપૂર્વક નિર્ણય લઈ શકો અને તમારી ઊપજનું શ્રેષ્ઠ મૂલ્ય મેળવી શકો.",
    getStarted: "શરૂ કરો",

    // ----- login -----
    loginTitle: "ફરી સ્વાગત છે",
    mobileNumber: "મોબાઇલ નંબર",
    mobilePlaceholder: "10 અંકનો મોબાઇલ નંબર",
    password: "પાસવર્ડ",
    passwordPlaceholder: "તમારો પાસવર્ડ દાખલ કરો",
    loginBtn: "લૉગિન",
    loggingIn: "લૉગિન થઈ રહ્યું છે...",
    loginFailed: "લૉગિન નિષ્ફળ ગયું. કૃપા કરીને ફરી પ્રયાસ કરો.",
    connectError: "સર્વર સાથે જોડાઈ શકાયું નથી. કૃપા કરીને ફરી પ્રયાસ કરો.",
    newFarmer: "નવા ખેડૂત?",
    createAccountLink: "ખાતું બનાવો",

    // ----- register -----
    createAccount: "🌱 તમારું ખાતું બનાવો",
    fullName: "પૂરું નામ",
    namePlaceholder: "તમારું પૂરું નામ દાખલ કરો",
    district: "જિલ્લો",
    districtPlaceholder: "તમારો જિલ્લો પસંદ કરો",
    preferredLanguage: "પસંદગીની ભાષા",
    createPassword: "પાસવર્ડ બનાવો",
    passwordHint: "ઓછામાં ઓછા 6 અક્ષર",
    confirmPassword: "પાસવર્ડ ફરી લખો",
    confirmPlaceholder: "પાસવર્ડ ફરીથી દાખલ કરો",
    registerBtn: "નોંધણી કરો",
    creatingAccount: "ખાતું બની રહ્યું છે...",
    errMobile: "કૃપા કરીને 10 અંકનો માન્ય મોબાઇલ નંબર દાખલ કરો.",
    errPasswordShort: "પાસવર્ડ ઓછામાં ઓછો 6 અક્ષરનો હોવો જોઈએ.",
    errPasswordMatch: "પાસવર્ડ મેળ ખાતા નથી.",
    registerFailed: "નોંધણી નિષ્ફળ ગઈ. કૃપા કરીને ફરી પ્રયાસ કરો.",
    haveAccount: "પહેલેથી ખાતું છે?",
    loginHere: "અહીં લૉગિન કરો",

    // ----- overview -----
    todayGlance: "આજની ઝલક - {crop}",
    nextWeekPrice: "આવતા અઠવાડિયાનો ભાવ",
    sharpTile: "ગયા અઠવાડિયે ભાવમાં મોટો ફેરફાર થયો, તેથી આ આગાહી ભરોસાપાત્ર નથી.",
    nowPriceChange: "હાલ ₹{price} ({change}%)",
    forecastNA: "આગાહી ઉપલબ્ધ નથી.",
    viewPrice: "ભાવની વિગત જુઓ →",
    marketDemand: "બજારની માંગ",
    demand_rising: "આવક વધી રહી છે",
    demand_stable: "આવક સ્થિર છે",
    demand_falling: "આવક ઘટી રહી છે",
    demandText_rising: "આવતા અઠવાડિયે માર્કેટ યાર્ડમાં વધુ માલ આવવાની શક્યતા છે.",
    demandText_stable: "આવતા અઠવાડિયે આવક લગભગ એટલી જ રહેવાની શક્યતા છે.",
    demandText_falling: "આવતા અઠવાડિયે માર્કેટ યાર્ડમાં ઓછો માલ આવવાની શક્યતા છે.",
    changeExpected: "આવતા અઠવાડિયે {change}% અપેક્ષિત",
    verySmall: "હાલ આવક ખૂબ ઓછી છે",
    demandNA: "માંગનો સંકેત ઉપલબ્ધ નથી.",
    viewDemand: "માંગની વિગત જુઓ →",
    weather7: "7 દિવસનું હવામાન",
    risk_low: "વરસાદનું જોખમ ઓછું",
    risk_moderate: "વરસાદનું મધ્યમ જોખમ",
    risk_high: "વરસાદનું ઊંચું જોખમ",
    rainExpected: "7 દિવસમાં {mm} મિ.મી. વરસાદની શક્યતા",
    weatherNA: "હાલ હવામાનની આગાહી ઉપલબ્ધ નથી.",
    viewWeather: "હવામાન જુઓ →",
    bestMandiTile: "હાલનું શ્રેષ્ઠ માર્કેટ યાર્ડ",
    harvestLine: "{season}, કાપણી: {months}",
    mandiNA: "માર્કેટ યાર્ડની માહિતી ઉપલબ્ધ નથી.",
    viewHarvest: "કાપણીની સલાહ જુઓ →",
    adviceFor: "{crop} માટે સલાહ",

    // ----- prices & demand -----
    priceHistory: "📊 ભાવનો ઇતિહાસ - {crop}",
    daily: "દૈનિક",
    monthly: "માસિક",
    yearly: "વાર્ષિક",
    priceSeries: "ભાવ (રૂ./ક્વિન્ટલ)",
    nextWeekForecast: "આવતા અઠવાડિયાની આગાહી",
    sharpBold: "ગયા અઠવાડિયે ભાવમાં મોટો ફેરફાર થયો ({pct}%).",
    sharpText:
      "આ અસામાન્ય છે અને ઘણી વાર ત્યારે થાય છે જ્યારે થોડા જ માર્કેટ યાર્ડ ભાવ જણાવે છે, તેથી નીચેની આગાહી ભરોસાપાત્ર નથી. કૃપા કરીને તમારા સ્થાનિક માર્કેટ યાર્ડમાં આજનો ભાવ તપાસો.",
    currentPrice: "હાલનો ભાવ",
    predictedNextWeek: "આવતા અઠવાડિયાનો અંદાજ",
    basedOn: "{date} સુધીના ભાવ પર આધારિત",
    methodBaseline: " · પદ્ધતિ: ગયા અઠવાડિયાનો ભાવ (આ પાક માટે સૌથી સચોટ)",
    methodModel: " · પદ્ધતિ: મશીન લર્નિંગ મોડેલ",
    demandCard: "બજારની માંગનો સંકેત",
    lowVolumeText: "હાલ આ પાકનો ખૂબ ઓછો માલ માર્કેટ યાર્ડમાં આવી રહ્યો છે.",
    arrivedWeek: "{date} ના અઠવાડિયામાં આવક",
    expectedWeek: "{date} ના અઠવાડિયા માટે અપેક્ષિત",
    weakSignal: "આટલા ઓછા જથ્થાનો સંકેત નબળો છે. ",
    demandNote:
      "આ જિલ્લામાં ભાવ જણાવતા માર્કેટ યાર્ડમાં આવતા ટન (માંગનો સંકેત, ચોક્કસ ગણતરી નથી).",
    demandMethodBaseline: " પદ્ધતિ: ગયા અઠવાડિયા જેટલું જ (આ પાક માટે સૌથી સચોટ).",
    demandMethodModel: " પદ્ધતિ: મશીન લર્નિંગ મોડેલ.",
    unitT: "ટન",
    bestMandiCard: "હાલનું શ્રેષ્ઠ માર્કેટ યાર્ડ",
    marketLabel: "માર્કેટ યાર્ડ",
    avgPrice90: "સરેરાશ ભાવ (છેલ્લા 90 દિવસ)",

    // ----- weather & harvest -----
    weatherTitle: "7 દિવસનું હવામાન",
    mm: "{mm} મિ.મી.",
    rainChance: "{pct}% શક્યતા",
    forecastUpdated: "આગાહી અપડેટ: {time} · સ્ત્રોત: Open-Meteo",
    harvestTitle: "કાપણી અને બજારની સલાહ",
    season: "સિઝન",
    sowingMonths: "સામાન્ય વાવણીના મહિના",
    harvestMonths: "સામાન્ય કાપણીના મહિના",

    // ----- production -----
    prodTitle: "ઉત્પાદનના આંકડા - ગુજરાત",
    prodByYear: "ગુજરાતનું વર્ષવાર ઉત્પાદન ({unit})",
    topDistricts: "સૌથી વધુ ઉત્પાદન કરતા જિલ્લા ({basis})",
    prodPerYear: "{value} {unit}/વર્ષ · {share}%",
    prodSeries: "ઉત્પાદન",
    prodSource: " સ્ત્રોત: {source}. જિલ્લાના નામ આ ડેટામાં વપરાયેલી જૂની સરહદો મુજબ છે.",

    // ----- chat -----
    askButton: "💬 KhedutMitra ને પૂછો",
    chatTitle: "🌾 KhedutMitra ને પૂછો",
    chatAbout: "પાક: {crop}",
    chatAuto: "સ્વચાલિત",
    chatIntro:
      "{crop} માટે ભાવ, માર્કેટ યાર્ડ, વરસાદ અને કાપણી વિશે પૂછો. તમે અંગ્રેજી અથવા ગુજરાતીમાં લખી શકો છો.",
    chatThinking: "વિચારી રહ્યો છું... (સર્વર જાગે ત્યાં સુધી પહેલા જવાબમાં એક મિનિટ સુધી લાગી શકે છે)",
    chatSend: "મોકલો",
    chatPlaceholder: "તમારો પ્રશ્ન લખો...",
    chatDisclaimer: "જવાબો ભૂતકાળના ડેટા અને આગાહી પર આધારિત છે. તે સૂચનો છે, ખાતરી નથી.",
    chatErrDefault: "માફ કરશો, હું તેનો જવાબ આપી શક્યો નહીં. કૃપા કરીને ફરી પ્રયાસ કરો.",
    chatErrServer: "સર્વર સુધી પહોંચી શકાયું નથી. કૃપા કરીને તમારું ઇન્ટરનેટ તપાસીને ફરી પ્રયાસ કરો.",

    // ----- error messages sent by the server (English text -> translated text) -----
    serverErrors: {
      "No account found with this mobile number.": "આ મોબાઇલ નંબર સાથે કોઈ ખાતું મળ્યું નથી.",
      "Incorrect password.": "પાસવર્ડ ખોટો છે.",
      "This mobile number is already registered.": "આ મોબાઇલ નંબર પહેલેથી નોંધાયેલો છે.",
    },
  },
};

// Gujarati names for display only. The English name is always what is sent to the server.
export const CROP_NAMES_GU = {
  "Bajra": "બાજરી",
  "Castor Seed": "એરંડા",
  "Chickpea": "ચણા",
  "Cotton": "કપાસ",
  "Cumin": "જીરું",
  "Groundnut": "મગફળી",
  "Mustard": "રાઈ",
  "Sesame": "તલ",
  "Wheat": "ઘઉં",
};

export const DISTRICT_NAMES_GU = {
  "Ahmedabad": "અમદાવાદ", "Amreli": "અમરેલી", "Anand": "આણંદ", "Aravalli": "અરવલ્લી",
  "Banaskantha": "બનાસકાંઠા", "Bharuch": "ભરૂચ", "Bhavnagar": "ભાવનગર", "Botad": "બોટાદ",
  "Chhota Udepur": "છોટા ઉદેપુર", "Dahod": "દાહોદ", "Dang": "ડાંગ", "Devbhoomi Dwarka": "દેવભૂમિ દ્વારકા",
  "Gandhinagar": "ગાંધીનગર", "Gir Somnath": "ગીર સોમનાથ", "Jamnagar": "જામનગર", "Junagadh": "જૂનાગઢ",
  "Kheda": "ખેડા", "Kutch": "કચ્છ", "Mahisagar": "મહીસાગર", "Mehsana": "મહેસાણા", "Morbi": "મોરબી",
  "Narmada": "નર્મદા", "Navsari": "નવસારી", "Panchmahal": "પંચમહાલ", "Patan": "પાટણ",
  "Porbandar": "પોરબંદર", "Rajkot": "રાજકોટ", "Sabarkantha": "સાબરકાંઠા", "Surat": "સુરત",
  "Surendranagar": "સુરેન્દ્રનગર", "Tapi": "તાપી", "Vadodara": "વડોદરા", "Valsad": "વલસાડ",
  // spellings used in the old production data
  "Kachchh": "કચ્છ", "Panch Mahals": "પંચમહાલ", "Dohad": "દાહોદ", "The Dangs": "ડાંગ",
  "Sabar Kantha": "સાબરકાંઠા", "Banas Kantha": "બનાસકાંઠા", "Mahesana": "મહેસાણા",
};

export const MONTHS_GU = {
  Jan: "જાન્યુ", Feb: "ફેબ્રુ", Mar: "માર્ચ", Apr: "એપ્રિલ", May: "મે", Jun: "જૂન",
  Jul: "જુલાઈ", Aug: "ઑગસ્ટ", Sep: "સપ્ટે", Oct: "ઑક્ટો", Nov: "નવે", Dec: "ડિસે",
};

export const UNIT_NAMES_GU = { tonnes: "ટન", bales: "ગાંસડી" };