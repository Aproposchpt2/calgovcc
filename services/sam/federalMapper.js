/**
 * Federal SAM.gov Mapper
 * Converts raw SAM.gov opportunity records into unified contract objects
 * used by the NGCC unified feed.
 */

export const federalMapper = {
  map(record) {
    return {
      id:
        record.noticeId ||
        record.id ||
        record.solNumber ||
        crypto.randomUUID(),

      // Source identifier for unified feed
      source: "Federal",

      // Contract title
      title:
        record.title ||
        record.description ||
        record.solNumber ||
        "Untitled Federal Contract",

      // Agency or office
      agency:
        record.agency ||
        record.office ||
        record.department ||
        "Federal Agency",

      // Estimated contract value (if provided)
      value:
        record.estimatedValue ||
        record.value ||
        record.contractValue ||
        null,

      // Dates
      postedDate:
        record.postedDate ||
        record.publishDate ||
        record.datePosted ||
        null,

      dueDate:
        record.responseDate ||
        record.closeDate ||
        record.dueDate ||
        null,

      // NAICS code
      naics:
        record.naics ||
        record.naicsCode ||
        (record.classification && record.classification.naics) ||
        null,

      // Summary
      summary:
        record.summary ||
        record.description ||
        record.shortDescription ||
        "",

      // Raw record for debugging or future expansion
      raw: record
    };
  }
};
