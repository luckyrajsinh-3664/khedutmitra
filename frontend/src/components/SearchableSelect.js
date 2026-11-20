import React, { useState, useRef, useEffect } from "react";
import "./SearchableSelect.css";
import { useLanguage } from "../i18n/LanguageContext";

/**
 * A dropdown with a built-in search box.
 * Props:
 *   options: array of strings to choose from (these are the real values, e.g. English names)
 *   value: currently selected value
 *   onChange: function called with the new value when user picks one
 *   placeholder: text shown when nothing is selected
 *   getLabel: (optional) function that turns a value into the text to DISPLAY,
 *             e.g. "Groundnut" -> "મગફળી". The value itself never changes.
 */
function SearchableSelect({ options, value, onChange, placeholder = "Select an option", getLabel }) {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const wrapperRef = useRef(null);

  const label = (option) => (getLabel ? getLabel(option) : option);

  // Close the dropdown if the user clicks outside of it
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchText("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Only show options that match what the user typed (in English or in the displayed language)
  const search = searchText.toLowerCase();
  const filteredOptions = options.filter(
    (option) => option.toLowerCase().includes(search) || label(option).toLowerCase().includes(search)
  );

  const handleSelect = (option) => {
    onChange(option);
    setIsOpen(false);
    setSearchText("");
  };

  return (
    <div className="searchable-select" ref={wrapperRef}>
      <button
        type="button"
        className="searchable-select-trigger"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={value ? "" : "placeholder-text"}>
          {value ? label(value) : placeholder}
        </span>
        <span className="dropdown-arrow">{isOpen ? "▲" : "▼"}</span>
      </button>

      {isOpen && (
        <div className="searchable-select-panel">
          <input
            type="text"
            className="searchable-select-search"
            placeholder={t("typeToSearch")}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            autoFocus
          />
          <div className="searchable-select-options">
            {filteredOptions.length === 0 ? (
              <div className="no-results">{t("noMatches")}</div>
            ) : (
              filteredOptions.map((option) => (
                <div
                  key={option}
                  className={`searchable-select-option ${option === value ? "selected" : ""}`}
                  onClick={() => handleSelect(option)}
                >
                  {label(option)}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default SearchableSelect;