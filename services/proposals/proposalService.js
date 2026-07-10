/**
 * Proposal Service
 * Stores proposal drafts, retrieves saved proposals,
 * and links proposals to specific contracts.
 */

import { supabase } from "./supabaseClient.js";

export const proposalService = {
  /**
   * Create a new proposal draft
   */
  async createProposal(userId, contractId, content) {
    const { data, error } = await supabase
      .from("proposals")
      .insert({
        user_id: userId,
        contract_id: contractId,
        content,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error("Supabase createProposal error:", error);
      return null;
    }

    return data;
  },

  /**
   * Update an existing proposal draft
   */
  async updateProposal(proposalId, content) {
    const { data, error } = await supabase
      .from("proposals")
      .update({
        content,
        updated_at: new Date().toISOString()
      })
      .eq("id", proposalId)
      .select()
      .single();

    if (error) {
      console.error("Supabase updateProposal error:", error);
      return null;
    }

    return data;
  },

  /**
   * Get all proposals for a user
   */
  async getProposals(userId) {
    const { data, error } = await supabase
      .from("proposals")
      .select("*")
      .eq("user_id", userId);

    if (error) {
      console.error("Supabase getProposals error:", error);
      return [];
    }

    return data || [];
  },

  /**
   * Get a single proposal by ID
   */
  async getProposalById(proposalId) {
    const { data, error } = await supabase
      .from("proposals")
      .select("*")
      .eq("id", proposalId)
      .single();

    if (error) {
      console.error("Supabase getProposalById error:", error);
      return null;
    }

    return data;
  }
};
