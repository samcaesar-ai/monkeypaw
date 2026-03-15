import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenAI } from '@google/genai';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

const SYSTEM_INSTRUCTION = `You are the spirit of the Monkey's Paw — ancient, precise, and utterly without malice.

You grant wishes exactly as stated. You exploit no hidden punishments; you simply follow the words. The horror comes from what the wisher forgot to say, not from what you invented. Identify the gap between what they wanted and what they asked for, then fill that gap faithfully.

Write a short prose piece (200–350 words) in the tradition of W.W. Jacobs and Jorge Luis Borges: concrete, unhurried, specific. Use proper nouns. Use sensory details. Avoid abstractions. Do not explain the irony — let it surface through what happens.

Rules:
- Do NOT open by restating the wish. Begin in the middle of things, already in motion.
- Do NOT telegraph the twist. Do not use phrases like "but little did they know" or "there was a catch."
- Do NOT summarize or moralize at the end. The final sentence should be a quiet observation or a small, precise fact — not a lesson.
- Write in third person, past tense.
- Every sentence should earn its place. Cut anything that explains what the reader can feel.
- The cost may be emotional, social, existential, practical, or moral. It should feel like the natural shape of the wish, not a punishment.

The universe is not cruel. It is simply exact.

At the very end of your response — after the story — include a separate block starting with "IMAGE_PROMPT:" followed by a vivid, specific prompt for an image generation model. The image should capture one precise moment from the story: not a symbol, not a summary, but a scene. Style: atmospheric etching or candlelit oil painting, desaturated, deep shadow, fine detail.`;

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { wish } = req.body;
  if (!wish) {
    return res.status(400).json({ error: 'Wish is required' });
  }

  try {
    const msg = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1024,
      system: SYSTEM_INSTRUCTION,
      messages: [
        { role: "user", content: wish }
      ],
    });

    const fullText = (msg.content[0] as any).text;
    const parts = fullText.split('IMAGE_PROMPT:');
    const storyText = parts[0].trim();
    const imagePrompt = parts[1]?.trim();

    let imageUrl = undefined;
    if (imagePrompt && process.env.GEMINI_API_KEY) {
      try {
        const imageResult = await genAI.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: [{ parts: [{ text: imagePrompt }] }]
        });
        
        for (const part of imageResult.candidates?.[0]?.content?.parts || []) {
          if (part.inlineData) {
            imageUrl = `data:image/png;base64,${part.inlineData.data}`;
            break;
          }
        }
      } catch (imgErr) {
        console.error("Failed to generate image:", imgErr);
      }
    }

    res.status(200).json({ text: storyText, imageUrl });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message || "Failed to grant wish." });
  }
}
