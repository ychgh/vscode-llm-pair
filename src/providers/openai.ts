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

    const choice = response.choices[0];
    if (!choice) {
      throw new Error('No choices returned from OpenAI API');
    }

    return {
      content: choice.message?.content || '',
      finishReason: choice.finish_reason,
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
      const choice = chunk.choices[0];
      const content = choice?.delta?.content;
      if (content) {
        onChunk(content);
      }
    }
  }

  getProviderName(): string {
    return 'OpenAI';
  }

  getModel(): string {
    return this.model;
  }
}
