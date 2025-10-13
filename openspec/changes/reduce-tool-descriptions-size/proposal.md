# Proposal: Reduce MCP Tool Descriptions Size

## Why

The MCP server's tool definitions context (~26,224 tokens) exceeds the MCP protocol limit of 25,000 tokens, triggering warnings from Claude Desktop's doctor command. This prevents optimal tool discovery and may cause issues with MCP client compatibility.

The excessive size comes from verbose descriptions in 42 tool definitions, where each parameter includes detailed explanations like "(default: X, max: Y)" and optional status markers "(optional)" that add significant token overhead.

## What Changes

- Shorten tool `description` fields to concise, essential-only summaries (remove implementation details)
- Remove redundant text from parameter descriptions:
  - Remove "(optional)" suffix - optionality is already indicated by `required` array
  - Remove default values and limits - these belong in code/docs, not MCP schema
  - Remove "(default: X)" and "(max: Y)" annotations
- Reduce parameter `description` to minimal useful info (typically just the parameter purpose)
- Target: Reduce tool context from ~26,224 tokens to under 20,000 tokens (~23% reduction)

## Impact

- **Affected specs**: `mcp-tools` (new capability spec)
- **Affected code**: `src/index.ts` (getToolDefinitions method, lines 102-667)
- **Breaking**: No - tool names, parameters, and types remain unchanged
- **Benefits**:
  - Resolves MCP protocol limit warning
  - Improves tool discovery performance
  - Maintains full functionality
  - Documentation/defaults remain in CLAUDE.md and tool implementation
