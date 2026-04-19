const express = require("express");
const path = require("path");
const Anthropic = require("@anthropic-ai/sdk");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "20mb" }));
app.use(express.static(path.join(__dirname, "public")));

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are a professional construction and water damage inspector. \
Analyze the provided image. Identify the type of damage, the likely cause, and a brief repair suggestion. \
You MUST provide the report in two distinct sections: first in English, then in Hebrew.`;

// POST /analyze — streams response via Server-Sent Events
app.post("/analyze", async (req, res) => {
  const { image } = req.body;
  if (!image) return res.status(400).json({ error: "No image provided." });

  // SSE headers — text starts flowing to the client immediately
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  try {
    const stream = anthropic.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: "image/jpeg", data: image },
            },
            { type: "text", text: "Please inspect this image and provide your damage report." },
          ],
        },
      ],
    });

    // Forward each text chunk to the client as it arrives
    stream.on("text", (text) => {
      res.write(`data: ${JSON.stringify({ text })}\n\n`);
    });

    await stream.finalMessage();
    res.write("data: [DONE]\n\n");
    res.end();

  } catch (err) {
    console.error("Anthropic API error:", err.message);
    res.write(`data: ${JSON.stringify({ error: "Failed to analyze image." })}\n\n`);
    res.end();
  }
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
