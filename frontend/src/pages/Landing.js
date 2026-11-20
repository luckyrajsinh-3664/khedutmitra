import React from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../i18n/LanguageContext";
import LanguageSwitcher from "../components/LanguageSwitcher";

function Landing() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <div className="landing-content">
      <LanguageSwitcher floating />

      <h1>🌾 KhedutMitra</h1>
      <p className="tagline">{t("tagline")}</p>

      <div className="description">
        <p>{t("landingP1")}</p>
        <p>
          <strong>KhedutMitra</strong>
          {t("landingP2")}
        </p>
      </div>

      <button className="btn-getstarted" onClick={() => navigate("/login")}>
        {t("getStarted")}
      </button>
    </div>
  );
}

export default Landing;