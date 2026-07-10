/**
 * AI Win Probability Engine (Unified)
 */

import OpenAI from "openai";
import { UnifiedCapabilityProfile } from "../unified/UnifiedCapabilityProfile.js";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function calculateWinProbability({ userId, contract }) {
  const profile = await UnifiedCapabilityProfile.getProfile(userId);

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "You are a government contracting evaluator. Produce a win probability score from 0–100 based on federal + state capabilities and contract data."
      },
      {
        role: "user",
        content: `
Contract Summary:
${contract.summary}

Agency:
${contract.agency}
NAICS:
${contract.naics}

Federal Capabilities:
${JSON.stringify(profile.federalCapabilities || {}, null, 2)}

State Capabilities (Nevada):
${JSON.stringify(profile.stateCapabilities || [], null, 2)}

Keywords:
${(profile.keywords || []).join(", ")}

Past Performance:
${JSON.stringify(profile.pastPerformance || [], null, 2)}
        `
      }
    ]
  });

  return response.choices[0].message.content;
}
