import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
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
  const [loading, setLoading] = useState(true);

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

  const handleLogout = () => {
    localStorage.removeItem("currentUser");
    navigate("/login");
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
          </>
        )}
      </div>
    </div>
  );
}

export default Dashboard;