import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { openai, getOpenAIApiKey, isOpenAIConfigured } from './openai';

describe('OpenAI Client Configuration & Resiliency', () => {
  const originalKey = process.env.OPENAI_API_KEY;

  afterEach(() => {
    process.env.OPENAI_API_KEY = originalKey;
  });

  it('should instantiate the openai client without throwing at import time', () => {
    expect(openai).toBeDefined();
    expect(openai.chat).toBeDefined();
    expect(openai.chat.completions).toBeDefined();
  });

  it('should return true for isOpenAIConfigured when key is present', () => {
    process.env.OPENAI_API_KEY = 'test-key-12345';
    expect(isOpenAIConfigured()).toBe(true);
    expect(getOpenAIApiKey()).toBe('test-key-12345');
  });

  it('should return false for isOpenAIConfigured when key is empty or undefined', () => {
    delete process.env.OPENAI_API_KEY;
    expect(isOpenAIConfigured()).toBe(false);
    expect(getOpenAIApiKey()).toBe('');
  });
});
