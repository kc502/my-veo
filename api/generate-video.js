import fetch from "node-fetch";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { apiKey, model, aspectRatio, person, resolution, prompt, negativePrompt } = req.body;

    if (!apiKey) {
      return res.status(400).json({ error: "API key missing" });
    }

    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateVideo", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        prompt: {
          text: prompt,
          negative_text: negativePrompt || ""
        },
        videoConfig: {
          aspectRatio: aspectRatio,
          resolution: resolution,
          personGeneration: person
        }
      })
    });

    const data = await response.json();
    return res.status(200).json(data);

  } catch (err) {
    console.error("Error generating video:", err);
    return res.status(500).json({ error: "Server error" });
  }
}
