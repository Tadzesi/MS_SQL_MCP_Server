const { spawn } = require('child_process');

const server = spawn('node', ['dist/index.js'], {
  stdio: ['pipe', 'pipe', 'inherit']
});

let buffer = '';

server.stdout.on('data', (data) => {
  buffer += data.toString();
  
  const lines = buffer.split('\n');
  buffer = lines.pop() || '';
  
  lines.forEach(line => {
    if (line.trim()) {
      try {
        const response = JSON.parse(line);
        console.log('\n=== RESPONSE ===');
        console.log(JSON.stringify(response, null, 2));
      } catch (e) {
        console.log('Output:', line);
      }
    }
  });
});

setTimeout(() => {
  console.log('=== Initializing ===');
  const init = {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'test', version: '1.0' }
    }
  };
  server.stdin.write(JSON.stringify(init) + '\n');
}, 500);

setTimeout(() => {
  console.log('\n=== Listing Tables ===');
  const call = {
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/call',
    params: {
      name: 'mssql_list_tables',
      arguments: {
        database: 'database-edu-care-portal',
        schema: 'dbo'
      }
    }
  };
  server.stdin.write(JSON.stringify(call) + '\n');
}, 2000);

setTimeout(() => {
  server.kill();
  process.exit(0);
}, 8000);
