/**
 * NevadaCommodityService
 * Loads and searches Nevada's commodity file.
 */

const nevadaCommodities = [
  // Example entries – replace with real dataset
  { code: "123-45", label: "IT Support Services", keywords: ["it", "support", "helpdesk"] },
  { code: "234-56", label: "Network Engineering", keywords: ["network", "engineering", "cisco"] },
  { code: "345-67", label: "Contact Center Services", keywords: ["call center", "contact center", "support"] }
];

export const NevadaCommodityService = {
  getAll() {
    return nevadaCommodities;
  },

  searchByKeyword(term) {
    const t = term.toLowerCase();
    return nevadaCommodities.filter(c =>
      c.label.toLowerCase().includes(t) ||
      c.keywords.some(k => k.toLowerCase().includes(t))
    );
  }
};
