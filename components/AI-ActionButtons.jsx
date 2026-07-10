{/* AI Action Buttons */}
<div className="agent-ai-actions">
  <button onClick={async () => {
    const summaries = await proposalBuilderIntegration.processUploads(uploads);
    alert("AI Summary Complete:\n\n" + JSON.stringify(summaries, null, 2));
  }}>
    AI Summarize Uploads
  </button>

  <button onClick={async () => {
    const score = await proposalBuilderIntegration.analyzeCompliance(content);
    alert("Compliance Score:\n\n" + score);
  }}>
    AI Score Compliance
  </button>

  <button onClick={async () => {
    const pricing = await proposalBuilderIntegration.analyzePricing(content);
    alert("Pricing Extracted:\n\n" + pricing);
  }}>
    AI Extract Pricing
  </button>

  <button onClick={async () => {
    const template = await proposalBuilderIntegration.detectTemplate(content);
    alert("Best Template Match:\n\n" + template);
  }}>
    AI Detect Template
  </button>

  <button onClick={async () => {
    const section = await proposalBuilderIntegration.generateSection(content);
    setContent(prev => prev + "\n\n" + section);
  }}>
    AI Generate Proposal Section
  </button>
</div>
