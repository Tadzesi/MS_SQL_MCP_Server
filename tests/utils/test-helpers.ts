/**
 * Test utility functions for setting up test environments and assertions
 */

/**
 * Set environment variables for testing
 */
export function setTestEnv(vars: Record<string, string>): void {
  for (const [key, value] of Object.entries(vars)) {
    process.env[key] = value;
  }
}

/**
 * Clear environment variables after testing
 */
export function clearTestEnv(keys: string[]): void {
  for (const key of keys) {
    delete process.env[key];
  }
}

/**
 * Clear all MSSQL environment variables
 */
export function clearMssqlEnv(): void {
  const keys = Object.keys(process.env).filter(key => key.startsWith('MSSQL_'));
  clearTestEnv(keys);
}

/**
 * Set up a complete test environment with SQL Server config
 */
export function setupTestEnv(profile: string = 'LOCAL', config: {
  server?: string;
  database?: string;
  auth?: 'sql' | 'integrated';
  username?: string;
  password?: string;
} = {}): void {
  const {
    server = 'localhost',
    database = 'TestDB',
    auth = 'sql',
    username = 'testuser',
    password = 'testpass'
  } = config;

  const prefix = `MSSQL_${profile}`;

  setTestEnv({
    [`${prefix}_SERVER`]: server,
    [`${prefix}_DATABASE`]: database,
    [`${prefix}_AUTH`]: auth,
  });

  if (auth === 'sql') {
    setTestEnv({
      [`${prefix}_USERNAME`]: username,
      [`${prefix}_PASSWORD`]: password,
    });
  }
}

/**
 * Wait for a condition to be true (for async testing)
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeout: number = 1000,
  interval: number = 50
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }

  throw new Error(`Timeout waiting for condition after ${timeout}ms`);
}

/**
 * Assertion helpers for common test patterns
 */

export function assertContains(haystack: string, needle: string): void {
  if (!haystack.includes(needle)) {
    throw new Error(`Expected string to contain "${needle}", but it did not.\nString: ${haystack}`);
  }
}

export function assertNotContains(haystack: string, needle: string): void {
  if (haystack.includes(needle)) {
    throw new Error(`Expected string to not contain "${needle}", but it did.\nString: ${haystack}`);
  }
}

export function assertMatches(text: string, pattern: RegExp): void {
  if (!pattern.test(text)) {
    throw new Error(`Expected string to match pattern ${pattern}, but it did not.\nString: ${text}`);
  }
}

export function assertNotMatches(text: string, pattern: RegExp): void {
  if (pattern.test(text)) {
    throw new Error(`Expected string to not match pattern ${pattern}, but it did.\nString: ${text}`);
  }
}

/**
 * Mock console.error to capture error output in tests
 */
export function mockConsoleError(): { restore: () => void; calls: string[] } {
  const originalError = console.error;
  const calls: string[] = [];

  console.error = (...args: any[]) => {
    calls.push(args.map(arg => String(arg)).join(' '));
  };

  return {
    calls,
    restore: () => {
      console.error = originalError;
    },
  };
}

/**
 * Create a spy function for testing callbacks
 */
export function createSpy<T extends (...args: any[]) => any>(): T & { calls: Parameters<T>[][]; callCount: number } {
  const calls: any[][] = [];

  const spy = ((...args: any[]) => {
    calls.push(args);
  }) as T & { calls: Parameters<T>[][]; callCount: number };

  spy.calls = calls as Parameters<T>[][];
  Object.defineProperty(spy, 'callCount', {
    get: () => calls.length,
  });

  return spy;
}

/**
 * Delay execution for a specified time (for testing async behavior)
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
