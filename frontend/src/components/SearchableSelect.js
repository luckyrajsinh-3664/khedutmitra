import React, { useState, useRef, useEffect } from "react";
import "./SearchableSelect.css";

/**
 * A dropdown with a built-in search box.
 * Props:
 *   options: array of strings to choose from
 *   value: currently selected value
 *   onChange: function called with the new value when user picks one
 *   placeholder: text shown when nothing is selected
 */
function SearchableSelect({ options, value, onChange, placeholder = "Select an option" }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const wrapperRef = useRef(null);

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

  // Only show options that match what the user typed
  const filteredOptions = options.filter((option) =>
    option.toLowerCase().includes(searchText.toLowerCase())
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
          {value || placeholder}
        </span>
        <span className="dropdown-arrow">{isOpen ? "▲" : "▼"}</span>
      </button>

      {isOpen && (
        <div className="searchable-select-panel">
          <input
            type="text"
            className="searchable-select-search"
            placeholder="Type to search..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            autoFocus
          />
          <div className="searchable-select-options">
            {filteredOptions.length === 0 ? (
              <div className="no-results">No matches found</div>
            ) : (
              filteredOptions.map((option) => (
                <div
                  key={option}
                  className={`searchable-select-option ${option === value ? "selected" : ""}`}
                  onClick={() => handleSelect(option)}
                >
                  {option}
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