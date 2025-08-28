// api/generate.js
import fetch from "node-fetch";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const {
    apiKey,
    model,
    aspectRatio,
    personGeneration,
    negativePrompt,
    prompt,
    resolution
  } = req.body || {};

  if (!apiKey || !model || !prompt)
    return res.status(400).json({ error: "Missing required fields" });

  try {
    const url = `https://generativelanguage.googleapis.com/v1/models/${encodeURIComponent(
      model
    )}:predictLongRunning`;

    const body = {
      instances: [
        {
          prompt: prompt
        }
      ],
      parameters: {
        aspect_ratio: aspectRatio,
        person_generation: personGeneration,
        negative_prompt: negativePrompt,
        resolution: resolution
      }
    };

    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "x-goog-api-key": apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    const j = await resp.json();
    if (!resp.ok) {
      return res.status(502).json({ error: "Upstream error", details: j });
    }

    return res.status(200).json({
      operationName: j.name,
      raw: j
    });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
}
