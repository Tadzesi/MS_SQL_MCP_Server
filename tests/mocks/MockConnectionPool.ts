/**
 * Mock SQL Server Connection Pool for testing
 * Simulates the behavior of mssql ConnectionPool without requiring a real database
 */

export interface MockQueryResult {
  recordset: any[];
  rowsAffected: number[];
}

export class MockRequest {
  private pool: MockConnectionPool;
  public timeout?: number;

  constructor(pool: MockConnectionPool) {
    this.pool = pool;
  }

  async query(sql: string): Promise<MockQueryResult> {
    this.pool.trackQuery(sql);

    const response = this.pool.getQueuedResponse();
    if (response) {
      if (response.error) {
        throw response.error;
      }
      return response.result!;
    }

    // Default empty response
    return {
      recordset: [],
      rowsAffected: [0],
    };
  }
}

export class MockConnectionPool {
  public connected: boolean = false;
  private responseQueue: Array<{ result?: MockQueryResult; error?: Error }> = [];
  private queriesExecuted: string[] = [];

  async connect(): Promise<void> {
    this.connected = true;
  }

  async close(): Promise<void> {
    this.connected = false;
  }

  request(): MockRequest {
    if (!this.connected) {
      throw new Error('Connection pool not connected');
    }
    return new MockRequest(this);
  }

  // Test utilities

  /**
   * Queue a successful response for the next query
   */
  queueResponse(recordset: any[], rowsAffected: number[] = [recordset.length]): void {
    this.responseQueue.push({
      result: { recordset, rowsAffected },
    });
  }

  /**
   * Queue an error for the next query
   */
  queueError(error: Error): void {
    this.responseQueue.push({ error });
  }

  /**
   * Get the next queued response
   */
  getQueuedResponse(): { result?: MockQueryResult; error?: Error } | undefined {
    return this.responseQueue.shift();
  }

  /**
   * Track executed queries for verification
   */
  trackQuery(sql: string): void {
    this.queriesExecuted.push(sql);
  }

  /**
   * Get all executed queries
   */
  getExecutedQueries(): string[] {
    return this.queriesExecuted;
  }

  /**
   * Get the last executed query
   */
  getLastQuery(): string | undefined {
    return this.queriesExecuted[this.queriesExecuted.length - 1];
  }

  /**
   * Clear query history
   */
  clearQueryHistory(): void {
    this.queriesExecuted = [];
  }

  /**
   * Clear response queue
   */
  clearResponseQueue(): void {
    this.responseQueue = [];
  }

  /**
   * Reset mock to initial state
   */
  reset(): void {
    this.connected = false;
    this.queriesExecuted = [];
    this.responseQueue = [];
  }
}
