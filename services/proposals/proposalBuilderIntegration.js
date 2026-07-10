/**
 * Proposal Builder Integration Layer
 * Connects ProposalBuilder.jsx to Supabase services and AI endpoints.
 */

import { proposalService } from "../supabase/proposalService.js";
import { savedContractsService } from "../supabase/savedContractsService.js";
import { recommendationService } from "../supabase/recommendationService.js";

export const proposalBuilderIntegration = {
  /**
   * Load an existing proposal for a contract (if any)
   */
  async loadExistingProposal(userId, contractId) {
    const proposals = await proposalService.getProposals(userId);
    return proposals.find(p => p.contract_id === contractId) || null;
  },

  /**
   * Save a new proposal draft
   */
  async saveDraft(userId, contractId, content) {
    return await proposalService.createProposal(userId, contractId, content);
  },

  /**
   * Update an existing proposal
   */
  async updateDraft(proposalId, content) {
    return await proposalService.updateProposal(proposalId, content);
  },

  /**
   * Handle uploaded files (Agent session window)
   * This is where AI processing will be added.
   */
  async processUploads(files) {
    // Placeholder for AI summary endpoint
    console.log("Uploaded files:", files);

    return {
      status: "received",
      count: files.length
    };
  },

  /**
   * Optional: Save a contract automatically when user starts a proposal
   */
  async autoSaveContract(userId, contractId) {
    const isSaved = await savedContractsService.isSaved(contractId, userId);
    if (!isSaved) {
      await savedContractsService.save(contractId, userId);
    }
  },

  /**
   * Optional: Boost recommendation score when user engages deeply
   */
  async boostRecommendation(userId, contractId) {
    await recommendationService.saveScore(userId, contractId, 95);
  }
};
