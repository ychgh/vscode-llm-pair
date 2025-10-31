import OpenAI from 'openai';
import { LLMProvider, ChatCompletionOptions, ChatCompletionResponse } from './types.js';

/**
 * Configuration for OpenAI provider
 */
export interface OpenAIConfig {
  apiKey: string;
  model: string;
  baseUrl?: string;
}

/**
 * OpenAI provider implementation
 */
export class OpenAIProvider implements LLMProvider {
  private client: OpenAI;
  private model: string;

  constructor(config: OpenAIConfig) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
    });
    this.model = config.model;
  }

  async generateChatCompletion(options: ChatCompletionOptions): Promise<ChatCompletionResponse> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: options.messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens,
      stream: false,
    });

    return {
      content: response.choices[0]?.message?.content || '',
      finishReason: response.choices[0]?.finish_reason,
    };
  }

  async streamChatCompletion(
    options: ChatCompletionOptions,
    onChunk: (chunk: string) => void
  ): Promise<void> {
    const stream = await this.client.chat.completions.create({
      model: this.model,
      messages: options.messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        onChunk(content);
      }
    }
  }

  getProviderName(): string {
    return 'OpenAI';
  }
}
