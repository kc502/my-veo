export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { apiKey } = req.body;

  if (!apiKey) {
    return res.status(400).json({ error: "Missing API key" });
  }

  try {
    const resp = await fetch("https://generativelanguage.googleapis.com/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` }
    });

    if (!resp.ok) {
      return res.status(401).json({ error: "Invalid API Key" });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: "Validation failed" });
  }
}
