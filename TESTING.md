# Testing Guide

This document explains the testing infrastructure for the MS SQL MCP Server and how to write, run, and maintain tests.

## Overview

The test suite uses **Jest** as the testing framework with TypeScript support via `ts-jest`. Tests are organized into unit tests, integration tests, and edge case tests.

**Coverage Target**: 80%+ for lines, branches, functions, and statements.

## Running Tests

### Basic Commands

```bash
# Run all tests
npm test

# Run tests in watch mode (re-runs on file changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

### Test Output

- **Console**: Test results are printed to stdout
- **Coverage Report**: Generated in `./coverage` directory
  - `coverage/index.html` - Browse HTML coverage report
  - `coverage/lcov.info` - LCOV format for CI tools

## Test Structure

```
tests/
├── unit/                    # Unit tests for individual modules
│   ├── config.test.ts       # ConfigManager tests
│   ├── database.test.ts     # DatabaseManager tests
│   └── codegen-tools.test.ts # CodeGenTools tests
├── integration/             # Integration tests for MCP protocol
├── mocks/                   # Mock implementations
│   └── MockConnectionPool.ts # Mock SQL Server connection
├── fixtures/                # Test data and fixtures
│   └── schema-fixtures.ts   # Sample schemas and data
└── utils/                   # Test utilities
    └── test-helpers.ts      # Helper functions
```

## Writing Tests

### Test File Naming

- Place tests in `tests/unit/` or `tests/integration/`
- Name test files `<module-name>.test.ts`
- Mirror the structure of `src/` directory

### Test Structure

```typescript
import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { YourModule } from '../../src/your-module.js';

describe('YourModule', () => {
  let instance: YourModule;

  beforeEach(() => {
    // Set up before each test
    instance = new YourModule();
  });

  afterEach(() => {
    // Clean up after each test
  });

  describe('Feature Name', () => {
    test('should do something specific', () => {
      // Arrange
      const input = 'test';

      // Act
      const result = instance.method(input);

      // Assert
      expect(result).toBe('expected');
    });

    test('should handle edge case', () => {
      expect(() => {
        instance.method(null);
      }).toThrow('Expected error message');
    });
  });
});
```

### Using Mocks

#### Mock SQL Server Connection

```typescript
import { MockConnectionPool } from '../mocks/MockConnectionPool.js';

test('should execute query', async () => {
  const mockPool = new MockConnectionPool();
  await mockPool.connect();

  // Queue a response
  mockPool.queueResponse([
    { id: 1, name: 'Test' },
    { id: 2, name: 'Test2' }
  ]);

  // Execute query
  const result = await dbManager.executeQuery(mockPool, 'SELECT * FROM users');

  // Verify
  expect(result.recordset).toHaveLength(2);
  expect(mockPool.getLastQuery()).toContain('SELECT * FROM users');
});
```

#### Mock Environment Variables

```typescript
import { setupTestEnv, clearMssqlEnv } from '../utils/test-helpers.js';

describe('With Environment Variables', () => {
  beforeEach(() => {
    clearMssqlEnv(); // Clear any existing vars
  });

  afterEach(() => {
    clearMssqlEnv(); // Clean up after test
  });

  test('should load config from env', () => {
    setupTestEnv('LOCAL', {
      server: 'localhost',
      database: 'TestDB',
      auth: 'sql',
      username: 'testuser',
      password: 'testpass',
    });

    const configManager = new ConfigManager();
    expect(configManager.getCurrentConnection().server).toBe('localhost');
  });
});
```

### Using Fixtures

```typescript
import { usersTableDescription, sampleUsers } from '../fixtures/schema-fixtures.js';

test('should generate entity from table description', () => {
  const entity = generateEntity(usersTableDescription);

  expect(entity).toContain('public class Users');
  expect(entity).toContain('public int UserId { get; set; }');
});
```

## Test Patterns

### Testing Async Functions

```typescript
test('should handle async operation', async () => {
  const result = await asyncFunction();
  expect(result).toBe('expected');
});

test('should reject with error', async () => {
  await expect(asyncFunction()).rejects.toThrow('Error message');
});
```

### Testing Exceptions

```typescript
test('should throw error for invalid input', () => {
  expect(() => {
    functionThatThrows();
  }).toThrow('Expected error message');
});

