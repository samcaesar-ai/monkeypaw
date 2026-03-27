import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

export const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || '' });
export const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' });

export function is529(err: any): boolean {
  return (
    err?.status === 529 ||
    String(err?.message).includes('529') ||
    String(err?.error?.type) === 'overloaded_error'
  );
}

export async function withRetry<T>(fn: () => Promise<T>, retries = 1, delayMs = 500): Promise<T> {
  try {
    return await fn();
  } catch (err: any) {
    if (retries > 0 && is529(err)) {
      await new Promise(r => setTimeout(r, delayMs));
      return withRetry(fn, retries - 1, delayMs * 2);
    }
    throw err;
  }
}

// Non-streaming: try Anthropic, fall back to OpenAI on overload
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
    const msg = await withRetry(() =>
      anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: params.maxTokens,
        temperature: params.temperature ?? 1,
        system: params.system,
        messages: [{ role: 'user', content: params.userContent }],
      })
    );
    return (msg.content[0] as any).text as string;
  } catch (err) {
    if (is529(err)) return tryOpenAI();
    throw err;
  }
}

// Streaming: try Anthropic, fall back to OpenAI on overload (before any text sent)
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
        textSent = true;
        params.onText(text);
      }
    }
    await params.onDone(fullText);
  };

  const handleStreamError = async (err: any) => {
    if (is529(err) && !textSent) {
      try {
        await tryOpenAI();
      } catch (fallbackErr: any) {
        params.onError(fallbackErr);
      }
    } else {
      params.onError(err);
    }
  };

  try {
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

    stream.on('end', async () => {
      await params.onDone(fullText);
    });

    stream.on('error', handleStreamError);
  } catch (err) {
    await handleStreamError(err);
  }
}
