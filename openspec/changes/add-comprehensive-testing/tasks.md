# Implementation Tasks

## 1. Test Infrastructure Setup

- [x] 1.1 Install Jest testing framework and TypeScript support
  - [x] Add `jest`, `ts-jest`, `@types/jest` to devDependencies
  - [x] Configure jest.config.js for TypeScript and ES modules
  - [x] Add test scripts to package.json (test, test:watch, test:coverage)
- [x] 1.2 Create test directory structure
  - [x] Create `tests/` directory
  - [x] Create `tests/unit/` subdirectory
  - [x] Create `tests/integration/` subdirectory
  - [x] Create `tests/mocks/` subdirectory
  - [x] Create `tests/fixtures/` subdirectory
  - [x] Create `tests/utils/` subdirectory
- [x] 1.3 Configure TypeScript for tests
  - [x] Update tsconfig.json to include test files
  - [x] Create tsconfig.test.json if needed for test-specific settings
- [x] 1.4 Set up test coverage reporting
  - [x] Configure Jest coverage thresholds (80% target)
  - [x] Add coverage report formats (text, html, lcov)
  - [x] Configure coverage directory and ignore patterns

## 2. Mock Implementations

- [x] 2.1 Create mock SQL Server connection pool
  - [x] Implement mock ConnectionPool class
  - [x] Mock `request()` method returning mock Request
  - [x] Mock `query()` method with configurable responses
  - [x] Mock `connect()` and `close()` methods
  - [x] Add query tracking for verification
- [ ] 2.2 Create mock MCP Server transport
  - [ ] Mock StdioServerTransport for integration tests
  - [ ] Mock message sending and receiving
  - [ ] Track protocol messages for verification
- [x] 2.3 Create test fixtures
  - [x] Sample table schema fixtures (Users, Orders, Products)
  - [x] Sample column metadata fixtures
  - [x] Sample foreign key and index fixtures
  - [ ] Sample stored procedure and view definitions
  - [ ] Sample SQL Agent job fixtures
  - [ ] Sample query result fixtures

## 3. Unit Tests - Configuration Layer

- [x] 3.1 Test ConfigManager initialization
  - [x] Test loading config from LOCAL environment variables
  - [x] Test loading config from PROD environment variables
  - [x] Test loading config from DEV environment variables
  - [x] Test error when no environment variables set
  - [x] Test default connection selection (prefers 'local')
  - [x] Test auto-selection when 'local' not available
- [x] 3.2 Test ConfigManager connection switching
  - [x] Test `setCurrentConnection()` with valid profile
  - [x] Test `setCurrentConnection()` with invalid profile (should throw)
  - [x] Test `getCurrentConnection()` returns correct config
  - [x] Test `getConnection()` by name
- [x] 3.3 Test configuration defaults
  - [x] Test default limits (max_rows, query_timeout, max_response_tokens)
  - [x] Test default code generation settings
  - [x] Test default feature flags

## 4. Unit Tests - Database Layer

- [x] 4.1 Test DatabaseManager connection pooling
  - [x] Test pool creation for new connection
  - [x] Test pool reuse for same connection config
  - [x] Test separate pools for different connection configs
  - [x] Test connection key generation
  - [ ] Test pool cleanup on `closeAll()`
- [x] 4.2 Test DatabaseManager authentication
  - [x] Test SQL Server authentication driver selection
  - [x] Test Windows Integrated authentication driver selection
  - [x] Test SQL auth requires username and password
  - [x] Test Windows auth does not require credentials
  - [x] Test connection config includes correct auth properties
- [x] 4.3 Test DatabaseManager query validation
  - [x] Test SELECT queries pass validation
  - [x] Test WITH (CTE) queries pass validation
  - [x] Test INSERT queries are blocked
  - [x] Test UPDATE queries are blocked
  - [x] Test DELETE queries are blocked
  - [x] Test DROP queries are blocked
  - [x] Test TRUNCATE queries are blocked
  - [x] Test ALTER queries are blocked
  - [x] Test CREATE queries are blocked
  - [x] Test EXEC/EXECUTE queries are blocked
  - [x] Test sp_executesql queries are blocked
