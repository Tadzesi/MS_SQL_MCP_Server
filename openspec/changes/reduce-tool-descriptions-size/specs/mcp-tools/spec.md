# MCP Tools Specification

## ADDED Requirements

### Requirement: Concise Tool Descriptions

The system SHALL provide concise tool descriptions that fit within MCP protocol token limits while maintaining usability.

#### Scenario: Tool description size compliance
- **WHEN** the MCP server registers tools with the MCP protocol
- **THEN** the total token count of all tool descriptions MUST be under 25,000 tokens
- **AND** each tool description MUST contain only essential purpose information
- **AND** each tool description MUST omit implementation details, defaults, and limits

#### Scenario: Parameter description brevity
- **WHEN** defining tool input schema parameter descriptions
- **THEN** each parameter description MUST contain only the parameter's purpose or type
- **AND** descriptions MUST NOT include "(optional)" suffixes (optionality indicated by required array)
- **AND** descriptions MUST NOT include default values or limits (documented elsewhere)
- **AND** descriptions MUST NOT repeat information already present in parameter name or type

### Requirement: MCP Tool Schema Optimization

The system SHALL optimize MCP tool input schemas for minimal token usage without losing essential information.

#### Scenario: Redundancy elimination
- **WHEN** defining tool parameters
- **THEN** optionality MUST be indicated via the `required` array only
- **AND** default values MUST be documented in implementation or CLAUDE.md, not in MCP schema
- **AND** validation limits MUST be enforced in code, not described in MCP schema
- **AND** enum values remain in schema for type safety

#### Scenario: Information preservation
- **WHEN** reducing description verbosity
- **THEN** parameter names MUST remain clear and self-documenting
- **AND** tool functionality MUST remain unchanged
- **AND** comprehensive documentation MUST remain in CLAUDE.md
- **AND** client code behavior MUST not change
