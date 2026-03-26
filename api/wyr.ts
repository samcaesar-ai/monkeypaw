import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

// Randomised seed elements to force variety on every request
// Abstract vibes, NOT specific places — Claude latches onto named locations
const THEMES = [
  'social embarrassment', 'bodily autonomy', 'professional reputation',
  'romantic relationships', 'family dynamics', 'financial decisions',
  'technology dependence', 'food and eating', 'sleep and dreams',
  'ageing and mortality', 'communication', 'memory and identity',
  'senses and perception', 'time and routine', 'animals and nature',
  'music and sound', 'clothing and appearance', 'transport and travel',
  'housing and neighbours', 'health and wellness', 'fame and anonymity',
  'childhood and nostalgia', 'weather and seasons', 'sports and competition',
  'language and accents', 'smells', 'textures', 'gravity', 'colour',
  'silence', 'symmetry', 'luck', 'déjà vu', 'queuing',
];

const FLAVOURS = [
  'body horror but make it mundane',
  'existential dread disguised as a minor inconvenience',
  'a supernatural curse with very specific bureaucratic rules',
  'something that sounds amazing until you think about it for 10 seconds',
  'an ability that technically counts as a superpower but ruins your social life',
  'a Faustian bargain involving a household appliance',
  'time-loop energy but only in one very boring location',
  'a sensory experience that cannot be explained to anyone else',
  'something involving animals that have gained an unsettling new behaviour',
  'a physical transformation that is technically reversible but socially devastating',
  'financial gain with a deeply specific and embarrassing catch',
  'telepathy but the wrong kind',
  'immortality with a very British asterisk',
  'a romantic curse that only activates at the worst possible moment',
  'something that makes you famous for exactly the wrong reason',
  'a childhood dream granted in the most literal and inconvenient way',
];

const TONES = [
  'absurdist — push the logic until it snaps',
  'philosophical — genuinely makes you stare at the ceiling',
  'mundane horror — the worst part is how plausible it is',
  'gleefully unhinged — the gameshow host has lost the plot',
  'deadpan — delivered with the energy of a bored civil servant',
  'weirdly wholesome — both options sound almost nice, then you think harder',
];

function pickRandom<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

const QUESTION_INSTRUCTION = `You are a deranged cosmic gameshow host who presents "Would You Rather" dilemmas. You've been doing this for aeons and your sense of what constitutes a "choice" has become beautifully warped.

Generate a single "Would You Rather" question with exactly two options. Both options should be:
- Specific and vivid — not vague hypotheticals
- Roughly equal in their appeal/horror ratio
- Funny in a way that makes people pause and genuinely think
- Grounded enough that you can picture the consequences
- British in cultural context (use £, UK places, British references where relevant)

The humour comes from specificity and escalation. Not "would you rather be rich or famous" — more like "would you rather have every dog you pass on the street narrate your deepest insecurity out loud, or have your browser history projected onto the nearest wall whenever you sneeze."

Mix tones: some should be absurd, some should be weirdly philosophical, some should be mundane-but-awful. The best ones make people laugh AND then go quiet.

IMPORTANT: Do NOT mention Greggs, sausage rolls, or bakery chains. Be wildly creative and unpredictable.

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

  const { mode, question, choice, recentQuestions } = req.body;

  try {
    if (mode === 'question') {
      const themes = pickRandom(THEMES, 2);
      const flavour = pickRandom(FLAVOURS, 1)[0];
      const tone = pickRandom(TONES, 1)[0];

      let userContent = `Generate a Would You Rather question.\n\nCreative seeds (use as LOOSE inspiration — do NOT mention these words directly in the question):\n- Themes to riff on: ${themes.join(' × ')}\n- Flavour: ${flavour}\n- Tone: ${tone}\n\nThe question should feel original and surprising. Do NOT set it in a specific named chain, brand, or restaurant.`;
      if (recentQuestions && recentQuestions.length > 0) {
        userContent += `\n\nIMPORTANT: Do NOT repeat or closely resemble any of these recent questions. Be completely different in topic, tone, and structure:\n${recentQuestions.map((q: string, i: number) => `${i + 1}. ${q}`).join('\n')}`;
      }

      const msg = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 256,
        temperature: 1,
        system: QUESTION_INSTRUCTION,
        messages: [
          { role: "user", content: userContent }
        ],
      });

      const text = (msg.content[0] as any).text;
      // Extract JSON from response — Claude sometimes adds preamble
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON in response');
      }
      const parsed = JSON.parse(jsonMatch[0]);
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
