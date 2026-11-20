import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import SearchableSelect from "../components/SearchableSelect";
import LanguageSwitcher from "../components/LanguageSwitcher";
import { API_BASE } from "../utils/dashboardHelpers";
import { useLanguage } from "../i18n/LanguageContext";

// List of Gujarat districts for the dropdown (English values are what we store)
const DISTRICTS = [
  "Ahmedabad", "Amreli", "Anand", "Aravalli", "Banaskantha", "Bharuch",
  "Bhavnagar", "Botad", "Chhota Udepur", "Dahod", "Dang", "Devbhoomi Dwarka",
  "Gandhinagar", "Gir Somnath", "Jamnagar", "Junagadh", "Kheda", "Kutch",
  "Mahisagar", "Mehsana", "Morbi", "Narmada", "Navsari", "Panchmahal",
  "Patan", "Porbandar", "Rajkot", "Sabarkantha", "Surat", "Surendranagar",
  "Tapi", "Vadodara", "Valsad"
];

function Register() {
  const navigate = useNavigate();
  // "language" is the preferred language: the picker below changes it for the whole app
  const { language, t, te, districtLabel } = useLanguage();

  // Form fields
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [district, setDistrict] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Basic validation before sending to the server
    if (mobile.length !== 10 || !/^\d+$/.test(mobile)) {
      setError(t("errMobile"));
      return;
    }
    if (password.length < 6) {
      setError(t("errPasswordShort"));
      return;
    }
    if (password !== confirmPassword) {
      setError(t("errPasswordMatch"));
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          mobile_number: mobile,
          password,
          district,
          language   // preferred language ("en" or "gu"), saved with the account
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.detail ? te(data.detail) : t("registerFailed"));
        setLoading(false);
        return;
      }

      // Save login info so the farmer stays logged in
      localStorage.setItem("currentUser", JSON.stringify({ name: data.name, token: data.token }));
      navigate("/dashboard");
    } catch (err) {
      setError(t("connectError"));
      setLoading(false);
    }
  };

  return (
    <div className="glass-card">
      <h2>{t("createAccount")}</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>{t("preferredLanguage")}</label>
          <LanguageSwitcher />
        </div>

        <div className="form-group">
          <label>{t("fullName")}</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("namePlaceholder")}
            required
          />
        </div>

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
          <label>{t("district")}</label>
          <SearchableSelect
            options={DISTRICTS}
            value={district}
            onChange={setDistrict}
            placeholder={t("districtPlaceholder")}
            getLabel={districtLabel}
          />
        </div>

        <div className="form-group">
          <label>{t("createPassword")}</label>
          <div className="password-field">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("passwordHint")}
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

        <div className="form-group">
          <label>{t("confirmPassword")}</label>
          <div className="password-field">
            <input
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={t("confirmPlaceholder")}
              required
            />
          </div>
        </div>

        {error && <p className="error-text">{error}</p>}

        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? t("creatingAccount") : t("registerBtn")}
        </button>
      </form>

      <p className="switch-link">
        {t("haveAccount")} <Link to="/login">{t("loginHere")}</Link>
      </p>
    </div>
  );
}

export default Register;