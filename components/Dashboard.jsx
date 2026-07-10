import React from "react";
import DashboardAIAnalytics from "./DashboardAIAnalytics.jsx";
import RecommendedContractsWidget from "./RecommendedContractsWidget.jsx";

export default function Dashboard({ userId, fetchContracts, featuredContract }) {
  return (
    <div className="dashboard">
      <DashboardAIAnalytics
        userId={userId}
        featuredContract={featuredContract}
      />

      <RecommendedContractsWidget
        userId={userId}
        fetchContracts={fetchContracts}
      />
    </div>
  );
}
