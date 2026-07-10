/**
 * Proposal Builder Integration
 * Connects UI to AI services, including win probability.
 */

import {
  summarizeUploadedFiles,
  scoreCompliance,
  extractPricing,
  matchTemplate,
  generateProposalSection
} from "../contracts/aiSummaryEndpoint.js";
import { calculateWinProbability } from "../ai/winProbabilityEngine.js";

export const proposalBuilderIntegration = {
  async processUploads(files) {
    return await summarizeUploadedFiles(files);
  },

  async analyzeCompliance(text) {
    return await scoreCompliance(text);
  },

  async analyzePricing(text) {
    return await extractPricing(text);
  },

  async detectTemplate(text) {
    return await matchTemplate(text);
  },

  async generateSection(text) {
    return await generateProposalSection(text);
  },

  async calculateWinScore(userId, contract) {
    return await calculateWinProbability({ userId, contract });
  }
};
