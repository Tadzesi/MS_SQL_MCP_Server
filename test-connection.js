import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const serverPath = join(__dirname, 'dist', 'index.js');

const server = spawn('node', [serverPath], {
  stdio: ['pipe', 'pipe', 'pipe']
});

let output = '';

server.stdout.on('data', (data) => {
  output += data.toString();
  console.log('Server response:', data.toString());
});

server.stderr.on('data', (data) => {
  console.error('Server stderr:', data.toString());
});

// Initialize
setTimeout(() => {
  console.log('\n=== Sending initialize request ===');
  server.stdin.write(JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'test', version: '1.0' }
    }
  }) + '\n');
}, 500);

// List tables
setTimeout(() => {
  console.log('\n=== Sending list_tables request ===');
  server.stdin.write(JSON.stringify({
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/call',
    params: {
      name: 'mssql_list_tables',
      arguments: {
        database: 'database-edu-portal'
      }
    }
  }) + '\n');
}, 2000);

// Close after 5 seconds
setTimeout(() => {
  console.log('\n=== Closing connection ===');
  server.kill();
  process.exit(0);
}, 5000);