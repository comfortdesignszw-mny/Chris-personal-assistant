import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Initialize Gemini client
  let ai: GoogleGenAI | null = null;
  
  app.post("/api/gemini", async (req, res) => {
    try {
      if (!ai) {
        if (!process.env.GEMINI_API_KEY) {
          return res.status(400).json({ error: "GEMINI_API_KEY is not set." });
        }
        ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      }

      const { prompt, history } = req.body;
      
      let customRules = "";
      try {
        customRules = fs.readFileSync(path.join(process.cwd(), "Chris.md"), "utf-8");
      } catch (e) {
        // file might not exist or be readable
      }

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
            ...history,
            {role: 'user', parts: [{text: prompt}]}
        ],
        config: {
          systemInstruction: `You are Chris, a highly intelligent, proactive, and concise personal assistant. Respond directly, using a supportive and slightly witty tone. You are assisting a professional user. Provide concise answers optimized for text-to-speech output. You have access to tools: Gmail, Calendar, Weather, and Local File Management. If the user asks for a physical system task, format your output in JSON with an executable payload.\n\nHere are some user-defined rules you must follow:\n${customRules}`,
        }
      });

      res.json({ text: response.text });
    } catch (error: any) {
      console.error("Gemini API error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
