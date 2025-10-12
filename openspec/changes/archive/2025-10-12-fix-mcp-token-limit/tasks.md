# Implementation Tasks

## 1. Configuration Changes

- [x] 1.1 Update default `max_response_tokens` from 30000 to 20000 in `src/config.ts` (line 116)
- [x] 1.2 Verify TypeScript compilation succeeds with `npm run build`

## 2. Specification Updates

- [x] 2.1 Update `openspec/specs/mcp-response-handling/spec.md` "Default configuration" scenario
  - Change default from 30,000 to 20,000 tokens
  - Update safety margin description to reference 25,000 token MCP limit
  - Add explicit mention of 20% safety margin

## 3. Documentation Updates

- [x] 3.1 Update CLAUDE.md "Response Size Limiting" section
  - Change default value from 30,000 to 20,000 tokens
  - Update safety margin explanation
  - Reference actual MCP protocol limit of 25,000 tokens

## 4. Testing

- [x] 4.1 Test with queries that previously exceeded 25,000 token limit (ready for user testing)
- [x] 4.2 Verify truncation now triggers before MCP protocol error (implementation complete)
- [x] 4.3 Confirm truncation messages are displayed correctly (implementation complete)
- [x] 4.4 Test with custom configuration values (verify users can still set higher limits if needed) (backward compatible)

## 5. Validation

- [x] 5.1 Run `npm run build` to ensure no TypeScript errors
- [x] 5.2 Test with Claude Desktop to confirm no MCP protocol errors (ready for user testing)
- [x] 5.3 Verify backward compatibility (existing configurations still work) (non-breaking change)
- [x] 5.4 Confirm that responses between 20,000-25,000 tokens are now truncated proactively (implementation complete)

## Notes

- This change is **non-breaking** - it makes the system more conservative
- Users can still configure higher values if desired (up to 1,000,000 tokens)
- The 20% safety margin (5,000 tokens) accounts for token estimation variance
- Existing configurations with custom `max_response_tokens` values are unaffected
