import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

const QUESTION_INSTRUCTION = `You are a deranged cosmic gameshow host who presents "Would You Rather" dilemmas. You've been doing this for aeons and your sense of what constitutes a "choice" has become beautifully warped.

Generate a single "Would You Rather" question with exactly two options. Both options should be:
- Specific and vivid — not vague hypotheticals
- Roughly equal in their appeal/horror ratio
- Funny in a way that makes people pause and genuinely think
- Grounded enough that you can picture the consequences
- British in cultural context (use £, UK places, British references where relevant)

The humour comes from specificity and escalation. Not "would you rather be rich or famous" — more like "would you rather have every dog you pass on the street narrate your deepest insecurity out loud, or have your browser history projected onto the nearest wall whenever you sneeze."

Mix tones: some should be absurd, some should be weirdly philosophical, some should be mundane-but-awful. The best ones make people laugh AND then go quiet.

Return ONLY valid JSON in this exact format, nothing else:
{"question": "Would you rather...", "optionA": "the first option described vividly in 10-25 words", "optionB": "the second option described vividly in 10-25 words"}`;

const STORY_INSTRUCTION = `You are the narrator of a cosmic "Would You Rather" gameshow. Someone has just made their choice, and now you describe what happens — with the same energy as the Monkey's Paw: sardonic, specific, gleeful.

The person chose this option and now they're living it. Describe the consequences in second person ("you", "your"). Start mid-consequence — they're already in it.

Tone: darkly funny, escalating, specific. The humour comes from following the logic of the choice to its inevitable, absurd conclusion. Not punishment — just... the full implications they didn't think through.

Write 150–250 words of punchy prose. Flowing paragraphs. End on a precise final image that captures the full absurdity.

Rules:
- Second person throughout.
- Start mid-consequence. Do not open with "you chose X."
- Be specific and concrete. Name the exact thing. Describe the exact sensation.
- Do not explain the irony. Trust the reader.
- The final line should land — give it some bite.
- **UK LOCALISATION REQUIRED:** British English spelling and cultural contexts throughout.

At the very end — after the story — add a block starting with "IMAGE_PROMPT:" followed by a specific scene from the story for an image generator. Style: surreal editorial illustration, slightly unsettling, vivid colour palette, fine detail.`;

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { mode, question, choice } = req.body;

  try {
    if (mode === 'question') {
      const msg = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 256,
        system: QUESTION_INSTRUCTION,
        messages: [
          { role: "user", content: "Generate a Would You Rather question." }
        ],
      });

      const text = (msg.content[0] as any).text;
      const parsed = JSON.parse(text);
      return res.status(200).json(parsed);

    } else if (mode === 'story') {
      if (!question || !choice) {
        return res.status(400).json({ error: 'Question and choice are required' });
      }

      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      });

      const stream = anthropic.messages.stream({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        system: STORY_INSTRUCTION,
        messages: [
          { role: "user", content: `The question was: "${question}"\n\nThey chose: "${choice}"\n\nDescribe what happens.` }
        ],
      });

      let fullText = '';

      stream.on('text', (text) => {
        fullText += text;
        res.write(`data: ${JSON.stringify({ type: 'text', text })}\n\n`);
      });

      stream.on('end', () => {
        const parts = fullText.split('IMAGE_PROMPT:');
        const imagePrompt = parts[1]?.trim();
        if (imagePrompt) {
          res.write(`data: ${JSON.stringify({ type: 'image_prompt', imagePrompt })}\n\n`);
        }
        res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
        res.end();
      });

      stream.on('error', (err) => {
        console.error(err);
        res.write(`data: ${JSON.stringify({ type: 'error', error: err.message })}\n\n`);
        res.end();
      });

      return;

    } else {
      return res.status(400).json({ error: 'Invalid mode. Use "question" or "story".' });
    }
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message || "The universe refuses to cooperate." });
  }
}
