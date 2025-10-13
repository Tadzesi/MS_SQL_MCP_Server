import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { ConfigManager } from '../../src/config.js';
import { setupTestEnv, clearMssqlEnv } from '../utils/test-helpers.js';

describe('ConfigManager', () => {
  beforeEach(() => {
    clearMssqlEnv();
  });

  afterEach(() => {
    clearMssqlEnv();
  });

  describe('Initialization', () => {
    test('should load config from LOCAL environment variables', () => {
      setupTestEnv('LOCAL', {
        server: 'localhost',
        database: 'TestDB',
        auth: 'sql',
        username: 'testuser',
        password: 'testpass',
      });

      const configManager = new ConfigManager();
      const config = configManager.getConfig();

      expect(config.connections.local).toBeDefined();
      expect(config.connections.local.server).toBe('localhost');
      expect(config.connections.local.database).toBe('TestDB');
      expect(config.connections.local.authentication).toBe('sql');
      expect(config.connections.local.username).toBe('testuser');
      expect(config.connections.local.password).toBe('testpass');
    });

    test('should load config from PROD environment variables', () => {
      setupTestEnv('PROD', {
        server: 'prod.server.com',
        database: 'ProdDB',
        auth: 'sql',
        username: 'produser',
        password: 'prodpass',
      });

      const configManager = new ConfigManager();
      const config = configManager.getConfig();

      expect(config.connections.prod).toBeDefined();
      expect(config.connections.prod.server).toBe('prod.server.com');
      expect(config.connections.prod.database).toBe('ProdDB');
    });

    test('should load config from DEV environment variables', () => {
      setupTestEnv('DEV', {
        server: 'dev.server.com',
        database: 'DevDB',
        auth: 'sql',
        username: 'devuser',
        password: 'devpass',
      });

      const configManager = new ConfigManager();
      const config = configManager.getConfig();

      expect(config.connections.dev).toBeDefined();
      expect(config.connections.dev.server).toBe('dev.server.com');
      expect(config.connections.dev.database).toBe('DevDB');
    });

    test('should load multiple connection profiles', () => {
      setupTestEnv('LOCAL');
      setupTestEnv('PROD', { server: 'prod.server.com' });
      setupTestEnv('DEV', { server: 'dev.server.com' });

      const configManager = new ConfigManager();
      const config = configManager.getConfig();

      expect(config.connections.local).toBeDefined();
      expect(config.connections.prod).toBeDefined();
      expect(config.connections.dev).toBeDefined();
    });

    test('should throw error when no environment variables are set', () => {
      expect(() => {
        new ConfigManager();
      }).toThrow('Configuration Error: No connection profiles found');
    });

    test('should provide helpful error message with configuration examples', () => {
      try {
        new ConfigManager();
      } catch (error: any) {
        expect(error.message).toContain('For SQL Server Authentication');
        expect(error.message).toContain('For Windows Integrated Authentication');
        expect(error.message).toContain('MSSQL_LOCAL_SERVER');
        expect(error.message).toContain('MSSQL_LOCAL_DATABASE');
        expect(error.message).toContain('MSSQL_LOCAL_AUTH');
      }
    });

    test('should default to "local" connection when available', () => {
      setupTestEnv('LOCAL');
      setupTestEnv('PROD', { server: 'prod.server.com' });

      const configManager = new ConfigManager();
      const config = configManager.getConfig();

      expect(config.current_connection).toBe('local');
    });

    test('should auto-select first available profile when "local" not available', () => {
      setupTestEnv('PROD', { server: 'prod.server.com' });

      const configManager = new ConfigManager();
      const config = configManager.getConfig();

      expect(config.current_connection).toBe('prod');
    });

    test('should handle Windows Integrated Authentication', () => {
      setupTestEnv('LOCAL', {
        server: 'localhost',
        database: 'TestDB',
        auth: 'integrated',
      });

      const configManager = new ConfigManager();
      const conn = configManager.getCurrentConnection();

      expect(conn.authentication).toBe('integrated');
      expect(conn.username).toBeUndefined();
      expect(conn.password).toBeUndefined();
    });
  });

  describe('Connection Switching', () => {
    test('should switch to valid connection profile', () => {
      setupTestEnv('LOCAL');
      setupTestEnv('PROD', { server: 'prod.server.com' });

      const configManager = new ConfigManager();
      expect(configManager.getConfig().current_connection).toBe('local');

      configManager.setCurrentConnection('prod');
      expect(configManager.getConfig().current_connection).toBe('prod');
    });

    test('should throw error when switching to invalid profile', () => {
      setupTestEnv('LOCAL');

      const configManager = new ConfigManager();

      expect(() => {
        configManager.setCurrentConnection('invalid');
      }).toThrow("Connection 'invalid' not found in configuration");
    });

    test('should return correct config after switching', () => {
      setupTestEnv('LOCAL', { server: 'localhost' });
      setupTestEnv('PROD', { server: 'prod.server.com' });

      const configManager = new ConfigManager();

      const localConn = configManager.getCurrentConnection();
      expect(localConn.server).toBe('localhost');

      configManager.setCurrentConnection('prod');

      const prodConn = configManager.getCurrentConnection();
      expect(prodConn.server).toBe('prod.server.com');
    });

    test('should get connection by name', () => {
      setupTestEnv('LOCAL', { server: 'localhost' });
      setupTestEnv('PROD', { server: 'prod.server.com' });

      const configManager = new ConfigManager();

      const prodConn = configManager.getConnection('prod');
      expect(prodConn.server).toBe('prod.server.com');
    });

    test('should throw error when getting invalid connection by name', () => {
      setupTestEnv('LOCAL');

      const configManager = new ConfigManager();

      expect(() => {
        configManager.getConnection('invalid');
      }).toThrow("Connection 'invalid' not found in configuration");
    });
  });

  describe('Configuration Defaults', () => {
    test('should have correct default limits', () => {
      setupTestEnv('LOCAL');

      const configManager = new ConfigManager();
      const config = configManager.getConfig();

      expect(config.limits.max_rows).toBe(10000);
      expect(config.limits.query_timeout_seconds).toBe(30);
      expect(config.limits.max_query_length).toBe(50000);
      expect(config.limits.max_response_tokens).toBe(20000);
    });

    test('should have correct code generation defaults', () => {
      setupTestEnv('LOCAL');

      const configManager = new ConfigManager();
      const config = configManager.getConfig();

      expect(config.code_generation.default_namespace).toBe('Data');
      expect(config.code_generation.use_nullable_reference_types).toBe(true);
      expect(config.code_generation.entity_framework_version).toBe('8.0');
      expect(config.code_generation.use_records_for_dtos).toBe(false);
    });

    test('should have correct feature flags', () => {
      setupTestEnv('LOCAL');

      const configManager = new ConfigManager();
      const config = configManager.getConfig();

      expect(config.features.enable_write_operations).toBe(false);
      expect(config.features.enable_procedure_execution).toBe(false);
      expect(config.features.enable_cross_database_queries).toBe(true);
      expect(config.features.enable_schema_comparison).toBe(true);
    });

    test('should default readonly to true', () => {
      setupTestEnv('LOCAL');

      const configManager = new ConfigManager();
      const conn = configManager.getCurrentConnection();

      expect(conn.readonly).toBe(true);
    });

    test('should allow disabling readonly via environment variable', () => {
      setupTestEnv('LOCAL');
      process.env.MSSQL_LOCAL_READONLY = 'false';

      const configManager = new ConfigManager();
      const conn = configManager.getCurrentConnection();

      expect(conn.readonly).toBe(false);
    });

    test('should default port to 1433', () => {
      setupTestEnv('LOCAL');

      const configManager = new ConfigManager();
      const conn = configManager.getCurrentConnection();

      expect(conn.port).toBe(1433);
    });

    test('should allow custom port via environment variable', () => {
      setupTestEnv('LOCAL');
      process.env.MSSQL_LOCAL_PORT = '1435';

      const configManager = new ConfigManager();
      const conn = configManager.getCurrentConnection();

      expect(conn.port).toBe(1435);
    });

    test('should default encrypt to false', () => {
      setupTestEnv('LOCAL');

      const configManager = new ConfigManager();
      const conn = configManager.getCurrentConnection();

      expect(conn.encrypt).toBe(false);
    });

    test('should allow enabling encryption via environment variable', () => {
      setupTestEnv('LOCAL');
      process.env.MSSQL_LOCAL_ENCRYPT = 'true';

      const configManager = new ConfigManager();
      const conn = configManager.getCurrentConnection();

      expect(conn.encrypt).toBe(true);
    });

    test('should default trustServerCertificate to true', () => {
      setupTestEnv('LOCAL');

      const configManager = new ConfigManager();
      const conn = configManager.getCurrentConnection();

      expect(conn.trustServerCertificate).toBe(true);
    });
  });

  describe('Environment Variable Parsing', () => {
    test('should handle database name in environment', () => {
      setupTestEnv('LOCAL', { database: 'MyDatabase' });

      const configManager = new ConfigManager();
      const conn = configManager.getCurrentConnection();

      expect(conn.database).toBe('MyDatabase');
    });

    test('should handle empty database name', () => {
      setupTestEnv('LOCAL', { server: 'localhost' });
      // Don't set database
      delete process.env.MSSQL_LOCAL_DATABASE;

      const configManager = new ConfigManager();
      const conn = configManager.getCurrentConnection();

      expect(conn.database).toBe('');
    });

    test('should handle domain for integrated auth', () => {
      setupTestEnv('LOCAL', { auth: 'integrated' });
      process.env.MSSQL_LOCAL_DOMAIN = 'MYDOMAIN';

      const configManager = new ConfigManager();
      const conn = configManager.getCurrentConnection();

      expect(conn.domain).toBe('MYDOMAIN');
    });

    test('should set correct environment label', () => {
      setupTestEnv('PROD', { server: 'prod.server.com' });

      const configManager = new ConfigManager();
      const conn = configManager.getConnection('prod');

      expect(conn.environment).toBe('prod');
    });
  });
});
