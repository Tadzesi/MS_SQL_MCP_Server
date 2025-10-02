import sql from 'mssql';
import { ConnectionConfig } from './types.js';
import { Logger } from './logger.js';

type ConnectionPool = any;
type SqlConfig = any;

/**
 * Database connection manager with pooling support
 */
export class DatabaseManager {
  private pools: Map<string, ConnectionPool> = new Map();

  async getConnection(connectionConfig: ConnectionConfig): Promise<ConnectionPool> {
    const key = this.getConnectionKey(connectionConfig);

    let pool = this.pools.get(key);
    if (pool && pool.connected) {
      Logger.debug(`Reusing existing connection pool for ${key}`);
      return pool;
    }

    // Create new connection pool
    const config: SqlConfig = {
      server: connectionConfig.server,
      database: connectionConfig.database,
      options: {
        encrypt: connectionConfig.encrypt ?? false,
        trustServerCertificate: connectionConfig.trustServerCertificate ?? true,
        enableArithAbort: true,
        readOnlyIntent: connectionConfig.readonly,
        instanceName: connectionConfig.server.includes('\\') ? connectionConfig.server.split('\\')[1] : undefined
      },
      pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
      },
      requestTimeout: 30000,
      connectionTimeout: 15000
    };

    // Add authentication
    Logger.debug(`Authentication type: ${connectionConfig.authentication}`);
    Logger.debug(`Username: ${connectionConfig.username || 'integrated'}`);

    if (connectionConfig.authentication === 'sql') {
      if (!connectionConfig.username || !connectionConfig.password) {
        throw new Error('SQL authentication requires username and password');
      }
      Logger.info('Using SQL authentication');
      // For SQL authentication, only set user and password (no authentication object)
      config.user = connectionConfig.username;
      config.password = connectionConfig.password;
    } else {
      // Windows integrated authentication
      Logger.info('Using Windows integrated authentication');
      config.authentication = {
        type: 'ntlm',
        options: {
          domain: '',
          userName: connectionConfig.username || '',
          password: connectionConfig.password || ''
        }
      };
    }

    // Log connection string (with password masked)
    const connectionString = this.formatConnectionString(connectionConfig);
    Logger.info(`Connecting to database: ${connectionString}`);

    pool = new sql.ConnectionPool(config);
    await pool.connect();

    Logger.info(`Successfully connected to ${connectionConfig.server}/${connectionConfig.database}`);
    this.pools.set(key, pool);
    return pool;
  }

  private getConnectionKey(config: ConnectionConfig): string {
    return `${config.server}:${config.port || 1433}:${config.database}:${config.username || 'integrated'}`;
  }

  private formatConnectionString(config: ConnectionConfig): string {
    const parts = [
      `Server=${config.server}`,
      `Database=${config.database}`
    ];

    if (config.port) {
      parts.push(`Port=${config.port}`);
    }

    if (config.authentication === 'sql') {
      parts.push(`User=${config.username}`);
      parts.push(`Password=****`);
    } else {
      parts.push(`IntegratedSecurity=true`);
    }

    parts.push(`Encrypt=${config.encrypt ?? false}`);
    parts.push(`TrustServerCertificate=${config.trustServerCertificate ?? true}`);
    parts.push(`ReadOnly=${config.readonly ?? false}`);

    return parts.join('; ');
  }

  async closeAll(): Promise<void> {
    Logger.info(`Closing ${this.pools.size} connection pool(s)`);
    for (const pool of this.pools.values()) {
      try {
        await pool.close();
      } catch (error) {
        Logger.error('Error closing connection pool:', error);
      }
    }
    this.pools.clear();
  }

  async executeQuery<T = any>(
    pool: ConnectionPool,
    query: string,
    timeout?: number
  ): Promise<any> {
    const request = pool.request();
    if (timeout) {
      (request as any).timeout = timeout * 1000;
    }
    return await request.query(query);
  }

  async executeScalar<T = any>(
    pool: ConnectionPool,
    query: string
  ): Promise<T> {
    const result = await this.executeQuery<any>(pool, query);
    if (result.recordset && result.recordset.length > 0) {
      const firstRow = result.recordset[0];
      return Object.values(firstRow)[0] as T;
    }
    throw new Error('Query returned no results');
  }

  validateReadOnlyQuery(query: string): void {
    const normalizedQuery = query.trim().toLowerCase();

    // Check for dangerous keywords
    const dangerousPatterns = [
      /\b(insert|update|delete|drop|truncate|alter|create|exec|execute|sp_executesql)\b/i,
      /\binto\s+\w+/i,  // INSERT INTO
      /\bset\s+\w+\s*=/i  // UPDATE ... SET
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(normalizedQuery)) {
        throw new Error('Only SELECT queries are allowed. Write operations must be performed through Entity Framework.');
      }
    }

    // Must start with SELECT, WITH, or EXPLAIN
    if (!/^(select|with|explain|set\s+(statistics|showplan))/i.test(normalizedQuery)) {
      throw new Error('Query must start with SELECT, WITH, or EXPLAIN');
    }
  }
}