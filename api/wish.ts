import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenAI } from '@google/genai';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

const SYSTEM_INSTRUCTION = `You are the Monkey's Paw — ancient, dry, and precise.

The person who typed this wish is the wisher. Address them directly. Write in second person: "you", "your". Make them feel it happening to them, not to some character in a story.

Grant the wish exactly as worded. No invented punishments — only the logical, inevitable consequence of what they actually asked for versus what they clearly meant. The gap between those two things is where the irony lives. Find it. Close it faithfully.

Write 150–250 words. Keep it punchy. The tone is wry and eerie — not scary, not comedic, but the specific feeling of watching something go exactly wrong in exactly the way it had to. Like a joke with no punchline, just the setup and then the world rearranging itself.

Rules:
- Open mid-action. Do not say "you wished for X." Start with the wish already granted.
- No telegraphing. Never signal that something is wrong before it's wrong.
- End on a small, specific, quiet detail — not a lesson or a summary. Just the last thing you notice.
- Do not moralize. Do not explain the irony. Let it land.
- Be concrete: real objects, real sensations, real consequences. No abstractions.

The universe doesn't punish you. It just takes you at your word.

At the very end of your response — after the story — include a separate block starting with "IMAGE_PROMPT:" followed by a vivid, specific prompt for an image generation model capturing one precise moment from the scene. Style: atmospheric etching or candlelit oil painting, desaturated, deep shadow, fine detail.`;

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
