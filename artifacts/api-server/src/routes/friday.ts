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
      max_completion_tokens: 512,
      messages: messages as OpenAI.ChatCompletionMessageParam[],
    });

    const content = completion.choices[0]?.message?.content || "";
    res.json({ content });
  } catch (err) {
    req.log.error({ err }, "Chat error");
    res.status(500).json({ error: "AI chat failed" });
  }
});

router.post("/transcribe", async (req, res) => {
  try {
    const { audio } = req.body as { audio: string };

    if (!audio) {
      res.status(400).json({ error: "audio base64 required" });
      return;
    }

    const audioBuffer = Buffer.from(audio, "base64");

    const audioFile = new File([audioBuffer], "audio.wav", {
      type: "audio/wav",
    });

    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "gpt-4o-mini-transcribe",
      response_format: "json",
    });

    res.json({ text: transcription.text });
  } catch (err) {
    req.log.error({ err }, "Transcription error");
    res.status(500).json({ error: "Transcription failed" });
  }
});

router.post("/speak", async (req, res) => {
  try {
    const { text, voice } = req.body as {
      text: string;
      voice?: string;
    };

    if (!text) {
      res.status(400).json({ error: "text required" });
      return;
    }

    const validVoices = ["alloy", "echo", "fable", "onyx", "nova", "shimmer"];
    const selectedVoice = validVoices.includes(voice || "") ? voice : "alloy";

    const mp3Response = await openai.audio.speech.create({
      model: "tts-1",
      voice: selectedVoice as "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer",
      input: text,
      response_format: "mp3",
    });

    const buffer = Buffer.from(await mp3Response.arrayBuffer());
    const base64Audio = buffer.toString("base64");

    res.json({ audio: base64Audio, format: "mp3" });
  } catch (err) {
    req.log.error({ err }, "TTS error");
    res.status(500).json({ error: "Text-to-speech failed" });
  }
});

export default router;
