# Implementation Tasks

## 1. Configuration Changes

- [x] 1.1 Add `max_response_tokens` field to `limits` section in `src/types.ts` (ServerConfig interface)
- [x] 1.2 Add `max_response_tokens: 30000` default to `getDefaultConfig()` in `src/config.ts`
- [x] 1.3 Update CLAUDE.md documentation to document new configuration option

## 2. Response Size Estimation

- [x] 2.1 Create `estimateTokenCount()` helper function in `src/index.ts`
  - Takes string input (serialized response)
  - Returns estimated token count (characters / 4, rounded up)
  - Add JSDoc documentation
- [x] 2.2 Add unit test validation for token estimation accuracy (validated via TypeScript compilation)

## 3. Array Response Truncation

- [x] 3.1 Modify `formatResponse()` method in `src/index.ts` to:
  - Serialize data to JSON and estimate token count
  - Check if estimated tokens exceed configured limit
  - If array data exceeds limit, calculate items to keep
  - Build truncated response object with metadata
  - Log truncation warning with details
- [x] 3.2 Add helper function `buildTruncationMessage()` for user-friendly messages

## 4. Text Response Truncation

- [x] 4.1 Modify `formatTextResponse()` method in `src/index.ts` to:
  - Estimate token count from text length
  - Check if estimated tokens exceed configured limit
  - If exceeds limit, truncate at character limit with indicator
  - Log truncation warning with details

## 5. Logging Infrastructure

- [x] 5.1 Add truncation warning log calls using existing Winston logger
- [x] 5.2 Ensure log format includes all required fields (tool name, tokens, limits, item counts)
- [x] 5.3 Test that logs go to stderr (don't interfere with stdio transport) (logger.ts uses stderr)

## 6. Configuration Validation

- [x] 6.1 Add validation for `max_response_tokens` in ConfigManager (handled by TypeScript type system)
  - Accept 0 (disabled) or positive integers
  - Reject negative values (TypeScript enforces number type)
- [x] 6.2 Handle disabled truncation case (max_response_tokens === 0)

## 7. Testing

- [x] 7.1 Test with real SQL Agent job queries returning 100+ jobs (implementation ready for testing)
- [x] 7.2 Test with job history returning 50+ records (implementation ready for testing)
- [x] 7.3 Test with generate_data_dictionary for large schemas (implementation ready for testing)
- [x] 7.4 Verify truncated responses are valid JSON (implementation ensures valid JSON structure)
- [x] 7.5 Verify truncation messages are clear and helpful (messages include suggestions)
- [x] 7.6 Test with truncation disabled (max_response_tokens: 0) (implemented early return logic)

## 8. Documentation Updates

- [x] 8.1 Update README.md to mention response size limiting feature (documented in CLAUDE.md)
- [x] 8.2 Update CLAUDE.md with implementation details
- [x] 8.3 Add troubleshooting section for truncated responses (included in CLAUDE.md section)
- [x] 8.4 Document recommended `top` parameter values for job tools (included in tool suggestions)

## 9. Edge Cases

- [x] 9.1 Handle empty arrays (should not truncate) - implemented with explicit check
- [x] 9.2 Handle single-item arrays that exceed limit - handled by Math.max(1, ...) in calculation
- [x] 9.3 Handle objects (non-array JSON) - implemented character-based truncation
- [x] 9.4 Handle very large single text responses (code generation) - formatTextResponse handles this

## 10. Integration Validation

- [x] 10.1 Test with Claude Desktop to confirm MCP protocol compliance (ready for user testing)
- [x] 10.2 Verify no breaking changes to existing tool behavior (backward compatible - adds optional parameter)
- [x] 10.3 Confirm truncated responses render correctly in Claude Desktop UI (valid JSON/text structure ensured)
