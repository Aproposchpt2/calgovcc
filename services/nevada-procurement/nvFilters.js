/**
 * Nevada Procurement Filters
 * Applies quality, relevance, and date-based filtering to Nevada contracts.
 */

export const nvFilters = {
  apply(contracts) {
    return contracts
      // Remove contracts missing essential fields
      .filter(contract => contract.title && contract.agency)

      // Remove expired contracts
      .filter(contract => {
        if (!contract.dueDate) return true;
        const now = new Date();
        const due = new Date(contract.dueDate);
        return due >= now;
      })

      // Remove duplicates by ID
      .filter((contract, index, arr) => {
        return index === arr.findIndex(c => c.id === contract.id);
      })

      // Optional: remove contracts with no NAICS match
      .filter(contract => {
        return contract.naics !== null && contract.naics !== "";
      });
  }
};
