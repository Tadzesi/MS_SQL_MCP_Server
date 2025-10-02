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
    const config = this.getDefaultConfig();

    // Load connection profiles from environment variables
    const envConnections = this.loadConnectionsFromEnv();
    config.connections = { ...config.connections, ...envConnections };

    // Validate that 'local' connection exists (default connection)
    if (!config.connections['local']) {
      throw new Error(
        `Configuration Error: No 'local' connection profile found.\n\n` +
        `Please configure your database connection by setting environment variables in your Claude Desktop MCP configuration:\n\n` +
        `{\n` +
        `  "mcpServers": {\n` +
        `    "mssql": {\n` +
        `      "command": "node",\n` +
        `      "args": ["path/to/MS_SQL_MCP_Server/dist/index.js"],\n` +
        `      "env": {\n` +
        `        "MSSQL_LOCAL_SERVER": "localhost",\n` +
        `        "MSSQL_LOCAL_DATABASE": "YourDatabase",\n` +
        `        "MSSQL_LOCAL_AUTH": "sql",\n` +
        `        "MSSQL_LOCAL_USERNAME": "your_username",\n` +
        `        "MSSQL_LOCAL_PASSWORD": "your_password"\n` +
        `      }\n` +
        `    }\n` +
        `  }\n` +
        `}\n\n` +
        `Required: MSSQL_LOCAL_SERVER and MSSQL_LOCAL_DATABASE\n` +
        `For SQL auth: MSSQL_LOCAL_USERNAME and MSSQL_LOCAL_PASSWORD\n` +
        `For Windows auth: Set MSSQL_LOCAL_AUTH="integrated"`
      );
    }

    console.error(`Loaded ${Object.keys(config.connections).length} connection profile(s)`);
    return config;
  }

  private loadConnectionsFromEnv(): Record<string, any> {
    const connections: Record<string, any> = {};
    const envPrefixes = ['LOCAL', 'PROD', 'DEV'];

    for (const prefix of envPrefixes) {
      const server = process.env[`MSSQL_${prefix}_SERVER`];
      if (server) {
        const connKey = prefix.toLowerCase();
        connections[connKey] = {
          server,
          database: process.env[`MSSQL_${prefix}_DATABASE`] || '',
          authentication: (process.env[`MSSQL_${prefix}_AUTH`] || 'sql') as 'integrated' | 'sql',
          username: process.env[`MSSQL_${prefix}_USERNAME`],
          password: process.env[`MSSQL_${prefix}_PASSWORD`],
          readonly: process.env[`MSSQL_${prefix}_READONLY`] !== 'false',
          environment: connKey as 'development' | 'staging' | 'production',
          port: parseInt(process.env[`MSSQL_${prefix}_PORT`] || '1433'),
          encrypt: process.env[`MSSQL_${prefix}_ENCRYPT`] === 'true',
          trustServerCertificate: process.env[`MSSQL_${prefix}_TRUST_CERT`] !== 'false'
        };
        console.error(`Loaded ${connKey} connection profile from environment variables`);
      }
    }

    return connections;
  }

  private getDefaultConfig(): ServerConfig {
    return {
      connections: {},
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
      current_connection: 'local'
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