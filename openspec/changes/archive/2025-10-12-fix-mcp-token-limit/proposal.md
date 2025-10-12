# Fix MCP Token Limit to Match Protocol Constraints

## Why

Production testing revealed that `mssql_execute_query` responses are exceeding the actual MCP protocol limit of 25,000 tokens (error showed 38,903 tokens). Our current default `max_response_tokens` is set to 30,000, which is **higher** than the actual MCP limit of 25,000. This means responses between 25,000-30,000 tokens are not truncated by our system but still fail at the MCP protocol level.

**Error observed**: `Error: MCP tool "mssql_execute_query" response (38903 tokens) exceeds maximum allowed tokens (25000)`

## What Changes

- Lower default `max_response_tokens` from 30,000 to 20,000 tokens
- Provides 20% safety margin below the actual MCP protocol limit (25,000 tokens)
- Update specification to reflect correct default value
- Update documentation to clarify the actual MCP limit

## Impact

- **Affected specs**: `mcp-response-handling` (modify existing spec)
- **Affected code**:
  - `src/config.ts` (line 116: change default from 30000 to 20000)
  - `CLAUDE.md` (update default value documentation)
- **Breaking changes**: None - this makes the system MORE conservative
- **Benefits**:
  - Prevents MCP protocol errors by staying well below the 25,000 token limit
  - Responses will be truncated before hitting protocol limits
  - Better user experience with proactive truncation
  - 20% safety margin accounts for token estimation variance
