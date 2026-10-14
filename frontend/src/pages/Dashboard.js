import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import SearchableSelect from "../components/SearchableSelect";

const API_BASE = "https://khedutmitra-backend.onrender.com";

// Colours and labels for the rain-risk levels returned by /weather/{crop}
const RISK_STYLES = {
  low:      { bg: "#E8F3E6", border: "#2F5233", label: "Low rain risk" },
  moderate: { bg: "#FFF3DC", border: "#E0A030", label: "Moderate rain risk" },
  high:     { bg: "#FBE4E1", border: "#C0392B", label: "High rain risk" },
};

// "2026-09-27" -> "27 Sep 2026"
function formatDate(iso) {
  if (!iso) return "";
  return new Date(iso + "T00:00:00").toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
}

// "2026-10-14" -> "Wed, 14 Oct"
function formatDay(iso) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-IN", {
    weekday: "short", day: "numeric", month: "short",
  });
}

// A small icon for each day, based on how much rain is expected
function rainIcon(mm) {
  if (mm >= 15) return "⛈️";
  if (mm >= 5) return "🌧️";
  if (mm > 0.5) return "🌦️";
  return "☀️";
}

// 4477500 -> "4.5M", 606340 -> "606k" (short labels for the production chart axis)
function shortNumber(v) {
  if (v >= 1000000) return (v / 1000000).toFixed(1) + "M";
  if (v >= 1000) return Math.round(v / 1000) + "k";
  return String(v);
}

