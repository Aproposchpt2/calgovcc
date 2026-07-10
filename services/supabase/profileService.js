/**
 * Profile Service
 * Handles user profile storage, onboarding state, and personalization data.
 */

import { supabase } from "./supabaseClient.js";

export const profileService = {
  /**
   * Fetch a user's profile record from Supabase
   */
  async getProfile(userId) {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Supabase getProfile error:", error);
      return null;
    }

    return data;
  },

  /**
   * Create or update a user's profile
   */
  async upsertProfile(userId, profileData) {
    const { data, error } = await supabase
      .from("profiles")
      .upsert({
        id: userId,
        ...profileData,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error("Supabase upsertProfile error:", error);
      return null;
    }

    return data;
  },

  /**
   * Update onboarding progress (wizard steps)
   */
  async updateOnboarding(userId, step) {
    const { data, error } = await supabase
      .from("profiles")
      .update({
        onboarding_step: step,
        updated_at: new Date().toISOString()
      })
      .eq("id", userId)
      .select()
      .single();

    if (error) {
      console.error("Supabase updateOnboarding error:", error);
      return null;
    }

    return data;
  }
};
