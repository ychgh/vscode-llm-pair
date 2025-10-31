import * as vscode from 'vscode';
import { LLMProvider, ChatMessage } from './providers/index.js';

/**
 * Provider for the chat webview in the sidebar
 */
export class ChatViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'llm-pair-chat';

  private _view?: vscode.WebviewView;
  private _provider: LLMProvider | undefined;
  private _conversationHistory: ChatMessage[] = [];

  constructor(
    private readonly _extensionUri: vscode.Uri,
  ) {}

  public setProvider(provider: LLMProvider) {
    this._provider = provider;
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    // Handle messages from the webview
    webviewView.webview.onDidReceiveMessage(async (data) => {
      switch (data.type) {
        case 'sendMessage':
          await this._handleUserMessage(data.message);
          break;
        case 'clearChat':
          this._conversationHistory = [];
          break;
      }
    });
  }

  private async _handleUserMessage(message: string) {
    if (!this._provider) {
      vscode.window.showErrorMessage('No LLM provider configured');
      return;
    }

    if (!this._view) {
      return;
    }

    // Add user message to history
    this._conversationHistory.push({
      role: 'user',
      content: message,
    });

    // Send user message to webview
    this._view.webview.postMessage({
      type: 'userMessage',
      message: message,
    });

    // Start streaming response
    this._view.webview.postMessage({
      type: 'startAssistantMessage',
    });

    let fullResponse = '';

    try {
      await this._provider.streamChatCompletion(
        {
          messages: [
            {
              role: 'system',
              content: 'You are a helpful AI pair programming assistant. Help the user with their coding tasks, provide suggestions, explain code, and assist with debugging.',
            },
            ...this._conversationHistory,
          ],
        },
        (chunk: string) => {
          fullResponse += chunk;
          this._view?.webview.postMessage({
            type: 'assistantChunk',
            chunk: chunk,
          });
        }
      );

      // Add assistant message to history
      this._conversationHistory.push({
        role: 'assistant',
        content: fullResponse,
      });

      // Notify completion
      this._view.webview.postMessage({
        type: 'assistantComplete',
      });
    } catch (error) {
      this._view.webview.postMessage({
        type: 'error',
        message: error instanceof Error ? error.message : 'An error occurred',
      });
    }
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>LLM Pair Chat</title>
    <style>
        body {
            padding: 0;
            margin: 0;
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background-color: var(--vscode-sideBar-background);
        }
        .container {
            display: flex;
            flex-direction: column;
            height: 100vh;
        }
        .messages {
            flex: 1;
            overflow-y: auto;
            padding: 10px;
        }
        .message {
            margin-bottom: 15px;
            padding: 10px;
            border-radius: 5px;
        }
        .user-message {
            background-color: var(--vscode-inputValidation-infoBackground);
            margin-left: 20px;
        }
        .assistant-message {
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            margin-right: 20px;
        }
        .message-label {
            font-weight: bold;
            margin-bottom: 5px;
            font-size: 0.9em;
            opacity: 0.8;
        }
        .input-container {
            padding: 10px;
            border-top: 1px solid var(--vscode-panel-border);
            display: flex;
            gap: 5px;
        }
        #messageInput {
            flex: 1;
            padding: 8px;
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            border-radius: 3px;
            font-family: var(--vscode-font-family);
        }
        button {
            padding: 8px 15px;
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 3px;
            cursor: pointer;
        }
        button:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        .error-message {
            background-color: var(--vscode-inputValidation-errorBackground);
            color: var(--vscode-inputValidation-errorForeground);
            padding: 10px;
            margin: 10px;
            border-radius: 5px;
        }
        .thinking {
            font-style: italic;
            opacity: 0.7;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="messages" id="messages"></div>
        <div class="input-container">
            <input type="text" id="messageInput" placeholder="Ask me anything..." />
            <button id="sendButton">Send</button>
            <button id="clearButton">Clear</button>
        </div>
    </div>
    <script>
        const vscode = acquireVsCodeApi();
        const messagesDiv = document.getElementById('messages');
        const messageInput = document.getElementById('messageInput');
        const sendButton = document.getElementById('sendButton');
        const clearButton = document.getElementById('clearButton');

        let currentAssistantMessage = null;

        sendButton.addEventListener('click', sendMessage);
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });

        clearButton.addEventListener('click', () => {
            messagesDiv.innerHTML = '';
            vscode.postMessage({ type: 'clearChat' });
        });

        function sendMessage() {
            const message = messageInput.value.trim();
            if (!message) {
                return;
            }

            vscode.postMessage({
                type: 'sendMessage',
                message: message
            });

            messageInput.value = '';
            sendButton.disabled = true;
        }

        function addMessage(content, isUser) {
            const messageDiv = document.createElement('div');
            messageDiv.className = \`message \${isUser ? 'user-message' : 'assistant-message'}\`;
            
            const labelDiv = document.createElement('div');
            labelDiv.className = 'message-label';
            labelDiv.textContent = isUser ? 'You' : 'Assistant';
            
            const contentDiv = document.createElement('div');
            contentDiv.textContent = content;
            
            messageDiv.appendChild(labelDiv);
            messageDiv.appendChild(contentDiv);
            messagesDiv.appendChild(messageDiv);
            messagesDiv.scrollTop = messagesDiv.scrollHeight;

            return contentDiv;
        }

        function showError(message) {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'error-message';
            errorDiv.textContent = 'Error: ' + message;
            messagesDiv.appendChild(errorDiv);
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }

        window.addEventListener('message', event => {
            const message = event.data;

            switch (message.type) {
                case 'userMessage':
                    addMessage(message.message, true);
                    break;
                
                case 'startAssistantMessage':
                    currentAssistantMessage = addMessage('', false);
                    break;
                
                case 'assistantChunk':
                    if (currentAssistantMessage) {
                        currentAssistantMessage.textContent += message.chunk;
                        messagesDiv.scrollTop = messagesDiv.scrollHeight;
                    }
                    break;
                
                case 'assistantComplete':
                    currentAssistantMessage = null;
                    sendButton.disabled = false;
                    messageInput.focus();
                    break;
                
                case 'error':
                    showError(message.message);
                    currentAssistantMessage = null;
                    sendButton.disabled = false;
                    break;
            }
        });

        // Focus input on load
        messageInput.focus();
    </script>
</body>
</html>`;
  }
}
