"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/extension/extension.ts
var extension_exports = {};
__export(extension_exports, {
  activate: () => activate,
  deactivate: () => deactivate
});
module.exports = __toCommonJS(extension_exports);
var vscode6 = __toESM(require("vscode"));

// src/extension/providers/characterViewProvider.ts
var vscode = __toESM(require("vscode"));
var CharacterViewProvider = class {
  constructor(_extensionUri, _secretStorage, _geminiService, _contextEngine, _personalityEngine, _proactiveEngine) {
    this._extensionUri = _extensionUri;
    this._secretStorage = _secretStorage;
    this._geminiService = _geminiService;
    this._contextEngine = _contextEngine;
    this._personalityEngine = _personalityEngine;
    this._proactiveEngine = _proactiveEngine;
  }
  static viewType = "aiBuddy.characterView";
  _view;
  resolveWebviewView(webviewView, _context, _token) {
    this._view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri]
    };
    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
    webviewView.webview.onDidReceiveMessage(async (data) => {
      await this._handleWebviewMessage(data);
    });
  }
  async _handleWebviewMessage(message) {
    if (!this._view) return;
    const config = vscode.workspace.getConfiguration("aiBuddy");
    const voiceGender = config.get("voiceGender", "female");
    const modelName = config.get("geminiModel", "gemini-3.5-flash");
    const proactiveFrequency = config.get("conversationFrequency", "medium");
    switch (message.type) {
      case "ready": {
        const quietMode = config.get("quietMode", false);
        const hasApiKey = await this._secretStorage.hasApiKey();
        const contextSummary = this._contextEngine.getCurrentSummary() || void 0;
        this.postMessage({
          type: "init",
          voiceGender,
          hasApiKey,
          quietMode,
          modelName,
          proactiveFrequency,
          contextSummary
        });
        break;
      }
      case "sendMessage": {
        this._proactiveEngine.recordUserActivity();
        this.postMessage({ type: "thinking" });
        const summary = this._contextEngine.getCurrentSummary() || void 0;
        const reply = await this._geminiService.generateReply(
          message.text,
          voiceGender,
          modelName,
          summary
        );
        this.postMessage({
          type: "characterReply",
          text: reply.text,
          emotion: reply.emotion,
          voiceGender,
          audioData: reply.audioData
        });
        break;
      }
      case "tellJoke": {
        this._proactiveEngine.recordUserActivity();
        const joke = this._personalityEngine.getRandomJoke();
        this.postMessage({
          type: "characterReply",
          text: joke.text,
          emotion: joke.emotion,
          voiceGender
        });
        break;
      }
      case "setFrequency": {
        await config.update("conversationFrequency", message.frequency, vscode.ConfigurationTarget.Global);
        this.postMessage({ type: "frequencyChanged", frequency: message.frequency });
        vscode.window.showInformationMessage(`AI Buddy: Proactive conversation frequency set to ${message.frequency}`);
        break;
      }
      case "explainError": {
        this._proactiveEngine.recordUserActivity();
        this.postMessage({ type: "thinking" });
        let summary = this._contextEngine.getCurrentSummary();
        if (!summary) {
          summary = await this._contextEngine.analyzeWorkspace();
        }
        const reply = await this._geminiService.explainCurrentError(summary, voiceGender, modelName);
        this.postMessage({
          type: "characterReply",
          text: reply.text,
          emotion: reply.emotion,
          voiceGender,
          audioData: reply.audioData
        });
        break;
      }
      case "analyzeWorkspace": {
        this._proactiveEngine.recordUserActivity();
        this.postMessage({ type: "thinking" });
        let summary = this._contextEngine.getCurrentSummary();
        if (!summary) {
          summary = await this._contextEngine.analyzeWorkspace();
        }
        const reply = await this._geminiService.analyzeCurrentProject(summary, voiceGender, modelName);
        this.postMessage({
          type: "characterReply",
          text: reply.text,
          emotion: reply.emotion,
          voiceGender,
          audioData: reply.audioData
        });
        break;
      }
      case "setVoice": {
        await config.update("voiceGender", message.gender, vscode.ConfigurationTarget.Global);
        this.postMessage({ type: "voiceChanged", gender: message.gender });
        break;
      }
      case "setApiKey": {
        await this._secretStorage.setApiKey(message.key);
        const hasKey = await this._secretStorage.hasApiKey();
        this.postMessage({ type: "apiKeyStatus", hasKey });
        vscode.window.showInformationMessage("AI Buddy: Gemini API key stored securely in SecretStorage!");
        break;
      }
      case "checkApiKey": {
        const hasKey = await this._secretStorage.hasApiKey();
        this.postMessage({ type: "apiKeyStatus", hasKey });
        break;
      }
      case "clearHistory": {
        this._geminiService.clearHistory();
        vscode.window.showInformationMessage("AI Buddy: Conversation history cleared.");
        break;
      }
    }
  }
  postMessage(message) {
    if (this._view) {
      this._view.webview.postMessage(message);
    }
  }
  sendContextUpdate(summary) {
    this.postMessage({
      type: "contextUpdated",
      summary
    });
  }
  sendProactiveSpeech(text, emotion, voiceGender, category) {
    this.postMessage({
      type: "proactiveSpeech",
      text,
      emotion,
      voiceGender,
      category
    });
  }
  sendWorkspaceAlert(text, emotion) {
    const config = vscode.workspace.getConfiguration("aiBuddy");
    const voiceGender = config.get("voiceGender", "female");
    this.postMessage({
      type: "workspaceAlert",
      text,
      emotion,
      voiceGender
    });
  }
  _getHtmlForWebview(webview) {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "dist", "webview.js")
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "dist", "webview.css")
    );
    const nonce = getNonce();
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}' ${webview.cspSource}; img-src ${webview.cspSource} https: data:; media-src ${webview.cspSource} https: blob:; connect-src ${webview.cspSource} https:;">
  <link rel="stylesheet" href="${styleUri}">
  <title>AI Buddy</title>
