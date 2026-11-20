import React, { useState, useEffect } from "react";
import { useNavigate, NavLink, Outlet } from "react-router-dom";
import SearchableSelect from "../components/SearchableSelect";
import ChatWidget from "../components/ChatWidget";
import { API_BASE } from "../utils/dashboardHelpers";
import "./DashboardTabs.css";

// The tabs shown under the crop selector. "end" makes Overview active only on /dashboard itself.
const TABS = [
  { to: "/dashboard",            label: "🏠 Overview",           end: true },
  { to: "/dashboard/prices",     label: "📈 Prices & Demand" },
  { to: "/dashboard/weather",    label: "🌦️ Weather & Harvest" },
  { to: "/dashboard/production", label: "📚 Production" },
];

// Dashboard is now a LAYOUT: it keeps the topbar, crop selector, tab bar and chat,
// loads all the data for the selected crop, and shows the chosen tab inside <Outlet />.
// The pages (in pages/dashboardPages) only display the data they receive.
function Dashboard() {
  const navigate = useNavigate();
  const currentUser = JSON.parse(localStorage.getItem("currentUser"));

  const [crops, setCrops] = useState([]);
  const [selectedCrop, setSelectedCrop] = useState("Wheat");
  const [granularity, setGranularity] = useState("daily");
  const [priceHistory, setPriceHistory] = useState([]);
  const [forecast, setForecast] = useState(null);
  const [arrival, setArrival] = useState(null);
  const [harvestInfo, setHarvestInfo] = useState(null);
  const [weather, setWeather] = useState(null);
  const [production, setProduction] = useState(null);
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
    setProduction(null);
    setArrival(null);

    fetch(`${API_BASE}/prices-aggregated/${selectedCrop}?granularity=${granularity}`)
      .then((res) => res.json())
      .then((data) => { if (!cancelled) setPriceHistory(data.data); })
      .catch(() => { if (!cancelled) setPriceHistory([]); });

    fetch(`${API_BASE}/forecast/price/${selectedCrop}`)
      .then((res) => res.json())
      .then((data) => { if (!cancelled) setForecast(data); })
      .catch(() => { if (!cancelled) setForecast(null); });

    // Demand indicator (expected arrivals next week), loaded separately
    fetch(`${API_BASE}/forecast/arrival/${selectedCrop}`)
      .then((res) => res.json())
      .then((data) => { if (!cancelled) setArrival(data); })
      .catch(() => { if (!cancelled) setArrival(null); });

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

        {/* Tab bar */}
        <nav className="dash-tabs">
          {TABS.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.end}
              className={({ isActive }) => "dash-tab" + (isActive ? " active" : "")}
            >
              {t.label}
            </NavLink>
          ))}
        </nav>

        {loading ? (
          <p className="loading-text">Loading data for {selectedCrop}...</p>
        ) : (
          // The selected tab's page appears here and receives this data via context
          <Outlet
            context={{
              selectedCrop,
              granularity,
              setGranularity,
              priceHistory,
              forecast,
              arrival,
              harvestInfo,
              weather,
              production,
            }}
          />
        )}
      </div>

      {/* Floating AI assistant, available on every tab */}
      <ChatWidget selectedCrop={selectedCrop} />
    </div>
  );
}

export default Dashboard;