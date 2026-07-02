/**
 * Release the Vite dev port before starting `npm run dev`.
 *
 * A previous dev session may leave node/vite listening on 5173. Without this
 * cleanup, strictPort causes Vite to exit immediately with "port already in use".
 */
import { execSync } from 'child_process';

const port = process.argv[2] || '5173';

function freePortUnix(targetPort) {
  let pids = [];

  try {
    const output = execSync(`lsof -ti:${targetPort}`, { encoding: 'utf8' }).trim();
    pids = output.split('\n').filter(Boolean);
  } catch {
    // lsof exits non-zero when nothing is listening on the port.
    return;
  }

  if (pids.length === 0) {
    return;
  }

  for (const pid of pids) {
    try {
      process.kill(Number(pid), 'SIGTERM');
      console.log(`Freed port ${targetPort} (stopped PID ${pid})`);
    } catch {
      // Process may have already exited.
    }
  }

  // SIGTERM is async — give listeners a moment to release the port before Vite starts.
  execSync('sleep 0.3');

  try {
    const remaining = execSync(`lsof -ti:${targetPort}`, { encoding: 'utf8' }).trim();
    for (const pid of remaining.split('\n').filter(Boolean)) {
      try {
        process.kill(Number(pid), 'SIGKILL');
        console.log(`Freed port ${targetPort} (force-killed PID ${pid})`);
      } catch {
        // Process may have already exited.
      }
    }
  } catch {
    // Port is free.
  }
}

function freePortWindows(targetPort) {
  try {
    const output = execSync(`netstat -ano | findstr :${targetPort}`, { encoding: 'utf8' });
    const pids = new Set();

    for (const line of output.split('\n')) {
      const parts = line.trim().split(/\s+/);
      const pid = parts[parts.length - 1];
      if (pid && /^\d+$/.test(pid)) {
        pids.add(pid);
      }
    }

    for (const pid of pids) {
      execSync(`taskkill /PID ${pid} /F`);
      console.log(`Freed port ${targetPort} (stopped PID ${pid})`);
    }
  } catch {
    // No listeners found.
  }
}

if (process.platform === 'win32') {
  freePortWindows(port);
} else {
  freePortUnix(port);
}