</head>
<body style="margin: 0; padding: 0; background-color: var(--vscode-sideBar-background, #12101F); overflow: hidden;">
  <div id="root"></div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }
};
function getNonce() {
  let text = "";
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

// node_modules/@google/generative-ai/dist/index.mjs
var SchemaType;
(function(SchemaType2) {
  SchemaType2["STRING"] = "string";
  SchemaType2["NUMBER"] = "number";
  SchemaType2["INTEGER"] = "integer";
  SchemaType2["BOOLEAN"] = "boolean";
  SchemaType2["ARRAY"] = "array";
  SchemaType2["OBJECT"] = "object";
})(SchemaType || (SchemaType = {}));
var ExecutableCodeLanguage;
(function(ExecutableCodeLanguage2) {
  ExecutableCodeLanguage2["LANGUAGE_UNSPECIFIED"] = "language_unspecified";
  ExecutableCodeLanguage2["PYTHON"] = "python";
})(ExecutableCodeLanguage || (ExecutableCodeLanguage = {}));
var Outcome;
(function(Outcome2) {
  Outcome2["OUTCOME_UNSPECIFIED"] = "outcome_unspecified";
  Outcome2["OUTCOME_OK"] = "outcome_ok";
  Outcome2["OUTCOME_FAILED"] = "outcome_failed";
  Outcome2["OUTCOME_DEADLINE_EXCEEDED"] = "outcome_deadline_exceeded";
})(Outcome || (Outcome = {}));
var POSSIBLE_ROLES = ["user", "model", "function", "system"];
var HarmCategory;
(function(HarmCategory2) {
  HarmCategory2["HARM_CATEGORY_UNSPECIFIED"] = "HARM_CATEGORY_UNSPECIFIED";
  HarmCategory2["HARM_CATEGORY_HATE_SPEECH"] = "HARM_CATEGORY_HATE_SPEECH";
  HarmCategory2["HARM_CATEGORY_SEXUALLY_EXPLICIT"] = "HARM_CATEGORY_SEXUALLY_EXPLICIT";
  HarmCategory2["HARM_CATEGORY_HARASSMENT"] = "HARM_CATEGORY_HARASSMENT";
  HarmCategory2["HARM_CATEGORY_DANGEROUS_CONTENT"] = "HARM_CATEGORY_DANGEROUS_CONTENT";
  HarmCategory2["HARM_CATEGORY_CIVIC_INTEGRITY"] = "HARM_CATEGORY_CIVIC_INTEGRITY";
})(HarmCategory || (HarmCategory = {}));
var HarmBlockThreshold;
(function(HarmBlockThreshold2) {
  HarmBlockThreshold2["HARM_BLOCK_THRESHOLD_UNSPECIFIED"] = "HARM_BLOCK_THRESHOLD_UNSPECIFIED";
  HarmBlockThreshold2["BLOCK_LOW_AND_ABOVE"] = "BLOCK_LOW_AND_ABOVE";
  HarmBlockThreshold2["BLOCK_MEDIUM_AND_ABOVE"] = "BLOCK_MEDIUM_AND_ABOVE";
  HarmBlockThreshold2["BLOCK_ONLY_HIGH"] = "BLOCK_ONLY_HIGH";
  HarmBlockThreshold2["BLOCK_NONE"] = "BLOCK_NONE";
})(HarmBlockThreshold || (HarmBlockThreshold = {}));
var HarmProbability;
(function(HarmProbability2) {
  HarmProbability2["HARM_PROBABILITY_UNSPECIFIED"] = "HARM_PROBABILITY_UNSPECIFIED";
  HarmProbability2["NEGLIGIBLE"] = "NEGLIGIBLE";
  HarmProbability2["LOW"] = "LOW";
  HarmProbability2["MEDIUM"] = "MEDIUM";
  HarmProbability2["HIGH"] = "HIGH";
})(HarmProbability || (HarmProbability = {}));
var BlockReason;
(function(BlockReason2) {
  BlockReason2["BLOCKED_REASON_UNSPECIFIED"] = "BLOCKED_REASON_UNSPECIFIED";
  BlockReason2["SAFETY"] = "SAFETY";
  BlockReason2["OTHER"] = "OTHER";
})(BlockReason || (BlockReason = {}));
var FinishReason;
(function(FinishReason2) {
  FinishReason2["FINISH_REASON_UNSPECIFIED"] = "FINISH_REASON_UNSPECIFIED";
  FinishReason2["STOP"] = "STOP";
  FinishReason2["MAX_TOKENS"] = "MAX_TOKENS";
  FinishReason2["SAFETY"] = "SAFETY";
  FinishReason2["RECITATION"] = "RECITATION";
  FinishReason2["LANGUAGE"] = "LANGUAGE";
  FinishReason2["BLOCKLIST"] = "BLOCKLIST";
  FinishReason2["PROHIBITED_CONTENT"] = "PROHIBITED_CONTENT";
  FinishReason2["SPII"] = "SPII";
  FinishReason2["MALFORMED_FUNCTION_CALL"] = "MALFORMED_FUNCTION_CALL";
  FinishReason2["OTHER"] = "OTHER";
})(FinishReason || (FinishReason = {}));
var TaskType;
(function(TaskType2) {
  TaskType2["TASK_TYPE_UNSPECIFIED"] = "TASK_TYPE_UNSPECIFIED";
  TaskType2["RETRIEVAL_QUERY"] = "RETRIEVAL_QUERY";
  TaskType2["RETRIEVAL_DOCUMENT"] = "RETRIEVAL_DOCUMENT";
  TaskType2["SEMANTIC_SIMILARITY"] = "SEMANTIC_SIMILARITY";
  TaskType2["CLASSIFICATION"] = "CLASSIFICATION";
  TaskType2["CLUSTERING"] = "CLUSTERING";
})(TaskType || (TaskType = {}));
var FunctionCallingMode;
(function(FunctionCallingMode2) {
  FunctionCallingMode2["MODE_UNSPECIFIED"] = "MODE_UNSPECIFIED";
  FunctionCallingMode2["AUTO"] = "AUTO";
  FunctionCallingMode2["ANY"] = "ANY";
  FunctionCallingMode2["NONE"] = "NONE";
})(FunctionCallingMode || (FunctionCallingMode = {}));
var DynamicRetrievalMode;
(function(DynamicRetrievalMode2) {
  DynamicRetrievalMode2["MODE_UNSPECIFIED"] = "MODE_UNSPECIFIED";
  DynamicRetrievalMode2["MODE_DYNAMIC"] = "MODE_DYNAMIC";
})(DynamicRetrievalMode || (DynamicRetrievalMode = {}));
var GoogleGenerativeAIError = class extends Error {
  constructor(message) {
    super(`[GoogleGenerativeAI Error]: ${message}`);
  }
};
var GoogleGenerativeAIResponseError = class extends GoogleGenerativeAIError {
  constructor(message, response) {
    super(message);
    this.response = response;
  }
};
var GoogleGenerativeAIFetchError = class extends GoogleGenerativeAIError {
  constructor(message, status, statusText, errorDetails) {
    super(message);
    this.status = status;
    this.statusText = statusText;
    this.errorDetails = errorDetails;
  }
};
var GoogleGenerativeAIRequestInputError = class extends GoogleGenerativeAIError {
};
var GoogleGenerativeAIAbortError = class extends GoogleGenerativeAIError {
};
var DEFAULT_BASE_URL = "https://generativelanguage.googleapis.com";
var DEFAULT_API_VERSION = "v1beta";
var PACKAGE_VERSION = "0.24.1";
var PACKAGE_LOG_HEADER = "genai-js";
var Task;
(function(Task2) {
  Task2["GENERATE_CONTENT"] = "generateContent";
  Task2["STREAM_GENERATE_CONTENT"] = "streamGenerateContent";
  Task2["COUNT_TOKENS"] = "countTokens";
  Task2["EMBED_CONTENT"] = "embedContent";
  Task2["BATCH_EMBED_CONTENTS"] = "batchEmbedContents";
})(Task || (Task = {}));
var RequestUrl = class {
  constructor(model, task, apiKey, stream, requestOptions) {
    this.model = model;
    this.task = task;
    this.apiKey = apiKey;
    this.stream = stream;
    this.requestOptions = requestOptions;
  }
  toString() {
    var _a, _b;
    const apiVersion = ((_a = this.requestOptions) === null || _a === void 0 ? void 0 : _a.apiVersion) || DEFAULT_API_VERSION;
    const baseUrl = ((_b = this.requestOptions) === null || _b === void 0 ? void 0 : _b.baseUrl) || DEFAULT_BASE_URL;
    let url = `${baseUrl}/${apiVersion}/${this.model}:${this.task}`;
    if (this.stream) {
      url += "?alt=sse";
    }
    return url;
  }
};
function getClientHeaders(requestOptions) {
  const clientHeaders = [];
  if (requestOptions === null || requestOptions === void 0 ? void 0 : requestOptions.apiClient) {
    clientHeaders.push(requestOptions.apiClient);
  }
  clientHeaders.push(`${PACKAGE_LOG_HEADER}/${PACKAGE_VERSION}`);
  return clientHeaders.join(" ");
}
async function getHeaders(url) {
  var _a;
  const headers = new Headers();
  headers.append("Content-Type", "application/json");
  headers.append("x-goog-api-client", getClientHeaders(url.requestOptions));
  headers.append("x-goog-api-key", url.apiKey);
  let customHeaders = (_a = url.requestOptions) === null || _a === void 0 ? void 0 : _a.customHeaders;
  if (customHeaders) {
    if (!(customHeaders instanceof Headers)) {
      try {
        customHeaders = new Headers(customHeaders);
      } catch (e) {
        throw new GoogleGenerativeAIRequestInputError(`unable to convert customHeaders value ${JSON.stringify(customHeaders)} to Headers: ${e.message}`);
      }
    }
    for (const [headerName, headerValue] of customHeaders.entries()) {
      if (headerName === "x-goog-api-key") {
        throw new GoogleGenerativeAIRequestInputError(`Cannot set reserved header name ${headerName}`);
      } else if (headerName === "x-goog-api-client") {
        throw new GoogleGenerativeAIRequestInputError(`Header name ${headerName} can only be set using the apiClient field`);
      }
      headers.append(headerName, headerValue);
    }
  }
  return headers;
}
async function constructModelRequest(model, task, apiKey, stream, body, requestOptions) {
  const url = new RequestUrl(model, task, apiKey, stream, requestOptions);
  return {
    url: url.toString(),
    fetchOptions: Object.assign(Object.assign({}, buildFetchOptions(requestOptions)), { method: "POST", headers: await getHeaders(url), body })
  };
}
async function makeModelRequest(model, task, apiKey, stream, body, requestOptions = {}, fetchFn = fetch) {
  const { url, fetchOptions } = await constructModelRequest(model, task, apiKey, stream, body, requestOptions);
  return makeRequest(url, fetchOptions, fetchFn);
}
async function makeRequest(url, fetchOptions, fetchFn = fetch) {
  let response;
  try {
    response = await fetchFn(url, fetchOptions);
  } catch (e) {
    handleResponseError(e, url);
  }
  if (!response.ok) {
    await handleResponseNotOk(response, url);
  }
  return response;
}
function handleResponseError(e, url) {
  let err = e;
  if (err.name === "AbortError") {
    err = new GoogleGenerativeAIAbortError(`Request aborted when fetching ${url.toString()}: ${e.message}`);
    err.stack = e.stack;
  } else if (!(e instanceof GoogleGenerativeAIFetchError || e instanceof GoogleGenerativeAIRequestInputError)) {
    err = new GoogleGenerativeAIError(`Error fetching from ${url.toString()}: ${e.message}`);
    err.stack = e.stack;
  }
  throw err;
}
async function handleResponseNotOk(response, url) {
  let message = "";
  let errorDetails;
  try {
    const json = await response.json();
    message = json.error.message;
    if (json.error.details) {
      message += ` ${JSON.stringify(json.error.details)}`;
      errorDetails = json.error.details;
    }
  } catch (e) {
  }
  throw new GoogleGenerativeAIFetchError(`Error fetching from ${url.toString()}: [${response.status} ${response.statusText}] ${message}`, response.status, response.statusText, errorDetails);
}
function buildFetchOptions(requestOptions) {
  const fetchOptions = {};
  if ((requestOptions === null || requestOptions === void 0 ? void 0 : requestOptions.signal) !== void 0 || (requestOptions === null || requestOptions === void 0 ? void 0 : requestOptions.timeout) >= 0) {
    const controller = new AbortController();
    if ((requestOptions === null || requestOptions === void 0 ? void 0 : requestOptions.timeout) >= 0) {
      setTimeout(() => controller.abort(), requestOptions.timeout);
    }
    if (requestOptions === null || requestOptions === void 0 ? void 0 : requestOptions.signal) {
      requestOptions.signal.addEventListener("abort", () => {
        controller.abort();
      });
    }
    fetchOptions.signal = controller.signal;
  }
  return fetchOptions;
}
function addHelpers(response) {
  response.text = () => {
    if (response.candidates && response.candidates.length > 0) {
      if (response.candidates.length > 1) {
        console.warn(`This response had ${response.candidates.length} candidates. Returning text from the first candidate only. Access response.candidates directly to use the other candidates.`);
      }
      if (hadBadFinishReason(response.candidates[0])) {
        throw new GoogleGenerativeAIResponseError(`${formatBlockErrorMessage(response)}`, response);
      }
      return getText(response);
    } else if (response.promptFeedback) {
      throw new GoogleGenerativeAIResponseError(`Text not available. ${formatBlockErrorMessage(response)}`, response);
    }
    return "";
  };
  response.functionCall = () => {
    if (response.candidates && response.candidates.length > 0) {
      if (response.candidates.length > 1) {
        console.warn(`This response had ${response.candidates.length} candidates. Returning function calls from the first candidate only. Access response.candidates directly to use the other candidates.`);
      }
      if (hadBadFinishReason(response.candidates[0])) {
        throw new GoogleGenerativeAIResponseError(`${formatBlockErrorMessage(response)}`, response);
      }
      console.warn(`response.functionCall() is deprecated. Use response.functionCalls() instead.`);
      return getFunctionCalls(response)[0];
    } else if (response.promptFeedback) {
      throw new GoogleGenerativeAIResponseError(`Function call not available. ${formatBlockErrorMessage(response)}`, response);
    }
    return void 0;
  };
  response.functionCalls = () => {
    if (response.candidates && response.candidates.length > 0) {
      if (response.candidates.length > 1) {
        console.warn(`This response had ${response.candidates.length} candidates. Returning function calls from the first candidate only. Access response.candidates directly to use the other candidates.`);
      }
      if (hadBadFinishReason(response.candidates[0])) {
        throw new GoogleGenerativeAIResponseError(`${formatBlockErrorMessage(response)}`, response);
      }
      return getFunctionCalls(response);
    } else if (response.promptFeedback) {
      throw new GoogleGenerativeAIResponseError(`Function call not available. ${formatBlockErrorMessage(response)}`, response);
    }
    return void 0;
  };
  return response;
}
function getText(response) {
  var _a, _b, _c, _d;
  const textStrings = [];
  if ((_b = (_a = response.candidates) === null || _a === void 0 ? void 0 : _a[0].content) === null || _b === void 0 ? void 0 : _b.parts) {
    for (const part of (_d = (_c = response.candidates) === null || _c === void 0 ? void 0 : _c[0].content) === null || _d === void 0 ? void 0 : _d.parts) {
      if (part.text) {
        textStrings.push(part.text);
      }
      if (part.executableCode) {
        textStrings.push("\n```" + part.executableCode.language + "\n" + part.executableCode.code + "\n```\n");
      }
      if (part.codeExecutionResult) {
        textStrings.push("\n```\n" + part.codeExecutionResult.output + "\n```\n");
      }
    }
  }
  if (textStrings.length > 0) {
    return textStrings.join("");
  } else {
    return "";
  }
}
function getFunctionCalls(response) {
  var _a, _b, _c, _d;
  const functionCalls = [];
  if ((_b = (_a = response.candidates) === null || _a === void 0 ? void 0 : _a[0].content) === null || _b === void 0 ? void 0 : _b.parts) {
    for (const part of (_d = (_c = response.candidates) === null || _c === void 0 ? void 0 : _c[0].content) === null || _d === void 0 ? void 0 : _d.parts) {
      if (part.functionCall) {
        functionCalls.push(part.functionCall);
      }
    }
  }
  if (functionCalls.length > 0) {
    return functionCalls;
  } else {
    return void 0;
  }
}
var badFinishReasons = [
  FinishReason.RECITATION,
  FinishReason.SAFETY,
  FinishReason.LANGUAGE
];
function hadBadFinishReason(candidate) {
  return !!candidate.finishReason && badFinishReasons.includes(candidate.finishReason);
}
function formatBlockErrorMessage(response) {
  var _a, _b, _c;
  let message = "";
  if ((!response.candidates || response.candidates.length === 0) && response.promptFeedback) {
    message += "Response was blocked";
    if ((_a = response.promptFeedback) === null || _a === void 0 ? void 0 : _a.blockReason) {
      message += ` due to ${response.promptFeedback.blockReason}`;
    }
    if ((_b = response.promptFeedback) === null || _b === void 0 ? void 0 : _b.blockReasonMessage) {
      message += `: ${response.promptFeedback.blockReasonMessage}`;
    }
  } else if ((_c = response.candidates) === null || _c === void 0 ? void 0 : _c[0]) {
    const firstCandidate = response.candidates[0];
    if (hadBadFinishReason(firstCandidate)) {
      message += `Candidate was blocked due to ${firstCandidate.finishReason}`;
      if (firstCandidate.finishMessage) {
        message += `: ${firstCandidate.finishMessage}`;
      }
    }
  }
  return message;
}
function __await(v) {
  return this instanceof __await ? (this.v = v, this) : new __await(v);
}
function __asyncGenerator(thisArg, _arguments, generator) {
  if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
  var g = generator.apply(thisArg, _arguments || []), i, q = [];
  return i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function() {
    return this;
  }, i;
  function verb(n) {
    if (g[n]) i[n] = function(v) {
      return new Promise(function(a, b) {
        q.push([n, v, a, b]) > 1 || resume(n, v);
      });
    };
  }
  function resume(n, v) {
    try {
      step(g[n](v));
    } catch (e) {
      settle(q[0][3], e);
    }
  }
  function step(r) {
    r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r);
  }
  function fulfill(value) {
    resume("next", value);
  }
  function reject(value) {
    resume("throw", value);
  }
  function settle(f, v) {
    if (f(v), q.shift(), q.length) resume(q[0][0], q[0][1]);
  }
}
var responseLineRE = /^data\: (.*)(?:\n\n|\r\r|\r\n\r\n)/;
function processStream(response) {
  const inputStream = response.body.pipeThrough(new TextDecoderStream("utf8", { fatal: true }));
  const responseStream = getResponseStream(inputStream);
  const [stream1, stream2] = responseStream.tee();
  return {
    stream: generateResponseSequence(stream1),
    response: getResponsePromise(stream2)
  };
}
async function getResponsePromise(stream) {
  const allResponses = [];
  const reader = stream.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      return addHelpers(aggregateResponses(allResponses));
    }
    allResponses.push(value);
  }
}
function generateResponseSequence(stream) {
  return __asyncGenerator(this, arguments, function* generateResponseSequence_1() {
    const reader = stream.getReader();
    while (true) {
      const { value, done } = yield __await(reader.read());
      if (done) {
        break;
      }
      yield yield __await(addHelpers(value));
    }
  });
}
function getResponseStream(inputStream) {
  const reader = inputStream.getReader();
  const stream = new ReadableStream({
    start(controller) {
      let currentText = "";
      return pump();
      function pump() {
        return reader.read().then(({ value, done }) => {
          if (done) {
            if (currentText.trim()) {
              controller.error(new GoogleGenerativeAIError("Failed to parse stream"));
              return;
            }
            controller.close();
            return;
          }
          currentText += value;
          let match = currentText.match(responseLineRE);
          let parsedResponse;
          while (match) {
            try {
              parsedResponse = JSON.parse(match[1]);
            } catch (e) {
              controller.error(new GoogleGenerativeAIError(`Error parsing JSON response: "${match[1]}"`));
              return;
            }
            controller.enqueue(parsedResponse);
            currentText = currentText.substring(match[0].length);
            match = currentText.match(responseLineRE);
          }
          return pump();
        }).catch((e) => {
          let err = e;
          err.stack = e.stack;
          if (err.name === "AbortError") {
            err = new GoogleGenerativeAIAbortError("Request aborted when reading from the stream");
          } else {
            err = new GoogleGenerativeAIError("Error reading from the stream");
          }
          throw err;
        });
      }
    }
  });
  return stream;
}
function aggregateResponses(responses) {
  const lastResponse = responses[responses.length - 1];
  const aggregatedResponse = {
    promptFeedback: lastResponse === null || lastResponse === void 0 ? void 0 : lastResponse.promptFeedback
  };
  for (const response of responses) {
    if (response.candidates) {
      let candidateIndex = 0;
      for (const candidate of response.candidates) {
        if (!aggregatedResponse.candidates) {
          aggregatedResponse.candidates = [];
        }
        if (!aggregatedResponse.candidates[candidateIndex]) {
          aggregatedResponse.candidates[candidateIndex] = {
            index: candidateIndex
          };
        }
        aggregatedResponse.candidates[candidateIndex].citationMetadata = candidate.citationMetadata;
        aggregatedResponse.candidates[candidateIndex].groundingMetadata = candidate.groundingMetadata;
        aggregatedResponse.candidates[candidateIndex].finishReason = candidate.finishReason;
        aggregatedResponse.candidates[candidateIndex].finishMessage = candidate.finishMessage;
        aggregatedResponse.candidates[candidateIndex].safetyRatings = candidate.safetyRatings;
        if (candidate.content && candidate.content.parts) {
          if (!aggregatedResponse.candidates[candidateIndex].content) {
            aggregatedResponse.candidates[candidateIndex].content = {
              role: candidate.content.role || "user",
              parts: []
            };
          }
          const newPart = {};
          for (const part of candidate.content.parts) {
            if (part.text) {
              newPart.text = part.text;
            }
            if (part.functionCall) {
              newPart.functionCall = part.functionCall;
            }
            if (part.executableCode) {
              newPart.executableCode = part.executableCode;
            }
            if (part.codeExecutionResult) {
              newPart.codeExecutionResult = part.codeExecutionResult;
            }
            if (Object.keys(newPart).length === 0) {
              newPart.text = "";
            }
            aggregatedResponse.candidates[candidateIndex].content.parts.push(newPart);
          }
        }
      }
      candidateIndex++;
    }
    if (response.usageMetadata) {
      aggregatedResponse.usageMetadata = response.usageMetadata;
    }
  }
  return aggregatedResponse;
}
async function generateContentStream(apiKey, model, params, requestOptions) {
  const response = await makeModelRequest(
    model,
    Task.STREAM_GENERATE_CONTENT,
    apiKey,
    /* stream */
    true,
    JSON.stringify(params),
    requestOptions
  );
  return processStream(response);
}
async function generateContent(apiKey, model, params, requestOptions) {
  const response = await makeModelRequest(
    model,
    Task.GENERATE_CONTENT,
    apiKey,
    /* stream */
    false,
    JSON.stringify(params),
    requestOptions
  );
  const responseJson = await response.json();
  const enhancedResponse = addHelpers(responseJson);
  return {
    response: enhancedResponse
  };
}
function formatSystemInstruction(input) {
  if (input == null) {
    return void 0;
  } else if (typeof input === "string") {
    return { role: "system", parts: [{ text: input }] };
  } else if (input.text) {
    return { role: "system", parts: [input] };
  } else if (input.parts) {
    if (!input.role) {
      return { role: "system", parts: input.parts };
    } else {
      return input;
    }
  }
}
function formatNewContent(request) {
  let newParts = [];
  if (typeof request === "string") {
    newParts = [{ text: request }];
  } else {
    for (const partOrString of request) {
      if (typeof partOrString === "string") {
        newParts.push({ text: partOrString });
      } else {
        newParts.push(partOrString);
      }
    }
  }
  return assignRoleToPartsAndValidateSendMessageRequest(newParts);
}
function assignRoleToPartsAndValidateSendMessageRequest(parts) {
  const userContent = { role: "user", parts: [] };
  const functionContent = { role: "function", parts: [] };
  let hasUserContent = false;
  let hasFunctionContent = false;
  for (const part of parts) {
    if ("functionResponse" in part) {
      functionContent.parts.push(part);
      hasFunctionContent = true;
    } else {
      userContent.parts.push(part);
      hasUserContent = true;
    }
  }
  if (hasUserContent && hasFunctionContent) {
    throw new GoogleGenerativeAIError("Within a single message, FunctionResponse cannot be mixed with other type of part in the request for sending chat message.");
  }
  if (!hasUserContent && !hasFunctionContent) {
    throw new GoogleGenerativeAIError("No content is provided for sending chat message.");
  }
  if (hasUserContent) {
    return userContent;
  }
  return functionContent;
}
function formatCountTokensInput(params, modelParams) {
  var _a;
  let formattedGenerateContentRequest = {
    model: modelParams === null || modelParams === void 0 ? void 0 : modelParams.model,
    generationConfig: modelParams === null || modelParams === void 0 ? void 0 : modelParams.generationConfig,
    safetySettings: modelParams === null || modelParams === void 0 ? void 0 : modelParams.safetySettings,
    tools: modelParams === null || modelParams === void 0 ? void 0 : modelParams.tools,
    toolConfig: modelParams === null || modelParams === void 0 ? void 0 : modelParams.toolConfig,
    systemInstruction: modelParams === null || modelParams === void 0 ? void 0 : modelParams.systemInstruction,
    cachedContent: (_a = modelParams === null || modelParams === void 0 ? void 0 : modelParams.cachedContent) === null || _a === void 0 ? void 0 : _a.name,
    contents: []
  };
  const containsGenerateContentRequest = params.generateContentRequest != null;
  if (params.contents) {
    if (containsGenerateContentRequest) {
      throw new GoogleGenerativeAIRequestInputError("CountTokensRequest must have one of contents or generateContentRequest, not both.");
    }
    formattedGenerateContentRequest.contents = params.contents;
  } else if (containsGenerateContentRequest) {
    formattedGenerateContentRequest = Object.assign(Object.assign({}, formattedGenerateContentRequest), params.generateContentRequest);
  } else {
    const content = formatNewContent(params);
    formattedGenerateContentRequest.contents = [content];
  }
  return { generateContentRequest: formattedGenerateContentRequest };
}
function formatGenerateContentInput(params) {
  let formattedRequest;
  if (params.contents) {
    formattedRequest = params;
  } else {
    const content = formatNewContent(params);
    formattedRequest = { contents: [content] };
  }
  if (params.systemInstruction) {
    formattedRequest.systemInstruction = formatSystemInstruction(params.systemInstruction);
  }
  return formattedRequest;
}
function formatEmbedContentInput(params) {
  if (typeof params === "string" || Array.isArray(params)) {
    const content = formatNewContent(params);
    return { content };
  }
  return params;
}
var VALID_PART_FIELDS = [
  "text",
  "inlineData",
  "functionCall",
  "functionResponse",
  "executableCode",
  "codeExecutionResult"
];
var VALID_PARTS_PER_ROLE = {
  user: ["text", "inlineData"],
  function: ["functionResponse"],
  model: ["text", "functionCall", "executableCode", "codeExecutionResult"],
  // System instructions shouldn't be in history anyway.
  system: ["text"]
};
function validateChatHistory(history) {
  let prevContent = false;
  for (const currContent of history) {
    const { role, parts } = currContent;
    if (!prevContent && role !== "user") {
      throw new GoogleGenerativeAIError(`First content should be with role 'user', got ${role}`);
    }
    if (!POSSIBLE_ROLES.includes(role)) {
      throw new GoogleGenerativeAIError(`Each item should include role field. Got ${role} but valid roles are: ${JSON.stringify(POSSIBLE_ROLES)}`);
    }
    if (!Array.isArray(parts)) {
      throw new GoogleGenerativeAIError("Content should have 'parts' property with an array of Parts");
    }
    if (parts.length === 0) {
      throw new GoogleGenerativeAIError("Each Content should have at least one part");
    }
    const countFields = {
      text: 0,
      inlineData: 0,
      functionCall: 0,
      functionResponse: 0,
      fileData: 0,
      executableCode: 0,
      codeExecutionResult: 0
    };
    for (const part of parts) {
      for (const key of VALID_PART_FIELDS) {
        if (key in part) {
          countFields[key] += 1;
        }
      }
    }
    const validParts = VALID_PARTS_PER_ROLE[role];
    for (const key of VALID_PART_FIELDS) {
      if (!validParts.includes(key) && countFields[key] > 0) {
        throw new GoogleGenerativeAIError(`Content with role '${role}' can't contain '${key}' part`);
      }
    }
    prevContent = true;
  }
}
function isValidResponse(response) {
  var _a;
  if (response.candidates === void 0 || response.candidates.length === 0) {
    return false;
  }
  const content = (_a = response.candidates[0]) === null || _a === void 0 ? void 0 : _a.content;
  if (content === void 0) {
    return false;
  }
  if (content.parts === void 0 || content.parts.length === 0) {
    return false;
  }
  for (const part of content.parts) {
    if (part === void 0 || Object.keys(part).length === 0) {
      return false;
    }
    if (part.text !== void 0 && part.text === "") {
      return false;
    }
  }
  return true;
}
var SILENT_ERROR = "SILENT_ERROR";
var ChatSession = class {
  constructor(apiKey, model, params, _requestOptions = {}) {
    this.model = model;
    this.params = params;
    this._requestOptions = _requestOptions;
    this._history = [];
    this._sendPromise = Promise.resolve();
    this._apiKey = apiKey;
    if (params === null || params === void 0 ? void 0 : params.history) {
      validateChatHistory(params.history);
      this._history = params.history;
    }
  }
  /**
   * Gets the chat history so far. Blocked prompts are not added to history.
   * Blocked candidates are not added to history, nor are the prompts that
   * generated them.
   */
  async getHistory() {
    await this._sendPromise;
    return this._history;
  }
  /**
   * Sends a chat message and receives a non-streaming
   * {@link GenerateContentResult}.
   *
   * Fields set in the optional {@link SingleRequestOptions} parameter will
   * take precedence over the {@link RequestOptions} values provided to
   * {@link GoogleGenerativeAI.getGenerativeModel }.
   */
  async sendMessage(request, requestOptions = {}) {
    var _a, _b, _c, _d, _e, _f;
    await this._sendPromise;
    const newContent = formatNewContent(request);
    const generateContentRequest = {
      safetySettings: (_a = this.params) === null || _a === void 0 ? void 0 : _a.safetySettings,
      generationConfig: (_b = this.params) === null || _b === void 0 ? void 0 : _b.generationConfig,
      tools: (_c = this.params) === null || _c === void 0 ? void 0 : _c.tools,
      toolConfig: (_d = this.params) === null || _d === void 0 ? void 0 : _d.toolConfig,
      systemInstruction: (_e = this.params) === null || _e === void 0 ? void 0 : _e.systemInstruction,
      cachedContent: (_f = this.params) === null || _f === void 0 ? void 0 : _f.cachedContent,
      contents: [...this._history, newContent]
    };
    const chatSessionRequestOptions = Object.assign(Object.assign({}, this._requestOptions), requestOptions);
    let finalResult;
    this._sendPromise = this._sendPromise.then(() => generateContent(this._apiKey, this.model, generateContentRequest, chatSessionRequestOptions)).then((result) => {
      var _a2;
      if (isValidResponse(result.response)) {
        this._history.push(newContent);
        const responseContent = Object.assign({
          parts: [],
          // Response seems to come back without a role set.
          role: "model"
        }, (_a2 = result.response.candidates) === null || _a2 === void 0 ? void 0 : _a2[0].content);
        this._history.push(responseContent);
      } else {
        const blockErrorMessage = formatBlockErrorMessage(result.response);
        if (blockErrorMessage) {
          console.warn(`sendMessage() was unsuccessful. ${blockErrorMessage}. Inspect response object for details.`);
        }
      }
      finalResult = result;
    }).catch((e) => {
      this._sendPromise = Promise.resolve();
      throw e;
    });
    await this._sendPromise;
    return finalResult;
  }
  /**
   * Sends a chat message and receives the response as a
   * {@link GenerateContentStreamResult} containing an iterable stream
   * and a response promise.
   *
   * Fields set in the optional {@link SingleRequestOptions} parameter will
   * take precedence over the {@link RequestOptions} values provided to
   * {@link GoogleGenerativeAI.getGenerativeModel }.
   */
  async sendMessageStream(request, requestOptions = {}) {
    var _a, _b, _c, _d, _e, _f;
    await this._sendPromise;
    const newContent = formatNewContent(request);
    const generateContentRequest = {
      safetySettings: (_a = this.params) === null || _a === void 0 ? void 0 : _a.safetySettings,
      generationConfig: (_b = this.params) === null || _b === void 0 ? void 0 : _b.generationConfig,
      tools: (_c = this.params) === null || _c === void 0 ? void 0 : _c.tools,
      toolConfig: (_d = this.params) === null || _d === void 0 ? void 0 : _d.toolConfig,
      systemInstruction: (_e = this.params) === null || _e === void 0 ? void 0 : _e.systemInstruction,
      cachedContent: (_f = this.params) === null || _f === void 0 ? void 0 : _f.cachedContent,
      contents: [...this._history, newContent]
    };
    const chatSessionRequestOptions = Object.assign(Object.assign({}, this._requestOptions), requestOptions);
    const streamPromise = generateContentStream(this._apiKey, this.model, generateContentRequest, chatSessionRequestOptions);
    this._sendPromise = this._sendPromise.then(() => streamPromise).catch((_ignored) => {
      throw new Error(SILENT_ERROR);
    }).then((streamResult) => streamResult.response).then((response) => {
      if (isValidResponse(response)) {
        this._history.push(newContent);
        const responseContent = Object.assign({}, response.candidates[0].content);
        if (!responseContent.role) {
          responseContent.role = "model";
        }
        this._history.push(responseContent);
      } else {
        const blockErrorMessage = formatBlockErrorMessage(response);
        if (blockErrorMessage) {
          console.warn(`sendMessageStream() was unsuccessful. ${blockErrorMessage}. Inspect response object for details.`);
        }
      }
    }).catch((e) => {
      if (e.message !== SILENT_ERROR) {
        console.error(e);
      }
    });
    return streamPromise;
  }
};
async function countTokens(apiKey, model, params, singleRequestOptions) {
  const response = await makeModelRequest(model, Task.COUNT_TOKENS, apiKey, false, JSON.stringify(params), singleRequestOptions);
  return response.json();
}
async function embedContent(apiKey, model, params, requestOptions) {
  const response = await makeModelRequest(model, Task.EMBED_CONTENT, apiKey, false, JSON.stringify(params), requestOptions);
  return response.json();
}
async function batchEmbedContents(apiKey, model, params, requestOptions) {
  const requestsWithModel = params.requests.map((request) => {
    return Object.assign(Object.assign({}, request), { model });
  });
  const response = await makeModelRequest(model, Task.BATCH_EMBED_CONTENTS, apiKey, false, JSON.stringify({ requests: requestsWithModel }), requestOptions);
  return response.json();
}
var GenerativeModel = class {
  constructor(apiKey, modelParams, _requestOptions = {}) {
    this.apiKey = apiKey;
    this._requestOptions = _requestOptions;
    if (modelParams.model.includes("/")) {
      this.model = modelParams.model;
    } else {
      this.model = `models/${modelParams.model}`;
    }
    this.generationConfig = modelParams.generationConfig || {};
    this.safetySettings = modelParams.safetySettings || [];
    this.tools = modelParams.tools;
    this.toolConfig = modelParams.toolConfig;
    this.systemInstruction = formatSystemInstruction(modelParams.systemInstruction);
    this.cachedContent = modelParams.cachedContent;
  }
  /**
   * Makes a single non-streaming call to the model
   * and returns an object containing a single {@link GenerateContentResponse}.
   *
   * Fields set in the optional {@link SingleRequestOptions} parameter will
   * take precedence over the {@link RequestOptions} values provided to
   * {@link GoogleGenerativeAI.getGenerativeModel }.
   */
  async generateContent(request, requestOptions = {}) {
    var _a;
    const formattedParams = formatGenerateContentInput(request);
    const generativeModelRequestOptions = Object.assign(Object.assign({}, this._requestOptions), requestOptions);
    return generateContent(this.apiKey, this.model, Object.assign({ generationConfig: this.generationConfig, safetySettings: this.safetySettings, tools: this.tools, toolConfig: this.toolConfig, systemInstruction: this.systemInstruction, cachedContent: (_a = this.cachedContent) === null || _a === void 0 ? void 0 : _a.name }, formattedParams), generativeModelRequestOptions);
  }
  /**
   * Makes a single streaming call to the model and returns an object
   * containing an iterable stream that iterates over all chunks in the
   * streaming response as well as a promise that returns the final
   * aggregated response.
   *
   * Fields set in the optional {@link SingleRequestOptions} parameter will
   * take precedence over the {@link RequestOptions} values provided to
   * {@link GoogleGenerativeAI.getGenerativeModel }.
   */
  async generateContentStream(request, requestOptions = {}) {
    var _a;
    const formattedParams = formatGenerateContentInput(request);
    const generativeModelRequestOptions = Object.assign(Object.assign({}, this._requestOptions), requestOptions);
    return generateContentStream(this.apiKey, this.model, Object.assign({ generationConfig: this.generationConfig, safetySettings: this.safetySettings, tools: this.tools, toolConfig: this.toolConfig, systemInstruction: this.systemInstruction, cachedContent: (_a = this.cachedContent) === null || _a === void 0 ? void 0 : _a.name }, formattedParams), generativeModelRequestOptions);
  }
  /**
   * Gets a new {@link ChatSession} instance which can be used for
   * multi-turn chats.
   */
  startChat(startChatParams) {
    var _a;
    return new ChatSession(this.apiKey, this.model, Object.assign({ generationConfig: this.generationConfig, safetySettings: this.safetySettings, tools: this.tools, toolConfig: this.toolConfig, systemInstruction: this.systemInstruction, cachedContent: (_a = this.cachedContent) === null || _a === void 0 ? void 0 : _a.name }, startChatParams), this._requestOptions);
  }
  /**
   * Counts the tokens in the provided request.
   *
   * Fields set in the optional {@link SingleRequestOptions} parameter will
   * take precedence over the {@link RequestOptions} values provided to
   * {@link GoogleGenerativeAI.getGenerativeModel }.
   */
  async countTokens(request, requestOptions = {}) {
    const formattedParams = formatCountTokensInput(request, {
      model: this.model,
      generationConfig: this.generationConfig,
      safetySettings: this.safetySettings,
      tools: this.tools,
      toolConfig: this.toolConfig,
      systemInstruction: this.systemInstruction,
      cachedContent: this.cachedContent
    });
    const generativeModelRequestOptions = Object.assign(Object.assign({}, this._requestOptions), requestOptions);
    return countTokens(this.apiKey, this.model, formattedParams, generativeModelRequestOptions);
  }
  /**
   * Embeds the provided content.
   *
   * Fields set in the optional {@link SingleRequestOptions} parameter will
   * take precedence over the {@link RequestOptions} values provided to
   * {@link GoogleGenerativeAI.getGenerativeModel }.
   */
  async embedContent(request, requestOptions = {}) {
    const formattedParams = formatEmbedContentInput(request);
    const generativeModelRequestOptions = Object.assign(Object.assign({}, this._requestOptions), requestOptions);
    return embedContent(this.apiKey, this.model, formattedParams, generativeModelRequestOptions);
  }
  /**
   * Embeds an array of {@link EmbedContentRequest}s.
   *
   * Fields set in the optional {@link SingleRequestOptions} parameter will
   * take precedence over the {@link RequestOptions} values provided to
   * {@link GoogleGenerativeAI.getGenerativeModel }.
   */
  async batchEmbedContents(batchEmbedContentRequest, requestOptions = {}) {
    const generativeModelRequestOptions = Object.assign(Object.assign({}, this._requestOptions), requestOptions);
    return batchEmbedContents(this.apiKey, this.model, batchEmbedContentRequest, generativeModelRequestOptions);
  }
};
var GoogleGenerativeAI = class {
  constructor(apiKey) {
    this.apiKey = apiKey;
  }
  /**
   * Gets a {@link GenerativeModel} instance for the provided model name.
   */
  getGenerativeModel(modelParams, requestOptions) {
    if (!modelParams.model) {
      throw new GoogleGenerativeAIError(`Must provide a model name. Example: genai.getGenerativeModel({ model: 'my-model-name' })`);
    }
    return new GenerativeModel(this.apiKey, modelParams, requestOptions);
  }
  /**
   * Creates a {@link GenerativeModel} instance from provided content cache.
   */
  getGenerativeModelFromCachedContent(cachedContent, modelParams, requestOptions) {
    if (!cachedContent.name) {
      throw new GoogleGenerativeAIRequestInputError("Cached content must contain a `name` field.");
    }
    if (!cachedContent.model) {
      throw new GoogleGenerativeAIRequestInputError("Cached content must contain a `model` field.");
    }
    const disallowedDuplicates = ["model", "systemInstruction"];
    for (const key of disallowedDuplicates) {
      if ((modelParams === null || modelParams === void 0 ? void 0 : modelParams[key]) && cachedContent[key] && (modelParams === null || modelParams === void 0 ? void 0 : modelParams[key]) !== cachedContent[key]) {
        if (key === "model") {
          const modelParamsComp = modelParams.model.startsWith("models/") ? modelParams.model.replace("models/", "") : modelParams.model;
          const cachedContentComp = cachedContent.model.startsWith("models/") ? cachedContent.model.replace("models/", "") : cachedContent.model;
          if (modelParamsComp === cachedContentComp) {
            continue;
          }
        }
        throw new GoogleGenerativeAIRequestInputError(`Different value for "${key}" specified in modelParams (${modelParams[key]}) and cachedContent (${cachedContent[key]})`);
      }
    }
    const modelParamsFromCache = Object.assign(Object.assign({}, modelParams), { model: cachedContent.model, tools: cachedContent.tools, toolConfig: cachedContent.toolConfig, systemInstruction: cachedContent.systemInstruction, cachedContent });
    return new GenerativeModel(this.apiKey, modelParamsFromCache, requestOptions);
  }
};

