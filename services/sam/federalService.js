/**
 * Federal SAM.gov Procurement Service
 * Fetches federal contract opportunities, maps them into a unified format,
 * and prepares them for the unified feed.
 */

import { samClient } from "./samClient.js";
import { federalMapper } from "./federalMapper.js";

export const federalService = {
  async getFederalContracts() {
    try {
      // Fetch raw SAM.gov data
      const raw = await samClient.fetch();

      // Convert raw SAM.gov records into unified contract objects
      const mapped = raw.map(federalMapper.map);

      return mapped;
    } catch (error) {
      console.error("Failed to load Federal SAM.gov data:", error);
      return [];
    }
  }
};
