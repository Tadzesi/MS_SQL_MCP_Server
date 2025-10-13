import { describe, test, expect, beforeEach } from '@jest/globals';
import { DatabaseManager } from '../../src/database.js';

describe('DatabaseManager', () => {
  let dbManager: DatabaseManager;

  beforeEach(() => {
    dbManager = new DatabaseManager();
  });

  describe('Query Validation', () => {
    test('should allow SELECT queries', () => {
      expect(() => {
        dbManager.validateReadOnlyQuery('SELECT * FROM users');
      }).not.toThrow();
    });

    test('should allow SELECT with WHERE clause', () => {
      expect(() => {
        dbManager.validateReadOnlyQuery('SELECT id, name FROM users WHERE active = 1');
      }).not.toThrow();
    });

    test('should allow WITH (CTE) queries', () => {
      expect(() => {
        dbManager.validateReadOnlyQuery('WITH cte AS (SELECT * FROM users) SELECT * FROM cte');
      }).not.toThrow();
    });

    test('should allow queries starting with SET STATISTICS', () => {
      expect(() => {
        dbManager.validateReadOnlyQuery('SET STATISTICS TIME ON; SELECT * FROM users');
      }).not.toThrow();
    });

    test('should allow queries starting with SET SHOWPLAN', () => {
      expect(() => {
        dbManager.validateReadOnlyQuery('SET SHOWPLAN_TEXT ON');
      }).not.toThrow();
    });

    test('should block INSERT queries', () => {
      expect(() => {
        dbManager.validateReadOnlyQuery('INSERT INTO users (name) VALUES (\'test\')');
      }).toThrow('Only SELECT queries are allowed');
    });

    test('should block UPDATE queries', () => {
      expect(() => {
        dbManager.validateReadOnlyQuery('UPDATE users SET name = \'test\'');
      }).toThrow('Only SELECT queries are allowed');
    });

    test('should block DELETE queries', () => {
      expect(() => {
        dbManager.validateReadOnlyQuery('DELETE FROM users WHERE id = 1');
      }).toThrow('Only SELECT queries are allowed');
    });

    test('should block DROP queries', () => {
      expect(() => {
        dbManager.validateReadOnlyQuery('DROP TABLE users');
      }).toThrow('Only SELECT queries are allowed');
    });

    test('should block TRUNCATE queries', () => {
      expect(() => {
        dbManager.validateReadOnlyQuery('TRUNCATE TABLE users');
      }).toThrow('Only SELECT queries are allowed');
    });

    test('should block ALTER queries', () => {
      expect(() => {
        dbManager.validateReadOnlyQuery('ALTER TABLE users ADD COLUMN email VARCHAR(255)');
      }).toThrow('Only SELECT queries are allowed');
    });

    test('should block CREATE queries', () => {
      expect(() => {
        dbManager.validateReadOnlyQuery('CREATE TABLE test (id INT)');
      }).toThrow('Only SELECT queries are allowed');
    });

    test('should block EXEC queries', () => {
      expect(() => {
        dbManager.validateReadOnlyQuery('EXEC sp_who');
      }).toThrow('Only SELECT queries are allowed');
    });

    test('should block EXECUTE queries', () => {
      expect(() => {
        dbManager.validateReadOnlyQuery('EXECUTE sp_who');
      }).toThrow('Only SELECT queries are allowed');
    });

    test('should block sp_executesql queries', () => {
      expect(() => {
        dbManager.validateReadOnlyQuery('sp_executesql N\'SELECT * FROM users\'');
      }).toThrow('Only SELECT queries are allowed');
    });

    test('should block INSERT INTO pattern', () => {
      expect(() => {
        dbManager.validateReadOnlyQuery('INSERT INTO users SELECT * FROM temp');
      }).toThrow('Only SELECT queries are allowed');
    });

    test('should block UPDATE SET pattern', () => {
      expect(() => {
        dbManager.validateReadOnlyQuery('UPDATE users SET active = 1');
      }).toThrow('Only SELECT queries are allowed');
    });

    test('should be case insensitive', () => {
      expect(() => {
        dbManager.validateReadOnlyQuery('select * from users');
      }).not.toThrow();

      expect(() => {
        dbManager.validateReadOnlyQuery('INSERT into users (name) values (\'test\')');
      }).toThrow();

      expect(() => {
        dbManager.validateReadOnlyQuery('DeLeTe FrOm users');
      }).toThrow();
    });

    test('should handle queries with leading whitespace', () => {
      expect(() => {
        dbManager.validateReadOnlyQuery('   SELECT * FROM users');
      }).not.toThrow();

      expect(() => {
        dbManager.validateReadOnlyQuery('\n\t  SELECT * FROM users');
      }).not.toThrow();
    });

    test('should block SQL injection attempts with DROP', () => {
      expect(() => {
        dbManager.validateReadOnlyQuery("SELECT * FROM users WHERE id = 1; DROP TABLE users; --");
      }).toThrow('Only SELECT queries are allowed');
    });

    test('should block SQL injection attempts with DELETE', () => {
      expect(() => {
        dbManager.validateReadOnlyQuery("'; DELETE FROM users; --");
      }).toThrow('Only SELECT queries are allowed');
    });

    test('should throw error for queries not starting with SELECT, WITH, or EXPLAIN', () => {
      expect(() => {
        dbManager.validateReadOnlyQuery('DECLARE @var INT');
      }).toThrow('Query must start with SELECT, WITH, or EXPLAIN');
    });
  });

  describe('ExecuteScalar', () => {
    test('should throw error when query returns no results', async () => {
      // Create a mock pool that returns empty results
      const mockPool = {
        request: () => ({
          query: async () => ({ recordset: [] })
        })
      };

      await expect(
        dbManager.executeScalar(mockPool as any, 'SELECT COUNT(*) FROM empty_table')
      ).rejects.toThrow('Query returned no results');
    });
  });
});