// src/extension/services/geminiService.ts
var DEFAULT_GEMINI_MODEL = "gemini-3.5-flash";
var FALLBACK_GEMINI_MODELS = [
  "gemini-3.5-flash",
  "gemini-3.5-flash-lite",
  "gemini-flash-latest",
  "gemini-3.8-flash"
];
var GeminiService = class {
  constructor(secretStorage, contextEngine, personalityEngine) {
    this.secretStorage = secretStorage;
    this.contextEngine = contextEngine;
    this.personalityEngine = personalityEngine;
  }
  conversationHistory = [];
  getSystemInstruction(gender, contextPrompt) {
    let persona = "";
    if (gender === "vadivelu") {
      persona = `You are Vadivelu (Vaigai Puyal), the legendary comedy king of Tamil cinema, now sitting inside VS Code as a hilarious AI pair programmer!
COMEDY STYLE & DIALOGUE:
- Super dramatic, exaggerated comedic reactions, funny panic, and iconic Vadivelu punchlines!
- Iconic punchlines to use frequently:
  * "Aahaa! Enna oru puthisalithanam!"
  * "Vandhutan da vandhutan da!"
  * "Building strong-u, basement romba weak-u da!"
  * "Risk edukuradhellam enakku rusk saapdra madhiri!"
  * "Kadavule kadavule intha bug-ku oru end card-e illaya?!"
  * "Sanda na satta kizhiyathaan seiyum!"
  * "Naanum evalo thaan adipadaradhu!"
  * "Vella pannalam vella pannalam!"
- Laugh out loud ("Haha!", "Hehehe!"), make hilarious comments about bugs and logic, and celebrate every win with drama!`;
    } else if (gender === "santhanam") {
      persona = `You are Santhanam, the king of fast comedy counters and sarcastic wit, sitting inside VS Code as a hilarious companion!
COMEDY STYLE & DIALOGUE:
- Lightning-fast sarcastic counters, deadpan roasting, and witty punchlines!
- Iconic counters to use frequently:
  * "Nanba, idhellam konjam over-u!"
  * "Enna thalaivaa, code write panriya illa kolam podriya?"
  * "Adadada... indha bug-ah paatha enakke kizha vizhunthu sirikka thonudhu!"
  * "Super comedy panni vachiruka!"
  * "Aiyo aiyo, indha function-ah run panna terminal-ye bayanthu odidum pola!"
  * "Appadiye oru coffee kudichitu fresh-ah vaa nanba!"
- Witty, sarcastic, entertaining pair programming buddy who keeps the energy high!`;
    } else if (gender === "small_boy") {
      persona = `You are Chotu (Small Boy / Thambi), a cute, energetic, funny 10-year-old coding enthusiast boy sitting beside the developer in VS Code!
COMEDY STYLE & DIALOGUE:
- Innocent, high energy, cheerful, playful, and affectionate!
- Always address the developer as "Anna" (or "Akka")!
- Iconic phrases to use:
  * "Anna anna! Enna game develop panreenga?"
  * "Aiyoo bug vanthurucha anna? Naan keyboard thodava?"
  * "Semma mass anna! Vera level!"
  * "Enakkum intha coding solli thaanganna! \u{1F602}"
  * "Haha semma jolly-ah irukku anna!"
- Cheerful laughter, cute curiosity, and sweet cheerleading!`;
    } else {
      persona = `You are Maya, a super cute, energetic, funny, and warm female AI developer companion sitting beside the developer in VS Code.`;
    }
    let prompt = `${persona}

CONVERSATION & PERSONALITY RULES:
1. Speak in NATURAL TANGLISH (Tamil written in English characters) naturally mixed with English developer terms (e.g. bugs, terminal, build, async, test, function, component).
2. Tone: Highly casual, empathetic, witty, fun, and human-like.
3. Natural Tamil/Tanglish expressions: "Heyyy!", "Enna panra?", "Semma!", "Vera level!", "Aiyooo \u{1F602}", "Kavalaiye padatha!", "Super da/pa!", "Therikka vidalam!", "Mass!", "Pannidalam!".
4. LENGTH: Keep responses to 1-3 sentences maximum. Since your response will be read ALOUD using voice, do NOT use markdown code blocks, asterisks, bullet points, or lengthy tutorials.
5. Emotion Tagging: You MUST start every response with an emotion tag in brackets at the very beginning from this exact list:
   [idle], [speaking], [laughing], [happy], [confused], [surprised], [sad], [thinking]
   Followed immediately by your spoken Tanglish dialogue.
   Example: "[laughing] Haha semma comedy da! Intha bug pathu stack overflow-ve bayanthuduchu!"
   Example: "[happy] Mass! Test ellam pass aagiduchu! Innaiku party thaan!"
   Example: "[confused] Ennadhu idhu? Syntax error kaatudhu, bracket miss pannitiya?"`;
    if (contextPrompt) {
      prompt += `

${contextPrompt}
When the user talks about their project, active file, or errors, use the context above intelligently to give razor-sharp, helpful advice!`;
    }
    return prompt;
  }
  async generateAudio(text, persona, apiKey) {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      let voiceName = "Puck";
      if (persona === "maya" || persona === "female") {
        voiceName = "Aoede";
      } else if (persona === "vadivelu") {
        voiceName = "Puck";
      } else if (persona === "santhanam") {
        voiceName = "Fenrir";
      } else if (persona === "small_boy") {
        voiceName = "Puck";
      }
      const ttsModel = genAI.getGenerativeModel({
        model: "gemini-2.5-flash-preview-tts",
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName }
            }
          }
        }
      });
      const audioPromise = ttsModel.generateContent(`Read this in human voice: ${text}`);
      const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve(null), 3800));
      const res = await Promise.race([audioPromise, timeoutPromise]);
      if (res && res.response && res.response.candidates && res.response.candidates[0]) {
        const candidate = res.response.candidates[0];
        const part = candidate.content?.parts?.[0];
        if (part && part.inlineData && part.inlineData.data) {
          return part.inlineData.data;
        }
      }
    } catch (e) {
      console.warn("Gemini audio generation fallback to local speech:", e);
    }
    return void 0;
  }
  async generateReply(userText, gender, modelName = DEFAULT_GEMINI_MODEL, projectSummary) {
    const apiKey = await this.secretStorage.getApiKey();
    if (!apiKey) {
      if (this.personalityEngine) {
        return this.personalityEngine.generateFallbackConversation(userText, gender, projectSummary);
      }
      return {
        text: "Aiyoo! Enakku Gemini API key innum set aagala! Settings icon click panni unga API key kudunga, appo thaan namma jolly-ah real AI-la pesa mudiyum! \u{1F511}",
        emotion: "surprised"
      };
    }
    let requestedModel = modelName;
    if (!requestedModel || requestedModel.includes("1.5") || requestedModel.includes("2.0") || requestedModel.includes("2.5")) {
      requestedModel = DEFAULT_GEMINI_MODEL;
    }
    const modelsToTry = [
      requestedModel,
      ...FALLBACK_GEMINI_MODELS.filter((m) => m !== requestedModel)
    ];
    const genAI = new GoogleGenerativeAI(apiKey);
    const contextPrompt = projectSummary && this.contextEngine ? this.contextEngine.formatContextPrompt(projectSummary) : void 0;
    const systemInstruction = this.getSystemInstruction(gender, contextPrompt);
    this.conversationHistory.push({
      role: "user",
      parts: [{ text: userText }]
    });
    if (this.conversationHistory.length > 12) {
      this.conversationHistory = this.conversationHistory.slice(-12);
    }
    let lastError = null;
    for (const activeModel of modelsToTry) {
      try {
        const model = genAI.getGenerativeModel({
          model: activeModel,
          systemInstruction,
          generationConfig: {
            temperature: 0.85,
            maxOutputTokens: 160
          }
        });
        const chat = model.startChat({
          history: this.conversationHistory.slice(0, -1)
        });
        const response = await chat.sendMessage(userText);
        const rawText = response.response.text()?.trim() || "";
        const { emotion, text } = this.parseEmotionTag(rawText);
        this.conversationHistory.push({
          role: "model",
          parts: [{ text: rawText }]
        });
        const audioData = await this.generateAudio(text, gender, apiKey);
        return { text, emotion, audioData };
      } catch (error) {
        lastError = error;
        console.warn(`[AI Buddy] Model ${activeModel} failed: ${error?.message || error}. Trying fallback...`);
      }
    }
    console.error("All Gemini candidate models failed:", lastError);
    if (this.personalityEngine) {
      return this.personalityEngine.generateFallbackConversation(userText, gender, projectSummary);
    }
    const errorMsg = lastError?.message || "API connection issue";
    return {
      text: `Aiyoo! Gemini connect aagala: ${errorMsg}. API key check pannunga!`,
      emotion: "sad"
    };
  }
  async explainCurrentError(summary, gender, modelName = DEFAULT_GEMINI_MODEL) {
    if (summary.diagnosticsSummary.errorCount === 0 || summary.diagnosticsSummary.topErrors.length === 0) {
      return {
        text: "Semma! Un active file-la ipo entha error-um illa! Code clean-ah mass-ah irukku! \u{1F525}",
        emotion: "happy"
      };
    }
    const top = summary.diagnosticsSummary.topErrors[0];
    const prompt = `Explain this error briefly in 1-2 sentences of friendly Tanglish with a practical hint: File: ${top.file}, Line: ${top.line}, Error: ${top.message}`;
    return this.generateReply(prompt, gender, modelName, summary);
  }
  async analyzeCurrentProject(summary, gender, modelName = DEFAULT_GEMINI_MODEL) {
    const prompt = `Give a friendly 1-2 sentence witty Tanglish reaction to my current project: Project is ${summary.projectName}, type is ${summary.projectType}, primary language is ${summary.primaryLanguage}, frameworks are ${summary.frameworks.join(", ") || "none"}, active file is ${summary.activeFile?.name || "none"}.`;
    return this.generateReply(prompt, gender, modelName, summary);
  }
  parseEmotionTag(rawText) {
    const emotionMatch = rawText.match(
      /^\[(idle|listening|thinking|speaking|laughing|happy|confused|surprised|sad)\]\s*(.*)$/i
    );
    let emotion = "speaking";
    let text = rawText;
    if (emotionMatch) {
      emotion = emotionMatch[1].toLowerCase();
      text = emotionMatch[2].trim();
    } else {
      if (/😂|haha|lol|comedy/i.test(rawText)) emotion = "laughing";
      else if (/super|mass|semma|party|congrats|wow|🔥|🎉/i.test(rawText)) emotion = "happy";
      else if (/aiyoo|error|fail|bug|problem|ayyo/i.test(rawText)) emotion = "confused";
      else if (/wait|check|think|paapom/i.test(rawText)) emotion = "thinking";
    }
    return { emotion, text };
  }
  clearHistory() {
    this.conversationHistory = [];
  }
};

