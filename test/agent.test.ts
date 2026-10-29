import assert from "node:assert/strict";
import test from "node:test";
import { NexcoreAgent } from "../src/index.ts";
import type { AgentEvent, ChatMessage, ModelPort } from "../src/index.ts";

test("composes file, memory, context, approval, tool execution and trace in order", async () => {
  const events: AgentEvent[] = [];
  const contexts: ChatMessage[][] = [];
  let calls = 0;
  const model: ModelPort = {
    async complete({ messages }) {
      calls++;
      if (calls === 1) {
        assert.ok(messages.some(message => message.content.includes("File evidence")));
        assert.ok(messages.some(message => message.content.includes("Recalled project memory")));
        return {
          content: "I will inspect the file.",
          toolCalls: [{ id: "tool-1", name: "write_report", arguments: { path: "report.md" } }],
          usage: { inputTokens: 10, outputTokens: 5 }
        };
      }
      return { content: "done", usage: { inputTokens: 7, outputTokens: 2 } };
    }
  };
  const agent = new NexcoreAgent({
    model,
    context: {
      prepare({ messages }) {
        contexts.push([...messages]);
        return { messages, actions: ["budget-ok"] };
      }
    },
    memory: {
      async recall() {
        return { selected: [{ id: "m1", text: "Use Canvas.", source: "run-1", reasons: ["graph"] }] };
      }
    },
    files: {
      async read(file) {
        return { name: file.name, markdown: "# Requirements\nUse local rendering.", engine: "test", warnings: [] };
      }
    },
    approval: { async request() { return true; } },
    trace: { record(event) { events.push(event); } },
    tools: [{
      name: "write_report",
      description: "write a report",
      risk: "write",
      async execute(args) { return { ok: true, path: args.path }; }
    }]
  });
  const result = await agent.run({
    input: "write a report",
    workspace: "D:/project",
    attachments: [{ name: "brief.md", mime: "text/markdown", text: "# Requirements" }]
  });
  assert.equal(result.output, "done");
  assert.equal(result.steps, 2);
  assert.equal(result.usage.inputTokens, 17);
  assert.ok(events.some(event => event.type === "tool.approved" && event.approved));
  assert.ok(events.some(event => event.type === "tool.result"));
  assert.ok(events.some(event => event.type === "memory.recall"));
  assert.equal(contexts.length, 2);
});

test("rejection stops before the model call", async () => {
  let modelCalls = 0;
  const events: AgentEvent[] = [];
  const agent = new NexcoreAgent({
    model: { async complete() { modelCalls++; return { content: "should not run" }; } },
    context: { prepare: ({ messages }) => ({ messages, actions: [], rejection: "context budget exceeded" }) },
    trace: { record(event) { events.push(event); } }
  });
  await assert.rejects(agent.run({ input: "too much", workspace: "D:/project" }), /budget/);
  assert.equal(modelCalls, 0);
  assert.ok(events.some(event => event.type === "run.rejected"));
});

test("rejected approval produces a tool observation without side effects", async () => {
  let executed = 0;
  let calls = 0;
  const agent = new NexcoreAgent({
    model: {
      async complete() {
        calls++;
        return calls === 1
          ? { content: "write", toolCalls: [{ id: "t", name: "write", arguments: {} }] }
          : { content: "denied" };
      }
    },
    context: { prepare: ({ messages }) => ({ messages, actions: [] }) },
    approval: { async request() { return false; } },
    tools: [{ name: "write", description: "write", risk: "write", async execute() { executed++; return "written"; } }]
  });
  const result = await agent.run({ input: "write", workspace: "D:/project" });
  assert.equal(result.output, "denied");
  assert.equal(executed, 0);
});
