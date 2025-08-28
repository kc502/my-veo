// api/operation-status.js
import fetch from "node-fetch";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const { operationName, apiKey } = req.body || {};
  if (!operationName || !apiKey) return res.status(400).json({ error: "missing fields" });

  try {
    const url = `https://generativelanguage.googleapis.com/v1/${operationName}`;
    const resp = await fetch(url, {
      headers: { "x-goog-api-key": apiKey }
    });
    const j = await resp.json();

    if (!resp.ok) return res.status(502).json({ error: "Upstream error", details: j });

    if (j.done) {
      // Try to extract download url
      const vid = j.response?.generatedVideos?.[0];
      const downloadUrl =
        vid?.video?.downloadUri || vid?.video?.uri || vid?.videoUrl || null;

      return res.status(200).json({
        done: true,
        downloadUrl,
        operation: j
      });
    }

    return res.status(200).json({ done: false, operation: j });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
}