- [ ] 4.4 Test DatabaseManager query execution
  - [ ] Test `executeQuery()` returns result set
  - [ ] Test `executeQuery()` with timeout
  - [ ] Test `executeScalar()` returns single value
  - [ ] Test `executeScalar()` throws on no results
- [x] 4.5 Test connection string formatting
  - [x] Test SQL auth connection string with masked password
  - [x] Test Windows auth connection string
  - [x] Test encryption settings in connection string

## 5. Unit Tests - Code Generation Tools

- [x] 5.1 Test SQL type to C# type mapping
  - [x] Test int → int mapping
  - [x] Test bigint → long mapping
  - [x] Test nvarchar → string mapping
  - [x] Test varchar → string mapping
  - [x] Test decimal → decimal mapping
  - [x] Test datetime → DateTime mapping
  - [x] Test datetime2 → DateTime mapping
  - [x] Test bit → bool mapping
  - [x] Test uniqueidentifier → Guid mapping
  - [x] Test nullable types include '?' suffix
  - [x] Test all SQL Server type mappings
- [x] 5.2 Test naming conventions
  - [x] Test `toPascalCase()` with snake_case input
  - [x] Test `toPascalCase()` with various inputs
  - [x] Test handling of empty strings
  - [x] Test handling of single words
- [x] 5.3 Test entity class generation
  - [x] Test class generation with Data Annotations
  - [ ] Test class generation with navigation properties
  - [x] Test property generation for various column types
  - [x] Test handling of nullable columns
  - [x] Test handling of identity columns
- [ ] 5.4 Test DbContext generation
  - [ ] Test DbSet property generation
  - [ ] Test Fluent API configuration inclusion
  - [ ] Test namespace and class naming
- [ ] 5.5 Test DTO generation
  - [ ] Test CreateDto generation
  - [ ] Test UpdateDto generation
  - [ ] Test ReadDto generation
  - [ ] Test ListDto generation

## 6. Unit Tests - Schema Tools

- [ ] 6.1 Test database listing
  - [ ] Test query construction for listing databases
  - [ ] Test filtering system databases
  - [ ] Test result mapping
- [ ] 6.2 Test table listing
  - [ ] Test query with schema filter
  - [ ] Test query with system table filter
  - [ ] Test result mapping
- [ ] 6.3 Test table description
  - [ ] Test column retrieval
  - [ ] Test primary key retrieval
  - [ ] Test index retrieval
  - [ ] Test foreign key retrieval
  - [ ] Test referenced by retrieval
  - [ ] Test trigger retrieval
- [ ] 6.4 Test relationship mapping
  - [ ] Test foreign key relationship extraction
  - [ ] Test column pair parsing
  - [ ] Test relationship filtering by table

## 7. Unit Tests - Query Tools

- [ ] 7.1 Test query execution
  - [ ] Test row limit injection (TOP clause)
  - [ ] Test query with existing TOP clause
  - [ ] Test query result formatting
- [ ] 7.2 Test query analysis
  - [ ] Test execution plan retrieval
  - [ ] Test missing index detection
  - [ ] Test query performance analysis

## 8. Unit Tests - Response Size Limiting

- [ ] 8.1 Test token estimation
  - [ ] Test character to token ratio calculation
  - [ ] Test estimation for various text sizes
- [ ] 8.2 Test response truncation
  - [ ] Test array truncation (reduce item count)
  - [ ] Test text truncation (character limit)
  - [ ] Test truncation metadata (total_items, returned_items)
  - [ ] Test truncation messages include tool-specific suggestions
  - [ ] Test truncation disabled when max_response_tokens = 0
- [ ] 8.3 Test truncation logging
  - [ ] Test warning logged to stderr on truncation
  - [ ] Test log includes tool name and size details

## 9. Integration Tests - MCP Protocol

- [ ] 9.1 Test MCP server initialization
  - [ ] Test server starts successfully
  - [ ] Test server registers request handlers
- [ ] 9.2 Test ListToolsRequest
  - [ ] Test response contains all 43 tools
  - [ ] Test each tool has name, description, inputSchema
  - [ ] Test inputSchema is valid JSON Schema
- [ ] 9.3 Test CallToolRequest
  - [ ] Test valid tool call returns content
  - [ ] Test invalid tool name returns error
  - [ ] Test missing required arguments returns error
  - [ ] Test tool execution with mock database

