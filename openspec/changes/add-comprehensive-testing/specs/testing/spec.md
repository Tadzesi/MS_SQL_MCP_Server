# Testing Capability

## ADDED Requirements

### Requirement: Unit Test Coverage for Core Components

The testing system SHALL provide comprehensive unit tests for all core components to ensure reliability and enable safe refactoring.

#### Scenario: ConfigManager initialization with valid environment variables

- **WHEN** ConfigManager is instantiated with `MSSQL_LOCAL_*` environment variables set
- **THEN** configuration SHALL be loaded successfully
- **AND** connection profiles SHALL be created for each environment prefix (LOCAL, PROD, DEV)
- **AND** `current_connection` SHALL default to 'local' if available, otherwise first available profile

#### Scenario: ConfigManager handles missing connection profiles

- **WHEN** no `MSSQL_*` environment variables are set
- **THEN** constructor SHALL throw descriptive error with configuration examples
- **AND** error message SHALL include both SQL and Windows authentication examples
- **AND** error message SHALL specify required environment variable patterns

#### Scenario: ConfigManager switch connection

- **WHEN** `setCurrentConnection()` is called with valid profile name
- **THEN** `current_connection` SHALL be updated
- **AND** subsequent calls to `getCurrentConnection()` SHALL return the new profile
- **WHEN** `setCurrentConnection()` is called with invalid profile name
- **THEN** error SHALL be thrown with descriptive message

#### Scenario: DatabaseManager connection pooling

- **WHEN** `getConnection()` is called multiple times with same connection config
- **THEN** existing connection pool SHALL be reused
- **AND** new pool SHALL NOT be created
- **WHEN** `getConnection()` is called with different connection config
- **THEN** new connection pool SHALL be created
- **AND** pools SHALL be tracked separately by connection key

#### Scenario: DatabaseManager validates read-only queries

- **WHEN** `validateReadOnlyQuery()` is called with SELECT statement
- **THEN** validation SHALL pass without error
- **WHEN** `validateReadOnlyQuery()` is called with INSERT statement
- **THEN** error SHALL be thrown with message about read-only operations
- **WHEN** `validateReadOnlyQuery()` is called with UPDATE, DELETE, DROP, TRUNCATE, ALTER, or CREATE statements
- **THEN** error SHALL be thrown for each dangerous operation
- **WHEN** `validateReadOnlyQuery()` is called with statement starting with WITH (CTE)
- **THEN** validation SHALL pass
- **WHEN** `validateReadOnlyQuery()` is called with EXEC or sp_executesql
- **THEN** error SHALL be thrown to prevent stored procedure execution

#### Scenario: SQL type to C# type mapping

- **WHEN** `mapSqlTypeToCSharp()` is called with 'int'
- **THEN** result SHALL be 'int'
- **WHEN** `mapSqlTypeToCSharp()` is called with 'nvarchar'
- **THEN** result SHALL be 'string'
- **WHEN** `mapSqlTypeToCSharp()` is called with 'decimal'
- **THEN** result SHALL be 'decimal'
- **WHEN** `mapSqlTypeToCSharp()` is called with 'datetime2'
- **THEN** result SHALL be 'DateTime'
- **WHEN** `mapSqlTypeToCSharp()` is called with 'bit'
- **THEN** result SHALL be 'bool'
- **WHEN** `mapSqlTypeToCSharp()` is called with nullable column
- **THEN** result SHALL include '?' suffix for value types

#### Scenario: PascalCase conversion for C# naming

- **WHEN** `toPascalCase()` is called with 'user_name'
- **THEN** result SHALL be 'UserName'
- **WHEN** `toPascalCase()` is called with 'order_id'
- **THEN** result SHALL be 'OrderId'
- **WHEN** `toPascalCase()` is called with 'id'
- **THEN** result SHALL be 'Id'
- **WHEN** `toPascalCase()` is called with empty string
- **THEN** result SHALL be empty string

### Requirement: Integration Tests for MCP Protocol Compliance

The testing system SHALL provide integration tests to verify correct MCP protocol implementation and tool invocation.

#### Scenario: List tools request

- **WHEN** MCP ListToolsRequest is sent to server
- **THEN** response SHALL contain all 43 tool definitions
- **AND** each tool SHALL have name, description, and inputSchema properties
- **AND** inputSchema SHALL be valid JSON Schema

#### Scenario: Tool call with valid arguments

- **WHEN** MCP CallToolRequest is sent with valid tool name and arguments
- **THEN** response SHALL contain content array with type 'text'
- **AND** isError SHALL be false or undefined
- **AND** response SHALL complete within timeout

