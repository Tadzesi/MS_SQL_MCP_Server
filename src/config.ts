import { writeFileSync } from 'fs';
import { ServerConfig } from './types.js';

/**
 * Configuration manager for MS SQL MCP Server
 */
export class ConfigManager {
  private config: ServerConfig;

  constructor(configPath?: string) {
    this.config = this.loadConfig(configPath);
  }

  private loadConfig(configPath?: string): ServerConfig {
    // Always use default configuration
    console.error('Using default configuration');
    const config = this.getDefaultConfig();
    const configSource = 'default';
    this.writeConfigToLog(config, configSource);
    return config;
  }

  private writeConfigToLog(config: ServerConfig, source: string): void {
    try {
      const sanitizedConfig = this.sanitizeConfig(config);
      const logEntry = {
        timestamp: new Date().toISOString(),
        source: source,
        config: sanitizedConfig
      };
      const logContent = JSON.stringify(logEntry, null, 2);
      writeFileSync('mssql-mcp-config.log', logContent, 'utf-8');
      console.error('Configuration written to mssql-mcp-config.log');
    } catch (error) {
      console.error('Failed to write config to log file:', error);
    }
  }

  private sanitizeConfig(config: ServerConfig): any {
    const sanitized = JSON.parse(JSON.stringify(config));
    // Mask passwords in all connections
    for (const connName in sanitized.connections) {
      if (sanitized.connections[connName].password) {
        sanitized.connections[connName].password = '***REDACTED***';
      }
    }
    return sanitized;
  }

  private getDefaultConfig(): ServerConfig {
    return {
      connections: {
        default: {
          server: 'NKKE13399',
          database: 'database-edu-care-portal',
          authentication: 'sql',
          username: 'local_user',
          password: 'local_user',
          readonly: true,
          environment: 'development',
          port: 1433,
          encrypt: false,
          trustServerCertificate: true
        }
      },
      limits: {
        max_rows: 10000,
        query_timeout_seconds: 30,
        max_query_length: 50000
      },
      code_generation: {
        default_namespace: 'Data',
        use_nullable_reference_types: true,
        entity_framework_version: '8.0',
        use_records_for_dtos: false
      },
      features: {
        enable_write_operations: false,
        enable_procedure_execution: false,
        enable_cross_database_queries: true,
        enable_schema_comparison: true
      },
      current_connection: 'default'
    };
  }

  getConfig(): ServerConfig {
    return this.config;
  }

  getCurrentConnection() {
    const connName = this.config.current_connection || 'default';
    const conn = this.config.connections[connName];
    if (!conn) {
      throw new Error(`Connection '${connName}' not found in configuration`);
    }
    return conn;
  }

  getConnection(name: string) {
    const conn = this.config.connections[name];
    if (!conn) {
      throw new Error(`Connection '${name}' not found in configuration`);
    }
    return conn;
  }

  setCurrentConnection(name: string) {
    if (!this.config.connections[name]) {
      throw new Error(`Connection '${name}' not found in configuration`);
    }
    this.config.current_connection = name;
  }
}