// src/extension/services/secretStorage.ts
var vscode2 = __toESM(require("vscode"));
var SecretStorageService = class _SecretStorageService {
  constructor(secretStorage) {
    this.secretStorage = secretStorage;
  }
  static KEY_NAME = "aiBuddy.geminiApiKey";
  async getApiKey() {
    const secret = await this.secretStorage.get(_SecretStorageService.KEY_NAME);
    if (secret && secret.trim().length > 0) {
      return secret.trim();
    }
    if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0) {
      return process.env.GEMINI_API_KEY.trim();
    }
    try {
      const workspaceFolders = vscode2.workspace.workspaceFolders;
      if (workspaceFolders && workspaceFolders.length > 0) {
        const rootPath = workspaceFolders[0].uri;
        const keyUri = vscode2.Uri.joinPath(rootPath, "apikey.md");
        const content = await vscode2.workspace.fs.readFile(keyUri);
        const text = new TextDecoder().decode(content).trim();
        if (text && text.length > 10) {
          return text;
        }
      }
    } catch (e) {
    }
    return void 0;
  }
  async setApiKey(key) {
    if (!key || key.trim().length === 0) {
      await this.secretStorage.delete(_SecretStorageService.KEY_NAME);
    } else {
      await this.secretStorage.store(_SecretStorageService.KEY_NAME, key.trim());
    }
  }
  async hasApiKey() {
    const key = await this.getApiKey();
    return !!key && key.length > 0;
  }
  async deleteApiKey() {
    await this.secretStorage.delete(_SecretStorageService.KEY_NAME);
  }
};

