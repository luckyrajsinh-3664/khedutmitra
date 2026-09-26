import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const API_BASE = "https://khedutmitra-backend.onrender.com";

function Dashboard() {
  const navigate = useNavigate();
  const currentUser = JSON.parse(localStorage.getItem("currentUser"));

  const [crops, setCrops] = useState([]);
  const [selectedCrop, setSelectedCrop] = useState("Wheat");
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

    fetch(`${API_BASE}/prices/${selectedCrop}?limit=60`)
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
  }, [selectedCrop]);

  const handleLogout = () => {
    localStorage.removeItem("currentUser");
    navigate("/login");
  };

  return (
    <div>
      <div className="dashboard-topbar">
        <h2>🌾 KhedutMitra</h2>
        <div>
          <span style={{ marginRight: "15px" }}>Namaste, {currentUser?.name || "Farmer"}</span>
          <button className="btn-logout" onClick={handleLogout}>Logout</button>
        </div>
      </div>

      <div className="dashboard-container">
        <div className="crop-selector">
          <label>Select Crop: </label>
          <select value={selectedCrop} onChange={(e) => setSelectedCrop(e.target.value)}>
            {crops.map((crop) => (
              <option key={crop} value={crop}>{crop}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <p style={{ color: "white" }}>Loading data for {selectedCrop}...</p>
        ) : (
          <>
            <div className="card">
              <h2>Price History (Last 60 Days) - {selectedCrop}</h2>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={priceHistory}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="price" stroke="#2e7d32" name="Price (Rs./Quintal)" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {forecast && !forecast.detail && (
              <div className="card">
                <h2>Next Week Forecast</h2>
                <p>Current Price: <strong>Rs. {forecast.current_price}</strong></p>
                <p>Predicted Next Week: <strong>Rs. {forecast.predicted_next_week_price}</strong></p>
              </div>
            )}

            {harvestInfo && !harvestInfo.detail && (
              <div className="card">
                <h2>Harvest & Market Advice</h2>
                <p><strong>Season:</strong> {harvestInfo.season}</p>
                <p><strong>Typical Sowing Months:</strong> {harvestInfo.typical_sowing_months}</p>
                <p><strong>Typical Harvest Months:</strong> {harvestInfo.typical_harvest_months}</p>
                {harvestInfo.best_mandi && (
                  <p><strong>Best Mandi Right Now:</strong> {harvestInfo.best_mandi.best_market} (avg Rs. {harvestInfo.best_mandi.best_avg_price})</p>
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