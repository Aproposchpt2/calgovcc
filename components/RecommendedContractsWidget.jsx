import React, { useEffect, useState } from "react";
import { proposalBuilderIntegration } from "../services/proposals/proposalBuilderIntegration-Enhanced.js";

export default function RecommendedContractsWidget({ userId, fetchContracts }) {
  const [recommended, setRecommended] = useState([]);

  useEffect(() => {
    async function load() {
      const contracts = await fetchContracts();
      const scored = [];

      for (const contract of contracts) {
        const score = await proposalBuilderIntegration.calculateWinScore(
          userId,
          contract
        );

        scored.push({
          contract,
          score: parseInt(score)
        });
      }

      const sorted = scored
        .filter(s => s.score >= 60)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);

      setRecommended(sorted);
    }

    load();
  }, [userId, fetchContracts]);

  return (
    <div className="recommended-contracts-widget">
      <h2>Recommended Contracts</h2>

      {recommended.map(item => (
        <div key={item.contract.id} className="recommended-card">
          <h4>{item.contract.title}</h4>
          <p><strong>Agency:</strong> {item.contract.agency}</p>
          <p><strong>Score:</strong> {item.score}</p>
        </div>
      ))}
    </div>
  );
}
