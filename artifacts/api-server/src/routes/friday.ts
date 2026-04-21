import { Router } from "express";
import OpenAI from "openai";

const router: Router = Router();

const openai = new OpenAI({
  baseURL: process.env["AI_INTEGRATIONS_OPENAI_BASE_URL"],
  apiKey: process.env["AI_INTEGRATIONS_OPENAI_API_KEY"] || "dummy",
});

router.post("/chat", async (req, res) => {
  try {
    const { messages } = req.body as {
      messages: Array<{ role: string; content: string }>;
    };

    if (!messages || !Array.isArray(messages)) {
      res.status(400).json({ error: "messages array required" });
      return;
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 300,
      messages: messages as OpenAI.ChatCompletionMessageParam[],
    });

    const content = completion.choices[0]?.message?.content || "";
    res.json({ content });
  } catch (err) {
    req.log.error({ err }, "Chat error");
    res.status(500).json({ error: "AI chat failed" });
  }
});

export default router;
