# vscode-llm-pair

VS Code LLM Pair is a powerful Visual Studio Code extension that brings the collaborative power of pair programming directly into your editor, with the flexibility to choose from various Large Language Models as your partner. Seamlessly switch between AI models to find the perfect coding companion for your style and task.

## Features

- 🤖 **Multi-LLM Support**: Supports OpenAI (GPT-4, GPT-3.5, etc.) and Ollama (local models)
- 💬 **Sidebar Chat Interface**: Interactive chat panel in the VS Code sidebar
- 🔄 **Streaming Responses**: Real-time streaming of AI responses
- 📝 **Conversation History**: Maintains context across multiple messages
- 🔀 **Easy Provider Switching**: Quick-switch between LLM providers and models via context menu
- ⚙️ **Configurable**: Customize API endpoints, models, and API keys

## Getting Started

### Prerequisites

- Visual Studio Code v1.101.0 or higher
- Node.js 20.x or higher
- **For OpenAI**: An OpenAI API key
- **For Ollama** (optional): Ollama installed locally ([https://ollama.com](https://ollama.com))

### Installation

#### From Source

1. Clone the repository:
   ```bash
   git clone https://github.com/ychgh/vscode-llm-pair.git
   cd vscode-llm-pair
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Compile the extension:
   ```bash
   npm run compile
   ```

4. Open the project in VS Code and press `F5` to launch the extension in development mode.

### Configuration

Configure the extension by adding the following settings to your VS Code settings (File > Preferences > Settings or `Ctrl+,`):

#### OpenAI Configuration

```json
{
  "llmPair.provider": "openai",
  "llmPair.openai.apiKey": "your-openai-api-key-here",
  "llmPair.openai.model": "gpt-4",
  "llmPair.openai.baseUrl": "https://api.openai.com/v1"
}
```

#### Ollama Configuration

First, install Ollama from [https://ollama.com](https://ollama.com) and pull a model:

```bash
# Install Ollama (see https://ollama.com for instructions)

# Pull a model
ollama pull codellama:latest
# or
ollama pull llama2:latest
# or
ollama pull mistral:latest
```

Then configure the extension:

```json
{
  "llmPair.provider": "ollama",
  "llmPair.ollama.baseUrl": "http://localhost:11434",
  "llmPair.ollama.model": "codellama:latest"
}
```

#### Configuration Options

**General:**
- `llmPair.provider`: The LLM provider to use (`"openai"` or `"ollama"`)

**OpenAI:**
- `llmPair.openai.apiKey`: Your OpenAI API key (required for OpenAI)
- `llmPair.openai.model`: The OpenAI model to use (default: `"gpt-4"`)
- `llmPair.openai.baseUrl`: The OpenAI API base URL (optional)

**Ollama:**
- `llmPair.ollama.baseUrl`: Ollama server URL (default: `"http://localhost:11434"`)
- `llmPair.ollama.model`: The Ollama model to use (default: `"codellama:latest"`)

## Usage

### Opening the Chat Panel

1. Click on the robot icon (🤖) in the VS Code activity bar to open the LLM Pair sidebar
2. Alternatively, use the command palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) and run:
   ```
   LLM Pair: Open Chat
   ```

### Switching Providers and Models

The extension provides convenient commands to switch between providers and models:

1. **Select Provider**: Use the command palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) and run:
   ```
   LLM Pair: Select Provider
   ```
   This allows you to quickly switch between OpenAI and Ollama.

2. **Browse Models**: Use the command palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) and run:
   ```
   LLM Pair: Browse Models
   ```
   This shows available models for your current provider:
   - **For Ollama**: Lists all locally available models
   - **For OpenAI**: Lists common OpenAI models

These commands are also available via buttons in the chat panel's title bar.

### Using the Chat

1. Type your question or request in the input field at the bottom of the chat panel
2. Press `Enter` or click the "Send" button to send your message
3. The AI will respond in real-time with streaming text
4. Continue the conversation - the extension maintains context across messages
5. Click "Clear" to start a fresh conversation

### Example Use Cases

- **Code Explanation**: Ask the AI to explain complex code snippets
- **Debugging Help**: Get suggestions for fixing bugs or errors
- **Code Generation**: Request code snippets or implementations
- **Best Practices**: Ask about coding patterns and best practices
- **Refactoring**: Get suggestions for improving code structure

## Development

### Project Structure

```
vscode-llm-pair/
├── src/
│   ├── extension.ts          # Extension entry point
│   ├── chatView.ts            # Webview provider for chat UI
│   └── providers/
│       ├── types.ts           # LLM provider interface
│       ├── openai.ts          # OpenAI implementation
│       └── index.ts           # Provider exports
├── .vscode/                   # VS Code configurations
├── package.json               # Extension manifest
├── tsconfig.json              # TypeScript configuration
└── eslint.config.mjs          # ESLint configuration
```

### Building

```bash
# Compile TypeScript
npm run compile

# Watch mode for development
npm run watch

# Lint code
npm run lint
```

### Running Tests

```bash
npm run test
```

## Roadmap

Future enhancements planned for this extension:

- [x] Additional LLM providers (Ollama for local models)
- [x] Context menu for quick provider and model switching
- [ ] Additional cloud providers (Anthropic Claude, Google Gemini, etc.)
- [ ] Code insertion directly into the editor
- [ ] Multi-file context awareness
- [ ] Custom system prompts
- [ ] Conversation export/import
- [ ] Token usage tracking
- [ ] Temperature and other parameter controls

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Inspired by the [vs-assistant](https://github.com/JuanmaBM/vs-assistant) project
- Built with the VS Code Extension API
- Powered by OpenAI's GPT models
