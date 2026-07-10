/**
 * User Service
 * Handles user authentication, retrieval, and basic identity operations.
 */

import { supabase } from "./supabaseClient.js";

export const userService = {
  /**
   * Returns the currently authenticated user (if any)
   */
  async getCurrentUser() {
    const {
      data: { user },
      error
    } = await supabase.auth.getUser();

    if (error) {
      console.error("Supabase getUser error:", error);
      return null;
    }

    return user || null;
  },

  /**
   * Sign in a user using email + password
   */
  async signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      console.error("Supabase signIn error:", error);
      return null;
    }

    return data.user;
  },

  /**
   * Sign out the current user
   */
  async signOut() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Supabase signOut error:", error);
      return false;
    }

    return true;
  }
};