#### Scenario: Tool call with missing required arguments

- **WHEN** MCP CallToolRequest is sent with missing required argument
- **THEN** error SHALL be returned
- **AND** isError SHALL be true
- **AND** error message SHALL describe missing argument

#### Scenario: Tool call with invalid tool name

- **WHEN** MCP CallToolRequest is sent with unknown tool name
- **THEN** error SHALL be returned with message 'Unknown tool: <name>'
- **AND** isError SHALL be true

### Requirement: Authentication Testing

The testing system SHALL verify both SQL Server and Windows Integrated Authentication paths with edge cases.

#### Scenario: SQL Server authentication with valid credentials

- **WHEN** connection config specifies `authentication: 'sql'` with valid username and password
- **THEN** connection SHALL succeed
- **AND** tedious driver SHALL be loaded
- **AND** connection pool SHALL be created with user and password properties

#### Scenario: SQL Server authentication with missing credentials

- **WHEN** connection config specifies `authentication: 'sql'` without username or password
- **THEN** connection SHALL fail with descriptive error
- **AND** error message SHALL specify that SQL auth requires username and password

#### Scenario: Windows Integrated Authentication

- **WHEN** connection config specifies `authentication: 'integrated'`
- **THEN** msnodesqlv8 driver SHALL be dynamically imported
- **AND** connection config SHALL include `driver: 'msnodesqlv8'`
- **AND** connection config SHALL include `trustedConnection: true`
- **AND** no username or password SHALL be set in config

#### Scenario: Connection string formatting

- **WHEN** connection config is formatted to connection string
- **THEN** password SHALL be masked with '****'
- **AND** for SQL auth, connection string SHALL include User and Password fields
- **AND** for Windows auth, connection string SHALL include IntegratedSecurity=true
- **AND** encryption settings SHALL be reflected

### Requirement: Edge Case and Error Handling Tests

The testing system SHALL validate correct behavior for edge cases and error conditions.

#### Scenario: Query with SQL injection attempt

- **WHEN** query contains `'; DROP TABLE users; --`
- **THEN** query validation SHALL detect and block dangerous operations
- **AND** error SHALL be thrown before query execution

#### Scenario: Connection to non-existent database

- **WHEN** connection config specifies non-existent database
- **THEN** connection attempt SHALL fail with appropriate error
- **AND** error message SHALL include database name

#### Scenario: Query timeout

- **WHEN** query execution exceeds configured timeout
- **THEN** query SHALL be cancelled
- **AND** timeout error SHALL be returned

#### Scenario: Response size exceeds token limit

- **WHEN** tool response exceeds `max_response_tokens` configuration
- **THEN** response SHALL be truncated
- **AND** truncated response SHALL include metadata (total_items, returned_items, message)
- **AND** for arrays, items SHALL be reduced proportionally
- **AND** for text, character limit SHALL be enforced
- **AND** warning SHALL be logged to stderr

#### Scenario: Response size limit disabled

- **WHEN** `max_response_tokens` is set to 0
- **THEN** response SHALL NOT be truncated regardless of size
- **AND** full response SHALL be returned

#### Scenario: Empty result sets

- **WHEN** query returns zero rows
- **THEN** response SHALL contain empty recordset array
- **AND** no error SHALL be thrown
- **WHEN** `executeScalar()` is called with query returning no results
- **THEN** error SHALL be thrown with message 'Query returned no results'

#### Scenario: Special characters in table/schema names

- **WHEN** table or schema name contains spaces, hyphens, or special characters
- **THEN** names SHALL be properly bracket-quoted in SQL queries
- **AND** queries SHALL execute successfully

#### Scenario: Invalid column names in code generation

- **WHEN** table column is named with SQL reserved keyword (e.g., 'order', 'select')
- **THEN** generated C# property SHALL be valid identifier
- **AND** property name SHALL be properly escaped if needed

#### Scenario: Null and default values

- **WHEN** column has default value defined
- **THEN** describeTable SHALL include default_value in column info
- **WHEN** column is nullable
- **THEN** is_nullable SHALL be true
- **AND** generated C# type SHALL include nullable annotation

### Requirement: Test Infrastructure and Utilities

The testing system SHALL provide infrastructure and utilities to support comprehensive testing.

#### Scenario: Mock SQL Server connection

- **WHEN** tests require SQL Server connection
- **THEN** mock connection pool SHALL be available
- **AND** mock SHALL support `request().query()` pattern
- **AND** mock SHALL allow configuring canned responses
- **AND** mock SHALL track query execution for verification

