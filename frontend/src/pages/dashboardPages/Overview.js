import React from "react";
import { Link, useOutletContext } from "react-router-dom";
import { RISK_STYLES, DEMAND_STYLES } from "../../utils/dashboardHelpers";

// Overview tab: four small summary tiles ("today at a glance").
// Each tile links to the tab that has the full details.
function Overview() {
  // The Dashboard layout loads all the data and hands it to us
  const { selectedCrop, forecast, arrival, harvestInfo, weather } = useOutletContext();

  // ---- Price tile ----
  const forecastOk = forecast && !forecast.detail;
  let change = null;
  if (forecastOk) {
    change =
      forecast.change_percent !== undefined
        ? forecast.change_percent
        : ((forecast.predicted_next_week_price - forecast.current_price) / forecast.current_price) * 100;
  }
  // Same 1% rule as the forecast card; no colour after a sharp weekly move
  let priceClass = "";
  let arrow = "▶";
  if (forecastOk && !forecast.sharp_move) {
    if (change > 1) { priceClass = "up"; arrow = "▲"; }
    else if (change < -1) { priceClass = "down"; arrow = "▼"; }
  }

  // ---- Demand tile ----
  const demandOk = arrival && !arrival.detail;
  const demandStyle = demandOk ? DEMAND_STYLES[arrival.direction] || DEMAND_STYLES.stable : null;

  // ---- Weather tile ----
  const weatherOk = weather && !weather.detail && weather.available;
  const riskStyle = weatherOk ? RISK_STYLES[weather.risk] || RISK_STYLES.low : null;

  const harvestOk = harvestInfo && !harvestInfo.detail;

  return (
    <>
      <h2 className="overview-heading">Today at a glance - {selectedCrop}</h2>

      <div className="overview-grid">
        {/* Price tile */}
        <Link to="/dashboard/prices" className="summary-tile">
          <div className="tile-title">Next week price</div>
          {forecastOk ? (
            <>
              <div className={`tile-main ${priceClass}`}>
                {forecast.sharp_move ? "" : arrow + " "}₹{forecast.predicted_next_week_price.toFixed(2)}
              </div>
              <div className="tile-sub">
                {forecast.sharp_move
                  ? "Prices moved sharply last week, so this forecast is unreliable."
                  : `Now ₹${forecast.current_price.toFixed(2)} (${change > 0 ? "+" : ""}${Number(change).toFixed(2)}%)`}
              </div>
            </>
          ) : (
            <div className="tile-sub">
              {forecast && typeof forecast.detail === "string" ? forecast.detail : "Forecast not available."}
            </div>
          )}
          <div className="tile-link">View price details →</div>
        </Link>

        {/* Demand tile */}
        <Link to="/dashboard/prices" className="summary-tile">
          <div className="tile-title">Market demand</div>
          {demandOk ? (
            <>
              <div className="tile-main" style={{ fontSize: "20px", color: demandStyle.border }}>
                {demandStyle.label}
              </div>
              <div className="tile-sub">
                {arrival.change_percent !== null && arrival.change_percent !== undefined
                  ? `${arrival.change_percent > 0 ? "+" : ""}${arrival.change_percent}% expected next week`
                  : "Very small volumes right now"}
              </div>
            </>
          ) : (
            <div className="tile-sub">Demand indicator not available.</div>
          )}
          <div className="tile-link">View demand details →</div>
        </Link>

        {/* Weather tile */}
        <Link to="/dashboard/weather" className="summary-tile">
          <div className="tile-title">7-day weather</div>
          {weatherOk ? (
            <>
              <div className="tile-main" style={{ fontSize: "20px", color: riskStyle.border }}>
                {riskStyle.label}
              </div>
              <div className="tile-sub">
                {weather.total_rain_mm} mm expected in 7 days{weather.district ? ` · ${weather.district}` : ""}
              </div>
            </>
          ) : (
            <div className="tile-sub">
              {weather && weather.message ? weather.message : "Weather forecast is not available right now."}
            </div>
          )}
          <div className="tile-link">View weather →</div>
        </Link>

        {/* Mandi + season tile */}
        <Link to="/dashboard/weather" className="summary-tile">
          <div className="tile-title">Best mandi right now</div>
          {harvestOk && harvestInfo.best_mandi ? (
            <>
              <div className="tile-main" style={{ fontSize: "20px" }}>
                {harvestInfo.best_mandi.best_market}
              </div>
              <div className="tile-sub">
                ₹{harvestInfo.best_mandi.best_avg_price.toFixed(2)} · {harvestInfo.season}, harvest: {harvestInfo.typical_harvest_months}
              </div>
            </>
          ) : (
            <div className="tile-sub">Mandi information not available.</div>
          )}
          <div className="tile-link">View harvest advice →</div>
        </Link>
      </div>

      {/* One-line advice from the recommendation engine */}
      {harvestOk && (
        <div className="card">
          <h2>Advice for {selectedCrop}</h2>
          <p className="advice" style={{ marginTop: 0 }}>{harvestInfo.advice}</p>
        </div>
      )}
    </>
  );
}

export default Overview;