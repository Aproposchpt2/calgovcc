/**
 * UnifiedContractsList Component
 * Displays a merged list of Nevada, California, and Federal contracts
 * with save/unsave functionality and AI relevance scores.
 */

import React, { useEffect, useState } from "react";
import ContractCard from "./ContractCard.jsx";

export default function UnifiedContractsList({
  fetchContracts,
  savedContracts,
  scores,
  onSave,
  onUnsave
}) {
  const [contracts, setContracts] = useState([]);

  useEffect(() => {
    async function load() {
      const data = await fetchContracts();
      setContracts(data);
    }

    load();
  }, [fetchContracts]);

  return (
    <div className="unified-contracts-list">
      {contracts.map(contract => {
        const isSaved = savedContracts.includes(contract.id);
        const score = scores[contract.id] ?? null;

        return (
          <ContractCard
            key={contract.id}
            contract={contract}
            isSaved={isSaved}
            score={score}
            onSave={onSave}
            onUnsave={onUnsave}
          />
        );
      })}
    </div>
  );
}
