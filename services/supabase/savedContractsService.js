/**
 * Saved Contracts Service
 * Handles saving, unsaving, and checking saved contract status for users.
 */

import { supabase } from "./supabaseClient.js";

export const savedContractsService = {
  /**
   * Check if a contract is saved by a specific user
   */
  async isSaved(contractId, userId) {
    const { data, error } = await supabase
      .from("saved_contracts")
      .select("id")
      .eq("contract_id", contractId)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.error("Supabase isSaved error:", error);
      return false;
    }

    return !!data;
  },

  /**
   * Save a contract for a user
   */
  async save(contractId, userId) {
    const { data, error } = await supabase
      .from("saved_contracts")
      .insert({
        contract_id: contractId,
        user_id: userId,
        saved_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error("Supabase save error:", error);
      return null;
    }

    return data;
  },

  /**
   * Remove a saved contract
   */
  async unsave(contractId, userId) {
    const { error } = await supabase
      .from("saved_contracts")
      .delete()
      .eq("contract_id", contractId)
      .eq("user_id", userId);

    if (error) {
      console.error("Supabase unsave error:", error);
      return false;
    }

    return true;
  },

  /**
   * Get all saved contracts for a user
   */
  async getSavedContracts(userId) {
    const { data, error } = await supabase
      .from("saved_contracts")
      .select("*")
      .eq("user_id", userId);

    if (error) {
      console.error("Supabase getSavedContracts error:", error);
      return [];
    }

    return data || [];
  }
};
