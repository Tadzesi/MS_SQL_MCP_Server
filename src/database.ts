import { ConnectionConfig } from './types.js';
import { Logger } from './logger.js';

type ConnectionPool = any;
type SqlConfig = any;

/**
 * Database connection manager with pooling support
 *
 * IMPORTANT: Supports two authentication methods:
 * 1. SQL Server Authentication - Uses standard mssql package (tedious driver)
 * 2. Windows Integrated Authentication - Uses msnodesqlv8 driver
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

    // Dynamically import the correct driver based on authentication type
    let sql: any;
    if (connectionConfig.authentication === 'integrated') {
      Logger.info('Loading msnodesqlv8 driver for Windows authentication');
      // @ts-ignore - mssql/msnodesqlv8 doesn't have type declarations
      sql = await import('mssql/msnodesqlv8.js');
    } else {
      Logger.info('Loading tedious driver for SQL Server authentication');
      sql = await import('mssql');
    }

    // Create new connection pool
    const config: SqlConfig = {
      server: connectionConfig.server,
      database: connectionConfig.database,
      options: {
        encrypt: connectionConfig.encrypt ?? false,
        trustServerCertificate: connectionConfig.trustServerCertificate ?? true,
        enableArithAbort: true,
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
    Logger.debug(`Server: ${connectionConfig.server}`);
    Logger.debug(`Database: ${connectionConfig.database}`);

    if (connectionConfig.authentication === 'sql') {
      // SQL Server Authentication using tedious driver (default)
      if (!connectionConfig.username || !connectionConfig.password) {
        throw new Error('SQL authentication requires username and password');
      }
      Logger.info('Using SQL Server authentication (tedious driver)');
      config.user = connectionConfig.username;
      config.password = connectionConfig.password;
      config.options.readOnlyIntent = connectionConfig.readonly;
    } else {
      // Windows Integrated Authentication using msnodesqlv8 driver
      Logger.info('Using Windows Integrated Authentication (msnodesqlv8 driver)');
      Logger.info('Connection will use current Windows user credentials');

      // CRITICAL: Must set driver to msnodesqlv8 for Windows auth
      config.driver = 'msnodesqlv8';

      // CRITICAL: Must set trustedConnection for Windows auth
      config.options.trustedConnection = true;

      // Do NOT set user/password for Windows auth - it uses current Windows session
      Logger.debug('Windows authentication will use current user session credentials');
    }

    // Log connection string (with password masked)
    const connectionString = this.formatConnectionString(connectionConfig);
    Logger.info(`Connecting to database: ${connectionString}`);

    try {
      // Robust module access - handle different export patterns
      const ConnectionPool = sql.default?.ConnectionPool || sql.ConnectionPool || sql.default;

      if (typeof ConnectionPool !== 'function') {
        const driverName = connectionConfig.authentication === 'integrated' ? 'msnodesqlv8' : 'mssql';
        Logger.error(`ConnectionPool not found in ${driverName} module. Available keys: ${Object.keys(sql).join(', ')}`);
        throw new Error(`Failed to load ConnectionPool constructor from ${driverName} driver`);
      }

      Logger.debug(`Creating connection pool using ${connectionConfig.authentication} driver`);
      pool = new ConnectionPool(config);

      Logger.debug('Connecting to database...');
      await pool.connect();

      // Validate connection state
      if (!pool.connected) {
        throw new Error(`Connection failed - pool.connected is ${pool.connected}`);
      }

      // Validate required methods exist
      if (typeof pool.request !== 'function') {
        throw new Error(`Pool missing request() method - typeof pool.request is ${typeof pool.request}`);
      }

      Logger.info(`Successfully connected to ${connectionConfig.server}/${connectionConfig.database}`);
      Logger.debug(`Pool state: connected=${pool.connected}, hasRequest=${typeof pool.request === 'function'}`);

    } catch (error: any) {
      Logger.error(`Connection failed for ${connectionConfig.authentication} authentication:`, error);
      throw new Error(`${connectionConfig.authentication} authentication connection failed: ${error.message}`);
    }

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