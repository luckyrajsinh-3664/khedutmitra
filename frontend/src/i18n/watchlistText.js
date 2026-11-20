// English / Gujarati text for the "My Watchlist" feature.
// Kept in its own file so the main translations file is not touched.
// wt(language, "key", { name: value }) fills the {placeholders}.

const TEXT = {
  en: {
    tabWatchlist: "My Watchlist",
    title: "My Watchlist",
    intro: "Follow crops and set a target price. We show an alert here when the price reaches it or a big move is expected.",
    priceNote: "Prices shown are the weekly average across all mandis, not the price at one mandi.",
    addTitle: "Add a crop",
    crop: "Crop",
    alertWhen: "Alert me when the price",
    optAbove: "goes above",
    optBelow: "goes below",
    targetLabel: "Target price (₹ per quintal, optional)",
    addBtn: "Add / update",
    saving: "Saving...",
    remove: "Remove",
    empty: "Your watchlist is empty. Add a crop above.",
    currentPrice: "Current price",
    nextWeek: "Next week (forecast)",
    noTarget: "No target set (following only)",
    targetLine: "Alert when price is {dir} ₹{price}",
    dirAbove: "above",
    dirBelow: "below",
    dataFrom: "Data from {date}",
    noAlerts: "No alerts right now.",
    loading: "Loading your watchlist...",
    loadError: "Could not load your watchlist. Please try again.",
    authError: "Your login has expired. Please log out and log in again.",
    saveError: "Could not save. Please check the price and try again.",
    logoutBtn: "Log out",
    bannerText: "{n} price alert(s) in your watchlist",
    bannerLink: "View watchlist →",
  },
  gu: {
    tabWatchlist: "મારી વૉચલિસ્ટ",
    title: "મારી વૉચલિસ્ટ",
    intro: "પાક ફોલો કરો અને લક્ષ્ય ભાવ નક્કી કરો. ભાવ ત્યાં પહોંચે અથવા મોટો ફેરફાર અપેક્ષિત હોય ત્યારે અમે અહીં ચેતવણી બતાવીશું.",
    priceNote: "બતાવેલા ભાવ બધા માર્કેટ યાર્ડની સાપ્તાહિક સરેરાશ છે, કોઈ એક માર્કેટ યાર્ડનો ભાવ નથી.",
    addTitle: "પાક ઉમેરો",
    crop: "પાક",
    alertWhen: "ચેતવણી આપો જ્યારે ભાવ",
    optAbove: "વધે",
    optBelow: "ઘટે",
    targetLabel: "લક્ષ્ય ભાવ (₹ પ્રતિ ક્વિન્ટલ, વૈકલ્પિક)",
    addBtn: "ઉમેરો / અપડેટ કરો",
    saving: "સાચવી રહ્યા છીએ...",
    remove: "કાઢી નાખો",
    empty: "તમારી વૉચલિસ્ટ ખાલી છે. ઉપર પાક ઉમેરો.",
    currentPrice: "હાલનો ભાવ",
    nextWeek: "આવતા અઠવાડિયે (આગાહી)",
    noTarget: "લક્ષ્ય નક્કી નથી (ફક્ત ફોલો)",
    targetLine: "ભાવ ₹{price} થી {dir} ત્યારે ચેતવણી",
    dirAbove: "વધે",
    dirBelow: "ઘટે",
    dataFrom: "{date} સુધીનો ડેટા",
    noAlerts: "હાલ કોઈ ચેતવણી નથી.",
    loading: "તમારી વૉચલિસ્ટ લોડ થઈ રહી છે...",
    loadError: "તમારી વૉચલિસ્ટ લોડ થઈ શકી નથી. ફરી પ્રયત્ન કરો.",
    authError: "તમારું લૉગિન પૂરું થઈ ગયું છે. કૃપા કરીને લૉગ આઉટ કરી ફરી લૉગિન કરો.",
    saveError: "સાચવી શકાયું નથી. ભાવ તપાસી ફરી પ્રયત્ન કરો.",
    logoutBtn: "લૉગ આઉટ",
    bannerText: "તમારી વૉચલિસ્ટમાં {n} ભાવ ચેતવણી",
    bannerLink: "વૉચલિસ્ટ જુઓ →",
  },
};

export function wt(language, key, vars) {
  let text = (TEXT[language] && TEXT[language][key]) ?? TEXT.en[key] ?? key;
  if (vars) {
    Object.keys(vars).forEach((k) => {
      text = text.split(`{${k}}`).join(vars[k]);
    });
  }
  return text;
}