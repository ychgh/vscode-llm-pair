import { LLMProvider, ChatCompletionOptions, ChatCompletionResponse } from './types.js';

/**
 * Configuration for Ollama provider
 */
export interface OllamaConfig {
  baseUrl: string;
  model: string;
}

/**
 * Response from Ollama /api/tags endpoint
 */
interface OllamaTagsResponse {
  models: Array<{
    name: string;
    modified_at: string;
    size: number;
    digest: string;
    details?: {
      format?: string;
      family?: string;
      parameter_size?: string;
      quantization_level?: string;
    };
  }>;
}

/**
 * Ollama provider implementation
 */
export class OllamaProvider implements LLMProvider {
  private baseUrl: string;
  private model: string;

  constructor(config: OllamaConfig) {
    this.baseUrl = config.baseUrl;
    this.model = config.model;
  }

  /**
   * List available models from local Ollama instance
   */
  async listModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.statusText}`);
      }
      const data = await response.json() as OllamaTagsResponse;
      return data.models.map(m => m.name);
    } catch (error) {
      if (error instanceof TypeError) {
        throw new Error('Failed to connect to Ollama. Please ensure Ollama is running.');
      }
      throw error;
    }
  }

  async generateChatCompletion(options: ChatCompletionOptions): Promise<ChatCompletionResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages: options.messages.map(msg => ({
            role: msg.role,
            content: msg.content,
          })),
          stream: false,
          options: {
            temperature: options.temperature ?? 0.7,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText}`);
      }

      const data = await response.json() as { message?: { content?: string }; done?: boolean };
      return {
        content: data.message?.content || '',
        finishReason: data.done ? 'stop' : undefined,
      };
    } catch (error) {
      if (error instanceof TypeError) {
        throw new Error('Failed to connect to Ollama. Please ensure Ollama is running.');
      }
      throw error;
    }
  }

  async streamChatCompletion(
    options: ChatCompletionOptions,
    onChunk: (chunk: string) => void
  ): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages: options.messages.map(msg => ({
            role: msg.role,
            content: msg.content,
          })),
          stream: true,
          options: {
            temperature: options.temperature ?? 0.7,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('Response body is null');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n').filter(line => line.trim());

          for (const line of lines) {
            try {
              const data = JSON.parse(line);
              if (data.message?.content) {
                onChunk(data.message.content);
              }
            } catch (parseError) {
              // Log parse errors for debugging but continue processing
              // This can happen with incomplete JSON chunks at stream boundaries
              console.debug('Failed to parse streaming chunk:', parseError);
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      if (error instanceof TypeError) {
        throw new Error('Failed to connect to Ollama. Please ensure Ollama is running.');
      }
      throw error;
    }
  }

  getProviderName(): string {
    return 'Ollama';
  }

  getModel(): string {
    return this.model;
  }
}
