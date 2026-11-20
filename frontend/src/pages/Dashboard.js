import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, NavLink, Outlet } from "react-router-dom";
import SearchableSelect from "../components/SearchableSelect";
import ChatWidget from "../components/ChatWidget";
import LanguageSwitcher from "../components/LanguageSwitcher";
import { API_BASE } from "../utils/dashboardHelpers";
import { useLanguage } from "../i18n/LanguageContext";
import { wt } from "../i18n/watchlistText";
import "./DashboardTabs.css";

// The tabs under the crop selector. "end" makes Overview active only on /dashboard itself.
// labelKey is looked up in the translations file; watchKey in watchlistText.js.
const TABS = [
  { to: "/dashboard",            labelKey: "tabOverview",   end: true },
  { to: "/dashboard/prices",     labelKey: "tabPrices" },
  { to: "/dashboard/weather",    labelKey: "tabWeather" },
  { to: "/dashboard/production", labelKey: "tabProduction" },
  { to: "/dashboard/watchlist",  watchKey: "tabWatchlist" },
];

// Dashboard is a LAYOUT: it keeps the topbar, crop selector, tab bar and chat,
// loads all the data for the selected crop, and shows the chosen tab inside <Outlet />.
function Dashboard() {
  const navigate = useNavigate();
  const { t, cropLabel, language } = useLanguage();
  const currentUser = JSON.parse(localStorage.getItem("currentUser"));
  const token = currentUser?.token;

  const [crops, setCrops] = useState([]);
  const [selectedCrop, setSelectedCrop] = useState("Wheat");
  const [granularity, setGranularity] = useState("daily");
  const [priceHistory, setPriceHistory] = useState([]);
  const [forecast, setForecast] = useState(null);
  const [arrival, setArrival] = useState(null);
  const [harvestInfo, setHarvestInfo] = useState(null);
  const [weather, setWeather] = useState(null);
  const [production, setProduction] = useState(null);

  // The farmer's watchlist: {items, alert_count}, or {error: "auth" | "load"}, or null while loading
  const [watchlist, setWatchlist] = useState(null);

  // "loadedCrop" is the crop whose data has arrived. While it differs from the selected
  // crop we show "Loading...". Changing only the LANGUAGE does not trigger the loading screen.
  const [loadedCrop, setLoadedCrop] = useState(null);
  const loading = loadedCrop !== selectedCrop;
  const lastCropRef = useRef(selectedCrop);

  // 1) The list of crops (once)
  useEffect(() => {
    fetch(`${API_BASE}/crops`)
      .then((res) => res.json())
      .then((data) => setCrops(data.crops))
      .catch((err) => console.error(err));
  }, []);

  // 2) Price history: depends on the crop and Daily/Monthly/Yearly only (no text, so no language)
  useEffect(() => {
    // "cancelled" stops a slow, old response from overwriting newer data
    let cancelled = false;
    setPriceHistory([]);

    fetch(`${API_BASE}/prices-aggregated/${selectedCrop}?granularity=${granularity}`)
      .then((res) => res.json())
      .then((data) => { if (!cancelled) setPriceHistory(data.data); })
      .catch(() => { if (!cancelled) setPriceHistory([]); });

    return () => { cancelled = true; };
  }, [selectedCrop, granularity]);

  // 3) Everything that contains sentences written by the backend: reloaded when the crop OR the
  //    language changes, and the backend is asked for the sentences in that language (?lang=).
  useEffect(() => {
    let cancelled = false;

    // A new crop: clear the old crop's data. (A language change keeps the cards on screen
    // until the new text arrives, so the page does not flash.)
    if (lastCropRef.current !== selectedCrop) {
      lastCropRef.current = selectedCrop;
      setLoadedCrop(null);
      setForecast(null);
      setArrival(null);
      setHarvestInfo(null);
      setWeather(null);
      setProduction(null);
    }

    const q = `?lang=${language}`;

    fetch(`${API_BASE}/forecast/price/${selectedCrop}${q}`)
      .then((res) => res.json())
      .then((data) => { if (!cancelled) setForecast(data); })
      .catch(() => { if (!cancelled) setForecast(null); });

    // Demand indicator (expected arrivals next week), loaded separately
    fetch(`${API_BASE}/forecast/arrival/${selectedCrop}${q}`)
      .then((res) => res.json())
      .then((data) => { if (!cancelled) setArrival(data); })
      .catch(() => { if (!cancelled) setArrival(null); });

    // Weather loads separately, so a slow weather call never blocks the page
    fetch(`${API_BASE}/weather/${selectedCrop}${q}`)
      .then((res) => res.json())
      .then((data) => { if (!cancelled) setWeather(data); })
      .catch(() => { if (!cancelled) setWeather(null); });

    // Historical production statistics (also loaded separately)
    fetch(`${API_BASE}/production/${selectedCrop}${q}`)
      .then((res) => res.json())
      .then((data) => { if (!cancelled) setProduction(data); })
      .catch(() => { if (!cancelled) setProduction(null); });

    // The harvest advice finishing is what ends the "Loading..." screen
    fetch(`${API_BASE}/harvest-window/${selectedCrop}${q}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        setHarvestInfo(data);
        setLoadedCrop(selectedCrop);
      })
      .catch(() => {
        if (cancelled) return;
        setHarvestInfo(null);
        setLoadedCrop(selectedCrop);
      });

    return () => { cancelled = true; };
  }, [selectedCrop, language]);

  // 4) The farmer's watchlist and alerts (needs the login token). Reloaded when the language changes,
  //    because the alert sentences come from the backend. The Watchlist tab calls refreshWatchlist()
  //    after adding or removing a crop.
  const refreshWatchlist = useCallback(() => {
    if (!token) {
      setWatchlist({ error: "auth" });
      return Promise.resolve();
    }
    return fetch(`${API_BASE}/watchlist?lang=${language}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (res.status === 401) throw new Error("auth");
        if (!res.ok) throw new Error("load");
        return res.json();
      })
      .then((data) => setWatchlist(data))
      .catch((err) => setWatchlist({ error: err.message === "auth" ? "auth" : "load" }));
  }, [token, language]);

  useEffect(() => {
    refreshWatchlist();
  }, [refreshWatchlist]);

  const handleLogout = () => {
    localStorage.removeItem("currentUser");
    navigate("/login");
  };

  const alertCount = watchlist && !watchlist.error ? watchlist.alert_count : 0;

  return (
    <div>
      <div className="dashboard-topbar">
        <h2 onClick={() => navigate("/")} style={{ cursor: "pointer" }}>🌾 KhedutMitra</h2>
        <div className="topbar-right">
          <span className="greeting">{t("greeting", { name: currentUser?.name || t("farmer") })}</span>
          <LanguageSwitcher />
          <button className="btn-logout" onClick={handleLogout}>{t("logout")}</button>
        </div>
      </div>

      <div className="dashboard-container">
        <div className="crop-selector">
          <label>{t("selectCrop")}</label>
          <div style={{ flex: 1, maxWidth: "240px" }}>
            <SearchableSelect
              options={crops}
              value={selectedCrop}
              onChange={setSelectedCrop}
              placeholder={t("selectCropPlaceholder")}
              getLabel={cropLabel}
            />
          </div>
        </div>

        {/* Tab bar */}
        <nav className="dash-tabs">
          {TABS.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) => "dash-tab" + (isActive ? " active" : "")}
            >
              {tab.watchKey ? wt(language, tab.watchKey) : t(tab.labelKey)}
              {/* number of watchlist alerts */}
              {tab.watchKey && alertCount > 0 && (
                <span
                  style={{
                    marginLeft: "6px", background: "#C0392B", color: "#fff", borderRadius: "10px",
                    padding: "1px 7px", fontSize: "0.75rem", fontWeight: 700,
                  }}
                >
                  {alertCount}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {loading ? (
          <p className="loading-text">{t("loadingData", { crop: cropLabel(selectedCrop) })}</p>
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
              crops,
              watchlist,
              refreshWatchlist,
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