export type ChatMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  toolCallId?: string;
};

export type AgentAttachment = {
  name: string;
  mime: string;
  bytes?: Uint8Array;
  text?: string;
};

export type FileEvidence = {
  name: string;
  markdown: string;
  engine: string;
  warnings: string[];
};

export type VisionEvidence = {
  name: string;
  markdown: string;
  engine: string;
  warnings: string[];
};

export type RecalledMemory = {
  id: string;
  text: string;
  source?: string;
  reasons?: string[];
  score?: number;
};

export type ToolCall = {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
};

export type ModelResult = {
  content: string;
  toolCalls?: ToolCall[];
  usage?: { inputTokens?: number; outputTokens?: number; cost?: number };
};

export type ModelRequest = {
  messages: ChatMessage[];
  tools: ToolDefinition[];
  signal?: AbortSignal;
};

export type ToolDefinition = {
  name: string;
  description: string;
  risk: "read" | "write" | "command" | "network";
  approve?: boolean;
  execute: (args: Record<string, unknown>, context: { workspace: string; signal?: AbortSignal }) => Promise<unknown>;
};

export type AgentEvent =
  | { type: "run.start"; workspace: string; input: string }
  | { type: "file.read"; evidence: FileEvidence }
  | { type: "vision.read"; evidence: VisionEvidence }
  | { type: "memory.recall"; selected: RecalledMemory[]; omitted?: number }
  | { type: "context.governed"; actions: string[] }
  | { type: "model.reply"; step: number; usage?: ModelResult["usage"] }
  | { type: "tool.request"; step: number; call: ToolCall; risk: ToolDefinition["risk"] }
  | { type: "tool.approved"; call: ToolCall; approved: boolean }
  | { type: "tool.result"; call: ToolCall; result: unknown }
  | { type: "run.end"; output: string; steps: number }
  | { type: "run.rejected"; reason: string };

export interface FileReaderPort {
  read(file: AgentAttachment): Promise<FileEvidence>;
}

export interface VisionPort {
  analyze(file: AgentAttachment, question: string): Promise<VisionEvidence>;
}

export interface MemoryPort {
  recall(input: { query: string; workspace: string }): Promise<{ selected: RecalledMemory[]; omitted?: number }>;
}

export interface ContextPort {
  prepare(input: {
    messages: ChatMessage[];
    workspace: string;
    safety: string;
  }): Promise<{ messages: ChatMessage[]; actions: string[]; rejection?: string }> | { messages: ChatMessage[]; actions: string[]; rejection?: string };
}

export interface ModelPort {
  complete(request: ModelRequest): Promise<ModelResult>;
}

export interface ApprovalPort {
  request(input: { workspace: string; call: ToolCall; definition: ToolDefinition }): Promise<boolean>;
}

export interface TracePort {
  record(event: AgentEvent): void | Promise<void>;
}

export type AgentRunInput = {
  input: string;
  workspace: string;
  safety?: string;
  attachments?: AgentAttachment[];
  signal?: AbortSignal;
  maxSteps?: number;
};

export type AgentRunResult = {
  output: string;
  messages: ChatMessage[];
  steps: number;
  usage: { inputTokens: number; outputTokens: number; cost: number };
};
