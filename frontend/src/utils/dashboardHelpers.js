// Shared constants and small helper functions used by the dashboard pages.

// Backend URL (change only here if you want to test against a local backend,
// e.g. "http://127.0.0.1:8000")
export const API_BASE = "http://127.0.0.1:8000";

// Colours for the rain-risk levels returned by /weather/{crop}.
// (The wording now comes from the translations file: risk_low, risk_moderate, risk_high.)
export const RISK_STYLES = {
  low:      { bg: "#E8F3E6", border: "#2F5233" },
  moderate: { bg: "#FFF3DC", border: "#E0A030" },
  high:     { bg: "#FBE4E1", border: "#C0392B" },
};

// Colours for the demand (arrivals) trend
// (Wording: demand_rising / demandText_rising etc. in the translations file.)
export const DEMAND_STYLES = {
  rising:  { bg: "#E8F3E6", border: "#2F5233" },
  stable:  { bg: "#F1EEE6", border: "#8A8470" },
  falling: { bg: "#FFF3DC", border: "#E0A030" },
};

// "2026-09-27" -> "27 Sep 2026" (month names follow the chosen language)
export function formatDate(iso, language = "en") {
  if (!iso) return "";
  return new Date(iso + "T00:00:00").toLocaleDateString(language === "gu" ? "gu-IN" : "en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
}

// "2026-10-14" -> "Wed, 14 Oct"
export function formatDay(iso, language = "en") {
  return new Date(iso + "T00:00:00").toLocaleDateString(language === "gu" ? "gu-IN" : "en-IN", {
    weekday: "short", day: "numeric", month: "short",
  });
}

// A small icon for each day, based on how much rain is expected
export function rainIcon(mm) {
  if (mm >= 15) return "⛈️";
  if (mm >= 5) return "🌧️";
  if (mm > 0.5) return "🌦️";
  return "☀️";
}

// 4477500 -> "4.5M", 606340 -> "606k" (short labels for the production chart axis)
export function shortNumber(v) {
  if (v >= 1000000) return (v / 1000000).toFixed(1) + "M";
  if (v >= 1000) return Math.round(v / 1000) + "k";
  return String(v);
}

// Suggested questions for the chat box (the selected crop is sent separately)
export function suggestedQuestions(lang, crop) {
  if (lang === "gu") {
    return [
      "અત્યારે વેચવું જોઈએ કે રાહ જોવી?",
      "આ અઠવાડિયે વરસાદ પડશે?",
      "કયા માર્કેટ યાર્ડમાં સૌથી સારો ભાવ મળે છે?",
      "કયા જિલ્લામાં સૌથી વધુ ઉત્પાદન થાય છે?",
    ];
  }
  return [
    `Should I sell ${crop} now or wait?`,
    "Will it rain this week?",
    "Which mandi pays the best price?",
    "Which district grows the most?",
  ];
}