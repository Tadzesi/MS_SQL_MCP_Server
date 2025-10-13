# Implementation Tasks

## 1. Analyze Current Tool Definitions

- [ ] 1.1 Count current token usage of tool definitions in getToolDefinitions()
- [ ] 1.2 Identify tools with most verbose descriptions
- [ ] 1.3 Document patterns of redundancy (optional suffixes, default values, limits)

## 2. Create Abbreviated Description Patterns

- [ ] 2.1 Define concise description template for each tool category (Schema, Query, Performance, etc.)
- [ ] 2.2 Create parameter description simplification rules
- [ ] 2.3 Document which information moves to CLAUDE.md vs stays in schema

## 3. Update Tool Descriptions

- [ ] 3.1 Shorten all tool `description` fields to essential purpose only
- [ ] 3.2 Remove "(optional)" suffixes from all parameter descriptions
- [ ] 3.3 Remove "(default: X)" annotations from all parameter descriptions
- [ ] 3.4 Remove "(max: Y)" and range annotations from all parameter descriptions
- [ ] 3.5 Simplify parameter descriptions to minimal useful info
- [ ] 3.6 Preserve enum values in schema for type safety

## 4. Verify Functionality

- [ ] 4.1 Build project (npm run build)
- [ ] 4.2 Test MCP server startup
- [ ] 4.3 Verify tool registration with MCP client
- [ ] 4.4 Confirm all 42 tools remain functional
- [ ] 4.5 Test sample tool calls for each category

## 5. Measure Token Reduction

- [ ] 5.1 Calculate new token count of tool definitions
- [ ] 5.2 Verify total is under 20,000 tokens (target: 20-23% reduction)
- [ ] 5.3 Run Claude Desktop doctor command to confirm warning resolved

## 6. Update Documentation

- [ ] 6.1 Update CLAUDE.md with comprehensive parameter defaults and limits
- [ ] 6.2 Ensure all removed details from schemas are documented in CLAUDE.md
- [ ] 6.3 Add note about schema optimization approach
