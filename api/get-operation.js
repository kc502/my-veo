// api/operation-status.js
import fetch from 'node-fetch';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { operationName, apiKey } = req.body || {};
  if (!operationName || !apiKey) return res.status(400).json({ error: 'missing' });

  try {
    // GET the operation
    // Operation endpoint: https://generativelanguage.googleapis.com/v1/{name=operations/*}
    const url = `https://generativelanguage.googleapis.com/v1/${encodeURIComponent(operationName)}`;
    const resp = await fetch(url, {
      method: 'GET',
      headers: { 'x-goog-api-key': apiKey }
    });
    const j = await resp.json();
    if (!resp.ok) {
      return res.status(502).json({ error: 'Upstream error', details: j });
    }

    // When done: operation.done === true and operation.response.generatedVideos[0] contains file refs
    if (j.done) {
      // try to extract generated video file url if present
      try {
        const video = (j.response?.generated_videos || j.response?.generatedVideos || [])[0];
        const fileRef = video?.video || video?.videoUrl || video?.video?.gs_uri || null;
        // Note: depending on API, you may need to call ai.files.download, or use returned signed URL.
        // We'll return raw operation as fallback.
        return res.status(200).json({ done: true, downloadUrl: fileRef, operation: j });
      } catch (e) {
        return res.status(200).json({ done: true, operation: j });
      }
    } else {
      return res.status(200).json({ done: false, operation: j });
    }
  } catch (err) {
    console.error('operation-status error', err);
    return res.status(500).json({ error: String(err) });
  }
}
