/**
 * ProposalBuilder Component
 * Full-page proposal editor with upload support and AI integration hooks.
 */

import React, { useState } from "react";

export default function ProposalBuilder({
  contract,
  existingProposal,
  onSave,
  onUpdate,
  onUpload
}) {
  const [content, setContent] = useState(existingProposal?.content || "");
  const [uploads, setUploads] = useState([]);

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
        <p>
          Upload documents for the Agent to analyze, summarize, or integrate
          into your proposal.
        </p>

        <input
          type="file"
          multiple
          onChange={handleUpload}
          className="upload-input"
        />

        <ul className="upload-list">
          {uploads.map((file, idx) => (
            <li key={idx}>{file.name}</li>
          ))}
        </ul>

        <h3>Contract Summary</h3>
        <p><strong>Agency:</strong> {contract.agency}</p>
        <p><strong>NAICS:</strong> {contract.naics || "N/A"}</p>
        <p><strong>Due Date:</strong> {contract.dueDate}</p>
        <p><strong>Description:</strong></p>
        <p>{contract.summary}</p>
      </div>
    </div>
  );
}
