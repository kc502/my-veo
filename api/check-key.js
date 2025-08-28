// api/validate-key.js
// Simple key validation: make a light request using the key; if unauthorized -> invalid.
// Uses the Generative Language / Gemini predictLongRunning endpoint.
import fetch from 'node-fetch';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { apiKey } = req.body || {};
  if (!apiKey) return res.status(400).json({ valid: false, error: 'missing key' });

  try {
    // lightweight call: try listing models or a tiny predict call that should 401 if invalid.
    // We'll hit the "models list" endpoint (generativelanguage) to validate the key.
    const resp = await fetch('https://generativelanguage.googleapis.com/v1/models', {
      method: 'GET',
      headers: {
        'x-goog-api-key': apiKey,
        'Accept': 'application/json'
      }
    });

    if (resp.status === 200) {
      return res.status(200).json({ valid: true });
    } else {
      // not 200 -> invalid or restricted
      const text = await resp.text();
      return res.status(200).json({ valid: false, status: resp.status, details: text });
    }
  } catch (err) {
    console.error('validate-key error', err);
    return res.status(500).json({ valid: false, error: String(err) });
  }
}