test('should throw specific error type', () => {
  expect(() => {
    functionThatThrows();
  }).toThrow(TypeError);
});
```

### Testing Private Methods

Use type assertion to test private methods when necessary:

```typescript
test('should convert to PascalCase', () => {
  const instance = new CodeGenTools();
  const result = (instance as any).toPascalCase('user_name');
  expect(result).toBe('UserName');
});
```

### Parameterized Tests

```typescript
describe('Type Mapping', () => {
  const testCases = [
    { sql: 'int', csharp: 'int' },
    { sql: 'bigint', csharp: 'long' },
    { sql: 'nvarchar', csharp: 'string' },
    { sql: 'bit', csharp: 'bool' },
  ];

  testCases.forEach(({ sql, csharp }) => {
    test(`should map ${sql} to ${csharp}`, () => {
      const result = mapSqlTypeToCSharp(sql);
      expect(result).toBe(csharp);
    });
  });
});
```

## Coverage Guidelines

### What to Test

**Always test:**
- Public API methods
- Error handling and edge cases
- Type conversions and mappings
- Security-critical code (query validation, authentication)
- Configuration loading
- Data transformations

**Optional:**
- Private helper methods (test through public API)
- Generated code (test the generator, not the output)
- Third-party library wrappers (test your usage, not the library)

### Coverage Thresholds

The project enforces 80% coverage for:
- **Lines**: 80% of code lines executed
- **Branches**: 80% of conditional branches tested
- **Functions**: 80% of functions called
- **Statements**: 80% of statements executed

Build will fail if coverage drops below these thresholds.

### Viewing Coverage

```bash
npm run test:coverage
# Open coverage/index.html in browser
```

Coverage report highlights:
- **Green**: Well-covered code
- **Yellow**: Partially covered branches
- **Red**: Uncovered code

## Common Testing Scenarios

### Testing Configuration

```typescript
test('should load SQL auth configuration', () => {
  setupTestEnv('LOCAL', {
    server: 'localhost',
    database: 'TestDB',
    auth: 'sql',
    username: 'user',
    password: 'pass',
  });

  const configManager = new ConfigManager();
  const conn = configManager.getCurrentConnection();

  expect(conn.authentication).toBe('sql');
  expect(conn.username).toBe('user');
  expect(conn.password).toBe('pass');
});
```

### Testing Query Validation

```typescript
test('should block dangerous queries', () => {
  const dbManager = new DatabaseManager();

  expect(() => {
    dbManager.validateReadOnlyQuery('DROP TABLE users');
  }).toThrow('Only SELECT queries are allowed');

  expect(() => {
    dbManager.validateReadOnlyQuery('DELETE FROM users');
  }).toThrow('Only SELECT queries are allowed');
});
```

### Testing Type Mappings

```typescript
test('should map SQL types to C# types', () => {
  const codeGenTools = new CodeGenTools(/* deps */);

  expect(codeGenTools.mapSqlTypeToCSharp('int')).toBe('int');
  expect(codeGenTools.mapSqlTypeToCSharp('nvarchar')).toBe('string');
  expect(codeGenTools.mapSqlTypeToCSharp('datetime2')).toBe('DateTime');
});
```

### Testing Error Cases

```typescript
test('should throw error when no config found', () => {
  clearMssqlEnv();

  expect(() => {
    new ConfigManager();
  }).toThrow('Configuration Error: No connection profiles found');
});

test('should handle empty query results', async () => {
  const mockPool = new MockConnectionPool();
  mockPool.queueResponse([]);

  await expect(
    dbManager.executeScalar(mockPool, 'SELECT COUNT(*) FROM empty_table')
  }).rejects.toThrow('Query returned no results');
});
```

## Debugging Tests

### Run a Single Test File

```bash
npm test -- tests/unit/config.test.ts
```

### Run Tests Matching a Pattern

```bash
npm test -- --testNamePattern="should load config"
```

### Enable Verbose Output

```bash
npm test -- --verbose
```

### Debug in VS Code

Add to `.vscode/launch.json`:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Jest Debug",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": ["--runInBand", "--no-cache"],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

## Best Practices

1. **Test Behavior, Not Implementation**
   - Focus on what the code does, not how it does it
   - Avoid testing internal details that may change

2. **Keep Tests Independent**
   - Each test should run in isolation
   - Use `beforeEach` to reset state
   - Clean up in `afterEach`

3. **Use Descriptive Test Names**
   - Start with "should"
   - Describe expected behavior
   - Example: "should throw error when credentials are missing"

4. **Arrange-Act-Assert Pattern**
   ```typescript
   test('example', () => {
     // Arrange: Set up test data
     const input = 'test';

     // Act: Execute the code under test
     const result = someFunction(input);

     // Assert: Verify the outcome
     expect(result).toBe('expected');
   });
   ```

5. **Test One Thing Per Test**
   - Each test should verify a single behavior
   - Makes failures easier to diagnose
   - Improves test readability

6. **Mock External Dependencies**
   - Don't rely on real databases or network
   - Use mocks for predictable behavior
   - Keeps tests fast and reliable

7. **Clean Up Test Data**
   - Clear environment variables after tests
   - Reset mocks between tests
   - Avoid test pollution

## Continuous Integration

Tests run automatically in CI/CD pipelines:

- **On Pull Request**: All tests must pass
- **On Push**: Coverage report generated
- **Coverage Enforcement**: Build fails if < 80% coverage

## Troubleshooting

### Tests Failing Locally

1. Ensure dependencies are installed: `npm install`
2. Build TypeScript: `npm run build`
3. Clear Jest cache: `npx jest --clearCache`
4. Check for environment variable pollution: `clearMssqlEnv()`

### Import Errors

- Ensure all imports include `.js` extension (ES modules requirement)
- Example: `import { Module } from './module.js'` ✅
- Wrong: `import { Module } from './module'` ❌

### Type Errors

- Run TypeScript compiler: `npx tsc --noEmit`
- Check types in test files match source types
- Use type assertions carefully: `(obj as any).method()`

### Coverage Not Updating

- Delete coverage directory: `rm -rf coverage`
- Run with `--no-cache`: `npm test -- --no-cache`
- Ensure test actually executes the code

## Contributing

When adding new features:

1. Write tests first (TDD) or alongside implementation
2. Aim for 100% coverage of new code
3. Test both success and failure paths
4. Add edge case tests
5. Update this guide if introducing new patterns

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [TypeScript Jest Setup](https://kulshekhar.github.io/ts-jest/)
- [Testing Best Practices](https://testingjavascript.com/)