describe('DatabaseManager - Connection Key Generation', () => {
  test('should generate unique keys for different servers', () => {
    const dbManager = new DatabaseManager();

    const key1 = (dbManager as any).getConnectionKey({
      server: 'server1',
      database: 'db',
      port: 1433,
      username: 'user'
    });

    const key2 = (dbManager as any).getConnectionKey({
      server: 'server2',
      database: 'db',
      port: 1433,
      username: 'user'
    });

    expect(key1).not.toBe(key2);
  });

  test('should generate unique keys for different databases', () => {
    const dbManager = new DatabaseManager();

    const key1 = (dbManager as any).getConnectionKey({
      server: 'server',
      database: 'db1',
      port: 1433,
      username: 'user'
    });

    const key2 = (dbManager as any).getConnectionKey({
      server: 'server',
      database: 'db2',
      port: 1433,
      username: 'user'
    });

    expect(key1).not.toBe(key2);
  });

  test('should generate unique keys for different ports', () => {
    const dbManager = new DatabaseManager();

    const key1 = (dbManager as any).getConnectionKey({
      server: 'server',
      database: 'db',
      port: 1433,
      username: 'user'
    });

    const key2 = (dbManager as any).getConnectionKey({
      server: 'server',
      database: 'db',
      port: 1435,
      username: 'user'
    });

    expect(key1).not.toBe(key2);
  });

  test('should generate same key for same connection config', () => {
    const dbManager = new DatabaseManager();

    const config = {
      server: 'server',
      database: 'db',
      port: 1433,
      username: 'user'
    };

    const key1 = (dbManager as any).getConnectionKey(config);
    const key2 = (dbManager as any).getConnectionKey(config);

    expect(key1).toBe(key2);
  });

  test('should use "integrated" as username for Windows auth', () => {
    const dbManager = new DatabaseManager();

    const key = (dbManager as any).getConnectionKey({
      server: 'server',
      database: 'db',
      port: 1433,
      // No username for integrated auth
    });

    expect(key).toContain(':integrated');
  });

  test('should default to port 1433 if not specified', () => {
    const dbManager = new DatabaseManager();

    const key1 = (dbManager as any).getConnectionKey({
      server: 'server',
      database: 'db',
      username: 'user'
    });

    const key2 = (dbManager as any).getConnectionKey({
      server: 'server',
      database: 'db',
      port: 1433,
      username: 'user'
    });

    expect(key1).toBe(key2);
  });
});

describe('DatabaseManager - Connection String Formatting', () => {
  test('should format SQL auth connection string with masked password', () => {
    const dbManager = new DatabaseManager();

    const connStr = (dbManager as any).formatConnectionString({
      server: 'localhost',
      database: 'TestDB',
      authentication: 'sql',
      username: 'testuser',
      password: 'secret123',
      encrypt: false,
      trustServerCertificate: true,
      readonly: false,
    });

    expect(connStr).toContain('Server=localhost');
    expect(connStr).toContain('Database=TestDB');
    expect(connStr).toContain('User=testuser');
    expect(connStr).toContain('Password=****');
    expect(connStr).not.toContain('secret123');
    expect(connStr).toContain('Encrypt=false');
    expect(connStr).toContain('TrustServerCertificate=true');
  });

  test('should format Windows auth connection string', () => {
    const dbManager = new DatabaseManager();

    const connStr = (dbManager as any).formatConnectionString({
      server: 'localhost',
      database: 'TestDB',
      authentication: 'integrated',
      encrypt: false,
      trustServerCertificate: true,
      readonly: true,
    });

    expect(connStr).toContain('Server=localhost');
    expect(connStr).toContain('Database=TestDB');
    expect(connStr).toContain('IntegratedSecurity=true');
    expect(connStr).not.toContain('User=');
    expect(connStr).not.toContain('Password=');
  });

  test('should include port when specified', () => {
    const dbManager = new DatabaseManager();

    const connStr = (dbManager as any).formatConnectionString({
      server: 'localhost',
      database: 'TestDB',
      port: 1435,
      authentication: 'sql',
      username: 'user',
      password: 'pass',
    });

    expect(connStr).toContain('Port=1435');
  });

  test('should include ReadOnly flag', () => {
    const dbManager = new DatabaseManager();

    const connStr = (dbManager as any).formatConnectionString({
      server: 'localhost',
      database: 'TestDB',
      authentication: 'sql',
      username: 'user',
      password: 'pass',
      readonly: true,
    });

    expect(connStr).toContain('ReadOnly=true');
  });
});
