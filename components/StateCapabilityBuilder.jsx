/**
 * StateCapabilityBuilder
 * Typeahead + card selector for Nevada commodity capabilities.
 */

import React, { useState } from "react";
import { NevadaCommodityService } from "../services/nevada-procurement/NevadaCommodityService.js";
import { UnifiedCapabilityProfile } from "../services/unified/UnifiedCapabilityProfile.js";

export default function StateCapabilityBuilder({ userId, onProfileUpdated }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState([]);

  function handleSearch(e) {
    const value = e.target.value;
    setQuery(value);
    setResults(value ? NevadaCommodityService.searchByKeyword(value) : []);
  }

  function toggleSelect(item) {
    setSelected(prev =>
      prev.find(s => s.code === item.code)
        ? prev.filter(s => s.code !== item.code)
        : [...prev, item]
    );
  }

  async function saveProfile() {
    await UnifiedCapabilityProfile.saveStateCapabilities(userId, selected);
    if (onProfileUpdated) onProfileUpdated(selected);
  }

  return (
    <div className="state-capability-builder">
      <h3>State Capability Profile (Nevada)</h3>

      <input
        type="text"
        value={query}
        onChange={handleSearch}
        placeholder="Type services you provide..."
      />

      <div className="commodity-results">
        {results.map(item => {
          const isSelected = !!selected.find(s => s.code === item.code);
          return (
            <div
              key={item.code}
              className={`commodity-card ${isSelected ? "selected" : ""}`}
              onClick={() => toggleSelect(item)}
            >
              <strong>{item.label}</strong>
              <p>Code: {item.code}</p>
            </div>
          );
        })}
      </div>

      <button onClick={saveProfile}>Save State Capabilities</button>
    </div>
  );
}