#### Scenario: Test fixtures for common schemas

- **WHEN** tests need sample table descriptions
- **THEN** test fixtures SHALL provide common schema objects (users table, orders table, etc.)
- **AND** fixtures SHALL include columns, primary keys, foreign keys, indexes
- **AND** fixtures SHALL be reusable across multiple tests

#### Scenario: MCP message builder utilities

- **WHEN** tests need to send MCP protocol messages
- **THEN** utility functions SHALL construct valid ListToolsRequest messages
- **AND** utility functions SHALL construct valid CallToolRequest messages
- **AND** utilities SHALL handle JSON serialization

#### Scenario: Test environment configuration

- **WHEN** tests run
- **THEN** test-specific environment variables SHALL be loaded
- **AND** test configuration SHALL NOT interfere with production config
- **AND** tests SHALL use isolated connection pools

### Requirement: Test Coverage Reporting

The testing system SHALL measure and report code coverage to ensure adequate test completeness.

#### Scenario: Coverage calculation

- **WHEN** test suite runs
- **THEN** code coverage SHALL be calculated for all source files
- **AND** coverage report SHALL include line coverage, branch coverage, and function coverage
- **AND** coverage threshold SHALL be configurable (target: 80%+)

#### Scenario: Coverage report output

- **WHEN** test suite completes
- **THEN** coverage summary SHALL be printed to console
- **AND** detailed HTML coverage report SHALL be generated
- **AND** uncovered lines SHALL be highlighted in report

#### Scenario: CI coverage enforcement

- **WHEN** tests run in CI environment
- **THEN** build SHALL fail if coverage drops below threshold
- **AND** coverage report SHALL be uploaded as artifact

### Requirement: Test Organization and Documentation

The testing system SHALL maintain clear organization and documentation for maintainability.

#### Scenario: Test file structure

- **WHEN** tests are organized
- **THEN** test files SHALL be located in `tests/` directory
- **AND** test file names SHALL match source file names with `.test.ts` suffix
- **AND** directory structure SHALL mirror `src/` structure
- **AND** shared utilities SHALL be in `tests/utils/` directory
- **AND** mocks SHALL be in `tests/mocks/` directory

#### Scenario: Test naming conventions

- **WHEN** tests are written
- **THEN** describe blocks SHALL match class or module names
- **AND** nested describes SHALL represent method or function names
- **AND** it/test descriptions SHALL be descriptive and follow "should" pattern
- **AND** test names SHALL clearly state expected behavior

#### Scenario: Testing guidelines documentation

- **WHEN** developers need to write tests
- **THEN** documentation SHALL explain how to run tests
- **AND** documentation SHALL provide examples of unit and integration tests
- **AND** documentation SHALL describe how to use mocks and fixtures
- **AND** documentation SHALL specify coverage expectations
- **AND** documentation SHALL be in TESTING.md file

### Requirement: Performance and Regression Tests

The testing system SHALL include performance benchmarks and regression tests for critical paths.

#### Scenario: Connection pool performance

- **WHEN** performance test runs
- **THEN** connection pool reuse SHALL be verified
- **AND** time to get existing connection SHALL be < 10ms
- **AND** time to create new connection SHALL be measured and logged

#### Scenario: Query execution performance baseline

- **WHEN** performance test runs
- **THEN** baseline execution time SHALL be established for common queries
- **AND** regression SHALL be detected if execution time increases significantly
- **AND** performance metrics SHALL be logged

#### Scenario: Token estimation accuracy

- **WHEN** response size limiting is tested
- **THEN** token estimation SHALL be within 20% of actual tokens
- **AND** estimation SHALL be conservative (overestimate acceptable)
- **AND** truncation SHALL prevent protocol errors

### Requirement: Continuous Integration Support

The testing system SHALL integrate with CI/CD pipelines for automated validation.

#### Scenario: NPM test scripts

- **WHEN** `npm test` is executed
- **THEN** all tests SHALL run
- **AND** results SHALL be printed to console
- **WHEN** `npm run test:watch` is executed
- **THEN** tests SHALL run in watch mode
- **AND** tests SHALL re-run on file changes
- **WHEN** `npm run test:coverage` is executed
- **THEN** tests SHALL run with coverage reporting
- **AND** coverage report SHALL be generated

#### Scenario: CI workflow integration

- **WHEN** pull request is created
- **THEN** test workflow SHALL run automatically
- **AND** all tests SHALL pass before merge
- **AND** coverage report SHALL be generated
- **AND** test failures SHALL block merge
