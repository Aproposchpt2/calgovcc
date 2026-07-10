/**
 * Nevada Procurement Client
 * Responsible for fetching raw Nevada contract data
 * from the Nevada Open Data API or internal procurement endpoint.
 */

export const nvClient = {
  async fetch() {
    try {
      // Replace this URL with the final Nevada procurement endpoint
      const url = "https://data.nv.gov/resource/your-endpoint.json";

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Nevada API error: ${response.status}`);
      }

      const data = await response.json();

      // Ensure we always return an array
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error("Failed to fetch Nevada procurement data:", error);
      return [];
    }
  }
};
