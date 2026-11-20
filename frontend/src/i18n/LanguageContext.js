import React, { createContext, useContext, useState, useEffect } from "react";
import { translations, CROP_NAMES_GU, DISTRICT_NAMES_GU, MONTHS_GU, UNIT_NAMES_GU } from "./translations";
import { MARKET_NAMES_GU, EXTRA_DISTRICT_NAMES_GU } from "./placeNames";

// One place that remembers the chosen language ("en" or "gu") and gives every page
// a translate function t("key"). The choice is saved in the browser (localStorage).
const LanguageContext = createContext(null);

function readSavedLanguage() {
  try {
    return localStorage.getItem("language") === "gu" ? "gu" : "en";
  } catch (e) {
    return "en";
  }
}

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(readSavedLanguage);

  const setLanguage = (lang) => {
    const next = lang === "gu" ? "gu" : "en";
    setLanguageState(next);
    try { localStorage.setItem("language", next); } catch (e) { /* storage unavailable: ignore */ }
  };

  // Tell the browser which language the page is in (helps fonts and screen readers)
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  // t("greeting", { name: "Raj" }) -> text in the current language with {name} filled in.
  // Falls back to English, then to the key itself, so a missing translation never crashes.
  const t = (key, vars) => {
    let text = (translations[language] && translations[language][key]) ?? translations.en[key] ?? key;
    if (vars) {
      Object.keys(vars).forEach((k) => {
        text = text.split(`{${k}}`).join(vars[k]);
      });
    }
    return text;
  };

  // Translate an error message sent by the server (only the ones we know about)
  const te = (message) => {
    const map = translations[language] && translations[language].serverErrors;
    return (map && map[message]) || message;
  };

  // Display names (values sent to the server stay in English)
  const cropLabel = (crop) => (language === "gu" ? CROP_NAMES_GU[crop] || crop : crop);
  const districtLabel = (district) =>
    language === "gu" ? DISTRICT_NAMES_GU[district] || EXTRA_DISTRICT_NAMES_GU[district] || district : district;
  const unitLabel = (unit) => (language === "gu" ? UNIT_NAMES_GU[unit] || unit : unit);

  // "Botad APMC" -> "બોટાદ APMC" (unknown markets stay in English)
  const marketLabel = (market) => {
    if (language !== "gu" || !market) return market;
    const base = String(market).replace(/ APMC$/, "");
    const gujarati = MARKET_NAMES_GU[base];
    return gujarati ? `${gujarati} APMC` : market;
  };

  // "Oct, Nov" -> "ઑક્ટો, નવે"
  const monthsLabel = (months) => {
    if (language !== "gu" || !months) return months;
    return String(months)
      .split(",")
      .map((m) => MONTHS_GU[m.trim()] || m.trim())
      .join(", ");
  };

  // "Kharif (long duration)" -> "ખરીફ (લાંબા ગાળાનો)"
  const seasonLabel = (season) => {
    if (language !== "gu" || !season) return season;
    return String(season)
      .replace(/Kharif/g, "ખરીફ")
      .replace(/Rabi/g, "રવી")
      .replace("long duration", "લાંબા ગાળાનો");
  };

  return (
    <LanguageContext.Provider
      value={{
        language, setLanguage, t, te,
        cropLabel, districtLabel, marketLabel, unitLabel, monthsLabel, seasonLabel,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}