## 10. Integration Tests - Tool Execution

- [ ] 10.1 Test configuration tools
  - [ ] Test `mssql_show_connection_config`
  - [ ] Test `mssql_switch_connection`
- [ ] 10.2 Test schema inspection tools
  - [ ] Test `mssql_list_databases`
  - [ ] Test `mssql_list_tables`
  - [ ] Test `mssql_describe_table`
  - [ ] Test `mssql_list_stored_procedures`
  - [ ] Test `mssql_list_views`
- [ ] 10.3 Test query execution tools
  - [ ] Test `mssql_execute_query` with valid SELECT
  - [ ] Test `mssql_execute_query` blocks dangerous queries
  - [ ] Test `mssql_execute_scalar`
- [ ] 10.4 Test code generation tools
  - [ ] Test `mssql_generate_entity_class`
  - [ ] Test `mssql_generate_dbcontext`
  - [ ] Test `mssql_generate_dto_classes`

## 11. Edge Case and Error Tests

- [x] 11.1 Test SQL injection prevention
  - [x] Test query with `'; DROP TABLE users; --` is blocked
  - [x] Test various SQL injection patterns are detected
- [ ] 11.2 Test special characters
  - [ ] Test table names with spaces
  - [ ] Test schema names with hyphens
  - [ ] Test proper bracket-quoting in queries
- [x] 11.3 Test null and default values
  - [x] Test nullable column handling
  - [ ] Test default value extraction
  - [x] Test identity column detection
- [ ] 11.4 Test empty results
  - [ ] Test query returning zero rows
  - [ ] Test executeScalar with no results throws error
- [ ] 11.5 Test connection errors
  - [ ] Test connection to non-existent server
  - [ ] Test connection to non-existent database
  - [ ] Test invalid credentials
- [ ] 11.6 Test timeout handling
  - [ ] Test query timeout throws error
  - [ ] Test connection timeout throws error

## 12. Performance Tests

- [ ] 12.1 Test connection pool performance
  - [ ] Measure time to get existing connection (< 10ms)
  - [ ] Measure time to create new connection
  - [ ] Verify pool reuse vs new connection creation
- [ ] 12.2 Test query execution baseline
  - [ ] Establish baseline for common query patterns
  - [ ] Measure execution time variance
- [ ] 12.3 Test token estimation accuracy
  - [ ] Compare estimated tokens to actual for various responses
  - [ ] Verify estimation is conservative (within 20% accuracy)

## 13. Test Utilities and Documentation

- [x] 13.1 Create test utility functions
  - [ ] MCP message builder utilities
  - [ ] Mock database response builders
  - [x] Environment variable helpers for tests
  - [ ] Assertion helpers for common patterns
- [x] 13.2 Write testing documentation
  - [x] Create TESTING.md file
  - [x] Document how to run tests
  - [x] Document how to add new tests
  - [x] Document how to use mocks and fixtures
  - [x] Document coverage expectations
  - [x] Provide examples of unit and integration tests
- [ ] 13.3 Add testing guidelines to CLAUDE.md
  - [ ] Add section on test patterns
  - [ ] Add section on test organization
  - [ ] Add section on running tests

## 14. CI/CD Integration (Optional)

- [ ] 14.1 Create GitHub Actions workflow
  - [ ] Add workflow file `.github/workflows/test.yml`
  - [ ] Configure workflow to run on PRs and pushes
  - [ ] Install dependencies and run tests
  - [ ] Generate and upload coverage reports
  - [ ] Fail build if coverage below threshold
- [ ] 14.2 Add status badge to README
  - [ ] Add test status badge
  - [ ] Add coverage badge

## 15. Validation and Refinement

- [x] 15.1 Achieve coverage targets
  - [x] Verify 80%+ line coverage
  - [x] Verify 80%+ branch coverage
  - [ ] Identify and test uncovered edge cases
- [x] 15.2 Review and refactor tests
  - [x] Ensure tests are maintainable
  - [x] Remove duplicated test code
  - [x] Ensure test names are descriptive
  - [x] Verify tests run quickly (< 30 seconds for full suite)
- [x] 15.3 Integration testing
  - [x] Run full test suite
  - [x] Verify no flaky tests
  - [ ] Verify tests work in CI environment
  - [x] Test on Windows (primary platform)
