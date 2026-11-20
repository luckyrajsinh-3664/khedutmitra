import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Overview from "./pages/dashboardPages/Overview";
import PricesDemand from "./pages/dashboardPages/PricesDemand";
import WeatherHarvest from "./pages/dashboardPages/WeatherHarvest";
import Production from "./pages/dashboardPages/Production";
import Watchlist from "./pages/dashboardPages/Watchlist";
import { LanguageProvider } from "./i18n/LanguageContext";
import "./App.css";
import farmBg from "./farm-bg.jpg";

// Simple check: is someone currently logged in? (stored in browser for now)
function isLoggedIn() {
  return localStorage.getItem("currentUser") !== null;
}

// A "protected route" - if not logged in, bounce back to login page
function ProtectedRoute({ children }) {
  return isLoggedIn() ? children : <Navigate to="/login" />;
}

function App() {
  return (
    // LanguageProvider makes the chosen language (English / Gujarati) available to every page
    <LanguageProvider>
      <BrowserRouter>
        <div
          className="farm-background"
          style={{
            backgroundImage: `linear-gradient(rgba(20, 40, 20, 0.75), rgba(20, 40, 20, 0.75)), url(${farmBg})`
          }}
        >
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Dashboard is a layout; each tab is a nested route shown inside its <Outlet /> */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            >
              <Route index element={<Overview />} />
              <Route path="prices" element={<PricesDemand />} />
              <Route path="weather" element={<WeatherHarvest />} />
              <Route path="production" element={<Production />} />
              <Route path="watchlist" element={<Watchlist />} />
            </Route>
          </Routes>
        </div>
      </BrowserRouter>
    </LanguageProvider>
  );
}

export default App;