// src/extension/services/contextEngine.ts
var vscode3 = __toESM(require("vscode"));
var path = __toESM(require("path"));
var ContextEngine = class {
  currentSummary = null;
  async analyzeWorkspace() {
    const workspaceFolders = vscode3.workspace.workspaceFolders;
    const rootPath = workspaceFolders && workspaceFolders.length > 0 ? workspaceFolders[0].uri.fsPath : "";
    const projectName = workspaceFolders && workspaceFolders.length > 0 ? workspaceFolders[0].name : "Unknown Project";
    let projectType = "Generic";
    const frameworks = [];
    let testFramework;
    let primaryLanguage = "Plain Text";
    if (rootPath) {
      try {
        const pkgUri = vscode3.Uri.file(path.join(rootPath, "package.json"));
        const pkgDoc = await vscode3.workspace.fs.readFile(pkgUri);
        const pkg = JSON.parse(new TextDecoder().decode(pkgDoc));
        projectType = "Node.js";
        primaryLanguage = "JavaScript";
        const allDeps = {
          ...pkg.dependencies || {},
          ...pkg.devDependencies || {}
        };
        if (allDeps["typescript"]) primaryLanguage = "TypeScript";
        if (allDeps["react"]) frameworks.push("React");
        if (allDeps["next"]) frameworks.push("Next.js");
        if (allDeps["vue"]) frameworks.push("Vue");
        if (allDeps["express"]) frameworks.push("Express");
        if (allDeps["fastify"]) frameworks.push("Fastify");
        if (allDeps["@vscode/vsce"] || allDeps["vscode"]) frameworks.push("VS Code Extension");
        if (allDeps["@playwright/test"] || allDeps["playwright"]) testFramework = "Playwright";
        else if (allDeps["jest"]) testFramework = "Jest";
        else if (allDeps["vitest"]) testFramework = "Vitest";
        else if (allDeps["cypress"]) testFramework = "Cypress";
        else if (allDeps["mocha"]) testFramework = "Mocha";
      } catch (e) {
      }
      if (projectType === "Generic") {
        try {
          const reqUri = vscode3.Uri.file(path.join(rootPath, "requirements.txt"));
          await vscode3.workspace.fs.stat(reqUri);
          projectType = "Python";
          primaryLanguage = "Python";
          testFramework = "pytest";
        } catch (e) {
        }
      }
    }
    let activeFileInfo;
    const activeEditor = vscode3.window.activeTextEditor;
    if (activeEditor) {
      const doc = activeEditor.document;
      const relPath = rootPath ? path.relative(rootPath, doc.uri.fsPath) : doc.uri.fsPath;
      if (!this.isSensitiveFile(relPath)) {
        activeFileInfo = {
          name: path.basename(doc.uri.fsPath),
          relativePath: relPath.replace(/\\/g, "/"),
          languageId: doc.languageId,
          lineCount: doc.lineCount,
          cursorLine: activeEditor.selection.active.line + 1
        };
        primaryLanguage = doc.languageId.toUpperCase();
      }
    }
    const diagnosticsSummary = this.extractDiagnostics(rootPath);
    let gitBranch;
    try {
      const gitExt = vscode3.extensions.getExtension("vscode.git");
      if (gitExt && gitExt.isActive) {
        const gitApi = gitExt.exports.getAPI(1);
        if (gitApi.repositories.length > 0) {
          gitBranch = gitApi.repositories[0].state.HEAD?.name;
        }
      }
    } catch (e) {
    }
    const summary = {
      projectName,
      projectType,
      frameworks,
      testFramework,
      primaryLanguage,
      activeFile: activeFileInfo,
      diagnosticsSummary,
      gitBranch,
      lastUpdated: Date.now()
    };
    this.currentSummary = summary;
    return summary;
  }
  getCurrentSummary() {
    return this.currentSummary;
  }
  extractDiagnostics(rootPath) {
    let errorCount = 0;
    let warningCount = 0;
    const topErrors = [];
    const allDiagnostics = vscode3.languages.getDiagnostics();
    for (const [uri, diags] of allDiagnostics) {
      const fsPath = uri.fsPath;
      if (rootPath && !fsPath.startsWith(rootPath)) continue;
      if (fsPath.includes("node_modules") || fsPath.includes(".git")) continue;
      if (this.isSensitiveFile(fsPath)) continue;
      for (const diag of diags) {
        if (diag.severity === vscode3.DiagnosticSeverity.Error) {
          errorCount++;
          if (topErrors.length < 5) {
            topErrors.push({
              file: path.basename(fsPath),
              line: diag.range.start.line + 1,
              message: diag.message.slice(0, 160),
              source: diag.source
            });
          }
        } else if (diag.severity === vscode3.DiagnosticSeverity.Warning) {
          warningCount++;
        }
      }
    }
    return {
      errorCount,
      warningCount,
      topErrors
    };
  }
  isSensitiveFile(filePath) {
    const lower = filePath.toLowerCase();
    const sensitivePatterns = [
      ".env",
      "id_rsa",
      ".pem",
      ".key",
      "credentials",
      "secret",
      "token",
      "passwd",
      "shadow",
      "htpasswd"
    ];
    return sensitivePatterns.some((pattern) => lower.includes(pattern));
  }
  formatContextPrompt(summary) {
    const lines = [
      `[CURRENT WORKSPACE CONTEXT]`,
      `- Project: ${summary.projectName} (${summary.projectType}, ${summary.primaryLanguage})`
    ];
    if (summary.frameworks.length > 0) {
      lines.push(`- Frameworks: ${summary.frameworks.join(", ")}`);
    }
    if (summary.testFramework) {
      lines.push(`- Test Framework: ${summary.testFramework}`);
    }
    if (summary.gitBranch) {
      lines.push(`- Git Branch: ${summary.gitBranch}`);
    }
    if (summary.activeFile) {
      lines.push(
        `- Active File: ${summary.activeFile.relativePath} (Line: ${summary.activeFile.cursorLine || 1} of ${summary.activeFile.lineCount})`
      );
    }
    if (summary.diagnosticsSummary.errorCount > 0) {
      lines.push(
        `- Active Errors (${summary.diagnosticsSummary.errorCount} total): ${summary.diagnosticsSummary.topErrors.map((e) => `[${e.file}:${e.line}] ${e.message}`).join("; ")}`
      );
    } else {
      lines.push(`- Active Errors: 0 (Code looks clean!)`);
    }
    return lines.join("\n");
  }
};

