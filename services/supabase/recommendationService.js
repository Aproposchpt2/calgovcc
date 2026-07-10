/**
 * Recommendation Service
 * Generates contract relevance scores and personalized recommendations
 * based on user profile, NAICS codes, saved history, and capabilities.
 */

import { supabase } from "./supabaseClient.js";

export const recommendationService = {
  /**
   * Store a recommendation score for a contract
   */
  async saveScore(userId, contractId, score) {
    const { data, error } = await supabase
      .from("recommendations")
      .upsert({
        user_id: userId,
        contract_id: contractId,
        score,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error("Supabase saveScore error:", error);
      return null;
    }

    return data;
  },

  /**
   * Get recommendation scores for a user
   */
  async getScores(userId) {
    const { data, error } = await supabase
      .from("recommendations")
      .select("*")
      .eq("user_id", userId);

    if (error) {
      console.error("Supabase getScores error:", error);
      return [];
    }

    return data || [];
  },

  /**
   * Get a single score for a contract
   */
  async getScoreForContract(userId, contractId) {
    const { data, error } = await supabase
      .from("recommendations")
      .select("score")
      .eq("user_id", userId)
      .eq("contract_id", contractId)
      .maybeSingle();

    if (error) {
      console.error("Supabase getScoreForContract error:", error);
      return null;
    }

    return data ? data.score : null;
  }
};
