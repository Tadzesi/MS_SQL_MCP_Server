# Response Size Limiting Design

## Context

The MS SQL MCP Server uses the Model Context Protocol (MCP) over stdio transport to communicate with Claude Desktop. MCP has token limits for tool responses (~35,808 tokens observed in practice). When tools return large datasets (e.g., 100+ SQL Agent jobs with full descriptions, 50+ job history records with error messages, or generated DbContext code for 50+ tables), the serialized JSON response exceeds this limit, causing protocol errors.

**Current Behavior**:
- All responses formatted via `JSON.stringify(data, null, 2)` in `src/index.ts:1060`
- No size validation before returning data
- Large responses cause MCP protocol failures
- No user feedback about truncation

**Constraints**:
- Must maintain backward compatibility (no breaking changes)
- Must preserve full functionality for responses within limits
- Must provide clear user feedback when truncation occurs
- Cannot modify MCP SDK or protocol (client-side constraint)

## Goals / Non-Goals

**Goals**:
- Prevent MCP protocol errors from oversized responses
- Provide informative truncation messages with summary statistics
- Make maximum response size configurable
- Log truncation events for monitoring
- Maintain full JSON structure for truncated responses (valid JSON)

**Non-Goals**:
- Implementing pagination (requires tool signature changes - future enhancement)
- Streaming responses (MCP protocol limitation)
- Compressing responses (adds complexity, limited benefit)
- Modifying individual tool implementations (keep changes centralized)

## Decisions

### Token Estimation Strategy

**Decision**: Use character-based estimation (1 token ≈ 4 characters) rather than actual token counting.

**Rationale**:
- Character counting is fast and deterministic
- Token counting libraries (e.g., `tiktoken`) add dependencies and complexity
- 4:1 ratio provides safe conservative estimate
- Claude's tokenizer overhead (JSON structure) is accounted for by conservative ratio

**Alternatives considered**:
- Actual token counting: Too slow, adds dependencies, overkill for safety check
- Byte-based estimation: Less intuitive, doesn't align with token semantics

### Truncation Approach

**Decision**: Truncate array responses by reducing item count; truncate text responses by character limit.

**Rationale**:
- Array truncation (JSON responses): Maintains valid JSON structure, preserves schema
- Text truncation (code generation): Simple substring with ellipsis
- User gets partial data plus clear indication of truncation

**Implementation**:
```typescript
// Array truncation
if (Array.isArray(data) && estimatedTokens > limit) {
  const itemsToKeep = Math.floor(data.length * (limit / estimatedTokens));
  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        truncated: true,
        total_items: data.length,
        returned_items: itemsToKeep,
        data: data.slice(0, itemsToKeep),
        message: `Response truncated: showing ${itemsToKeep} of ${total_items} items`
      }, null, 2)
    }]
  };
}

// Text truncation
if (typeof data === 'string' && estimatedTokens > limit) {
  const charLimit = limit * 4;
  return {
    content: [{
      type: 'text',
      text: data.substring(0, charLimit) + '\n\n[... Response truncated ...]'
    }]
  };
}
```

**Alternatives considered**:
- Field-level truncation: Too complex, loses data context
- Compression: Adds complexity, limited benefit for text data
- Error on overflow: Worse UX than graceful truncation

### Configuration

**Decision**: Add `max_response_tokens` to `limits` section in config with default of 30,000 tokens.

**Rationale**:
- 30,000 token limit provides ~15% safety margin below observed 35,808 limit
- Configurable allows users to adjust based on their MCP client capabilities
- Grouped with existing `limits` configuration (max_rows, query_timeout_seconds)

**Configuration in `src/config.ts`**:
```typescript
limits: {
  max_rows: 10000,
  query_timeout_seconds: 30,
  max_response_tokens: 30000  // NEW
}
```

**Alternatives considered**:
- Fixed limit: Less flexible, but simpler - rejected for configurability
- Per-tool limits: Too granular, maintenance burden
- Dynamic limits based on response type: Complex, limited value

### Logging

**Decision**: Log truncation events to stderr (existing Winston logger) with tool name and truncation details.

**Rationale**:
- Helps monitor which tools frequently hit limits
- Aids debugging and capacity planning
- Uses existing logging infrastructure
- Doesn't interfere with stdio MCP transport

**Log format**:
```
WARN: Response truncated for tool 'mssql_list_jobs': 45000 tokens > 30000 limit (reduced from 200 to 133 items)
```

## Risks / Trade-offs

### Risk: User confusion about partial data

**Mitigation**:
- Clear truncation messages in response
- Include summary statistics (total vs. returned items)
- Suggest pagination parameters in message

### Risk: Token estimation inaccuracy

**Mitigation**:
- Conservative 4:1 character:token ratio provides safety margin
- 30,000 token default limit (vs. 35,808 observed max) adds buffer
- Log actual sizes to monitor estimation accuracy

### Trade-off: Truncation vs. Error

**Choice**: Truncate with warning rather than fail with error.

**Rationale**:
- Partial data is more useful than no data
- User can refine query (add filters, pagination) after seeing partial results
- Maintains system stability

## Migration Plan

**Phase 1**: Implement response size limiting (this change)
- Add configuration option
- Implement truncation logic in `formatResponse()` and `formatTextResponse()`
- Add logging

**Phase 2** (Future Enhancement): Add pagination support
- Modify tool signatures to support `offset` and `limit` parameters
- Update tool implementations
- Document pagination patterns

**Rollback**: Remove size limiting if issues arise - no breaking changes, simple revert.

## Open Questions

1. **Q**: Should we provide a way to disable truncation entirely?
   **A**: Yes - allow `max_response_tokens: 0` to disable (infinite limit).

2. **Q**: Should truncation messages include suggestions for refining queries?
   **A**: Yes - include tool-specific suggestions (e.g., "Use `top` parameter to limit results").

3. **Q**: Should we track truncation metrics?
   **A**: Start with logging; consider metrics collection in future based on operational needs.