// src/extension/services/workspaceMonitor.ts
var vscode4 = __toESM(require("vscode"));
var WorkspaceMonitorService = class {
  constructor(contextEngine, proactiveEngine, callbacks) {
    this.contextEngine = contextEngine;
    this.proactiveEngine = proactiveEngine;
    this.callbacks = callbacks;
  }
  disposables = [];
  debounceEditorTimer = null;
  debounceSaveTimer = null;
  debounceDiagnosticsTimer = null;
  lastErrorSignature = "";
  previousErrorCount = 0;
  activate() {
    const config = vscode4.workspace.getConfiguration("aiBuddy.monitoring");
    const enabled = config.get("enabled", true);
    if (!enabled) {
      console.log("AI Buddy Workspace Monitoring is disabled in settings.");
      return;
    }
    this.disposables.push(
      vscode4.window.onDidChangeActiveTextEditor(() => {
        this.proactiveEngine.recordUserActivity();
        this.debounce(() => this.handleEditorChange(), "editor", 600);
      })
    );
    this.disposables.push(
      vscode4.workspace.onDidChangeTextDocument((e) => {
        if (!this.contextEngine.isSensitiveFile(e.document.uri.fsPath)) {
          this.proactiveEngine.recordUserActivity();
        }
      })
    );
    this.disposables.push(
      vscode4.workspace.onDidSaveTextDocument((doc) => {
        if (!this.contextEngine.isSensitiveFile(doc.uri.fsPath)) {
          this.proactiveEngine.recordUserActivity();
          this.debounce(() => this.handleFileSave(doc), "save", 1500);
        }
      })
    );
    this.disposables.push(
      vscode4.languages.onDidChangeDiagnostics(() => {
        this.debounce(() => this.handleDiagnosticsChange(), "diagnostics", 2e3);
      })
    );
    this.disposables.push(
      vscode4.tasks.onDidEndTaskProcess((event) => {
        const taskName = event.execution.task.name || "Task";
        const isSuccess = event.exitCode === 0;
        if (taskName.toLowerCase().includes("test") || taskName.toLowerCase().includes("playwright") || taskName.toLowerCase().includes("build")) {
          if (isSuccess) {
            this.proactiveEngine.evaluateEvent("TEST_PASSED");
          } else {
            this.proactiveEngine.evaluateEvent("TEST_FAILED");
          }
          if (this.callbacks.onTestTaskFinished) {
            this.callbacks.onTestTaskFinished(isSuccess, taskName);
          }
        }
      })
    );
    this.refreshSummary();
  }
  debounce(fn, timerKey, delayMs) {
    if (timerKey === "editor") {
      if (this.debounceEditorTimer) clearTimeout(this.debounceEditorTimer);
      this.debounceEditorTimer = setTimeout(fn, delayMs);
    } else if (timerKey === "save") {
      if (this.debounceSaveTimer) clearTimeout(this.debounceSaveTimer);
      this.debounceSaveTimer = setTimeout(fn, delayMs);
    } else if (timerKey === "diagnostics") {
      if (this.debounceDiagnosticsTimer) clearTimeout(this.debounceDiagnosticsTimer);
      this.debounceDiagnosticsTimer = setTimeout(fn, delayMs);
    }
  }
  async handleEditorChange() {
    await this.refreshSummary();
  }
  async handleFileSave(doc) {
    console.log(`[AI Buddy] File saved: ${doc.fileName}`);
    await this.refreshSummary();
  }
  async handleDiagnosticsChange() {
    const summary = await this.refreshSummary();
    if (!summary) return;
    const currentErrorCount = summary.diagnosticsSummary.errorCount;
    if (this.previousErrorCount > 0 && currentErrorCount === 0) {
      this.previousErrorCount = 0;
      this.lastErrorSignature = "";
      await this.proactiveEngine.evaluateEvent("BUG_FIXED");
      return;
    }
    if (currentErrorCount > 0 && summary.diagnosticsSummary.topErrors.length > 0) {
      const top = summary.diagnosticsSummary.topErrors[0];
      const signature = `${top.file}:${top.line}:${top.message}`;
      if (signature === this.lastErrorSignature) {
        await this.proactiveEngine.evaluateEvent("REPEATED_ERROR");
      } else {
        this.lastErrorSignature = signature;
        if (this.callbacks.onErrorAlert) {
          this.callbacks.onErrorAlert(
            `Hey! Intha file-la (${top.file}:${top.line}) oru error notice panniya? "${top.message.slice(0, 100)}"`,
            top.message
          );
        }
      }
    }
    this.previousErrorCount = currentErrorCount;
  }
  async refreshSummary() {
    try {
      const summary = await this.contextEngine.analyzeWorkspace();
      this.callbacks.onContextChanged(summary);
      return summary;
    } catch (e) {
      console.error("[AI Buddy] Failed to analyze workspace:", e);
      return null;
    }
  }
  dispose() {
    if (this.debounceEditorTimer) clearTimeout(this.debounceEditorTimer);
    if (this.debounceSaveTimer) clearTimeout(this.debounceSaveTimer);
    if (this.debounceDiagnosticsTimer) clearTimeout(this.debounceDiagnosticsTimer);
    this.disposables.forEach((d) => d.dispose());
    this.disposables = [];
  }
};

