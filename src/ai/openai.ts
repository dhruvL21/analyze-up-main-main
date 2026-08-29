import OpenAI from 'openai';

/**
 * Retrieves the configured OpenAI API key from environment variables.
 */
export function getOpenAIApiKey(): string {
  return process.env.OPENAI_API_KEY || '';
}

/**
 * Checks whether the OpenAI API key is defined in the environment.
 */
export function isOpenAIConfigured(): boolean {
  const key = process.env.OPENAI_API_KEY;
  return Boolean(
    key &&
    key.trim().length > 10 &&
    !key.startsWith('missing-') &&
    !key.startsWith('sk-placeholder') &&
    !key.includes('your-api-key')
  );
}

/**
 * Singleton OpenAI client instance initialized safely.
 * If OPENAI_API_KEY is unset, the client can still be imported without throwing top-level
 * module evaluation exceptions, allowing fallback handlers to operate cleanly.
 */
export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'missing-openai-api-key',
  maxRetries: 0,
  timeout: 3500,
});
