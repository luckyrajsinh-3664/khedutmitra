import React from "react";
import { useOutletContext } from "react-router-dom";
import { RISK_STYLES, formatDay, rainIcon } from "../../utils/dashboardHelpers";

// Weather & Harvest tab: 7-day weather outlook and the harvest advice.
function WeatherHarvest() {
  const { weather, harvestInfo } = useOutletContext();

  const riskStyle = weather && weather.available ? RISK_STYLES[weather.risk] || RISK_STYLES.low : null;

  return (
    <>
      {/* Weather card */}
      {weather && !weather.detail && (
        <div className="card">
          <h2>7-Day Weather Outlook{weather.district ? ` - ${weather.district}` : ""}</h2>

          {weather.available ? (
            <>
              <div
                style={{
                  background: riskStyle.bg,
                  borderLeft: `4px solid ${riskStyle.border}`,
                  borderRadius: "8px",
                  padding: "12px 16px",
                  marginBottom: "16px",
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: "4px" }}>{riskStyle.label}</div>
                <div>{weather.message}</div>
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                {weather.daily.map((d) => (
                  <div
                    key={d.date}
                    style={{
                      flex: "1 1 100px",
                      minWidth: "100px",
                      textAlign: "center",
                      padding: "10px 6px",
                      borderRadius: "8px",
                      background: "rgba(0,0,0,0.04)",
                      fontSize: "0.85rem",
                    }}
                  >
                    <div style={{ fontWeight: 600 }}>{formatDay(d.date)}</div>
                    <div style={{ fontSize: "1.4rem", margin: "4px 0" }}>{rainIcon(d.rain_mm)}</div>
                    <div>{d.rain_mm} mm</div>
                    <div style={{ opacity: 0.7 }}>{d.rain_chance_pct}% chance</div>
                    <div style={{ opacity: 0.7 }}>{d.temp_max}°C</div>
                  </div>
                ))}
              </div>

              {weather.updated_at && (
                <p style={{ margin: "12px 0 0", fontSize: "0.8rem", opacity: 0.65 }}>
                  Forecast updated: {weather.updated_at} · Source: Open-Meteo
                </p>
              )}
            </>
          ) : (
            <p style={{ margin: 0 }}>{weather.message || "Weather forecast is not available right now."}</p>
          )}
        </div>
      )}

      {/* Harvest & market advice (the best mandi row now lives on the Prices & Demand tab) */}
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
          <p className="advice">{harvestInfo.advice}</p>
        </div>
      )}
    </>
  );
}

export default WeatherHarvest;