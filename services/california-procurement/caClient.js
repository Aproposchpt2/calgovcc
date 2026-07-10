/**
 * California Procurement Client
 * Responsible for fetching raw California contract data
 * from SCPRS or a future California procurement API endpoint.
 */

export const caClient = {
  async fetch() {
    try {
      // Replace this URL with the final SCPRS endpoint
      const url = "https://www.ca.gov/api/your-scprs-endpoint.json";

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`California API error: ${response.status}`);
      }

      const data = await response.json();

      // Ensure we always return an array
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error("Failed to fetch California procurement data:", error);
      return [];
    }
  }
};
