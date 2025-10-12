# MODIFIED Requirements

## Requirement: Response Size Configuration

The system SHALL provide a configurable maximum response token limit with a safe default value.

### Scenario: Default configuration

- **WHEN** no max_response_tokens is configured
- **THEN** the system SHALL use a default limit of 20,000 tokens
- **AND** the default SHALL provide a 20% safety margin below the MCP protocol limit of 25,000 tokens

### Scenario: Custom configuration

- **WHEN** a user configures max_response_tokens in the limits section
- **THEN** the system SHALL use the configured value for response validation
- **AND** the system SHALL support values from 1 to 1,000,000 tokens

### Scenario: Disabled truncation

- **WHEN** a user sets max_response_tokens to 0
- **THEN** the system SHALL disable truncation entirely
- **AND** the system SHALL return all responses unmodified
