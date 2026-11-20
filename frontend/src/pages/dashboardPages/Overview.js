import React from "react";
import { Link, useOutletContext } from "react-router-dom";
import { RISK_STYLES, DEMAND_STYLES } from "../../utils/dashboardHelpers";
import { useLanguage } from "../../i18n/LanguageContext";

// Overview tab: four small summary tiles ("today at a glance").
// Each tile links to the tab that has the full details.
function Overview() {
  const { t, cropLabel, districtLabel, marketLabel, seasonLabel, monthsLabel } = useLanguage();
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
  const demandDirection = demandOk ? (DEMAND_STYLES[arrival.direction] ? arrival.direction : "stable") : null;
  const demandStyle = demandOk ? DEMAND_STYLES[demandDirection] : null;

  // ---- Weather tile ----
  const weatherOk = weather && !weather.detail && weather.available;
  const riskKey = weatherOk ? (RISK_STYLES[weather.risk] ? weather.risk : "low") : null;
  const riskStyle = weatherOk ? RISK_STYLES[riskKey] : null;

  const harvestOk = harvestInfo && !harvestInfo.detail;

  return (
    <>
      <h2 className="overview-heading">{t("todayGlance", { crop: cropLabel(selectedCrop) })}</h2>

      <div className="overview-grid">
        {/* Price tile */}
        <Link to="/dashboard/prices" className="summary-tile">
          <div className="tile-title">{t("nextWeekPrice")}</div>
          {forecastOk ? (
            <>
              <div className={`tile-main ${priceClass}`}>
                {forecast.sharp_move ? "" : arrow + " "}₹{forecast.predicted_next_week_price.toFixed(2)}
              </div>
              <div className="tile-sub">
                {forecast.sharp_move
                  ? t("sharpTile")
                  : t("nowPriceChange", {
                      price: forecast.current_price.toFixed(2),
                      change: `${change > 0 ? "+" : ""}${Number(change).toFixed(2)}`,
                    })}
              </div>
            </>
          ) : (
            <div className="tile-sub">
              {forecast && typeof forecast.detail === "string" ? forecast.detail : t("forecastNA")}
            </div>
          )}
          <div className="tile-link">{t("viewPrice")}</div>
        </Link>

        {/* Demand tile */}
        <Link to="/dashboard/prices" className="summary-tile">
          <div className="tile-title">{t("marketDemand")}</div>
          {demandOk ? (
            <>
              <div className="tile-main" style={{ fontSize: "20px", color: demandStyle.border }}>
                {t("demand_" + demandDirection)}
              </div>
              <div className="tile-sub">
                {arrival.change_percent !== null && arrival.change_percent !== undefined
                  ? t("changeExpected", { change: `${arrival.change_percent > 0 ? "+" : ""}${arrival.change_percent}` })
                  : t("verySmall")}
              </div>
            </>
          ) : (
            <div className="tile-sub">{t("demandNA")}</div>
          )}
          <div className="tile-link">{t("viewDemand")}</div>
        </Link>

        {/* Weather tile */}
        <Link to="/dashboard/weather" className="summary-tile">
          <div className="tile-title">{t("weather7")}</div>
          {weatherOk ? (
            <>
              <div className="tile-main" style={{ fontSize: "20px", color: riskStyle.border }}>
                {t("risk_" + riskKey)}
              </div>
              <div className="tile-sub">
                {t("rainExpected", { mm: weather.total_rain_mm })}
                {weather.district ? ` · ${districtLabel(weather.district)}` : ""}
              </div>
            </>
          ) : (
            <div className="tile-sub">
              {weather && weather.message ? weather.message : t("weatherNA")}
            </div>
          )}
          <div className="tile-link">{t("viewWeather")}</div>
        </Link>

        {/* Mandi + season tile */}
        <Link to="/dashboard/weather" className="summary-tile">
          <div className="tile-title">{t("bestMandiTile")}</div>
          {harvestOk && harvestInfo.best_mandi ? (
            <>
              <div className="tile-main" style={{ fontSize: "20px" }}>
                {marketLabel(harvestInfo.best_mandi.best_market)}
              </div>
              <div className="tile-sub">
                ₹{harvestInfo.best_mandi.best_avg_price.toFixed(2)} ·{" "}
                {t("harvestLine", {
                  season: seasonLabel(harvestInfo.season),
                  months: monthsLabel(harvestInfo.typical_harvest_months),
                })}
              </div>
            </>
          ) : (
            <div className="tile-sub">{t("mandiNA")}</div>
          )}
          <div className="tile-link">{t("viewHarvest")}</div>
        </Link>
      </div>

      {/* Advice from the recommendation engine (written by the backend in the chosen language) */}
      {harvestOk && (
        <div className="card">
          <h2>{t("adviceFor", { crop: cropLabel(selectedCrop) })}</h2>
          <p className="advice" style={{ marginTop: 0 }}>{harvestInfo.advice}</p>
        </div>
      )}
    </>
  );
}

export default Overview;