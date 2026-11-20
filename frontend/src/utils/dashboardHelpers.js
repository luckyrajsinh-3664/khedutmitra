// Shared constants and small helper functions used by the dashboard pages.
// Keeping them in one place means every page uses the same colours and date formats.

// Backend URL (change only here if you want to test against a local backend,
// e.g. "http://127.0.0.1:8000")
export const API_BASE = "https://khedutmitra-backend.onrender.com";

// Colours and labels for the rain-risk levels returned by /weather/{crop}
export const RISK_STYLES = {
  low:      { bg: "#E8F3E6", border: "#2F5233", label: "Low rain risk" },
  moderate: { bg: "#FFF3DC", border: "#E0A030", label: "Moderate rain risk" },
  high:     { bg: "#FBE4E1", border: "#C0392B", label: "High rain risk" },
};

// Colours and wording for the demand (arrivals) trend
export const DEMAND_STYLES = {
  rising:  { bg: "#E8F3E6", border: "#2F5233", label: "Arrivals rising",  text: "More produce is expected at the mandi next week." },
  stable:  { bg: "#F1EEE6", border: "#8A8470", label: "Arrivals stable",  text: "Arrivals are expected to stay about the same next week." },
  falling: { bg: "#FFF3DC", border: "#E0A030", label: "Arrivals falling", text: "Less produce is expected at the mandi next week." },
};

// "2026-09-27" -> "27 Sep 2026"
export function formatDate(iso) {
  if (!iso) return "";
  return new Date(iso + "T00:00:00").toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
}

// "2026-10-14" -> "Wed, 14 Oct"
export function formatDay(iso) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-IN", {
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