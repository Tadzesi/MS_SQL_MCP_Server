# MCP Response Handling Specification

## ADDED Requirements

### Requirement: Response Size Validation

The system SHALL validate all MCP tool responses against a configurable token limit before returning them to the client to prevent protocol errors from oversized responses.

#### Scenario: Response within token limit

- **WHEN** a tool returns data that serializes to fewer tokens than the configured limit
- **THEN** the system SHALL return the complete response without modification

#### Scenario: Array response exceeds token limit

- **WHEN** a tool returns an array that serializes to more tokens than the configured limit
- **THEN** the system SHALL truncate the array by reducing item count
- **AND** the system SHALL return a structured response containing:
  - `truncated: true` flag
  - `total_items`: original array length
  - `returned_items`: truncated array length
  - `data`: truncated array
  - `message`: user-friendly truncation message
- **AND** the system SHALL log a warning with tool name and truncation details

#### Scenario: Text response exceeds token limit

- **WHEN** a tool returns text/string content that exceeds the configured token limit
- **THEN** the system SHALL truncate the text at the character limit (limit * 4)
- **AND** the system SHALL append a truncation indicator to the text
- **AND** the system SHALL log a warning with tool name and truncation details

#### Scenario: Token limit disabled

- **WHEN** the configured max_response_tokens is set to 0
- **THEN** the system SHALL skip size validation entirely
- **AND** the system SHALL return all responses without truncation

### Requirement: Token Estimation

The system SHALL estimate response token count using a character-based approximation to avoid dependency on tokenizer libraries while maintaining safety margins.

#### Scenario: Estimate tokens for JSON response

- **WHEN** estimating tokens for a JSON response
- **THEN** the system SHALL serialize the data using `JSON.stringify(data, null, 2)`
- **AND** the system SHALL divide the character count by 4 to estimate tokens
- **AND** the system SHALL round up to ensure conservative estimates

#### Scenario: Estimate tokens for text response

- **WHEN** estimating tokens for a text response
- **THEN** the system SHALL divide the character count by 4 to estimate tokens
- **AND** the system SHALL round up to ensure conservative estimates

### Requirement: Response Size Configuration

The system SHALL provide a configurable maximum response token limit with a safe default value.

#### Scenario: Default configuration

- **WHEN** no max_response_tokens is configured
- **THEN** the system SHALL use a default limit of 30,000 tokens
- **AND** the default SHALL provide adequate safety margin below MCP protocol limits

#### Scenario: Custom configuration

- **WHEN** a user configures max_response_tokens in the limits section
- **THEN** the system SHALL use the configured value for response validation
- **AND** the system SHALL support values from 1 to 1,000,000 tokens

#### Scenario: Disabled truncation

- **WHEN** a user sets max_response_tokens to 0
- **THEN** the system SHALL disable truncation entirely
- **AND** the system SHALL return all responses unmodified

### Requirement: Truncation Logging

The system SHALL log truncation events to enable monitoring and debugging of response size issues.

#### Scenario: Log array truncation

- **WHEN** an array response is truncated
- **THEN** the system SHALL log a warning message containing:
  - Tool name
  - Original token count
  - Token limit
  - Original item count
  - Truncated item count

#### Scenario: Log text truncation

- **WHEN** a text response is truncated
- **THEN** the system SHALL log a warning message containing:
  - Tool name
  - Original token count
  - Token limit
  - Original character count
  - Truncated character count

#### Scenario: No logging when within limits

- **WHEN** a response is within the token limit
- **THEN** the system SHALL NOT log any truncation-related messages

### Requirement: User-Friendly Truncation Messages

The system SHALL provide clear, actionable messages when responses are truncated to help users understand what happened and how to get complete data.

#### Scenario: Array truncation message

- **WHEN** an array response is truncated
- **THEN** the truncation message SHALL include:
  - Clear indication that data was truncated
  - Total number of items available
  - Number of items returned
  - Suggestion to use pagination or filtering parameters

#### Scenario: Text truncation message

- **WHEN** a text response is truncated
- **THEN** the truncation indicator SHALL clearly mark the truncation point
- **AND** the indicator SHALL suggest the response was too large

### Requirement: Valid JSON Structure Preservation

The system SHALL ensure that truncated JSON responses maintain valid JSON structure and conform to expected schemas.

#### Scenario: Truncated array maintains JSON validity

- **WHEN** an array response is truncated
- **THEN** the returned JSON SHALL be parseable without errors
- **AND** the returned data SHALL be a valid array

#### Scenario: Truncated response includes metadata

- **WHEN** any response is truncated
- **THEN** the response object SHALL include truncation metadata
- **AND** the metadata SHALL not break existing client parsing logic
