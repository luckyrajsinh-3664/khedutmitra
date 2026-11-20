import React from "react";
import { useOutletContext } from "react-router-dom";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { DEMAND_STYLES, formatDate } from "../../utils/dashboardHelpers";
import { useLanguage } from "../../i18n/LanguageContext";

// Prices & Demand tab: price history, next-week forecast, demand indicator, best mandi.
function PricesDemand() {
  const { language, t, cropLabel, marketLabel } = useLanguage();
  const { selectedCrop, granularity, setGranularity, priceHistory, forecast, arrival, harvestInfo } = useOutletContext();

  // Forecast card colour: green only if rising by more than 1%, red only if
  // falling by more than 1%, otherwise neutral (same 1% rule as the backend).
  // After a sharp weekly move the forecast is unreliable, so no colour at all.
  let trendClass = "";
  if (forecast && !forecast.detail && !forecast.sharp_move) {
    const change =
      forecast.change_percent !== undefined
        ? forecast.change_percent
        : ((forecast.predicted_next_week_price - forecast.current_price) / forecast.current_price) * 100;
    if (change > 1) trendClass = "trend-up";
    else if (change < -1) trendClass = "trend-down";
  }

  // Demand indicator: very small numbers carry little information
  const demandOk = arrival && !arrival.detail;
  const demandDirection = demandOk ? (DEMAND_STYLES[arrival.direction] ? arrival.direction : "stable") : null;
  const demandStyle = demandOk ? DEMAND_STYLES[demandDirection] : null;
  const lowVolume = demandOk && arrival.current_arrivals < 5 && arrival.predicted_arrivals < 5;

  return (
    <>
      <div className="card">
        <div className="chart-header-row">
          <h2 className="no-border">{t("priceHistory", { crop: cropLabel(selectedCrop) })}</h2>
          <div className="granularity-toggle">
            {["daily", "monthly", "yearly"].map((g) => (
              <button
                key={g}
                className={`granularity-btn ${granularity === g ? "active" : ""}`}
                onClick={() => setGranularity(g)}
              >
                {t(g)}
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
            <Line type="monotone" dataKey="price" stroke="#2F5233" strokeWidth={2.5} name={t("priceSeries")} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Forecast card: normal case */}
      {forecast && !forecast.detail && (
        <div className="card">
          <h2>{t("nextWeekForecast")}</h2>

          {/* Warning after a sharp weekly move (the forecast is unreliable then) */}
          {forecast.sharp_move && (
            <div
              style={{
                background: "#FFF3DC",
                borderLeft: "4px solid #E0A030",
                borderRadius: "8px",
                padding: "10px 14px",
                marginBottom: "14px",
                fontSize: "0.9rem",
              }}
            >
              <b>{t("sharpBold", { pct: `${forecast.weekly_move_percent > 0 ? "+" : ""}${forecast.weekly_move_percent}` })}</b>{" "}
              {t("sharpText")}
            </div>
          )}

          <div className="forecast-stats">
            <div className="stat-box">
              <div className="stat-label">{t("currentPrice")}</div>
              <div className="stat-value">₹{forecast.current_price.toFixed(2)}</div>
            </div>
            <div className={`stat-box ${trendClass}`}>
              <div className="stat-label">{t("predictedNextWeek")}</div>
              <div className="stat-value">₹{forecast.predicted_next_week_price.toFixed(2)}</div>
            </div>
          </div>

          {/* Likely range around the forecast (text comes from the backend in the chosen language) */}
          {forecast.range_low !== undefined && forecast.range_low !== null && (
            <div style={{ marginTop: "14px", fontSize: "0.92rem" }}>
              <b>{forecast.range_label}:</b> ₹{forecast.range_low.toFixed(2)} – ₹{forecast.range_high.toFixed(2)}
              <div style={{ fontSize: "0.8rem", opacity: 0.7, marginTop: "4px" }}>{forecast.range_note}</div>
            </div>
          )}

          <p style={{ margin: "12px 0 0", fontSize: "0.85rem", opacity: 0.75 }}>
            {t("basedOn", { date: formatDate(forecast.last_updated, language) })}
            {forecast.method === "baseline"
              ? t("methodBaseline")
              : forecast.method === "model"
              ? t("methodModel")
              : ""}
          </p>
        </div>
      )}

      {/* Forecast card: not available (e.g. no recent prices). The text comes from the backend in the chosen language. */}
      {forecast && forecast.detail && (
        <div className="card">
          <h2>{t("nextWeekForecast")}</h2>
          <p style={{ margin: 0 }}>
            {typeof forecast.detail === "string" ? forecast.detail : t("forecastNA")}
          </p>
        </div>
      )}

      {/* Demand indicator card (expected arrivals next week) */}
      {demandOk && (
        <div className="card">
          <h2>{t("demandCard")}</h2>

          <div
            style={{
              background: demandStyle.bg,
              borderLeft: `4px solid ${demandStyle.border}`,
              borderRadius: "8px",
              padding: "12px 16px",
              marginBottom: "16px",
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: "4px" }}>
              {t("demand_" + demandDirection)}
              {arrival.change_percent !== null && arrival.change_percent !== undefined
                ? ` (${arrival.change_percent > 0 ? "+" : ""}${arrival.change_percent}%)`
                : ""}
            </div>
            <div>{lowVolume ? t("lowVolumeText") : t("demandText_" + demandDirection)}</div>
          </div>

          <div className="forecast-stats">
            <div className="stat-box">
              <div className="stat-label">{t("arrivedWeek", { date: formatDate(arrival.week_ending, language) })}</div>
              <div className="stat-value">{arrival.current_arrivals.toLocaleString("en-IN")} {t("unitT")}</div>
            </div>
            <div className="stat-box">
              <div className="stat-label">{t("expectedWeek", { date: formatDate(arrival.forecast_week_ending, language) })}</div>
              <div className="stat-value">{arrival.predicted_arrivals.toLocaleString("en-IN")} {t("unitT")}</div>
            </div>
          </div>

          <p style={{ margin: "12px 0 0", fontSize: "0.8rem", opacity: 0.7 }}>
            {lowVolume ? t("weakSignal") : ""}
            {t("demandNote")}
            {arrival.method === "baseline"
              ? t("demandMethodBaseline")
              : arrival.method === "model"
              ? t("demandMethodModel")
              : ""}
          </p>
        </div>
      )}

      {/* Demand indicator: not available (hidden if the server has no such page yet) */}
      {arrival && arrival.detail && typeof arrival.detail === "string" && arrival.detail !== "Not Found" && (
        <div className="card">
          <h2>{t("demandCard")}</h2>
          <p style={{ margin: 0 }}>{arrival.detail}</p>
        </div>
      )}

      {/* Best mandi */}
      {harvestInfo && !harvestInfo.detail && harvestInfo.best_mandi && (
        <div className="card">
          <h2>{t("bestMandiCard")}</h2>
          <div className="info-row">
            <span className="label">{t("marketLabel")}</span>
            <span className="value">{marketLabel(harvestInfo.best_mandi.best_market)}</span>
          </div>
          <div className="info-row">
            <span className="label">{t("avgPrice90")}</span>
            <span className="value">₹{harvestInfo.best_mandi.best_avg_price.toFixed(2)}</span>
          </div>
        </div>
      )}
    </>
  );
}

export default PricesDemand;