# NexcoreAgent

> A thin, inspectable orchestration layer for local-first AI agents. It composes existing
> capabilities instead of rebuilding them.

This framework is the coordination layer extracted from NexcoreWork:

```text
document / image
  → NexcoreFileRead / NexcoreVision
  → NexcoreMemory recall
  → Nexcore Context Governor
  → model
  → tool approval gateway
  → tool result as observation
  → trace / recall receipt
  → answer or next step
```

The framework deliberately owns no database, no model SDK and no OCR engine. Those are
replaceable ports supplied by the host application.

## Why another agent framework?

Most loops stop at “call model, call tool, repeat”. NexcoreAgent makes the boundaries explicit:

- file and vision evidence are read before the model call;
- memory recall happens inside a workspace boundary;
- context is governed before every model request;
- write and command tools require approval bound to the exact call;
- tool results return to the model as observations;
- every stage emits a trace event.

## Quick start

```bash
git clone https://github.com/yan-stone-computer/NexcoreAgent.git
cd NexcoreAgent
npm install
npm run check
```

```ts
import { NexcoreAgent } from "nexcore-agent";

const agent = new NexcoreAgent({
  model,
  context,
  memory,
  files,
  vision,
  approval,
  trace,
  tools,
});

const result = await agent.run({
  input: "Read the brief, update the report, and verify it.",
  workspace: "D:/projects/example",
  attachments,
  maxSteps: 20,
});
```

## Ports

| Port | Responsibility |
|---|---|
| `FileReaderPort` | Turn a local document into bounded Markdown evidence |
| `VisionPort` | Turn an image into visual evidence text |
| `MemoryPort` | Return workspace-scoped memories and reasons |
| `ContextPort` | Budget, compact, reject or preserve safety constraints |
| `ModelPort` | Call any model provider |
| `ApprovalPort` | Approve a write/command call with its exact payload |
| `TracePort` | Persist run events and explain what happened |

The default safety text states what the framework itself enforces and leaves policy details to
the host.

## Composition with Nexcore open results

- [nexcore-context-governor](https://github.com/yan-stone-computer/nexcore-context-governor)
- [NexcoreMemory](https://github.com/yan-stone-computer/NexcoreMemory)
- [NexcoreFileRead](https://github.com/yan-stone-computer/NexcoreFileRead)
- [NexcoreVision](https://github.com/yan-stone-computer/NexcoreVision)

Each adapter is optional. The host can use the complete NexcoreWork application, selected modules,
or another implementation with the same contract.

## Design limits

- The loop is serial and easy to inspect; it does not pretend to provide distributed execution.
- Tool side effects are never retried automatically.
- Approval defaults to deny when no approval port is configured.
- The host must enforce workspace path resolution inside its tools.
- The framework emits events but does not persist them; persistence belongs to `TracePort`.

## License

MIT.
