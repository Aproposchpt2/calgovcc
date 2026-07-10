/**
 * ProposalBuilder Component (Enhanced with Template Buttons)
 */

import React, { useState } from "react";
import { proposalTemplates } from "../../api/contracts/proposalTemplates.js";
import { proposalBuilderIntegration } from "../../services/proposals/proposalBuilderIntegration.js";

export default function ProposalBuilder({
  contract,
  existingProposal,
  onSave,
  onUpdate,
  onUpload
}) {
  const [content, setContent] = useState(existingProposal?.content || "");
  const [uploads, setUploads] = useState([]);

  function insertTemplate(type) {
    const template = proposalTemplates[type];
    setContent(prev => prev + "\n\n" + template);
  }

  async function generateAISection() {
    const aiText = await proposalBuilderIntegration.generateSection(content);
    setContent(prev => prev + "\n\n" + aiText);
  }

  function handleUpload(e) {
    const files = Array.from(e.target.files);
    setUploads(prev => [...prev, ...files]);

    if (onUpload) {
      onUpload(files);
    }
  }

  return (
    <div className="proposal-builder">
      {/* Left: Full-page editor */}
      <div className="editor-section">
        <h2>Proposal for: {contract.title}</h2>

        {/* Template Buttons */}
        <div className="template-buttons">
          <button onClick={() => insertTemplate("technical")}>
            Insert Technical
          </button>
          <button onClick={() => insertTemplate("management")}>
            Insert Management
          </button>
          <button onClick={() => insertTemplate("pastPerformance")}>
            Insert Past Performance
          </button>
          <button onClick={() => insertTemplate("pricing")}>
            Insert Pricing
          </button>
          <button onClick={() => insertTemplate("hybrid")}>
            Insert Hybrid
          </button>

          <button className="ai-generate" onClick={generateAISection}>
            AI Generate Section
          </button>
        </div>

        <textarea
          className="proposal-editor"
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Write your proposal here..."
        />

        <div className="proposal-actions">
          {existingProposal ? (
            <button onClick={() => onUpdate(existingProposal.id, content)}>
              Update Proposal
            </button>
          ) : (
            <button onClick={() => onSave(contract.id, content)}>
              Save Draft
            </button>
          )}
        </div>
      </div>

      {/* Right: Agent Session Window */}
      <div className="sidebar-section">
        <h3>Agent Session</h3>
        <p>Upload documents for AI analysis.</p>

        <input type="file" multiple onChange={handleUpload} />

        <ul className="upload-list">
          {uploads.map((file, idx) => (
            <li key={idx}>{file.name}</li>
          ))}
        </ul>

        <h3>Contract Summary</h3>
        <p><strong>Agency:</strong> {contract.agency}</p>
        <p><strong>NAICS:</strong> {contract.naics || "N/A"}</p>
        <p><strong>Due Date:</strong> {contract.dueDate}</p>
        <p>{contract.summary}</p>
      </div>
    </div>
  );
}
