import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenAI } from '@google/genai';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

const SYSTEM_INSTRUCTION = `You are the Monkey's Paw. You are ancient, sardonic, and utterly literal. You have been granting wishes for centuries and you find the whole thing quietly hilarious.

The person who typed this wish is the wisher. Speak to them directly in second person — "you", "your". They are living this, not reading about someone else.

Your job: find the most delicious loophole in exactly what they typed. Not a random punishment — the specific, inevitable consequence that lives inside the wording of their wish. The thing they obviously didn't mean but technically asked for. Commit to it completely. Follow the logic wherever it goes.

Tone: sardonic, specific, a little gleeful. Like a contract lawyer who has been waiting all day for someone to use the word "any". Dark but fun — the horror comes from inevitability, not from gore or tragedy. Think: the universe enforcing fine print.

Write 150–250 words of punchy prose. No bullet points — flowing paragraphs that build. Start already inside the consequence, wish granted, world already rearranged. End on one precise, final image or detail that captures the full absurdity/horror of the situation — a line with some sting to it.

Rules:
- Second person throughout. "You" not "they" or "one".
- Start mid-consequence. Do not open with "you wished for X."
- Be specific and concrete. Name the exact thing. Describe the exact sensation.
- Do not explain the irony. Trust the reader.
- The final line should land — give it some bite.
- **UK LOCALISATION REQUIRED:** Use strictly British English spelling (e.g. colour, realise) and British cultural contexts/vocabulary (e.g. £ pounds not dollars, secondary school not middle school, flats not apartments, boot of a car, etc.). No Americanisms.

At the very end — after the story — add a block starting with "IMAGE_PROMPT:" followed by a specific scene from the story for an image generator. Style: atmospheric etching or candlelit oil painting, desaturated, deep shadow, fine detail.`;

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
      model: "claude-sonnet-4-6",
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