// Suggested questions for the chat box (the crop selected on the dashboard is sent separately)
function suggestedQuestions(lang, crop) {
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

function Dashboard() {
  const navigate = useNavigate();
  const currentUser = JSON.parse(localStorage.getItem("currentUser"));

  const [crops, setCrops] = useState([]);
  const [selectedCrop, setSelectedCrop] = useState("Wheat");
  const [granularity, setGranularity] = useState("daily");
  const [priceHistory, setPriceHistory] = useState([]);
  const [forecast, setForecast] = useState(null);
  const [harvestInfo, setHarvestInfo] = useState(null);
  const [weather, setWeather] = useState(null);
  const [production, setProduction] = useState(null);
  const [loading, setLoading] = useState(true);

  // ---- AI assistant chat state ----
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatLang, setChatLang] = useState("auto");   // "auto", "en" or "gu"
  const [messages, setMessages] = useState([]);       // {role: "user"|"bot", text, sources, error}
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    fetch(`${API_BASE}/crops`)
      .then((res) => res.json())
      .then((data) => setCrops(data.crops))
      .catch((err) => console.error(err));
  }, []);

  useEffect(() => {
    // "cancelled" stops a slow, old response from overwriting the data of a
    // crop the user has already switched away from
    let cancelled = false;
    setLoading(true);
    setWeather(null);
    setProduction(null);

    fetch(`${API_BASE}/prices-aggregated/${selectedCrop}?granularity=${granularity}`)
      .then((res) => res.json())
      .then((data) => { if (!cancelled) setPriceHistory(data.data); })
      .catch(() => { if (!cancelled) setPriceHistory([]); });

    fetch(`${API_BASE}/forecast/price/${selectedCrop}`)
      .then((res) => res.json())
      .then((data) => { if (!cancelled) setForecast(data); })
      .catch(() => { if (!cancelled) setForecast(null); });

    // Weather loads separately, so a slow weather call never blocks the page
    fetch(`${API_BASE}/weather/${selectedCrop}`)
      .then((res) => res.json())
      .then((data) => { if (!cancelled) setWeather(data); })
      .catch(() => { if (!cancelled) setWeather(null); });

    // Historical production statistics (also loaded separately)
    fetch(`${API_BASE}/production/${selectedCrop}`)
      .then((res) => res.json())
      .then((data) => { if (!cancelled) setProduction(data); })
      .catch(() => { if (!cancelled) setProduction(null); });

    fetch(`${API_BASE}/harvest-window/${selectedCrop}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        setHarvestInfo(data);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setHarvestInfo(null);
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, [selectedCrop, granularity]);

  // Keep the newest chat message in view
  useEffect(() => {
    if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: "smooth" });
  }, [messages, chatLoading, chatOpen]);

  const handleLogout = () => {
    localStorage.removeItem("currentUser");
    navigate("/login");
  };

  // Send one question to the assistant. The crop selected on the dashboard is sent too,
  // so the farmer does not have to type the crop name.
  const sendQuestion = async (text) => {
    const question = (text !== undefined ? text : chatInput).trim();
    if (!question || chatLoading) return;

    setMessages((prev) => [...prev, { role: "user", text: question }]);
    setChatInput("");
    setChatLoading(true);

    try {
      const res = await fetch(`${API_BASE}/assistant/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          crop: selectedCrop,
          language: chatLang === "auto" ? null : chatLang,
        }),
      });
      const data = await res.json();
      if (data.available) {
        setMessages((prev) => [...prev, { role: "bot", text: data.answer, sources: data.sources }]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "bot", text: data.message || "Sorry, I could not answer that. Please try again.", error: true },
        ]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "bot", text: "Could not reach the server. Please check your internet and try again.", error: true },
      ]);
    }
    setChatLoading(false);
  };

  // Forecast card colour: green only if rising by more than 1%, red only if
  // falling by more than 1%, otherwise neutral (same 1% rule as the backend)
  let trendClass = "";
  if (forecast && !forecast.detail) {
    const change =
      forecast.change_percent !== undefined
        ? forecast.change_percent
        : ((forecast.predicted_next_week_price - forecast.current_price) / forecast.current_price) * 100;
    if (change > 1) trendClass = "trend-up";
    else if (change < -1) trendClass = "trend-down";
  }

  const riskStyle = weather && weather.available ? RISK_STYLES[weather.risk] || RISK_STYLES.low : null;

  const chipLang = chatLang === "gu" ? "gu" : "en";

  return (
    <div>
      <div className="dashboard-topbar">
        <h2 onClick={() => navigate("/")} style={{ cursor: "pointer" }}>🌾 KhedutMitra</h2>
        <div className="topbar-right">
          <span className="greeting">Namaste, {currentUser?.name || "Farmer"}</span>
          <button className="btn-logout" onClick={handleLogout}>Logout</button>
        </div>
      </div>

      <div className="dashboard-container">
        <div className="crop-selector">
          <label>🌾 Select Crop:</label>
          <div style={{ flex: 1, maxWidth: "240px" }}>
            <SearchableSelect
              options={crops}
              value={selectedCrop}
              onChange={setSelectedCrop}
              placeholder="Select a crop"
            />
          </div>
        </div>

        {loading ? (
          <p className="loading-text">Loading data for {selectedCrop}...</p>
        ) : (
          <>
            <div className="card">
              <div className="chart-header-row">
                <h2 className="no-border">📊 Price History - {selectedCrop}</h2>
                <div className="granularity-toggle">
                  {["daily", "monthly", "yearly"].map((g) => (
                    <button
                      key={g}
                      className={`granularity-btn ${granularity === g ? "active" : ""}`}
                      onClick={() => setGranularity(g)}
                    >
                      {g.charAt(0).toUpperCase() + g.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <hr className="chart-divider" />
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={priceHistory}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis />
                  <Tooltip formatter={(value) => value.toFixed(2)} />
                  <Legend />
                  <Line type="monotone" dataKey="price" stroke="#2F5233" strokeWidth={2.5} name="Price (Rs./Quintal)" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Forecast card: normal case */}
            {forecast && !forecast.detail && (
              <div className="card">
                <h2>Next Week Forecast</h2>
                <div className="forecast-stats">
                  <div className="stat-box">
                    <div className="stat-label">Current Price</div>
                    <div className="stat-value">₹{forecast.current_price.toFixed(2)}</div>
                  </div>
                  <div className={`stat-box ${trendClass}`}>
                    <div className="stat-label">Predicted Next Week</div>
                    <div className="stat-value">₹{forecast.predicted_next_week_price.toFixed(2)}</div>
                  </div>
                </div>
                <p style={{ margin: "12px 0 0", fontSize: "0.85rem", opacity: 0.75 }}>
                  Based on prices up to {formatDate(forecast.last_updated)}
                  {forecast.method === "baseline"
                    ? " · Method: last week's price (best performer for this crop)"
                    : forecast.method === "model"
                    ? " · Method: machine learning model"
                    : ""}
                </p>
              </div>
            )}

            {/* Forecast card: not available (e.g. Cotton, no recent prices) */}
            {forecast && forecast.detail && (
              <div className="card">
                <h2>Next Week Forecast</h2>
                <p style={{ margin: 0 }}>
                  {typeof forecast.detail === "string" ? forecast.detail : "Forecast not available."}
                </p>
              </div>
            )}

            {/* Weather card */}
            {weather && !weather.detail && (
              <div className="card">
                <h2>7-Day Weather Outlook{weather.district ? ` - ${weather.district}` : ""}</h2>

                {weather.available ? (
                  <>
                    <div
                      style={{
                        background: riskStyle.bg,
                        borderLeft: `4px solid ${riskStyle.border}`,
                        borderRadius: "8px",
                        padding: "12px 16px",
                        marginBottom: "16px",
                      }}
                    >
                      <div style={{ fontWeight: 700, marginBottom: "4px" }}>{riskStyle.label}</div>
                      <div>{weather.message}</div>
                    </div>

                    <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                      {weather.daily.map((d) => (
                        <div
                          key={d.date}
                          style={{
                            flex: "1 1 100px",
                            minWidth: "100px",
                            textAlign: "center",
                            padding: "10px 6px",
                            borderRadius: "8px",
                            background: "rgba(0,0,0,0.04)",
                            fontSize: "0.85rem",
                          }}
                        >
                          <div style={{ fontWeight: 600 }}>{formatDay(d.date)}</div>
                          <div style={{ fontSize: "1.4rem", margin: "4px 0" }}>{rainIcon(d.rain_mm)}</div>
                          <div>{d.rain_mm} mm</div>
                          <div style={{ opacity: 0.7 }}>{d.rain_chance_pct}% chance</div>
                          <div style={{ opacity: 0.7 }}>{d.temp_max}°C</div>
                        </div>
                      ))}
                    </div>

                    {weather.updated_at && (
                      <p style={{ margin: "12px 0 0", fontSize: "0.8rem", opacity: 0.65 }}>
                        Forecast updated: {weather.updated_at} · Source: Open-Meteo
                      </p>
                    )}
                  </>
                ) : (
                  <p style={{ margin: 0 }}>{weather.message || "Weather forecast is not available right now."}</p>
                )}
              </div>
            )}

            {harvestInfo && !harvestInfo.detail && (
              <div className="card">
                <h2>Harvest & Market Advice</h2>
                <div className="info-row">
                  <span className="label">Season</span>
                  <span className="value">{harvestInfo.season}</span>
                </div>
                <div className="info-row">
                  <span className="label">Typical Sowing Months</span>
                  <span className="value">{harvestInfo.typical_sowing_months}</span>
                </div>
                <div className="info-row">
                  <span className="label">Typical Harvest Months</span>
                  <span className="value">{harvestInfo.typical_harvest_months}</span>
                </div>
                {harvestInfo.best_mandi && (
                  <div className="info-row">
                    <span className="label">Best Mandi Right Now</span>
                    <span className="value">{harvestInfo.best_mandi.best_market} (₹{harvestInfo.best_mandi.best_avg_price.toFixed(2)})</span>
                  </div>
                )}
                <p className="advice">{harvestInfo.advice}</p>
              </div>
            )}

            {/* Production statistics card (historical, 1997-2012) */}
            {production && !production.detail && (
              <div className="card">
                <h2>Production Statistics - Gujarat</h2>

                {production.available ? (
                  <>
                    <p style={{ margin: "0 0 16px" }}>{production.message}</p>

                    <div style={{ fontWeight: 600, marginBottom: "6px", fontSize: "0.9rem" }}>
                      Gujarat production by year ({production.unit})
                    </div>
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={production.yearly_trend}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="year" tick={{ fontSize: 10 }} />
                        <YAxis tickFormatter={shortNumber} tick={{ fontSize: 10 }} />
                        <Tooltip
                          formatter={(value) => [`${value.toLocaleString("en-IN")} ${production.unit}`, "Production"]}
                        />
                        <Bar dataKey="production" fill="#2F5233" name={`Production (${production.unit})`} />
                      </BarChart>
                    </ResponsiveContainer>

                    <div style={{ fontWeight: 600, margin: "20px 0 8px", fontSize: "0.9rem" }}>
                      Top producing districts ({production.top_districts_basis})
                    </div>
                    {production.top_districts.map((d) => (
                      <div key={d.district} style={{ marginBottom: "10px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem" }}>
                          <span>{d.district}</span>
                          <span>
                            {d.avg_production.toLocaleString("en-IN")} {production.unit}/yr · {d.share_pct}%
                          </span>
                        </div>
                        <div style={{ height: "6px", borderRadius: "3px", background: "rgba(0,0,0,0.08)", marginTop: "4px" }}>
                          <div
                            style={{
                              width: `${Math.min(d.share_pct, 100)}%`,
                              height: "100%",
                              borderRadius: "3px",
                              background: "#2F5233",
                            }}
                          />
                        </div>
                      </div>
                    ))}

                    <p style={{ margin: "14px 0 0", fontSize: "0.8rem", opacity: 0.65 }}>
                      {production.note} Source: {production.source}. District names follow the older boundaries used in this data.
                    </p>
                  </>
                ) : (
                  <p style={{ margin: 0 }}>
                    {production.message || "Production statistics are not available for this crop."}
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* ---------------- AI assistant: floating button + chat panel ---------------- */}
      {!chatOpen && (
        <button
          onClick={() => setChatOpen(true)}
          style={{
            position: "fixed", right: "20px", bottom: "20px", zIndex: 1000,
            background: "#2F5233", color: "#fff", border: "none", borderRadius: "28px",
            padding: "12px 20px", fontSize: "1rem", fontWeight: 600, cursor: "pointer",
            boxShadow: "0 4px 14px rgba(0,0,0,0.3)",
          }}
        >
          💬 Ask KhedutMitra
        </button>
      )}

      {chatOpen && (
        <div
          style={{
            position: "fixed", right: "20px", bottom: "20px", zIndex: 1000,
            width: "min(390px, calc(100vw - 32px))", height: "min(540px, calc(100vh - 40px))",
            background: "#fff", borderRadius: "14px", display: "flex", flexDirection: "column",
            boxShadow: "0 8px 30px rgba(0,0,0,0.35)", overflow: "hidden", color: "#222",
          }}
        >
          {/* header */}
          <div style={{ background: "#2F5233", color: "#fff", padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontWeight: 700 }}>🌾 Ask KhedutMitra</div>
              <div style={{ fontSize: "0.78rem", opacity: 0.85 }}>About: {selectedCrop}</div>
            </div>
            <button
              onClick={() => setChatOpen(false)}
              aria-label="Close chat"
              style={{ background: "transparent", border: "none", color: "#fff", fontSize: "1.4rem", cursor: "pointer" }}
            >
              ×
            </button>
          </div>

          {/* language switch */}
          <div style={{ display: "flex", gap: "6px", padding: "8px 12px", background: "#F3F6F1", borderBottom: "1px solid #E0E6DC" }}>
            {[["auto", "Auto"], ["en", "English"], ["gu", "ગુજરાતી"]].map(([code, label]) => (
              <button
                key={code}
                onClick={() => setChatLang(code)}
                style={{
                  padding: "4px 12px", borderRadius: "14px", fontSize: "0.82rem", cursor: "pointer",
                  border: "1px solid #2F5233",
                  background: chatLang === code ? "#2F5233" : "#fff",
                  color: chatLang === code ? "#fff" : "#2F5233",
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "12px", display: "flex", flexDirection: "column", gap: "10px" }}>
            {messages.length === 0 && (
              <div style={{ fontSize: "0.9rem", lineHeight: 1.5 }}>
                <div style={{ marginBottom: "10px" }}>
                  {chipLang === "gu"
                    ? `${selectedCrop} માટે ભાવ, માર્કેટ યાર્ડ, વરસાદ અને કાપણી વિશે પૂછો.`
                    : `Ask me about prices, mandis, rain and harvest timing for ${selectedCrop}. You can write in English or Gujarati.`}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {suggestedQuestions(chipLang, selectedCrop).map((q) => (
                    <button
                      key={q}
                      onClick={() => sendQuestion(q)}
                      style={{
                        textAlign: "left", padding: "8px 10px", borderRadius: "10px", fontSize: "0.85rem",
                        border: "1px solid #C9D6C4", background: "#F3F6F1", cursor: "pointer", color: "#2F5233",
                      }}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} style={{ alignSelf: m.role === "user" ? "flex-end" : "flex-start", maxWidth: "88%" }}>
                <div
                  style={{
                    padding: "9px 12px", borderRadius: "12px", fontSize: "0.9rem", lineHeight: 1.5,
                    whiteSpace: "pre-wrap",
                    background: m.role === "user" ? "#2F5233" : m.error ? "#FBE4E1" : "#EEF3EC",
                    color: m.role === "user" ? "#fff" : "#222",
                  }}
                >
                  {m.text}
                </div>
                {m.role === "bot" && !m.error && m.sources && m.sources.length > 0 && (
                  <div style={{ fontSize: "0.72rem", opacity: 0.6, margin: "4px 4px 0" }}>
                    Based on: {m.sources.join(" · ")}
                  </div>
                )}
              </div>
            ))}

            {chatLoading && (
              <div style={{ alignSelf: "flex-start", maxWidth: "88%", padding: "9px 12px", borderRadius: "12px", background: "#EEF3EC", fontSize: "0.85rem" }}>
                Thinking... (the first answer can take up to a minute while the server wakes up)
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* input */}
          <div style={{ borderTop: "1px solid #E0E6DC", padding: "10px 12px" }}>
            <div style={{ display: "flex", gap: "8px" }}>
              <input
                type="text"
                value={chatInput}
                maxLength={500}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") sendQuestion(); }}
                placeholder={chatLang === "gu" ? "તમારો પ્રશ્ન લખો..." : "Type your question..."}
                style={{ flex: 1, padding: "9px 12px", borderRadius: "20px", border: "1px solid #C9D6C4", fontSize: "0.9rem", outline: "none" }}
              />
              <button
                onClick={() => sendQuestion()}
                disabled={chatLoading || !chatInput.trim()}
                style={{
                  padding: "0 16px", borderRadius: "20px", border: "none", fontWeight: 600, cursor: "pointer",
                  background: chatLoading || !chatInput.trim() ? "#A9B8A5" : "#2F5233", color: "#fff",
                }}
              >
                Send
              </button>
            </div>
            <div style={{ fontSize: "0.7rem", opacity: 0.6, marginTop: "6px" }}>
              Answers use past data and forecasts. They are suggestions, not guarantees.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;