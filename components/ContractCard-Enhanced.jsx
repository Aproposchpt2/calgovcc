/**
 * ContractCard (Enhanced with AI Indicators)
 */

import React from "react";

export default function ContractCard({
  contract,
  score,
  onSave,
  onUnsave,
  isSaved,
  onOpenProposal
}) {
  function getMatchLabel(score) {
    if (score >= 90) return "High Win Probability";
    if (score >= 75) return "Recommended for You";
    if (score >= 60) return "Smart Match";
    return "Low Match";
  }

  const matchLabel = getMatchLabel(score);

  return (
    <div className="contract-card enhanced">
      {/* AI Score Badge */}
      <div className="ai-score-badge">
        {score}% Match
      </div>

      {/* AI Match Label */}
      <div className={`ai-match-label ${matchLabel.replace(/\s+/g, "-").toLowerCase()}`}>
        {matchLabel}
      </div>

      <h3>{contract.title}</h3>
      <p><strong>Agency:</strong> {contract.agency}</p>
      <p><strong>Due:</strong> {contract.dueDate}</p>
      <p>{contract.summary}</p>

      {/* Save / Unsave */}
      {isSaved ? (
        <button onClick={() => onUnsave(contract.id)}>Unsave</button>
      ) : (
        <button onClick={() => onSave(contract.id)}>Save</button>
      )}

      {/* Write Proposal */}
      <button onClick={() => onOpenProposal(contract)}>
        Write Proposal
      </button>
    </div>
  );
}
