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

    const availableConnections = Object.keys(config.connections);

    // Check if any connections are configured
    if (availableConnections.length === 0) {
      throw new Error(
        `Configuration Error: No connection profiles found.\n\n` +
        `Please configure your database connection by setting environment variables in your Claude Desktop MCP configuration:\n\n` +
        `For SQL Server Authentication:\n` +
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
        `For Windows Integrated Authentication:\n` +
        `{\n` +
        `  "mcpServers": {\n` +
        `    "mssql": {\n` +
        `      "command": "node",\n` +
        `      "args": ["path/to/MS_SQL_MCP_Server/dist/index.js"],\n` +
        `      "env": {\n` +
        `        "MSSQL_LOCAL_SERVER": "SERVERNAME",\n` +
        `        "MSSQL_LOCAL_DATABASE": "YourDatabase",\n` +
        `        "MSSQL_LOCAL_AUTH": "integrated"\n` +
        `      }\n` +
        `    }\n` +
        `  }\n` +
        `}\n\n` +
        `Required: MSSQL_{PREFIX}_SERVER and MSSQL_{PREFIX}_DATABASE\n` +
        `Supported prefixes: LOCAL, PROD, DEV\n` +
        `For SQL auth: MSSQL_{PREFIX}_AUTH="sql", MSSQL_{PREFIX}_USERNAME, MSSQL_{PREFIX}_PASSWORD\n` +
        `For Windows auth: MSSQL_{PREFIX}_AUTH="integrated" (uses current Windows user)`
      );
    }

    // Auto-select connection profile: prefer 'local', otherwise use first available
    if (!config.connections['local']) {
      const firstConnection = availableConnections[0];
      config.current_connection = firstConnection;
      console.error(
        `Note: 'local' connection profile not found. Available profiles: ${availableConnections.join(', ')}\n` +
        `Automatically selected '${firstConnection}' as the default connection.\n` +
        `You can switch connections using the mssql_switch_connection tool.`
      );
    } else {
      config.current_connection = 'local';
    }

    console.error(`Loaded ${availableConnections.length} connection profile(s): ${availableConnections.join(', ')}`);
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
          domain: process.env[`MSSQL_${prefix}_DOMAIN`],
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
        max_query_length: 50000,
        max_response_tokens: 20000
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
      current_connection: '' // Set dynamically in loadConfig()
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