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
  const config = vscode.workspace.getConfiguration();
  const provider = config.get<string>('llmPair.provider', 'openai');

  outputChannel?.appendLine('=== Configuration Debug ===');
  outputChannel?.appendLine(`Workspace folders: ${JSON.stringify(vscode.workspace.workspaceFolders?.map(f => f.uri.fsPath))}`);
  outputChannel?.appendLine(`Provider: ${provider}`);
  outputChannel?.appendLine(`Config inspection for 'llmPair.provider': ${JSON.stringify(config.inspect('llmPair.provider'))}`);
  outputChannel?.appendLine(`Environment variable VSCODE_LLMPAIR_OPENAI_APIKEY: ${process.env.VSCODE_LLMPAIR_OPENAI_APIKEY ? '[SET]' : '[NOT SET]'}`);

  try {
    if (provider === 'openai') {
      // Try config first, then fall back to environment variable for development
      let apiKey = config.get<string>('llmPair.openai.apiKey');
      
      outputChannel?.appendLine(`API Key from config.get: ${apiKey ? (apiKey === 'update your api-key here' ? '[DEFAULT]' : '[SET]') : '[NOT SET]'}`);
      
      // Fallback to environment variable if not set in config (for development)
      if (!apiKey || apiKey === 'update your api-key here' || apiKey.trim() === '') {
        apiKey = process.env.VSCODE_LLMPAIR_OPENAI_APIKEY;
        if (apiKey) {
          outputChannel?.appendLine('✓ Using API key from environment variable');
        }
      } else {
        outputChannel?.appendLine('✓ Using API key from settings.json');
      }
      
      const model = config.get<string>('llmPair.openai.model', 'gpt-4');
      const baseUrl = config.get<string>('llmPair.openai.baseUrl');
      
      outputChannel?.appendLine(`API Key inspection: ${JSON.stringify(config.inspect('llmPair.openai.apiKey'))}`);
      outputChannel?.appendLine(`Model inspection: ${JSON.stringify(config.inspect('llmPair.openai.model'))}`);
      outputChannel?.appendLine(`BaseUrl inspection: ${JSON.stringify(config.inspect('llmPair.openai.baseUrl'))}`);
      outputChannel?.appendLine(`Final config: apiKey=${apiKey ? '[SET]' : '[NOT SET]'}, model=${model}, baseUrl=${baseUrl || '[DEFAULT]'}`);

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