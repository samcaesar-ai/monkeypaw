import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

export const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || '' });
export const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' });

function isAnthropicError(err: any): boolean {
  return (
    err instanceof Anthropic.APIError ||
    err?.name === 'APIConnectionError' ||
    err?.name === 'APIError' ||
    err?.status === 529 ||
    String(err?.message).includes('529') ||
    String(err?.message).toLowerCase().includes('connection')
  );
}

// Non-streaming: try Anthropic, fall back to OpenAI on any API error
export async function createMessage(params: {
  system: string;
  userContent: string;
  maxTokens: number;
  temperature?: number;
}): Promise<string> {
  const tryOpenAI = async () => {
    const resp = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: params.maxTokens,
      temperature: params.temperature ?? 1,
      messages: [
        { role: 'system', content: params.system },
        { role: 'user', content: params.userContent },
      ],
    });
    return resp.choices[0].message.content || '';
  };

  try {
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: params.maxTokens,
      temperature: params.temperature ?? 1,
      system: params.system,
      messages: [{ role: 'user', content: params.userContent }],
    });
    return (msg.content[0] as any).text as string;
  } catch (err) {
    console.error('Anthropic failed, falling back to OpenAI:', err);
    return tryOpenAI();
  }
}

// Streaming: try Anthropic, fall back to OpenAI on any error (if no text sent yet)
export async function streamText(params: {
  system: string;
  userContent: string;
  maxTokens: number;
  onText: (text: string) => void;
  onDone: (fullText: string) => Promise<void> | void;
  onError: (err: Error) => void;
}): Promise<void> {
  let fullText = '';
  let textSent = false;

  const tryOpenAI = async () => {
    fullText = '';
    const stream = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: params.maxTokens,
      stream: true,
      messages: [
        { role: 'system', content: params.system },
        { role: 'user', content: params.userContent },
      ],
    });
    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content || '';
      if (text) {
        fullText += text;
        params.onText(text);
      }
    }
    await params.onDone(fullText);
  };

  // Wrap stream events in a Promise to avoid unhandled async rejections
  const { anthropicError } = await new Promise<{ anthropicError?: Error }>((resolve) => {
    const stream = anthropic.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: params.maxTokens,
      system: params.system,
      messages: [{ role: 'user', content: params.userContent }],
    });

    stream.on('text', (text) => {
      fullText += text;
      textSent = true;
      params.onText(text);
    });

    stream.on('end', () => resolve({}));

    // Resolve (not reject) on error so we can handle fallback cleanly
    stream.on('error', (err: any) => {
      console.error('Anthropic stream error:', err);
      resolve({ anthropicError: err });
    });
  });

  if (anthropicError) {
    if (!textSent) {
      // No text sent yet — fall back to OpenAI silently
      try {
        console.error('Falling back to OpenAI...');
        await tryOpenAI();
      } catch (err: any) {
        try { params.onError(err); } catch { /* response already ended */ }
      }
    } else {
      // Partial text already sent — surface the error
      try { params.onError(anthropicError); } catch { /* response already ended */ }
    }
    return;
  }

  try {
    await params.onDone(fullText);
  } catch (err: any) {
    try { params.onError(err); } catch { /* response already ended */ }
  }
}
