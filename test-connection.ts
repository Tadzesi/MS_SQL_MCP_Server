/**
 * Test script to verify SQL Server connections with both authentication methods
 */
import { DatabaseManager } from './src/database.js';
import { ConnectionConfig } from './src/types.js';

/**
 * Test Windows Integrated Authentication
 */
async function testWindowsAuth(): Promise<void> {
  console.log('\n' + '='.repeat(70));
  console.log('Testing Windows Integrated Authentication');
  console.log('='.repeat(70));

  const config: ConnectionConfig = {
    server: 'NKKE13399',
    database: 'database-edu-care-portal',
    authentication: 'integrated',
    readonly: false,
    environment: 'development',
    encrypt: false,
    trustServerCertificate: true
  };

  const dbManager = new DatabaseManager();

  try {
    console.log(`\nConnecting to: ${config.server}\\${config.database}`);
    console.log('Authentication: Windows Integrated (msnodesqlv8)');
    console.log('Credentials: Current Windows user session\n');

    const pool = await dbManager.getConnection(config);
    console.log('✓ Successfully connected to SQL Server!\n');

    // Test query to verify connection
    console.log('Executing test query...');
    const result = await dbManager.executeQuery(pool, `
      SELECT
        @@VERSION as SQLVersion,
        SYSTEM_USER as AuthenticatedUser,
        DB_NAME() as CurrentDatabase,
        GETDATE() as ServerTime
    `);

    if (result.recordset && result.recordset.length > 0) {
      const row = result.recordset[0];
      console.log('\n' + '='.repeat(70));
      console.log('Connection Test Results:');
      console.log('='.repeat(70));
      console.log('\nAuthenticated User:', row.AuthenticatedUser);
      console.log('Current Database:', row.CurrentDatabase);
      console.log('Server Time:', row.ServerTime);
      console.log('\nSQL Server Version:');
      console.log(row.SQLVersion.substring(0, 100) + '...');
    }

    console.log('\n' + '='.repeat(70));
    console.log('✓ Windows Authentication is working correctly!');
    console.log('='.repeat(70));

    await dbManager.closeAll();
    console.log('\n✓ Connection closed successfully.\n');

    return;
  } catch (err) {
    console.error('\n' + '='.repeat(70));
    console.error('❌ Windows Authentication Test Failed:');
    console.error('='.repeat(70));

    if (err instanceof Error) {
      console.error('\nError Message:', err.message);
      console.error('\nFull Error:');
      console.error(err);

      console.error('\n' + '='.repeat(70));
      console.error('Troubleshooting Tips:');
      console.error('='.repeat(70));
      console.error('1. Verify the SQL Server name is correct: NKKE13399');
      console.error('2. Ensure the database exists: database-edu-care-portal');
      console.error('3. Check that SQL Server is running and accessible');
      console.error('4. Verify your Windows user has permissions on the database');
      console.error('5. Ensure msnodesqlv8 package is properly installed');
      console.error('6. Check if SQL Server is configured to accept Windows Authentication');
      console.error('7. Make sure you are running this from a Windows environment');
    } else {
      console.error(err);
    }

    throw err;
  }
}

/**
 * Test SQL Server Authentication
 * NOTE: You need to provide SQL auth credentials for this test
 */
async function testSqlAuth(username?: string, password?: string): Promise<void> {
  if (!username || !password) {
    console.log('\n' + '='.repeat(70));
    console.log('Skipping SQL Server Authentication test (no credentials provided)');
    console.log('='.repeat(70));
    console.log('To test SQL auth, provide username and password as arguments.\n');
    return;
  }

  console.log('\n' + '='.repeat(70));
  console.log('Testing SQL Server Authentication');
  console.log('='.repeat(70));

  const config: ConnectionConfig = {
    server: 'NKKE13399',
    database: 'database-edu-care-portal',
    authentication: 'sql',
    username,
    password,
    readonly: false,
    environment: 'development',
    encrypt: false,
    trustServerCertificate: true
  };

  const dbManager = new DatabaseManager();

  try {
    console.log(`\nConnecting to: ${config.server}\\${config.database}`);
    console.log('Authentication: SQL Server (tedious driver)');
    console.log(`Username: ${username}\n`);

    const pool = await dbManager.getConnection(config);
    console.log('✓ Successfully connected to SQL Server!\n');

    // Test query to verify connection
    console.log('Executing test query...');
    const result = await dbManager.executeQuery(pool, `
      SELECT
        SYSTEM_USER as AuthenticatedUser,
        DB_NAME() as CurrentDatabase,
        GETDATE() as ServerTime
    `);

    if (result.recordset && result.recordset.length > 0) {
      const row = result.recordset[0];
      console.log('\n' + '='.repeat(70));
      console.log('Connection Test Results:');
      console.log('='.repeat(70));
      console.log('\nAuthenticated User:', row.AuthenticatedUser);
      console.log('Current Database:', row.CurrentDatabase);
      console.log('Server Time:', row.ServerTime);
    }

    console.log('\n' + '='.repeat(70));
    console.log('✓ SQL Server Authentication is working correctly!');
    console.log('='.repeat(70));

    await dbManager.closeAll();
    console.log('\n✓ Connection closed successfully.\n');

  } catch (err) {
    console.error('\n' + '='.repeat(70));
    console.error('❌ SQL Server Authentication Test Failed:');
    console.error('='.repeat(70));

    if (err instanceof Error) {
      console.error('\nError Message:', err.message);
      console.error('\nFull Error:');
      console.error(err);
    } else {
      console.error(err);
    }

    throw err;
  }
}

/**
 * Main test runner
 */
async function runTests(): Promise<void> {
  console.log('\n' + '='.repeat(70));
  console.log('MS SQL MCP Server - Connection Tests');
  console.log('='.repeat(70));

  // Get SQL auth credentials from command line if provided
  const sqlUsername = process.argv[2];
  const sqlPassword = process.argv[3];

  try {
    // Test Windows Authentication
    await testWindowsAuth();

    // Test SQL Server Authentication (if credentials provided)
    if (sqlUsername && sqlPassword) {
      await testSqlAuth(sqlUsername, sqlPassword);
    }

    console.log('\n' + '='.repeat(70));
    console.log('✓ All tests completed successfully!');
    console.log('='.repeat(70) + '\n');

    process.exit(0);
  } catch (err) {
    console.error('\n' + '='.repeat(70));
    console.error('❌ Tests failed');
    console.error('='.repeat(70) + '\n');
    process.exit(1);
  }
}

// Run tests
runTests();
