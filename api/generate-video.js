export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { apiKey, model, prompt, negativePrompt, aspectRatio, person, resolution } = req.body;

  if (!apiKey || !prompt) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${model}:generateVideo?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          negativePrompt,
          aspectRatio,
          person,
          resolution
        })
      }
    );

    const data = await resp.json();

    if (!resp.ok) {
      return res.status(400).json({ error: data.error || "Generation failed" });
    }

    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: "Backend error" });
  }
}
