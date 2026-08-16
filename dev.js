const { spawn } = require('child_process');

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const api = spawn(process.execPath, ['server.js'], { stdio: 'inherit' });
const client = spawn(npmCommand, ['--prefix', 'my-app', 'start'], { stdio: 'inherit' });
let isStopping = false;

function stopChildren(exitCode = 0) {
  if (isStopping) {
    return;
  }

  isStopping = true;
  api.kill('SIGTERM');
  client.kill('SIGTERM');

  setTimeout(() => process.exit(exitCode), 500).unref();
}

api.on('exit', (code) => {
  if (!isStopping) {
    console.error(`The API stopped unexpectedly${code === null ? '.' : ` (code ${code}).`}`);
    stopChildren(code ?? 1);
  }
});

client.on('exit', (code) => {
  if (!isStopping) {
    console.error(`The React app stopped unexpectedly${code === null ? '.' : ` (code ${code}).`}`);
    stopChildren(code ?? 1);
  }
});

process.on('SIGINT', () => stopChildren());
process.on('SIGTERM', () => stopChildren());
