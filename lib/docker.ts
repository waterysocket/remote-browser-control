import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

const DOCKER_IMAGE = "browserless/chromium:latest";

/**
 * Starts a Docker container running a headless Chromium browser.
 * Returns the full container ID.
 */
export async function startBrowserContainer(): Promise<string> {
  const { stdout, stderr } = await execAsync(
    `docker run -d --rm \
      -p 3001:3000 \
      --name browser-session-${Date.now()} \
      ${DOCKER_IMAGE}`
  );

  if (stderr && !stdout) {
    throw new Error(`Docker start failed: ${stderr.trim()}`);
  }

  // docker run -d returns the full container ID on stdout
  const containerId = stdout.trim();
  if (!containerId) {
    throw new Error("Docker returned an empty container ID");
  }

  return containerId;
}

/**
 * Stops and removes a running container by ID.
 */
export async function stopBrowserContainer(containerId: string): Promise<void> {
  // Use the first 12 chars (short ID) — works reliably with docker stop
  const shortId = containerId.slice(0, 12);
  await execAsync(`docker stop ${shortId}`);
  // --rm on run means Docker removes it automatically after stop
}
