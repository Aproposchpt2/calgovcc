/**
 * AI Summary Endpoint
 * Processes uploaded files and generates summaries, extracted data,
 * and proposal-ready content.
 */

import OpenAI from "openai";
import fs from "fs";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function summarizeUploadedFiles(files) {
  const summaries = [];

  for (const file of files) {
    const buffer = fs.readFileSync(file.path);

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a government contracting analyst. Summarize the document and extract key requirements."
        },
        {
          role: "user",
          content: buffer.toString()
        }
      ]
    });

    summaries.push({
      filename: file.originalname,
      summary: response.choices[0].message.content
    });
  }

  return summaries;
}
