/**
 * Represents a message in the chat conversation
 */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Options for generating a chat completion
 */
export interface ChatCompletionOptions {
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

/**
 * Response from a chat completion
 */
export interface ChatCompletionResponse {
  content: string;
  finishReason?: string;
}

/**
 * Base interface for LLM providers
 */
export interface LLMProvider {
  /**
   * Generate a chat completion
   */
  generateChatCompletion(options: ChatCompletionOptions): Promise<ChatCompletionResponse>;

  /**
   * Generate a streaming chat completion
   */
  streamChatCompletion(
    options: ChatCompletionOptions,
    onChunk: (chunk: string) => void
  ): Promise<void>;

  /**
   * Get the provider name
   */
  getProviderName(): string;

  /**
   * Get the model name
   */
  getModel?(): string;
}
