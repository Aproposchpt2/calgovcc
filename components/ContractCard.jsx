/**
 * ContractCard Component
 * Displays a single contract in the unified feed with save button,
 * agency, NAICS, due date, and relevance score.
 */

import React from "react";

export default function ContractCard({
  contract,
  onSave,
  onUnsave,
  isSaved,
  score
}) {
  return (
    <div className="contract-card">
      <h3>{contract.title}</h3>

      <p className="agency">{contract.agency}</p>

      <p className="naics">
        <strong>NAICS:</strong> {contract.naics || "N/A"}
      </p>

      <p className="due-date">
        <strong>Due:</strong>{" "}
        {contract.dueDate ? new Date(contract.dueDate).toLocaleDateString() : "N/A"}
      </p>

      {score !== null && (
        <p className="score">
          <strong>Score:</strong> {score}
        </p>
      )}

      <button
        className="save-button"
        onClick={() => {
          if (isSaved) {
            onUnsave(contract.id);
          } else {
            onSave(contract.id);
          }
        }}
      >
        {isSaved ? "Unsave" : "Save"}
      </button>
    </div>
  );
}
