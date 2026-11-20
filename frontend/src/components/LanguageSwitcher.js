import React from "react";
import { useLanguage } from "../i18n/LanguageContext";
import "./LanguageSwitcher.css";

// Two buttons: English | ગુજરાતી. "floating" pins it to the top-right corner of the screen.
function LanguageSwitcher({ floating }) {
  const { language, setLanguage } = useLanguage();
  const options = [["en", "English"], ["gu", "ગુજરાતી"]];

  return (
    <div className={"lang-switcher" + (floating ? " floating" : "")}>
      {options.map(([code, label]) => (
        <button
          key={code}
          type="button"
          className={"lang-btn" + (language === code ? " active" : "")}
          onClick={() => setLanguage(code)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export default LanguageSwitcher;