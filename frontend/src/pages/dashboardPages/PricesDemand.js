import React from "react";
import { useOutletContext } from "react-router-dom";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { DEMAND_STYLES, formatDate } from "../../utils/dashboardHelpers";

// Prices & Demand tab: price history, next-week forecast, demand indicator, best mandi.
function PricesDemand() {
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
  const demandStyle = arrival && !arrival.detail ? DEMAND_STYLES[arrival.direction] || DEMAND_STYLES.stable : null;
  const lowVolume = arrival && !arrival.detail && arrival.current_arrivals < 5 && arrival.predicted_arrivals < 5;

  return (
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
              <b>Prices moved sharply last week ({forecast.weekly_move_percent > 0 ? "+" : ""}{forecast.weekly_move_percent}%).</b>{" "}
              This is unusual and often happens when only a few mandis report, so the forecast below is
              unreliable. Please check today's price at your local mandi.
            </div>
          )}

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

      {/* Forecast card: not available (e.g. no recent prices) */}
      {forecast && forecast.detail && (
        <div className="card">
          <h2>Next Week Forecast</h2>
          <p style={{ margin: 0 }}>
            {typeof forecast.detail === "string" ? forecast.detail : "Forecast not available."}
          </p>
        </div>
      )}

      {/* Demand indicator card (expected arrivals next week) */}
      {arrival && !arrival.detail && (
        <div className="card">
          <h2>Market Demand Indicator</h2>

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
              {demandStyle.label}
              {arrival.change_percent !== null && arrival.change_percent !== undefined
                ? ` (${arrival.change_percent > 0 ? "+" : ""}${arrival.change_percent}%)`
                : ""}
            </div>
            <div>{lowVolume ? "Very little produce is arriving at the mandis for this crop right now." : demandStyle.text}</div>
          </div>

          <div className="forecast-stats">
            <div className="stat-box">
              <div className="stat-label">Arrived Week Ending {formatDate(arrival.week_ending)}</div>
              <div className="stat-value">{arrival.current_arrivals.toLocaleString("en-IN")} t</div>
            </div>
            <div className="stat-box">
              <div className="stat-label">Expected Week Ending {formatDate(arrival.forecast_week_ending)}</div>
              <div className="stat-value">{arrival.predicted_arrivals.toLocaleString("en-IN")} t</div>
            </div>
          </div>

          <p style={{ margin: "12px 0 0", fontSize: "0.8rem", opacity: 0.7 }}>
            {lowVolume ? "Volumes this small are a weak signal. " : ""}
            Tonnes arriving at the mandis that reported in this district (a demand indicator, not an exact count).
            {arrival.method === "baseline"
              ? " Method: same as last week (best performer for this crop)."
              : arrival.method === "model"
              ? " Method: machine learning model."
              : ""}
          </p>
        </div>
      )}

      {/* Demand indicator: not available (hidden if the server has no such page yet) */}
      {arrival && arrival.detail && typeof arrival.detail === "string" && arrival.detail !== "Not Found" && (
        <div className="card">
          <h2>Market Demand Indicator</h2>
          <p style={{ margin: 0 }}>{arrival.detail}</p>
        </div>
      )}

      {/* Best mandi (moved here from the old Harvest card, it is a price topic) */}
      {harvestInfo && !harvestInfo.detail && harvestInfo.best_mandi && (
        <div className="card">
          <h2>Best Mandi Right Now</h2>
          <div className="info-row">
            <span className="label">Market</span>
            <span className="value">{harvestInfo.best_mandi.best_market}</span>
          </div>
          <div className="info-row">
            <span className="label">Average price (last 90 days)</span>
            <span className="value">₹{harvestInfo.best_mandi.best_avg_price.toFixed(2)}</span>
          </div>
        </div>
      )}
    </>
  );
}

export default PricesDemand;