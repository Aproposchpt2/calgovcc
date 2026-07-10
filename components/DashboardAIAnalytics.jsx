import React, { useEffect, useState } from "react";
import ProposalStrengthMeter from "./ProposalStrengthMeter.jsx";
import { UnifiedCapabilityProfile } from "../services/unified/UnifiedCapabilityProfile.js";
import { proposalBuilderIntegration } from "../services/proposals/proposalBuilderIntegration-Enhanced.js";

export default function DashboardAIAnalytics({ userId, featuredContract }) {
  const [profile, setProfile] = useState(null);
  const [winScore, setWinScore] = useState(null);

  useEffect(() => {
    async function load() {
      const p = await UnifiedCapabilityProfile.getProfile(userId);
      setProfile(p);

      if (featuredContract) {
        const score = await proposalBuilderIntegration.calculateWinScore(
          userId,
          featuredContract
        );
        setWinScore(score);
      }
    }
    load();
  }, [userId, featuredContract]);

  if (!profile) return null;

  return (
    <div className="dashboard-ai-analytics">
      <h2>AI Capability & Match Overview</h2>

      <div className="analytics-row">
        <div className="analytics-card">
          <h4>Federal Capability Strength</h4>
          <p>{profile.federalCapabilities ? "Configured" : "Not configured"}</p>
        </div>

        <div className="analytics-card">
          <h4>State Capability Strength (Nevada)</h4>
          <p>{(profile.stateCapabilities || []).length} commodities selected</p>
        </div>

        <div className="analytics-card">
          <h4>Keywords</h4>
          <p>{(profile.keywords || []).join(", ") || "None yet"}</p>
        </div>

        {featuredContract && (
          <div className="analytics-card">
            <h4>AI Win Probability</h4>
            <p>{winScore || "Calculating..."}</p>
          </div>
        )}
      </div>

      <ProposalStrengthMeter winScore={winScore} />
    </div>
  );
}
