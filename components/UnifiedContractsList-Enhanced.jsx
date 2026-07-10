/**
 * UnifiedContractsList (Enhanced with AI Actions)
 */

import React, { useEffect, useState } from "react";
import { proposalBuilderIntegration } from "../services/proposals/proposalBuilderIntegration.js";

export default function UnifiedContractsList({
  fetchContracts,
  savedContracts,
  scores,
  onSave,
  onUnsave,
  onOpenProposal
}) {
  const [contracts, setContracts] = useState([]);

  useEffect(() => {
    async function load() {
      const list = await fetchContracts();
      setContracts(list);
    }
    load();
  }, [fetchContracts]);

  return (
    <div className="contracts-list">
      {contracts.map(contract => (
        <div key={contract.id} className="contract-card">
          <h3>{contract.title}</h3>
          <p><strong>Agency:</strong> {contract.agency}</p>
          <p><strong>Due:</strong> {contract.dueDate}</p>
          <p>{contract.summary}</p>

          {/* Save / Unsave */}
          {savedContracts.includes(contract.id) ? (
            <button onClick={() => onUnsave(contract.id)}>Unsave</button>
          ) : (
            <button onClick={() => onSave(contract.id)}>Save</button>
          )}

          {/* AI Buttons */}
          <div className="contract-ai-actions">
            <button onClick={() => onOpenProposal(contract)}>
              Write Proposal
            </button>

            <button
              onClick={async () => {
                const summary = await proposalBuilderIntegration.generateSection(
                  contract.summary
                );
                alert("AI Contract Analysis:\n\n" + summary);
              }}
            >
              AI Analyze Contract
            </button>

            <button
              onClick={async () => {
                const score = await proposalBuilderIntegration.analyzeCompliance(
                  contract.summary
                );
                alert("AI Fit Score:\n\n" + score);
              }}
            >
              AI Score Fit
            </button>

            <button
              onClick={async () => {
                const reqs = await proposalBuilderIntegration.detectTemplate(
                  contract.summary
                );
                alert("AI Extract Requirements:\n\n" + reqs);
              }}
            >
              AI Extract Requirements
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
