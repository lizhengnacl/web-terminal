const pty = require('node-pty');
const os = require('os');

console.log('Testing node-pty...');
console.log('Platform:', process.platform);
console.log('Arch:', process.arch);
console.log('Node version:', process.version);

try {
  console.log('\nTrying to spawn shell...');
  
  const shell = os.platform() === 'win32' ? 'powershell.exe' : '/bin/sh';
  
  console.log('Using shell:', shell);
  
  const ptyProcess = pty.spawn(shell, [], {
    name: 'xterm-color',
    cols: 80,
    rows: 30,
    cwd: process.env.HOME,
    env: process.env
  });

  console.log('✓ PTY process spawned successfully!');
  console.log('  PID:', ptyProcess.pid);

  let output = '';
  
  ptyProcess.onData((data) => {
    output += data;
    console.log('Received data:', JSON.stringify(data));
  });

  ptyProcess.onExit(({ exitCode, signal }) => {
    console.log('Process exited with code:', exitCode, 'signal:', signal);
  });

  setTimeout(() => {
    console.log('\nWriting "echo hello\\n"...');
    ptyProcess.write('echo hello\n');
  }, 500);

  setTimeout(() => {
    console.log('\nWriting "exit\\n"...');
    ptyProcess.write('exit\n');
  }, 1500);

  setTimeout(() => {
    console.log('\nFinal output:');
    console.log(output);
    process.exit(0);
  }, 2500);

} catch (error) {
  console.error('✗ Failed to spawn PTY:', error);
  console.error('Error stack:', error.stack);
  process.exit(1);
}
