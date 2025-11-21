import * as vscode from 'vscode';
import { ChatViewProvider } from './chatView.js';
import { OpenAIProvider, OllamaProvider } from './providers/index.js';

/**
 * Shared output channel for the extension
 */
let outputChannel: vscode.OutputChannel | undefined;

/**
 * Extension activation function
 */
export async function activate(context: vscode.ExtensionContext) {
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
  await initializeLLMProvider(chatViewProvider);

  // Watch for configuration changes
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('llmPair')) {
        outputChannel?.appendLine('Configuration changed, reinitializing LLM provider');
        void initializeLLMProvider(chatViewProvider);
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

  // Register the select provider command
  const selectProviderCommand = vscode.commands.registerCommand(
    'vscode-llm-pair.selectProvider',
    async () => {
      await selectProvider(chatViewProvider);
    }
  );

  // Register the browse models command
  const browseModelsCommand = vscode.commands.registerCommand(
    'vscode-llm-pair.browseModels',
    async () => {
      await browseModels(chatViewProvider);
    }
  );

  context.subscriptions.push(openChatCommand, selectProviderCommand, browseModelsCommand);
}

/**
 * Initialize the LLM provider based on configuration
 */
async function initializeLLMProvider(chatViewProvider: ChatViewProvider) {
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
    } else if (provider === 'ollama') {
      const baseUrl = config.get<string>('llmPair.ollama.baseUrl', 'http://localhost:11434');
      const model = config.get<string>('llmPair.ollama.model', 'codellama:latest');

      outputChannel?.appendLine(`Ollama config: baseUrl=${baseUrl}, model=${model}`);

      const ollamaProvider = new OllamaProvider({
        baseUrl,
        model,
      });

      // Test connection to Ollama
      try {
        await ollamaProvider.listModels();
        chatViewProvider.setProvider(ollamaProvider);
        outputChannel?.appendLine(`LLM Provider initialized: Ollama (${model})`);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        vscode.window.showErrorMessage(
          `Failed to connect to Ollama: ${message}. Please ensure Ollama is running at ${baseUrl}`
        );
        outputChannel?.appendLine(`Failed to connect to Ollama: ${message}`);
      }
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
 * Select LLM provider via quick pick
 */
async function selectProvider(chatViewProvider: ChatViewProvider) {
  const config = vscode.workspace.getConfiguration();
  const currentProvider = config.get<string>('llmPair.provider', 'openai');

  const providers = [
    {
      label: 'OpenAI',
      value: 'openai',
      description: currentProvider === 'openai' ? '$(check) Currently selected' : '',
    },
    {
      label: 'Ollama',
      value: 'ollama',
      description: currentProvider === 'ollama' ? '$(check) Currently selected' : 'Local models',
    },
  ];

  const selected = await vscode.window.showQuickPick(providers, {
    placeHolder: 'Select LLM Provider',
    title: 'LLM Provider Selection',
  });

  if (selected && selected.value !== currentProvider) {
    await config.update('llmPair.provider', selected.value, vscode.ConfigurationTarget.Global);
    vscode.window.showInformationMessage(`Provider switched to ${selected.label}`);
  }
}

/**
 * Browse and select models for the current provider
 */
async function browseModels() {
  const config = vscode.workspace.getConfiguration();
  const provider = config.get<string>('llmPair.provider', 'openai');

  if (provider === 'ollama') {
    await browseOllamaModels();
  } else if (provider === 'openai') {
    await browseOpenAIModels();
  } else {
    vscode.window.showWarningMessage(`Model browsing not supported for provider: ${provider}`);
  }
}

/**
 * Browse and select Ollama models
 */
async function browseOllamaModels() {
  const config = vscode.workspace.getConfiguration();
  const baseUrl = config.get<string>('llmPair.ollama.baseUrl', 'http://localhost:11434');
  const currentModel = config.get<string>('llmPair.ollama.model', 'codellama:latest');

  try {
    const ollamaProvider = new OllamaProvider({ baseUrl, model: currentModel });
    const models = await ollamaProvider.listModels();

    if (models.length === 0) {
      vscode.window.showWarningMessage(
        'No models found in Ollama. Please pull a model first using: ollama pull <model>'
      );
      return;
    }

    const modelItems = models.map(model => ({
      label: model,
      description: model === currentModel ? '$(check) Currently selected' : '',
    }));

    const selected = await vscode.window.showQuickPick(modelItems, {
      placeHolder: 'Select Ollama Model',
      title: 'Ollama Model Selection',
    });

    if (selected && selected.label !== currentModel) {
      await config.update('llmPair.ollama.model', selected.label, vscode.ConfigurationTarget.Global);
      vscode.window.showInformationMessage(`Model switched to ${selected.label}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    vscode.window.showErrorMessage(`Failed to fetch Ollama models: ${message}`);
  }
}

/**
 * Browse and select OpenAI models
 */
async function browseOpenAIModels() {
  const config = vscode.workspace.getConfiguration();
  const currentModel = config.get<string>('llmPair.openai.model', 'gpt-4');

  const models = [
    { label: 'gpt-4', description: 'Most capable model' },
    { label: 'gpt-4-turbo', description: 'Faster GPT-4' },
    { label: 'gpt-3.5-turbo', description: 'Fast and cost-effective' },
    { label: 'gpt-4o', description: 'GPT-4 Omni' },
    { label: 'gpt-4o-mini', description: 'Compact GPT-4 Omni' },
  ];

  const modelItems = models.map(model => ({
    ...model,
    description: model.label === currentModel 
      ? `$(check) Currently selected - ${model.description}`
      : model.description,
  }));

  const selected = await vscode.window.showQuickPick(modelItems, {
    placeHolder: 'Select OpenAI Model',
    title: 'OpenAI Model Selection',
  });

  if (selected && selected.label !== currentModel) {
    await config.update('llmPair.openai.model', selected.label, vscode.ConfigurationTarget.Global);
    vscode.window.showInformationMessage(`Model switched to ${selected.label}`);
  }
}

/**
 * Extension deactivation function
 */
export function deactivate() {
  outputChannel?.appendLine('LLM Pair extension is now deactivated');
}