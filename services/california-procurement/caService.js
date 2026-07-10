/**
 * California Procurement Service
 * Fetches California state contracts, maps them into a unified format,
 * and prepares them for the unified feed.
 */

import { caClient } from "./caClient.js";
import { caMapper } from "./caMapper.js";

export const caService = {
  async getCaliforniaContracts() {
    try {
      // Fetch raw California procurement data
      const raw = await caClient.fetch();

      // Convert raw California data into unified contract objects
      const mapped = raw.map(caMapper.map);

      return mapped;
    } catch (error) {
      console.error("Failed to load California procurement data:", error);
      return [];
    }
  }
};
