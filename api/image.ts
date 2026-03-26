import { GoogleGenAI } from '@google/genai';

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { prompt } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.status(503).json({ error: 'Image generation not configured' });
  }

  try {
    const imageResult = await genAI.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: [{ parts: [{ text: prompt }] }]
    });

    for (const part of imageResult.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return res.status(200).json({
          imageUrl: `data:image/png;base64,${part.inlineData.data}`
        });
      }
    }

    return res.status(500).json({ error: 'No image generated' });
  } catch (err: any) {
    console.error("Failed to generate image:", err);
    res.status(500).json({ error: err.message || "Image generation failed." });
  }
}
