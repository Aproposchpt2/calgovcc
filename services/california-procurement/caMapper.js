/**
 * California Procurement Mapper
 * Converts raw California SCPRS records into unified contract objects
 * used by the NGCC unified feed.
 */

export const caMapper = {
  map(record) {
    return {
      id: record.contract_id || record.id || crypto.randomUUID(),

      // Source identifier for unified feed
      source: "California",

      // Contract title
      title: record.title || record.description || "Untitled Contract",

      // Agency or department
      agency: record.agency || record.department || "California State Agency",

      // Contract value (if provided)
      value: record.contract_value || record.amount || null,

      // Dates
      postedDate: record.posted_date || record.date_posted || null,
      dueDate: record.due_date || record.closing_date || null,

      // Category / NAICS
      naics: record.naics_code || record.category || null,

      // Summary (optional)
      summary: record.summary || record.description || "",

      // Raw record for debugging or future expansion
      raw: record
    };
  }
};
