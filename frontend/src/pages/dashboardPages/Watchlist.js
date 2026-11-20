import React, { useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { API_BASE, formatDate } from "../../utils/dashboardHelpers";
import { useLanguage } from "../../i18n/LanguageContext";
import { wt } from "../../i18n/watchlistText";

// Colours of the alert boxes: "hit" = target reached, "near" = forecast may reach it,
// "info" = big forecast move, "warn" = unreliable or old data
const ALERT_STYLES = {
  hit:  { bg: "#E3F3E3", border: "#2F8F4E" },
  near: { bg: "#EEF5DC", border: "#8AAE2F" },
  info: { bg: "#E6EEF8", border: "#4A7FBF" },
  warn: { bg: "#FFF3DC", border: "#E0A030" },
};

const inputStyle = {
  padding: "8px 10px", borderRadius: "8px", border: "1px solid #C9D6C4",
  fontSize: "0.95rem", background: "#fff",
};

// My Watchlist tab: follow crops with an optional target price and see alerts.
// The watchlist itself is loaded by Dashboard (the layout) and arrives through the Outlet context.
function Watchlist() {
  const { language, cropLabel } = useLanguage();
  const navigate = useNavigate();
  const { crops, watchlist, refreshWatchlist } = useOutletContext();

  const [crop, setCrop] = useState("");
  const [direction, setDirection] = useState("above");
  const [target, setTarget] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");   // a key of watchlistText.js, or ""

  const getToken = () => {
    try {
      return JSON.parse(localStorage.getItem("currentUser"))?.token;
    } catch (e) {
      return null;
    }
  };

  // Used when the login token is missing or expired
  const handleLogout = () => {
    localStorage.removeItem("currentUser");
    navigate("/login");
  };

  // Add a crop (or change its target)
  const handleAdd = () => {
    const chosen = crop || (crops && crops[0]);
    if (!chosen) return;

    let targetNumber = null;
    if (target !== "") {
      targetNumber = Number(target);
      if (!(targetNumber > 0)) {
        setFormError("saveError");
        return;
      }
    }

    setSaving(true);
    setFormError("");
    fetch(`${API_BASE}/watchlist`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ crop: chosen, target_price: targetNumber, direction }),
    })
      .then((res) => {
        if (res.status === 401) throw new Error("auth");
        if (!res.ok) throw new Error("save");
        return res.json();
      })
      .then(() => {
        setTarget("");
        return refreshWatchlist();
      })
      .catch((err) => setFormError(err.message === "auth" ? "authError" : "saveError"))
      .finally(() => setSaving(false));
  };

  // Remove a crop
  const handleRemove = (cropName) => {
    fetch(`${API_BASE}/watchlist/${encodeURIComponent(cropName)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then((res) => {
        if (res.status === 401) throw new Error("auth");
        return refreshWatchlist();
      })
      .catch((err) => setFormError(err.message === "auth" ? "authError" : "saveError"));
  };

  // ---- Not loaded yet / could not load ----
  if (watchlist === null) {
    return <p className="loading-text">{wt(language, "loading")}</p>;
  }
  if (watchlist.error) {
    return (
      <div className="card">
        <h2>{wt(language, "title")}</h2>
        <p style={{ marginTop: 0 }}>
          {wt(language, watchlist.error === "auth" ? "authError" : "loadError")}
        </p>
        {watchlist.error === "auth" && (
          <button className="btn-logout" onClick={handleLogout}>{wt(language, "logoutBtn")}</button>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="card">
        <h2>{wt(language, "title")}</h2>
        <p style={{ marginTop: 0 }}>{wt(language, "intro")}</p>
        <p style={{ fontSize: "0.82rem", opacity: 0.7 }}>{wt(language, "priceNote")}</p>

        <h3 style={{ margin: "16px 0 8px", fontSize: "1rem" }}>{wt(language, "addTitle")}</h3>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "flex-end" }}>
          <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "0.85rem" }}>
            {wt(language, "crop")}
            <select value={crop || (crops && crops[0]) || ""} onChange={(e) => setCrop(e.target.value)} style={inputStyle}>
              {(crops || []).map((c) => (
                <option key={c} value={c}>{cropLabel(c)}</option>
              ))}
            </select>
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "0.85rem" }}>
            {wt(language, "alertWhen")}
            <select value={direction} onChange={(e) => setDirection(e.target.value)} style={inputStyle}>
              <option value="above">{wt(language, "optAbove")}</option>
              <option value="below">{wt(language, "optBelow")}</option>
            </select>
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "0.85rem" }}>
            {wt(language, "targetLabel")}
            <input
              type="number"
              min="1"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              style={{ ...inputStyle, width: "190px" }}
            />
          </label>

          <button className="btn-primary" onClick={handleAdd} disabled={saving} style={{ width: "auto", padding: "9px 18px" }}>
            {saving ? wt(language, "saving") : wt(language, "addBtn")}
          </button>
        </div>

        {formError && (
          <p style={{ color: "#B3261E", marginBottom: 0 }}>
            {wt(language, formError)}{" "}
            {formError === "authError" && (
              <button className="btn-logout" onClick={handleLogout}>{wt(language, "logoutBtn")}</button>
            )}
          </p>
        )}
      </div>

      {watchlist.items.length === 0 && (
        <div className="card"><p style={{ margin: 0 }}>{wt(language, "empty")}</p></div>
      )}

      {watchlist.items.map((item) => (
        <div className="card" key={item.crop}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px" }}>
            <h2 className="no-border" style={{ margin: 0 }}>{cropLabel(item.crop)}</h2>
            <button className="btn-logout" onClick={() => handleRemove(item.crop)}>{wt(language, "remove")}</button>
          </div>

          {item.current_price !== undefined && (
            <div className="forecast-stats" style={{ marginTop: "12px" }}>
              <div className="stat-box">
                <div className="stat-label">{wt(language, "currentPrice")}</div>
                <div className="stat-value">₹{Number(item.current_price).toFixed(2)}</div>
              </div>
              {item.predicted_price !== undefined && (
                <div className="stat-box">
                  <div className="stat-label">{wt(language, "nextWeek")}</div>
                  <div className="stat-value">
                    ₹{Number(item.predicted_price).toFixed(2)}
                    {!item.sharp_move && item.change_percent !== undefined && (
                      <span style={{ fontSize: "0.8rem", marginLeft: "6px" }}>
                        ({item.change_percent > 0 ? "+" : ""}{item.change_percent}%)
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <p style={{ margin: "10px 0 0", fontSize: "0.85rem", opacity: 0.8 }}>
            {item.target_price
              ? wt(language, "targetLine", {
                  dir: wt(language, item.direction === "below" ? "dirBelow" : "dirAbove"),
                  price: item.target_price,
                })
              : wt(language, "noTarget")}
            {item.last_updated ? ` · ${wt(language, "dataFrom", { date: formatDate(item.last_updated, language) })}` : ""}
          </p>

          <div style={{ marginTop: "10px", display: "flex", flexDirection: "column", gap: "8px" }}>
            {item.alerts.length === 0 && (
              <span style={{ fontSize: "0.85rem", opacity: 0.7 }}>{wt(language, "noAlerts")}</span>
            )}
            {item.alerts.map((a, i) => {
              const style = ALERT_STYLES[a.kind] || ALERT_STYLES.info;
              return (
                <div
                  key={i}
                  style={{
                    background: style.bg,
                    borderLeft: `4px solid ${style.border}`,
                    borderRadius: "8px",
                    padding: "9px 12px",
                    fontSize: "0.9rem",
                  }}
                >
                  {a.text}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </>
  );
}

export default Watchlist;