// api/generate.js
import fetch from 'node-fetch';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const body = req.body || {};
  const {
    apiKey, model, aspectRatio, personGeneration,
    negativePrompt, prompt, resolution
  } = body;

  if (!apiKey || !model || !prompt) return res.status(400).json({ error: 'Missing required fields' });

  try {
    // Build the predictLongRunning URL for the chosen model
    // Example: https://generativelanguage.googleapis.com/v1/models/veo-3.0-generate-preview:predictLongRunning
    const url = `https://generativelanguage.googleapis.com/v1/models/${encodeURIComponent(model)}:predictLongRunning`;

    const requestBody = {
      instances: [{
        prompt: prompt
      }],
      parameters: {
        aspectRatio,
        personGeneration,
        negativePrompt,
        // You may pass resolution in parameters if supported by model
        resolution
      }
    };

    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'x-goog-api-key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    const j = await resp.json();
    if (!resp.ok) {
      return res.status(502).json({ error: 'Upstream error', details: j });
    }

    // The API returns an operation handle for long-running job
    // Example response: { name: "operations/..." } or full operation object
    return res.status(200).json({ operationName: j.name || (j.operation && j.operation.name) || null, raw: j });

  } catch (err) {
    console.error('generate error', err);
    return res.status(500).json({ error: String(err) });
  }
}
