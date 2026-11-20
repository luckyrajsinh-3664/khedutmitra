import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { API_BASE } from "../utils/dashboardHelpers";
import { useLanguage } from "../i18n/LanguageContext";
import LanguageSwitcher from "../components/LanguageSwitcher";

function Login() {
  const navigate = useNavigate();
  const { t, te, setLanguage } = useLanguage();

  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile_number: mobile, password })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.detail ? te(data.detail) : t("loginFailed"));
        setLoading(false);
        return;
      }

      localStorage.setItem("currentUser", JSON.stringify({ name: data.name, token: data.token }));
      // Open the app in the language the farmer chose when registering
      if (data.language) setLanguage(data.language);
      navigate("/dashboard");
    } catch (err) {
      setError(t("connectError"));
      setLoading(false);
    }
  };

  return (
    <div className="glass-card">
      <LanguageSwitcher floating />

      <h2>| {t("loginTitle")}</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>{t("mobileNumber")}</label>
          <input
            type="tel"
            value={mobile}
            onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
            placeholder={t("mobilePlaceholder")}
            required
          />
        </div>

        <div className="form-group">
          <label>{t("password")}</label>
          <div className="password-field">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("passwordPlaceholder")}
              required
            />
            <button
              type="button"
              className="password-toggle-btn"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? "🙈" : "👁️"}
            </button>
          </div>
        </div>

        {error && <p className="error-text">{error}</p>}

        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? t("loggingIn") : t("loginBtn")}
        </button>
      </form>

      <p className="switch-link">
        {t("newFarmer")} <Link to="/register">{t("createAccountLink")}</Link>
      </p>
    </div>
  );
}

export default Login;