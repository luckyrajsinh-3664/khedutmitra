import React, { useState, useEffect, useRef } from "react";
import { API_BASE, suggestedQuestions } from "../utils/dashboardHelpers";
import { useLanguage } from "../i18n/LanguageContext";

// The floating "Ask KhedutMitra" button + chat panel (available on every dashboard tab).
// Chat language "Auto": the backend replies in Gujarati if the question is in Gujarati script or
// in Gujarati typed with English letters, otherwise in the language the website is shown in.
function ChatWidget({ selectedCrop }) {
  const { language, t, cropLabel } = useLanguage();

  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatLang, setChatLang] = useState("auto");     // "auto", "en" or "gu"
  const [messages, setMessages] = useState([]);         // {role: "user"|"bot", text, sources, error}
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);

  // When the website language is switched, go back to Auto (Auto follows the website language)
  useEffect(() => {
    setChatLang("auto");
  }, [language]);

  // Keep the newest chat message in view
  useEffect(() => {
    if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: "smooth" });
  }, [messages, chatLoading, chatOpen]);

  // Send one question to the assistant
  const sendQuestion = async (text) => {
    const question = (text !== undefined ? text : chatInput).trim();
    if (!question || chatLoading) return;

    // The last 6 messages (before this question) give the assistant the context for follow-ups
    const history = messages
      .filter((m) => !m.error)
      .slice(-6)
      .map((m) => ({ role: m.role, text: m.text }));

    setMessages((prev) => [...prev, { role: "user", text: question }]);
    setChatInput("");
    setChatLoading(true);

    try {
      const res = await fetch(`${API_BASE}/assistant/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          crop: selectedCrop,
          language: chatLang === "auto" ? null : chatLang,
          app_language: language,
          history,
        }),
      });
      const data = await res.json();
      if (data.available) {
        setMessages((prev) => [...prev, { role: "bot", text: data.answer, sources: data.sources }]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "bot", text: data.message || t("chatErrDefault"), error: true },
        ]);
      }
    } catch (err) {
      setMessages((prev) => [...prev, { role: "bot", text: t("chatErrServer"), error: true }]);
    }
    setChatLoading(false);
  };

  // Language used for the suggested-question chips
  const chipLang = chatLang === "auto" ? language : chatLang;

  return (
    <>
      {!chatOpen && (
        <button
          onClick={() => setChatOpen(true)}
          style={{
            position: "fixed", right: "20px", bottom: "20px", zIndex: 1000,
            background: "#2F5233", color: "#fff", border: "none", borderRadius: "28px",
            padding: "12px 20px", fontSize: "1rem", fontWeight: 600, cursor: "pointer",
            boxShadow: "0 4px 14px rgba(0,0,0,0.3)",
          }}
        >
          {t("askButton")}
        </button>
      )}

      {chatOpen && (
        <div
          style={{
            position: "fixed", right: "20px", bottom: "20px", zIndex: 1000,
            width: "min(390px, calc(100vw - 32px))", height: "min(540px, calc(100vh - 40px))",
            background: "#fff", borderRadius: "14px", display: "flex", flexDirection: "column",
            boxShadow: "0 8px 30px rgba(0,0,0,0.35)", overflow: "hidden", color: "#222",
          }}
        >
          {/* header */}
          <div style={{ background: "#2F5233", color: "#fff", padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontWeight: 700 }}>{t("chatTitle")}</div>
              <div style={{ fontSize: "0.78rem", opacity: 0.85 }}>{t("chatAbout", { crop: cropLabel(selectedCrop) })}</div>
            </div>
            <button
              onClick={() => setChatOpen(false)}
              aria-label="Close chat"
              style={{ background: "transparent", border: "none", color: "#fff", fontSize: "1.4rem", cursor: "pointer" }}
            >
              ×
            </button>
          </div>

          {/* language switch */}
          <div style={{ display: "flex", gap: "6px", padding: "8px 12px", background: "#F3F6F1", borderBottom: "1px solid #E0E6DC" }}>
            {[["auto", t("chatAuto")], ["en", "English"], ["gu", "ગુજરાતી"]].map(([code, label]) => (
              <button
                key={code}
                onClick={() => setChatLang(code)}
                style={{
                  padding: "4px 12px", borderRadius: "14px", fontSize: "0.82rem", cursor: "pointer",
                  border: "1px solid #2F5233",
                  background: chatLang === code ? "#2F5233" : "#fff",
                  color: chatLang === code ? "#fff" : "#2F5233",
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "12px", display: "flex", flexDirection: "column", gap: "10px" }}>
            {messages.length === 0 && (
              <div style={{ fontSize: "0.9rem", lineHeight: 1.5 }}>
                <div style={{ marginBottom: "10px" }}>
                  {t("chatIntro", { crop: cropLabel(selectedCrop) })}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {suggestedQuestions(chipLang, selectedCrop).map((q) => (
                    <button
                      key={q}
                      onClick={() => sendQuestion(q)}
                      style={{
                        textAlign: "left", padding: "8px 10px", borderRadius: "10px", fontSize: "0.85rem",
                        border: "1px solid #C9D6C4", background: "#F3F6F1", cursor: "pointer", color: "#2F5233",
                      }}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} style={{ alignSelf: m.role === "user" ? "flex-end" : "flex-start", maxWidth: "88%" }}>
                <div
                  style={{
                    padding: "9px 12px", borderRadius: "12px", fontSize: "0.9rem", lineHeight: 1.5,
                    whiteSpace: "pre-wrap",
                    background: m.role === "user" ? "#2F5233" : m.error ? "#FBE4E1" : "#EEF3EC",
                    color: m.role === "user" ? "#fff" : "#222",
                  }}
                >
                  {m.text}
                </div>
                {m.role === "bot" && !m.error && m.sources && m.sources.length > 0 && (
                  <div style={{ fontSize: "0.72rem", opacity: 0.6, margin: "4px 4px 0" }}>
                    {language === "gu" ? "આધાર:" : "Based on:"} {m.sources.join(" · ")}
                  </div>
                )}
              </div>
            ))}

            {chatLoading && (
              <div style={{ alignSelf: "flex-start", maxWidth: "88%", padding: "9px 12px", borderRadius: "12px", background: "#EEF3EC", fontSize: "0.85rem" }}>
                {t("chatThinking")}
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* input */}
          <div style={{ borderTop: "1px solid #E0E6DC", padding: "10px 12px" }}>
            <div style={{ display: "flex", gap: "8px" }}>
              <input
                type="text"
                value={chatInput}
                maxLength={500}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") sendQuestion(); }}
                placeholder={t("chatPlaceholder")}
                style={{ flex: 1, padding: "9px 12px", borderRadius: "20px", border: "1px solid #C9D6C4", fontSize: "0.9rem", outline: "none" }}
              />
              <button
                onClick={() => sendQuestion()}
                disabled={chatLoading || !chatInput.trim()}
                style={{
                  padding: "0 16px", borderRadius: "20px", border: "none", fontWeight: 600, cursor: "pointer",
                  background: chatLoading || !chatInput.trim() ? "#A9B8A5" : "#2F5233", color: "#fff",
                }}
              >
                {t("chatSend")}
              </button>
            </div>
            <div style={{ fontSize: "0.7rem", opacity: 0.6, marginTop: "6px" }}>
              {t("chatDisclaimer")}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default ChatWidget;