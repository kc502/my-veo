// api/validate-key.js
import fetch from "node-fetch";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const { apiKey } = req.body || {};
  if (!apiKey) return res.status(400).json({ valid: false, error: "missing key" });

  try {
    const resp = await fetch(
      "https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent",
      {
        method: "POST",
        headers: {
          "x-goog-api-key": apiKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: "ping" }] }]
        })
      }
    );

    if (resp.ok) {
      return res.status(200).json({ valid: true });
    } else {
      const err = await resp.text();
      return res.status(200).json({ valid: false, details: err });
    }
  } catch (e) {
    return res.status(500).json({ valid: false, error: String(e) });
  }
}
