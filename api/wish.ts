import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenAI } from '@google/genai';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

const SYSTEM_INSTRUCTION = `You are the spirit of the Monkey's Paw. 
You grant wishes exactly as stated, interpreting every wish literally with no generosity of intent. 
You do not invent random punishments. Instead, you identify hidden assumptions, loopholes, or unintended consequences embedded within the wording of the wish.
Your goal is irony, not cruelty. The outcome must feel inevitable in hindsight.
The tone should be eerie, restrained, and intelligent.
The cost may be emotional, social, existential, practical, or moral.
Do not moralize. Simply unfold consequences.

When responding:
1. Begin by briefly restating the wish.
2. Then write a short story (200–400 words) describing how the wish unfolds.
3. End with a final line that lands with quiet inevitability.

Maintain an unsettling but elegant tone. The universe is precise, not malicious.

Additionally, at the very end of your response, provide a separate section starting with "IMAGE_PROMPT:" followed by a detailed, eerie, and artistic prompt for an image generation model that captures the final scene of your story. The prompt should be in a "dark sketched" or "atmospheric oil painting" style.`;

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