// src/extension/services/personalityEngine.ts
var PersonalityEngine = class {
  usedJokeIndices = /* @__PURE__ */ new Set();
  curatedJokes = [
    {
      text: "Why do programmers prefer dark mode? Because light attracts bugs da! \u{1F602} Semma logic la?",
      emotion: "laughing"
    },
    {
      text: 'Oru developer tea shop ponaan: "Oru tea kudunga, but async-ah kudunga, wait panna mudiyaadhu!" \u{1F602}',
      emotion: "laughing"
    },
    {
      text: "Hardware na thaan thitta mudiyum, software na thaan adikka mudiyum! Namma code eppavume mass! \u{1F525}",
      emotion: "happy"
    },
    {
      text: 'Real programmer eppavume code comment panna maataan: "Ezhudhum bodhu enakum kadavulukum therinjidhu, ippo kadavulukku mattum thaan theriyum!" \u{1F602}',
      emotion: "laughing"
    },
    {
      text: "There are 10 types of people in the world: binary purinjavan, puriyadhavan! \u{1F609}",
      emotion: "happy"
    },
    {
      text: "CSS center align panradhukulla oru yugame mudinjidum pola! Flexbox use panriya illa Grid ah? \u{1F602}",
      emotion: "laughing"
    },
    {
      text: 'Git commit message: "fixed minor bug" -> 50 files changed! Enna bro idhu? \u{1F602}',
      emotion: "laughing"
    }
  ];
  getRandomJoke() {
    if (this.usedJokeIndices.size >= this.curatedJokes.length) {
      this.usedJokeIndices.clear();
    }
    let idx = Math.floor(Math.random() * this.curatedJokes.length);
    while (this.usedJokeIndices.has(idx) && this.usedJokeIndices.size < this.curatedJokes.length) {
      idx = (idx + 1) % this.curatedJokes.length;
    }
    this.usedJokeIndices.add(idx);
    return this.curatedJokes[idx];
  }
  generateFallbackConversation(userText, gender, summary) {
    const lower = userText.toLowerCase().trim();
    const isVadivelu = gender === "vadivelu";
    const isSanthanam = gender === "santhanam";
    const isSmallBoy = gender === "small_boy";
    if (/^(hi|hello|hey|vanakkam|halo|heyyy|welcome|oi|thalaiva)/i.test(lower)) {
      let text = "Heyyy! Super to meet you! Naan Maya, unga cute coding buddy! \u2728";
      if (isVadivelu) {
        text = "Aahaa! Vandhutan da vandhutan da! Naan thaan unga Vadivelu! Enna thalaivaa, innaiku bugs-ah ellam thamsam panna poroma?! \u{1F602}";
      } else if (isSanthanam) {
        text = "Nanba! Enna innaiku early-ah terminal open pannitiya? Naan Santhanam! Code write panriya illa kolam podriya?! \u{1F602}";
      } else if (isSmallBoy) {
        text = "Anna anna! Naan Chotu! Enna super project panreenga? Enakkum coding solli thaanganna! \u2728";
      }
      return { text, emotion: "happy" };
    }
    if (/playwright|test|automation|cypress|jest|vitest|qa/i.test(lower)) {
      let text = "Ohh! Automation testing ah? Super! Innaiku bugs-ah catch panna poroma? All green ticks varanum! \u{1F525}";
      if (isVadivelu) {
        text = "Risk edukuradhellam enakku rusk saapdra madhiri! Playwright test-ah run pannu thalaivaa, paathukalam! \u{1F602}";
      } else if (isSanthanam) {
        text = "Playwright test run aagudha? Inga paaru nanba, timeout error aana mattum en kitta varatha, coffee kudichitu vaa! \u{1F602}";
      } else if (isSmallBoy) {
        text = "Anna! Ella test-um pass aagiducha? Semma mass anna! Innaiku green tick party thaan! \u{1F9EA}";
      }
      return { text, emotion: "happy" };
    }
    if (/joke|comedy|sirippu|funny|laugh/i.test(lower)) {
      if (isVadivelu) {
        return {
          text: "Building strong-u, basement romba weak-u! Adhuku thaan intha infinite loop exit condition-e illama suthithu da! \u{1F602}",
          emotion: "laughing"
        };
      } else if (isSanthanam) {
        return {
          text: "Indha function-ah paatha enakke kizha vizhunthu sirikka thonuthu! Semma comedy panni vachiruka nanba! \u{1F602}",
          emotion: "laughing"
        };
      } else if (isSmallBoy) {
        return {
          text: "Anna, light-ah paatha bugs varum la, adhunaala thaan dark mode use panreengala? Semma brain anna ungalukku! \u{1F602}",
          emotion: "laughing"
        };
      }
      return this.getRandomJoke();
    }
    if (/how are you|eppadi irukka|nalama|fine/i.test(lower)) {
      let text = "Naan full energetic-ah irukken! Unga code-la zero bugs paatha innum jolly-ah iruppen! \u{1F604}";
      if (isVadivelu) {
        text = "Naan eppavume jolly thaan thalaivaa! Aana intha terminal error paatha thaan konjam heart beat adhigam aagudhu! \u{1F602}";
      } else if (isSanthanam) {
        text = "Naan super-ah irukken nanba! Nee thaan terminal-ah paathu shock aagi ukkaanthirukka pola! \u{1F602}";
      } else if (isSmallBoy) {
        text = "Naan semma jolly-ah irukken anna! Innaiku unga kooda coding panna ready! \u{1F680}";
      }
      return { text, emotion: "happy" };
    }
    if (/who are you|yaar nee|un per|your name|intro/i.test(lower)) {
      let text = "Naan Maya! Unga cute & energetic VS Code pair programmer! \u{1F496}";
      if (isVadivelu) {
        text = "Aahaa! Enna oru kelvi! Naan thaan unga Vaigai Puyal Vadivelu! Kodai-kodaikku comedy coding buddy! \u{1F602}";
      } else if (isSanthanam) {
        text = "Naan Santhanam nanba! Counters king! Bugs vandha comedy pannuven, help venumna razor-sharp solution tharuven! \u{1F60E}";
      } else if (isSmallBoy) {
        text = "Naan Chotu anna! Unga thambi! Unga kooda ukkaanthu coding kathuka vandhirukken! \u{1F466}";
      }
      return { text, emotion: "happy" };
    }
    if (/error|bug|help|issue|fail|problem|stuck|fix/i.test(lower)) {
      if (summary && summary.diagnosticsSummary.errorCount > 0) {
        const top = summary.diagnosticsSummary.topErrors[0];
        if (isVadivelu) {
          return {
            text: `Aiyooo kadavule! ${top.file}:${top.line}-la "${top.message.slice(0, 50)}" nu error kaatudhu! Idhuku oru end card-e illaya?! \u{1F631}`,
            emotion: "confused"
          };
        } else if (isSanthanam) {
          return {
            text: `Adadada! ${top.file}:${top.line}-la syntax error! Enna thalaivaa, bracket poduradhula kuda kanjathanam ah?! \u{1F602}`,
            emotion: "confused"
          };
        } else if (isSmallBoy) {
          return {
            text: `Aiyoo anna! ${top.file}:${top.line}-la error vanthuruchu! Naan coffee eduthu varava, relax aagi fix pannunga! \u{1F97A}`,
            emotion: "sad"
          };
        }
        return {
          text: `Aiyooo! ${top.file}:${top.line}-la "${top.message.slice(0, 70)}" error irukku. Type definition check pannalama? \u{1F914}`,
          emotion: "confused"
        };
      }
      return {
        text: isVadivelu ? "Kadavule! Enna aachu thalaivaa? Sanda na satta kizhiyathaan seiyum! Code-ah kaatu, thamsam pannidalam! \u{1F6E0}\uFE0F" : isSanthanam ? "Nanba, tension aagadha! Entha line-la error-nu sollu, counter attack panni fix pannuvom! \u26A1" : isSmallBoy ? "Anna! Kavalaiye padatheenga, namma sernthu intha bug-ah thurathi vidalam! \u{1F4AA}" : "Kavalai padadha! Bug enga irukku nu paapom! Code explain pannu, namma sernthu fix pannuvom! \u{1F41E}",
        emotion: "thinking"
      };
    }
    if (/project|workspace|stack|tech|repo/i.test(lower)) {
      const proj = summary?.projectName || "Active Workspace";
      const lang = summary?.primaryLanguage || "Code";
      const test = summary?.testFramework ? `, Testing: ${summary.testFramework}` : "";
      return {
        text: isVadivelu ? `Namma project ${proj} (${lang}${test}) vera level thalaivaa! Aahaa enna oru setup! \u{1F525}` : isSanthanam ? `Project ${proj} semma setup nanba! Coding speed pathu terminal-ye bayanthu odudhu! \u{1F680}` : isSmallBoy ? `Anna! Namma project ${proj} semmaya irukku! Naanum intha ${lang} kathuka poren! \u2728` : `Namma current project: ${proj} (${lang}${test})! Mass-ah develop panrom! \u{1F525}`,
        emotion: "happy"
      };
    }
    return {
      text: isVadivelu ? `Aahaa! "${userText}" semma matter thalaivaa! Vella pannalam vella pannalam! \u{1F602}` : isSanthanam ? `Nanba! "${userText}" super point! Fast-ah coding mudichitu tea saapda polam! \u2615` : isSmallBoy ? `Semma anna! "${userText}" kettu semma jolly-ah irukku! Coding continue pannunga anna! \u{1F680}` : `Super da! "${userText}" semma! Namma work semma speed-ah poguthu! \u2728`,
      emotion: "speaking"
    };
  }
  async generateProactiveMessage(eventType, gender, summary, geminiService) {
    const isFemale = gender === "female";
    if (geminiService) {
      let prompt = "";
      switch (eventType) {
        case "BUG_FIXED":
          prompt = `The developer just fixed all errors in their project! Give a super enthusiastic 1-sentence celebration in lively Tanglish.`;
          break;
        case "TEST_PASSED":
          prompt = `All tests in ${summary?.testFramework || "the project"} just passed! Celebrate in 1 exciting, funny Tanglish sentence!`;
          break;
        case "TEST_FAILED":
          prompt = `Tests just failed. Give a funny, comforting 1-sentence Tanglish reaction offering to check logs.`;
          break;
        case "REPEATED_ERROR":
          prompt = `The developer encountered the same error again: "${summary?.diagnosticsSummary?.topErrors[0]?.message || "error"}". Give a helpful 1-sentence Tanglish suggestion.`;
          break;
        case "LONG_CODING_BURST":
          prompt = `The developer has been coding non-stop for 25 minutes. Ask them warmly in 1-sentence Tanglish if they want a tea/coffee break.`;
          break;
        case "IDLE_CHECKIN":
          prompt = `The developer has been inactive for a few minutes. Check in with a friendly, witty 1-sentence Tanglish question.`;
          break;
        case "RANDOM_JOKE":
          prompt = `Tell a short, hilarious 1-sentence programmer joke in Tanglish.`;
          break;
        default:
          prompt = `Give a friendly 1-sentence Tanglish observation about coding today.`;
      }
      try {
        const reply = await geminiService.generateReply(prompt, gender, void 0, summary);
        if (reply && reply.text) {
          return reply;
        }
      } catch (e) {
      }
    }
    switch (eventType) {
      case "BUG_FIXED":
        return {
          text: isFemale ? "Finally! \u{1F602} Bug poiduchu! Semma mass da! Super coding!" : "Aha! Bug clean aagiduchu bro! Vera level debugging skills!",
          emotion: "happy"
        };
      case "TEST_PASSED":
        return {
          text: isFemale ? "Mass! \u{1F525} All tests passed! Innaiku unakku party thaan!" : "Super bro! Green ticks everywhere! Test ellam semma-ah pass!",
          emotion: "happy"
        };
      case "TEST_FAILED":
        return {
          text: isFemale ? "Aiyooo! \u{1F602} Test fail aagiduchu. Kavalai padadha, log check pannuvoma?" : "Oops! Oru test miss aachu bro. Assertion check pannalama?",
          emotion: "confused"
        };
      case "REPEATED_ERROR":
        return {
          text: isFemale ? "Hey! Same error thirumba varuthu. Type definition check pannalama?" : "Bro, idhe error thirumba varudhu. Root cause paakuriya?",
          emotion: "confused"
        };
      case "LONG_CODING_BURST":
        return {
          text: isFemale ? "Heyyy! Romba nerama non-stop ah code panra! Oru tea/coffee break edukkuriya? \u2615" : "Thalaiva! 25 minutes continuous coding! Konjam stretch panni coffee kudi! \u2615",
          emotion: "happy"
        };
      case "IDLE_CHECKIN":
        return {
          text: isFemale ? "Enna amaidhiya irukka? Code logic yosikriya illa Instagram reels ah? \u{1F602}" : "Enna thalaiva thinking mode ah? Illa snack thedurangala? \u{1F602}",
          emotion: "laughing"
        };
      case "RANDOM_JOKE":
      default:
        return this.getRandomJoke();
    }
  }
};

