"""
messages.py
All the sentences the backend writes for farmers, in English ("en") and Gujarati ("gu").
Keeping them in one file means the logic files (weather.py, production.py,
harvest_and_mandi.py, main.py) contain no hard-coded sentences, and a Gujarati speaker
can review every Gujarati sentence here.

Usage:   msg("gu", "advice_stable")      msg("en", "weather_low", total=0)
Anything that is not "gu" is treated as English. The English text is exactly the text the
backend used before this file existed, so English output is unchanged.
"""

# Gujarati crop names (display only)
CROP_NAMES_GU = {
    "Bajra": "બાજરી", "Castor Seed": "એરંડા", "Chickpea": "ચણા", "Cotton": "કપાસ",
    "Cumin": "જીરું", "Groundnut": "મગફળી", "Mustard": "રાઈ", "Sesame": "તલ", "Wheat": "ઘઉં",
}

# Gujarati district names (display only), including the old spellings in the production data
DISTRICT_NAMES_GU = {
    "Ahmedabad": "અમદાવાદ", "Amreli": "અમરેલી", "Anand": "આણંદ", "Aravalli": "અરવલ્લી",
    "Banaskantha": "બનાસકાંઠા", "Bharuch": "ભરૂચ", "Bhavnagar": "ભાવનગર", "Botad": "બોટાદ",
    "Chhota Udepur": "છોટા ઉદેપુર", "Dahod": "દાહોદ", "Dang": "ડાંગ", "The Dangs": "ડાંગ",
    "Devbhoomi Dwarka": "દેવભૂમિ દ્વારકા", "Gandhinagar": "ગાંધીનગર", "Gir Somnath": "ગીર સોમનાથ",
    "Jamnagar": "જામનગર", "Junagadh": "જૂનાગઢ", "Kheda": "ખેડા", "Kutch": "કચ્છ", "Kachchh": "કચ્છ",
    "Mahisagar": "મહીસાગર", "Mehsana": "મહેસાણા", "Morbi": "મોરબી", "Narmada": "નર્મદા",
    "Navsari": "નવસારી", "Panchmahal": "પંચમહાલ", "Panchmahals": "પંચમહાલ", "Panch Mahals": "પંચમહાલ",
    "Patan": "પાટણ", "Porbandar": "પોરબંદર", "Rajkot": "રાજકોટ", "Sabarkantha": "સાબરકાંઠા",
    "Surat": "સુરત", "Surendranagar": "સુરેન્દ્રનગર", "Tapi": "તાપી", "Vadodara": "વડોદરા",
    "Valsad": "વલસાડ",
}

