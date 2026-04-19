const express = require("express");
const cors = require("cors");
const Anthropic = require("@anthropic-ai/sdk");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: "20mb" }));

// Anthropic client — key comes exclusively from environment
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `You are a professional construction and water damage inspector. \
Analyze the provided image. Identify the type of damage, the likely cause, and a brief repair suggestion. \
You MUST provide the report in two distinct sections: first in English, then in Hebrew.`;

// POST /analyze
app.post("/analyze", async (req, res) => {
  const { image } = req.body; // expects a Base64 string (no data-URI prefix)

  if (!image) {
    return res.status(400).json({ error: "No image provided." });
  }

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: "image/jpeg",
                data: image,
              },
            },
            {
              type: "text",
              text: "Please inspect this image and provide your damage report.",
            },
          ],
        },
      ],
    });

    const report = response.content[0].text;
    res.json({ report });
  } catch (err) {
    console.error("Anthropic API error:", err.message);
    res.status(500).json({ error: "Failed to analyze image." });
  }
});

// Health-check
app.get("/", (req, res) => res.send("Damage Inspector API is running."));

app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
