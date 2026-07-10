/**
 * Nevada Procurement Service
 * Fetches Nevada state contracts, maps them into a unified format,
 * and applies filters for relevance and quality.
 */

import { nvClient } from "./nvClient.js";
import { nvMapper } from "./nvMapper.js";
import { nvFilters } from "./nvFilters.js";

export const nvService = {
  async getNevadaContracts() {
    // Fetch raw Nevada procurement data
    const raw = await nvClient.fetch();

    // Convert raw Nevada data into unified contract objects
    const mapped = raw.map(nvMapper.map);

    // Apply filters (remove duplicates, expired, irrelevant)
    const filtered = nvFilters.apply(mapped);

    return filtered;
  }
};