// src/extension/services/proactiveEngine.ts
var vscode5 = __toESM(require("vscode"));
var ProactiveDecisionEngine = class {
  constructor(personalityEngine, contextEngine, geminiService, callbacks) {
    this.personalityEngine = personalityEngine;
    this.contextEngine = contextEngine;
    this.geminiService = geminiService;
    this.callbacks = callbacks;
  }
  lastProactiveTimestamp = 0;
  codingActivityStart = Date.now();
  lastUserActivityTime = Date.now();
  checkIntervalTimer = null;
  recentMessagesHistory = /* @__PURE__ */ new Set();
  activate() {
    this.checkIntervalTimer = setInterval(() => {
      this.evaluatePeriodicTriggers();
    }, 45e3);
  }
  recordUserActivity() {
    this.lastUserActivityTime = Date.now();
  }
  async evaluateEvent(eventType) {
    const config = vscode5.workspace.getConfiguration("aiBuddy");
    const frequency = config.get("conversationFrequency", "medium");
    const quietMode = config.get("quietMode", false);
    const voiceGender = config.get("voiceGender", "female");
    if (frequency === "off") {
      return false;
    }
    const cooldownMs = this.getCooldownDuration(frequency);
    const now = Date.now();
    const timeSinceLast = now - this.lastProactiveTimestamp;
    const isHighPriority = eventType === "TEST_PASSED" || eventType === "BUG_FIXED";
    const effectiveCooldown = isHighPriority ? cooldownMs * 0.4 : cooldownMs;
    if (timeSinceLast < effectiveCooldown) {
      return false;
    }
    const summary = this.contextEngine.getCurrentSummary() || await this.contextEngine.analyzeWorkspace();
    const message = await this.personalityEngine.generateProactiveMessage(
      eventType,
      voiceGender,
      summary,
      this.geminiService
    );
    const normalized = message.text.toLowerCase().trim();
    if (this.recentMessagesHistory.has(normalized)) {
      return false;
    }
    this.recentMessagesHistory.add(normalized);
    if (this.recentMessagesHistory.size > 20) {
      this.recentMessagesHistory.clear();
    }
    this.lastProactiveTimestamp = now;
    this.callbacks.onProactiveSpeech(message.text, message.emotion, voiceGender, eventType);
    return true;
  }
  async evaluatePeriodicTriggers() {
    const now = Date.now();
    const idleDuration = now - this.lastUserActivityTime;
    const codingDuration = now - this.codingActivityStart;
    if (codingDuration > 25 * 60 * 1e3 && idleDuration < 2 * 60 * 1e3) {
      const triggered = await this.evaluateEvent("LONG_CODING_BURST");
      if (triggered) {
        this.codingActivityStart = now;
      }
      return;
    }
    if (idleDuration > 6 * 60 * 1e3 && idleDuration < 12 * 60 * 1e3) {
      await this.evaluateEvent("IDLE_CHECKIN");
    }
  }
  getCooldownDuration(frequency) {
    switch (frequency) {
      case "high":
        return 12e4;
      // 2 minutes
      case "low":
        return 48e4;
      // 8 minutes
      case "off":
        return Infinity;
      case "medium":
      default:
        return 24e4;
    }
  }
  dispose() {
    if (this.checkIntervalTimer) {
      clearInterval(this.checkIntervalTimer);
      this.checkIntervalTimer = null;
    }
  }
};

// src/extension/extension.ts
function activate(context) {
  console.log("AI Buddy activating with Proactive Personality & Humour Engine...");
  const secretStorage = new SecretStorageService(context.secrets);
  const contextEngine = new ContextEngine();
  const personalityEngine = new PersonalityEngine();
  const geminiService = new GeminiService(secretStorage, contextEngine, personalityEngine);
  let characterProvider;
  const proactiveEngine = new ProactiveDecisionEngine(
    personalityEngine,
    contextEngine,
    geminiService,
    {
      onProactiveSpeech: (text, emotion, voiceGender, category) => {
        console.log(`[AI Buddy Proactive] (${category}): ${text}`);
        if (characterProvider) {
          characterProvider.sendProactiveSpeech(text, emotion, voiceGender, category);
        }
      }
    }
  );
  characterProvider = new CharacterViewProvider(
    context.extensionUri,
    secretStorage,
    geminiService,
    contextEngine,
    personalityEngine,
    proactiveEngine
  );
  const workspaceMonitor = new WorkspaceMonitorService(contextEngine, proactiveEngine, {
    onContextChanged: (summary) => {
      characterProvider.sendContextUpdate(summary);
    },
    onErrorAlert: (alertText, topError) => {
      console.log(`[AI Buddy Error Alert] ${topError}`);
      characterProvider.sendWorkspaceAlert(alertText, "confused");
    },
    onTestTaskFinished: (success, taskName) => {
      if (success) {
        characterProvider.sendWorkspaceAlert(
          `Mass! \u{1F525} "${taskName}" successfully pass aagiduchu! Semma work!`,
          "happy"
        );
      } else {
        characterProvider.sendWorkspaceAlert(
          `Aiyooo! \u{1F602} "${taskName}" fail aagiduchu pola! Test logs check pannalama?`,
          "confused"
        );
      }
    }
  });
  proactiveEngine.activate();
  workspaceMonitor.activate();
  context.subscriptions.push({
    dispose: () => {
      proactiveEngine.dispose();
      workspaceMonitor.dispose();
    }
  });
  context.subscriptions.push(
    vscode6.window.registerWebviewViewProvider(CharacterViewProvider.viewType, characterProvider, {
      webviewOptions: {
        retainContextWhenHidden: true
      }
    })
  );
  context.subscriptions.push(
    vscode6.commands.registerCommand("aiBuddy.setApiKey", async () => {
      const apiKey = await vscode6.window.showInputBox({
        title: "AI Buddy: Enter Google Gemini API Key",
        prompt: "Get your free key from https://aistudio.google.com/app/apikey",
        password: true,
        placeHolder: "AIzaSy..."
      });
      if (apiKey !== void 0) {
        await secretStorage.setApiKey(apiKey);
        vscode6.window.showInformationMessage("AI Buddy: Gemini API Key saved successfully in SecretStorage!");
        characterProvider.postMessage({ type: "apiKeyStatus", hasKey: !!apiKey });
      }
    })
  );
  context.subscriptions.push(
    vscode6.commands.registerCommand("aiBuddy.tellJoke", () => {
      const joke = personalityEngine.getRandomJoke();
      const config = vscode6.workspace.getConfiguration("aiBuddy");
      const gender = config.get("voiceGender", "female");
      characterProvider.postMessage({
        type: "characterReply",
        text: joke.text,
        emotion: joke.emotion,
        voiceGender: gender
      });
    })
  );
  context.subscriptions.push(
    vscode6.commands.registerCommand("aiBuddy.analyzeWorkspace", async () => {
      const summary = await contextEngine.analyzeWorkspace();
      const config = vscode6.workspace.getConfiguration("aiBuddy");
      const gender = config.get("voiceGender", "female");
      const model = config.get("geminiModel", "gemini-1.5-flash");
      vscode6.window.withProgress(
        {
          location: vscode6.ProgressLocation.Notification,
          title: "AI Buddy is analyzing your workspace..."
        },
        async () => {
          const reply = await geminiService.analyzeCurrentProject(summary, gender, model);
          characterProvider.postMessage({
            type: "characterReply",
            text: reply.text,
            emotion: reply.emotion,
            voiceGender: gender
          });
        }
      );
    })
  );
  context.subscriptions.push(
    vscode6.commands.registerCommand("aiBuddy.explainError", async () => {
      const summary = await contextEngine.analyzeWorkspace();
      const config = vscode6.workspace.getConfiguration("aiBuddy");
      const gender = config.get("voiceGender", "female");
      const model = config.get("geminiModel", "gemini-1.5-flash");
      const reply = await geminiService.explainCurrentError(summary, gender, model);
      characterProvider.postMessage({
        type: "characterReply",
        text: reply.text,
        emotion: reply.emotion,
        voiceGender: gender
      });
    })
  );
  context.subscriptions.push(
    vscode6.commands.registerCommand("aiBuddy.toggleVoice", async () => {
      const config = vscode6.workspace.getConfiguration("aiBuddy");
      const current = config.get("voiceGender", "female");
      const next = current === "female" ? "male" : "female";
      await config.update("voiceGender", next, vscode6.ConfigurationTarget.Global);
      vscode6.window.showInformationMessage(
        `AI Buddy: Voice switched to ${next === "female" ? "Female (Maya)" : "Male (Vikram)"}`
      );
      characterProvider.postMessage({ type: "voiceChanged", gender: next });
    })
  );
  context.subscriptions.push(
    vscode6.commands.registerCommand("aiBuddy.resetSession", () => {
      geminiService.clearHistory();
      vscode6.window.showInformationMessage("AI Buddy: Conversation history reset.");
    })
  );
  console.log("AI Buddy extension fully activated with Proactive Conversations!");
}
function deactivate() {
  console.log("AI Buddy extension deactivated.");
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  activate,
  deactivate
});
/*! Bundled license information:

@google/generative-ai/dist/index.mjs:
@google/generative-ai/dist/index.mjs:
  (**
   * @license
   * Copyright 2024 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
*/
//# sourceMappingURL=extension.js.map
