import React from "react";
import { useOutletContext } from "react-router-dom";
import { RISK_STYLES, formatDay, rainIcon } from "../../utils/dashboardHelpers";
import { useLanguage } from "../../i18n/LanguageContext";

// Weather & Harvest tab: 7-day weather outlook and the harvest advice.
function WeatherHarvest() {
  const { language, t, districtLabel, seasonLabel, monthsLabel } = useLanguage();
  const { weather, harvestInfo } = useOutletContext();

  const riskKey = weather && weather.available ? (RISK_STYLES[weather.risk] ? weather.risk : "low") : null;
  const riskStyle = riskKey ? RISK_STYLES[riskKey] : null;

  return (
    <>
      {/* Weather card */}
      {weather && !weather.detail && (
        <div className="card">
          <h2>
            {t("weatherTitle")}
            {weather.district ? ` - ${districtLabel(weather.district)}` : ""}
          </h2>

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
                <div style={{ fontWeight: 700, marginBottom: "4px" }}>{t("risk_" + riskKey)}</div>
                {/* This sentence is written by the backend (English until the backend is translated) */}
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
                    <div style={{ fontWeight: 600 }}>{formatDay(d.date, language)}</div>
                    <div style={{ fontSize: "1.4rem", margin: "4px 0" }}>{rainIcon(d.rain_mm)}</div>
                    <div>{t("mm", { mm: d.rain_mm })}</div>
                    <div style={{ opacity: 0.7 }}>{t("rainChance", { pct: d.rain_chance_pct })}</div>
                    <div style={{ opacity: 0.7 }}>{d.temp_max}°C</div>
                  </div>
                ))}
              </div>

              {weather.updated_at && (
                <p style={{ margin: "12px 0 0", fontSize: "0.8rem", opacity: 0.65 }}>
                  {t("forecastUpdated", { time: weather.updated_at })}
                </p>
              )}
            </>
          ) : (
            <p style={{ margin: 0 }}>{weather.message || t("weatherNA")}</p>
          )}
        </div>
      )}

      {/* Harvest & market advice */}
      {harvestInfo && !harvestInfo.detail && (
        <div className="card">
          <h2>{t("harvestTitle")}</h2>
          <div className="info-row">
            <span className="label">{t("season")}</span>
            <span className="value">{seasonLabel(harvestInfo.season)}</span>
          </div>
          <div className="info-row">
            <span className="label">{t("sowingMonths")}</span>
            <span className="value">{monthsLabel(harvestInfo.typical_sowing_months)}</span>
          </div>
          <div className="info-row">
            <span className="label">{t("harvestMonths")}</span>
            <span className="value">{monthsLabel(harvestInfo.typical_harvest_months)}</span>
          </div>
          {/* Written by the backend (English until the backend is translated) */}
          <p className="advice">{harvestInfo.advice}</p>
        </div>
      )}
    </>
  );
}

export default WeatherHarvest;