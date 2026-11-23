# AI Buddy – Intelligent Voice-Enabled VS Code Companion

AI Buddy is an animated, voice-enabled developer companion inside Visual Studio Code. Powered by the Google Gemini API and modern Web Audio technologies, AI Buddy brings a friendly, witty pair-programmer into your sidebar to converse in natural Tamil, English, and Tanglish.

---

## Key Features

- **Animated Human-like Companion**:
  - Expressive character with 9 distinct synchronized states: `idle`, `listening`, `thinking`, `speaking`, `laughing`, `happy`, `confused`, `surprised`, and `sad`.
  - Natural blinking, breathing animations, blushing cheeks, and reactive lip-sync mouth movements.
  - Dark-mode developer aesthetic with vibrant purple and electric blue neon accents.

- **Dual Switchable Voice Personalities**:
  - **Maya (Female)**: Cute, energetic, friendly, and playful.
  - **Vikram (Male)**: Witty, warm, energetic, and encouraging.
  - Switch anytime via the top pill toggle without reloading.

- **Natural Voice & Tanglish Dialogue**:
  - Speech-to-Text recognition supporting **Tanglish (`en-IN`)**, **Tamil (`ta-IN`)**, and **English (`en-US`)**.
  - Natural speech delivery using tuned speech synthesis.
  - Interrupt / barge-in support: tap Stop or speak to instantly pause the character.

- **Automatic Workspace Intelligence**:
  - Automatically identifies project type, active language, and testing frameworks (e.g., Playwright, Jest, Vitest, pytest).
  - Inspects active file and cursor context without scanning full disk or keystrokes.
  - Analyzes compiler diagnostics and errors to provide practical debugging hints.

- **Proactive AI Decision Engine**:
  - Intelligently initiates conversation upon significant coding events (e.g., test passes, resolved bugs, recurring errors, or extended coding sessions).
  - Dynamic cooldown timer (High: 2m, Normal: 4m, Quiet: 8m, Mute) to protect developer focus.
  - Contextual programmer humor and friendly teasing.

- **Workspace Privacy & Security**:
  - Sensitive files (`.env`, `id_rsa`, `*.pem`, `*.key`, `*secret*`, `*token*`) are strictly excluded.
  - Gemini API keys are encrypted and stored in VS Code's OS-level SecretStorage keychain.

---

## Setup & Configuration

### 1. Get a Free Gemini API Key
Obtain an API key from [Google AI Studio](https://aistudio.google.com/app/apikey).

### 2. Configure the API Key
You can configure your key in two ways:
- Click the **Settings (gear icon)** inside the AI Buddy sidebar and paste your key.
- Or press `Ctrl+Shift+P` (or `Cmd+Shift+P` on macOS) and run:
  ```
  AI Buddy: Set Gemini API Key
  ```

### 3. Extension Settings
Configure AI Buddy via VS Code Settings (`settings.json`):
- `aiBuddy.voiceGender`: `"female"` | `"male"` (Default: `"female"`)
- `aiBuddy.geminiModel`: `"gemini-1.5-flash"`
- `aiBuddy.quietMode`: `true` | `false` (Visual expressions and text only, no speech audio)
- `aiBuddy.conversationFrequency`: `"high"` | `"medium"` | `"low"` | `"off"` (Default: `"medium"`)
- `aiBuddy.proactiveHumor`: `true` | `false` (Default: `true`)
- `aiBuddy.monitoring.enabled`: `true` | `false` (Default: `true`)

---

## Building from Source

```bash
# Install dependencies
npm install

# Build Extension Host and React Webview
npm run build

# Type check
npm run compile

# Run automated tests
npm test

# Package VSIX
npm run package
```

---

## License

MIT License.
