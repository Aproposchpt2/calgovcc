/**
 * SAM.gov Client
 * Responsible for fetching raw federal contract opportunity data
 * from the official SAM.gov API.
 */

export const samClient = {
  async fetch() {
    try {
      // Replace this with your final SAM.gov API endpoint
      const url = "https://api.sam.gov/opportunities/v1/search?limit=100";

      const response = await fetch(url, {
        headers: {
          // Insert your SAM.gov API key here when ready
          "X-API-KEY": process.env.SAM_GOV_API_KEY || ""
        }
      });

      if (!response.ok) {
        throw new Error(`SAM.gov API error: ${response.status}`);
      }

      const data = await response.json();

      // SAM.gov returns nested structures; normalize to array
      const opportunities =
        data.opportunities || data.results || data.data || [];

      return Array.isArray(opportunities) ? opportunities : [];
    } catch (error) {
      console.error("Failed to fetch SAM.gov data:", error);
      return [];
    }
  }
};
