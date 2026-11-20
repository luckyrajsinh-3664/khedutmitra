import React from "react";
import { useOutletContext } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { shortNumber } from "../../utils/dashboardHelpers";

// Production tab: historical production statistics (1997-2012), shown for context.
function Production() {
  const { production } = useOutletContext();

  return (
    <>
      {production && !production.detail && (
        <div className="card">
          <h2>Production Statistics - Gujarat</h2>

          {production.available ? (
            <>
              <p style={{ margin: "0 0 16px" }}>{production.message}</p>

              <div style={{ fontWeight: 600, marginBottom: "6px", fontSize: "0.9rem" }}>
                Gujarat production by year ({production.unit})
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={production.yearly_trend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" tick={{ fontSize: 10 }} />
                  <YAxis tickFormatter={shortNumber} tick={{ fontSize: 10 }} />
                  <Tooltip
                    formatter={(value) => [`${value.toLocaleString("en-IN")} ${production.unit}`, "Production"]}
                  />
                  <Bar dataKey="production" fill="#2F5233" name={`Production (${production.unit})`} />
                </BarChart>
              </ResponsiveContainer>

              <div style={{ fontWeight: 600, margin: "20px 0 8px", fontSize: "0.9rem" }}>
                Top producing districts ({production.top_districts_basis})
              </div>
              {production.top_districts.map((d) => (
                <div key={d.district} style={{ marginBottom: "10px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem" }}>
                    <span>{d.district}</span>
                    <span>
                      {d.avg_production.toLocaleString("en-IN")} {production.unit}/yr · {d.share_pct}%
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
                {production.note} Source: {production.source}. District names follow the older boundaries used in this data.
              </p>
            </>
          ) : (
            <p style={{ margin: 0 }}>
              {production.message || "Production statistics are not available for this crop."}
            </p>
          )}
        </div>
      )}
    </>
  );
}

export default Production;