MESSAGES = {
    "en": {
        # ---- weather (weather.py) ----
        "weather_high_total": "About {total} mm of rain is expected over the next 7 days. Delay harvesting and protect harvested produce.",
        "weather_heavy_today": "Heavy rain ({mm} mm) is expected today. Do not harvest or dry produce in the open.",
        "weather_heavy_later": "Heavy rain ({mm} mm) is expected in {days} day(s). Delay harvesting or finish and cover produce before then.",
        "weather_moderate": "Some rain is expected ({wet} wet day(s), {total} mm total). Harvest on dry days and keep produce covered.",
        "weather_low": "Mostly dry weather ahead ({total} mm in 7 days). Good for harvesting.",
        "weather_unavailable": "Weather forecast is temporarily unavailable ({reason}).",
        "weather_no_location": "No weather location configured for {crop}.",

        # ---- harvest advice (harvest_and_mandi.py) ----
        "advice_no_forecast": "Price forecast not available for this crop; recommendation based on seasonal calendar only.",
        "advice_stale": "No recent prices are available for this crop (last reported {date}, about {weeks} weeks ago, probably off-season or not reported), so we cannot give a reliable price forecast.",
        "advice_sharp": "Prices moved sharply last week ({pct}%). This is unusual and often happens when only a few mandis report, so we cannot give a reliable forecast. Please check today's price at your local mandi before deciding.",
        "advice_baseline": "For this crop, last week's price (about Rs. {price} per quintal) has been the most accurate predictor in our tests, so we expect prices to stay close to the current level.",
        "advice_large_swing": "Our model predicts a large price swing ({change}% next week), but such large single-week changes are less reliable. Treat this as a signal to watch prices closely rather than a firm prediction.",
        "advice_up": "Prices are trending upward (+{change}% expected next week). If you have storage, consider holding stock for a slightly better price.",
        "advice_down": "Prices are trending downward ({change}% expected next week). Consider selling soon rather than waiting.",
        "advice_stable": "Prices are expected to remain stable in the short term.",
        "wx_first": "WEATHER: ",
        "wx_mid": " Weather: ",
        "wx_alert": " Weather alert: ",

        # ---- forecast endpoints (main.py) ----
        "forecast_stale": "No recent prices for {crop} (last reported {date}, about {weeks} weeks ago). Forecast not available.",
        "arrival_stale": "No recent arrivals reported for {crop} (last reported {date}, about {weeks} weeks ago). Demand forecast not available.",

        # ---- production (production.py) ----
        "prod_unavailable": "Production statistics are temporarily unavailable.",
        "prod_no_data": "Production statistics for {crop} are not available in our dataset.",
        "prod_summary_up": "Between {y1}-{y2} and {y3}-{y4}, Gujarat's {crop} production rose by about {pct}% on average. {district} is the largest producing district ({share}% of the state total).",
        "prod_summary_down": "Between {y1}-{y2} and {y3}-{y4}, Gujarat's {crop} production fell by about {pct}% on average. {district} is the largest producing district ({share}% of the state total).",
        "prod_basis": "average of {a}-{b}",
        "prod_note": "Historical statistics (1997-2012), shown for context. Not current-season production.",
        "prod_source": "Ministry of Agriculture & Farmers Welfare (district-wise Area, Production & Yield)",
    },

    "gu": {
        # ---- weather ----
        "weather_high_total": "આગામી 7 દિવસમાં લગભગ {total} મિ.મી. વરસાદની શક્યતા છે. કાપણી મોકૂફ રાખો અને કાપેલા પાકને સુરક્ષિત રાખો.",
        "weather_heavy_today": "આજે ભારે વરસાદ ({mm} મિ.મી.) પડવાની શક્યતા છે. ખુલ્લામાં કાપણી કે પાક સૂકવવાનું ટાળો.",
        "weather_heavy_later": "{days} દિવસમાં ભારે વરસાદ ({mm} મિ.મી.) પડવાની શક્યતા છે. કાપણી મોકૂફ રાખો અથવા તે પહેલાં પાક સમેટીને ઢાંકી દો.",
        "weather_moderate": "થોડા વરસાદની શક્યતા છે ({wet} વરસાદી દિવસ, કુલ {total} મિ.મી.). સૂકા દિવસોમાં કાપણી કરો અને પાકને ઢાંકેલો રાખો.",
        "weather_low": "આગળ મોટે ભાગે સૂકું હવામાન રહેશે (7 દિવસમાં {total} મિ.મી.). કાપણી માટે સારું.",
        "weather_unavailable": "હવામાનની આગાહી હાલ અસ્થાયી રીતે ઉપલબ્ધ નથી ({reason}).",
        "weather_no_location": "{crop} માટે હવામાનનું સ્થળ નક્કી કરેલું નથી.",

        # ---- harvest advice ----
        "advice_no_forecast": "આ પાક માટે ભાવની આગાહી ઉપલબ્ધ નથી; ભલામણ ફક્ત સિઝન કેલેન્ડર પર આધારિત છે.",
        "advice_stale": "આ પાક માટે તાજેતરના ભાવ ઉપલબ્ધ નથી (છેલ્લે {date} ના રોજ નોંધાયા, લગભગ {weeks} અઠવાડિયા પહેલાં, કદાચ ઑફ-સિઝન અથવા નોંધાયા નથી), તેથી અમે ભરોસાપાત્ર ભાવની આગાહી આપી શકતા નથી.",
        "advice_sharp": "ગયા અઠવાડિયે ભાવમાં મોટો ફેરફાર થયો ({pct}%). આ અસામાન્ય છે અને ઘણી વાર ત્યારે થાય છે જ્યારે થોડા જ માર્કેટ યાર્ડ ભાવ જણાવે છે, તેથી અમે ભરોસાપાત્ર આગાહી આપી શકતા નથી. નિર્ણય લેતા પહેલાં કૃપા કરીને તમારા સ્થાનિક માર્કેટ યાર્ડમાં આજનો ભાવ તપાસો.",
        "advice_baseline": "આ પાક માટે ગયા અઠવાડિયાનો ભાવ (લગભગ રૂ. {price} પ્રતિ ક્વિન્ટલ) અમારા પરીક્ષણોમાં સૌથી સચોટ અનુમાન સાબિત થયો છે, તેથી અમે અપેક્ષા રાખીએ છીએ કે ભાવ હાલના સ્તરની નજીક રહેશે.",
        "advice_large_swing": "અમારું મોડેલ ભાવમાં મોટા ફેરફારની ({change}% આવતા અઠવાડિયે) આગાહી કરે છે, પરંતુ આવા એક અઠવાડિયાના મોટા ફેરફાર ઓછા ભરોસાપાત્ર હોય છે. તેને પાકી આગાહી ગણવાને બદલે ભાવ પર નજીકથી નજર રાખવાનો સંકેત ગણો.",
        "advice_up": "ભાવ વધવાનું વલણ છે (આવતા અઠવાડિયે +{change}% અપેક્ષિત). જો તમારી પાસે સંગ્રહની સુવિધા હોય, તો થોડા સારા ભાવ માટે માલ રોકી રાખવાનું વિચારો.",
        "advice_down": "ભાવ ઘટવાનું વલણ છે (આવતા અઠવાડિયે {change}% અપેક્ષિત). રાહ જોવાને બદલે જલદી વેચવાનું વિચારો.",
        "advice_stable": "ટૂંકા ગાળામાં ભાવ સ્થિર રહેવાની અપેક્ષા છે.",
        "wx_first": "હવામાન: ",
        "wx_mid": " હવામાન: ",
        "wx_alert": " હવામાન ચેતવણી: ",

        # ---- forecast endpoints ----
        "forecast_stale": "{crop} માટે તાજેતરના ભાવ ઉપલબ્ધ નથી (છેલ્લે {date} ના રોજ નોંધાયા, લગભગ {weeks} અઠવાડિયા પહેલાં). આગાહી ઉપલબ્ધ નથી.",
        "arrival_stale": "{crop} માટે તાજેતરની આવક નોંધાયેલી નથી (છેલ્લે {date} ના રોજ નોંધાઈ, લગભગ {weeks} અઠવાડિયા પહેલાં). માંગની આગાહી ઉપલબ્ધ નથી.",

        # ---- production ----
        "prod_unavailable": "ઉત્પાદનના આંકડા હાલ અસ્થાયી રીતે ઉપલબ્ધ નથી.",
        "prod_no_data": "{crop} માટે ઉત્પાદનના આંકડા અમારા ડેટામાં ઉપલબ્ધ નથી.",
        "prod_summary_up": "{y1}-{y2} અને {y3}-{y4} વચ્ચે ગુજરાતમાં {crop}નું ઉત્પાદન સરેરાશ લગભગ {pct}% વધ્યું. {district} સૌથી વધુ ઉત્પાદન કરતો જિલ્લો છે (રાજ્યના કુલ ઉત્પાદનના {share}%).",
        "prod_summary_down": "{y1}-{y2} અને {y3}-{y4} વચ્ચે ગુજરાતમાં {crop}નું ઉત્પાદન સરેરાશ લગભગ {pct}% ઘટ્યું. {district} સૌથી વધુ ઉત્પાદન કરતો જિલ્લો છે (રાજ્યના કુલ ઉત્પાદનના {share}%).",
        "prod_basis": "{a}-{b} ની સરેરાશ",
        "prod_note": "ઐતિહાસિક આંકડા (1997-2012), સંદર્ભ માટે બતાવ્યા છે. ચાલુ સિઝનનું ઉત્પાદન નથી.",
        "prod_source": "કૃષિ અને ખેડૂત કલ્યાણ મંત્રાલય (જિલ્લાવાર વિસ્તાર, ઉત્પાદન અને ઉપજ)",
    },
}


def normalise_lang(lang):
    """Anything that is not "gu" means English."""
    return "gu" if lang == "gu" else "en"


def msg(lang, key, **values):
    """Look up a sentence in the right language and fill in the {placeholders}."""
    table = MESSAGES[normalise_lang(lang)]
    template = table.get(key) or MESSAGES["en"][key]   # missing Gujarati text falls back to English
    return template.format(**values)


def crop_label(lang, crop):
    """'Groundnut' -> 'મગફળી' in Gujarati; unchanged in English."""
    if normalise_lang(lang) != "gu" or not crop:
        return crop
    return CROP_NAMES_GU.get(crop) or CROP_NAMES_GU.get(str(crop).strip().title(), crop)


def district_label(lang, district):
    """'Dahod' -> 'દાહોદ' in Gujarati; unchanged in English."""
    if normalise_lang(lang) != "gu":
        return district
    return DISTRICT_NAMES_GU.get(district, district)