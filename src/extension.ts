import * as vscode from 'vscode';
import { ChatViewProvider } from './chatView.js';
import { OpenAIProvider } from './providers/index.js';

/**
 * Shared output channel for the extension
 */
let outputChannel: vscode.OutputChannel | undefined;

/**
 * Extension activation function
 */
export function activate(context: vscode.ExtensionContext) {
  // Create a dedicated output channel
  outputChannel = vscode.window.createOutputChannel('LLM Pair');
  context.subscriptions.push(outputChannel);
  outputChannel.appendLine('LLM Pair extension is now active');

  // Create the chat view provider with the output channel
  const chatViewProvider = new ChatViewProvider(context.extensionUri, outputChannel);

  // Register the webview view provider
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      ChatViewProvider.viewType,
      chatViewProvider
    )
  );

  // Initialize the LLM provider
  initializeLLMProvider(chatViewProvider);

  // Watch for configuration changes
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('llmPair')) {
        outputChannel?.appendLine('Configuration changed, reinitializing LLM provider');
        initializeLLMProvider(chatViewProvider);
      }
    })
  );

  // Register the open chat command
  const openChatCommand = vscode.commands.registerCommand(
    'vscode-llm-pair.openChat',
    () => {
      vscode.commands.executeCommand('llm-pair-chat.focus');
    }
  );

  context.subscriptions.push(openChatCommand);
}

/**
 * Initialize the LLM provider based on configuration
 */
function initializeLLMProvider(chatViewProvider: ChatViewProvider) {
  const config = vscode.workspace.getConfiguration('llmPair');
  const provider = config.get<string>('provider', 'openai');

  try {
    if (provider === 'openai') {
      const apiKey = config.get<string>('openai.apiKey', '');
      const model = config.get<string>('openai.model', 'gpt-4');
      const baseUrl = config.get<string>('openai.baseUrl');

      if (!apiKey) {
        vscode.window.showWarningMessage(
          'OpenAI API key not configured. Please set llmPair.openai.apiKey in settings.'
        );
        outputChannel?.appendLine('OpenAI API key not configured.');
        return;
      }

      const openaiProvider = new OpenAIProvider({
        apiKey,
        model,
        baseUrl,
      });

      chatViewProvider.setProvider(openaiProvider);
      outputChannel?.appendLine(`LLM Provider initialized: OpenAI (${model})`);
    } else {
      outputChannel?.appendLine(`Unsupported provider: ${provider}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    vscode.window.showErrorMessage(
      `Failed to initialize LLM provider: ${message}`
    );
    outputChannel?.appendLine(`Failed to initialize LLM provider: ${message}`);
  }
}

/**
 * Extension deactivation function
 */
export function deactivate() {
  outputChannel?.appendLine('LLM Pair extension is now deactivated');
}