import React from "react";

export default function ProposalStrengthMeter({ winScore }) {
  const numeric = parseInt(winScore || 0);
  let label = "Weak";
  let color = "#e53935";

  if (numeric >= 80) {
    label = "Strong";
    color = "#43a047";
  } else if (numeric >= 60) {
    label = "Moderate";
    color = "#fb8c00";
  }

  return (
    <div className="proposal-strength-meter">
      <h4>AI Proposal Strength</h4>
      <div className="meter-bar">
        <div
          className="meter-fill"
          style={{ width: `${Math.min(numeric, 100)}%`, background: color }}
        />
      </div>
      <p>{numeric || 0} / 100 — {label}</p>
    </div>
  );
}
