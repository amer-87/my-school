const net = require('node:net');
const path = require('node:path');
const { spawn } = require('node:child_process');

const projectRoot = path.resolve(__dirname, '..');
const children = [];
let stopping = false;

function findAvailablePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close((error) => error ? reject(error) : resolve(port));
    });
  });
}

function waitForServer(port, serverProcess) {
  const deadline = Date.now() + 30000;

  return new Promise((resolve, reject) => {
    const check = () => {
      if (serverProcess.exitCode !== null) {
        reject(new Error('Vite exited before the development server became ready.'));
        return;
      }

      const connection = net.createConnection({ host: '127.0.0.1', port });
      connection.once('connect', () => {
        connection.destroy();
        resolve();
      });
      connection.once('error', () => {
        if (Date.now() >= deadline) {
          reject(new Error('Timed out waiting for the Vite development server.'));
        } else {
          setTimeout(check, 200);
        }
      });
    };

    check();
  });
}

function stop(exitCode) {
  if (stopping) return;
  stopping = true;
  process.exitCode = exitCode;
  for (const child of children) {
    if (child.exitCode === null) child.kill();
  }
}

async function start() {
  const port = await findAvailablePort();
  const env = {
    ...process.env,
    VITE_DEV_SERVER_PORT: String(port),
    ELECTRON_START_URL: `http://127.0.0.1:${port}`,
  };
  const vite = spawn(process.execPath, [path.join(projectRoot, 'node_modules', 'vite', 'bin', 'vite.js')], {
    cwd: projectRoot,
    env,
    stdio: 'inherit',
  });
  children.push(vite);
  vite.once('error', (error) => {
    console.error('Failed to start Vite:', error);
    stop(1);
  });
  vite.once('exit', (code) => {
    if (!stopping) stop(code || 0);
  });

  await waitForServer(port, vite);
  if (stopping) return;

  const electron = spawn(require('electron'), ['.'], {
    cwd: projectRoot,
    env,
    stdio: 'inherit',
  });
  children.push(electron);
  electron.once('error', (error) => {
    console.error('Failed to start Electron:', error);
    stop(1);
  });
  electron.once('exit', (code) => {
    if (!stopping) stop(code || 0);
  });
}

process.once('SIGINT', () => stop(0));
process.once('SIGTERM', () => stop(0));

start().catch((error) => {
  console.error(error);
  stop(1);
});
