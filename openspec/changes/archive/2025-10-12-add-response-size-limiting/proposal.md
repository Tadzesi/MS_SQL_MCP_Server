# Add Response Size Limiting for MCP Tools

## Why

MCP tool responses can exceed the maximum token limit (35,808 tokens) when returning large datasets, particularly from SQL Agent job tools (`mssql_list_jobs`, `mssql_job_history`, `mssql_analyze_job_failures`), documentation generation (`mssql_generate_data_dictionary`), and code generation tools (`mssql_generate_dbcontext` for large schemas). This causes MCP protocol errors and degrades the user experience.

## What Changes

- Add response size validation before returning data to MCP clients
- Implement truncation mechanism with informative messages when responses exceed safe limits
- Add configuration option for maximum response size (with sensible default)
- Provide summary statistics when full response is truncated
- Log truncation events for monitoring and debugging

## Impact

- **Affected specs**: `mcp-response-handling` (new capability)
- **Affected code**:
  - `src/index.ts` (lines 1055-1075: `formatResponse()` and `formatTextResponse()` methods)
  - `src/config.ts` (add `max_response_tokens` configuration option)
  - `src/types.ts` (add response metadata types)
- **Breaking changes**: None - this is a graceful degradation feature
- **Benefits**:
  - Prevents MCP protocol errors from oversized responses
  - Provides clear feedback when data is truncated
  - Maintains system stability for large result sets
