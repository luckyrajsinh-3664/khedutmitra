import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import SearchableSelect from "../components/SearchableSelect";

const API_BASE = "https://khedutmitra-backend.onrender.com";

function Dashboard() {
  const navigate = useNavigate();
  const currentUser = JSON.parse(localStorage.getItem("currentUser"));

  const [crops, setCrops] = useState([]);
  const [selectedCrop, setSelectedCrop] = useState("Wheat");
  const [granularity, setGranularity] = useState("daily");
  const [priceHistory, setPriceHistory] = useState([]);
  const [forecast, setForecast] = useState(null);
  const [harvestInfo, setHarvestInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/crops`)
      .then((res) => res.json())
      .then((data) => setCrops(data.crops))
      .catch((err) => console.error(err));
  }, []);

  useEffect(() => {
    setLoading(true);

    fetch(`${API_BASE}/prices-aggregated/${selectedCrop}?granularity=${granularity}`)
      .then((res) => res.json())
      .then((data) => setPriceHistory(data.data))
      .catch(() => setPriceHistory([]));

    fetch(`${API_BASE}/forecast/price/${selectedCrop}`)
      .then((res) => res.json())
      .then((data) => setForecast(data))
      .catch(() => setForecast(null));

    fetch(`${API_BASE}/harvest-window/${selectedCrop}`)
      .then((res) => res.json())
      .then((data) => {
        setHarvestInfo(data);
        setLoading(false);
      })
      .catch(() => {
        setHarvestInfo(null);
        setLoading(false);
      });
  }, [selectedCrop, granularity]);

  const handleLogout = () => {
    localStorage.removeItem("currentUser");
    navigate("/login");
  };

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

            {forecast && !forecast.detail && (
              <div className="card">
                <h2>Next Week Forecast</h2>
                <div className="forecast-stats">
                  <div className="stat-box">
                    <div className="stat-label">Current Price</div>
                    <div className="stat-value">₹{forecast.current_price.toFixed(2)}</div>
                  </div>
                  <div className={`stat-box ${forecast.predicted_next_week_price > forecast.current_price ? "trend-up" : "trend-down"}`}>
                    <div className="stat-label">Predicted Next Week</div>
                    <div className="stat-value">₹{forecast.predicted_next_week_price.toFixed(2)}</div>
                  </div>
                </div>
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