/**
 * ProposalBuilderPage
 * Connects ProposalBuilder.jsx to integration layer + routing.
 */

import React, { useEffect, useState } from "react";
import ProposalBuilder from "../components/proposals/ProposalBuilder.jsx";
import { proposalBuilderIntegration } from "../services/proposals/proposalBuilderIntegration.js";

export default function ProposalBuilderPage({ userId, contract }) {
  const [existingProposal, setExistingProposal] = useState(null);

  useEffect(() => {
    async function load() {
      const proposal = await proposalBuilderIntegration.loadExistingProposal(
        userId,
        contract.id
      );
      setExistingProposal(proposal);

      // Auto-save contract engagement
      await proposalBuilderIntegration.autoSaveContract(userId, contract.id);

      // Boost recommendation score
      await proposalBuilderIntegration.boostRecommendation(userId, contract.id);
    }

    load();
  }, [userId, contract.id]);

  async function handleSave(contractId, content) {
    const saved = await proposalBuilderIntegration.saveDraft(
      userId,
      contractId,
      content
    );
    setExistingProposal(saved);
  }

  async function handleUpdate(proposalId, content) {
    const updated = await proposalBuilderIntegration.updateDraft(
      proposalId,
      content
    );
    setExistingProposal(updated);
  }

  async function handleUpload(files) {
    await proposalBuilderIntegration.processUploads(files);
  }

  return (
    <ProposalBuilder
      contract={contract}
      existingProposal={existingProposal}
      onSave={handleSave}
      onUpdate={handleUpdate}
      onUpload={handleUpload}
    />
  );
}
