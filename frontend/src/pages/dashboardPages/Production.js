import React from "react";
import { useOutletContext } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { shortNumber } from "../../utils/dashboardHelpers";
import { useLanguage } from "../../i18n/LanguageContext";

// Production tab: historical production statistics (1997-2012), shown for context.
function Production() {
  const { t, districtLabel, unitLabel } = useLanguage();
  const { production } = useOutletContext();

  return (
    <>
      {production && !production.detail && (
        <div className="card">
          <h2>{t("prodTitle")}</h2>

          {production.available ? (
            <>
              {/* Summary sentence written by the backend (English until the backend is translated) */}
              <p style={{ margin: "0 0 16px" }}>{production.message}</p>

              <div style={{ fontWeight: 600, marginBottom: "6px", fontSize: "0.9rem" }}>
                {t("prodByYear", { unit: unitLabel(production.unit) })}
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={production.yearly_trend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" tick={{ fontSize: 10 }} />
                  <YAxis tickFormatter={shortNumber} tick={{ fontSize: 10 }} />
                  <Tooltip
                    formatter={(value) => [`${value.toLocaleString("en-IN")} ${unitLabel(production.unit)}`, t("prodSeries")]}
                  />
                  <Bar dataKey="production" fill="#2F5233" name={`${t("prodSeries")} (${unitLabel(production.unit)})`} />
                </BarChart>
              </ResponsiveContainer>

              <div style={{ fontWeight: 600, margin: "20px 0 8px", fontSize: "0.9rem" }}>
                {t("topDistricts", { basis: production.top_districts_basis })}
              </div>
              {production.top_districts.map((d) => (
                <div key={d.district} style={{ marginBottom: "10px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem" }}>
                    <span>{districtLabel(d.district)}</span>
                    <span>
                      {t("prodPerYear", {
                        value: d.avg_production.toLocaleString("en-IN"),
                        unit: unitLabel(production.unit),
                        share: d.share_pct,
                      })}
                    </span>
                  </div>
                  <div style={{ height: "6px", borderRadius: "3px", background: "rgba(0,0,0,0.08)", marginTop: "4px" }}>
                    <div
                      style={{
                        width: `${Math.min(d.share_pct, 100)}%`,
                        height: "100%",
                        borderRadius: "3px",
                        background: "#2F5233",
                      }}
                    />
                  </div>
                </div>
              ))}

              <p style={{ margin: "14px 0 0", fontSize: "0.8rem", opacity: 0.65 }}>
                {production.note}
                {t("prodSource", { source: production.source })}
              </p>
            </>
          ) : (
            <p style={{ margin: 0 }}>{production.message || t("weatherNA")}</p>
          )}
        </div>
      )}
    </>
  );
}

export default Production;