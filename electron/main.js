const { app, BrowserWindow, dialog, shell } = require("electron");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const isDevelopment = process.argv.includes("--dev");
const packagedPort = 3210;
const backendUrl = "http://127.0.0.1:8000/health";
let frontendProcess;
let backendProcess;
let backendLog;
let frontendLog;
let mainWindow;
let isQuitting = false;

const hasSingleInstanceLock = app.requestSingleInstanceLock();
if (!hasSingleInstanceLock) {
  app.quit();
}

function waitForService(url, name, attempts = 120) {
  return new Promise((resolve, reject) => {
    const check = () => {
      const request = require("node:http").get(url, (response) => {
        response.resume();
        if (response.statusCode >= 200 && response.statusCode < 300) {
          resolve();
        } else if (attempts-- > 0) {
          setTimeout(check, 250);
        } else {
          reject(new Error(`${name} returned HTTP ${response.statusCode}`));
        }
      });

      request.on("error", () => {
        if (attempts-- > 0) {
          setTimeout(check, 250);
        } else {
          reject(new Error(`${name} did not start at ${url}`));
        }
      });
      request.setTimeout(1_000, () => request.destroy());
    };

    check();
  });
}

async function startPackagedBackend() {
  try {
    await waitForService(backendUrl, "Backend", 0);
    return;
  } catch {
    // No existing backend is running, so start the bundled one.
  }

  const executable = path.join(
    process.resourcesPath,
    "backend",
    process.platform === "win32" ? "txthero-backend.exe" : "txthero-backend",
  );
  const logPath = path.join(app.getPath("logs"), "backend.log");
  fs.mkdirSync(path.dirname(logPath), { recursive: true });
  backendLog = fs.openSync(logPath, "a");

  backendProcess = spawn(executable, [], {
    env: {
      ...process.env,
      ENV: "production",
      HOST: "127.0.0.1",
      PORT: "8000",
      TXTHERO_STORAGE_DIR: path.join(app.getPath("userData"), "documents"),
    },
    stdio: ["ignore", backendLog, backendLog],
  });

  await waitForService(backendUrl, "Bundled backend");
}

async function startPackagedFrontend() {
  const frontendUrl = `http://127.0.0.1:${packagedPort}`;
  try {
    await waitForService(frontendUrl, "Frontend", 0);
    return;
  } catch {
    // No existing frontend is running, so start the bundled one.
  }

  const frontendRoot = path.join(process.resourcesPath, "frontend");
  const server = path.join(frontendRoot, "server.js");
  const logPath = path.join(app.getPath("logs"), "frontend.log");
  fs.mkdirSync(path.dirname(logPath), { recursive: true });
  frontendLog = fs.openSync(logPath, "a");

  frontendProcess = spawn(process.execPath, [server], {
    cwd: frontendRoot,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      HOSTNAME: "127.0.0.1",
      PORT: String(packagedPort),
      TXTHERO_UPLOAD_DIR: path.join(app.getPath("userData"), "uploads"),
      TXTHERO_USER_DATA_DIR: path.join(app.getPath("userData"), "account"),
    },
    stdio: ["ignore", frontendLog, frontendLog],
  });

  await waitForService(frontendUrl, "Bundled frontend");
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    title: "TxtHero",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.webContents.on("did-fail-load", (_event, errorCode, _description, validatedUrl, isMainFrame) => {
    if (!isMainFrame || isQuitting || errorCode === -3) return;
    const localUrl = `http://127.0.0.1:${packagedPort}`;
    if (!validatedUrl.startsWith(localUrl)) return;
    setTimeout(async () => {
      try {
        await waitForService(localUrl, "Bundled frontend", 20);
        if (!mainWindow?.isDestroyed()) mainWindow.loadURL(localUrl);
      } catch {
        dialog.showErrorBox(
          "TxtHero frontend stopped",
          `Reload TxtHero after checking ${path.join(app.getPath("logs"), "frontend.log")}.`,
        );
      }
    }, 500);
  });

  if (isDevelopment) {
    mainWindow.loadURL("http://127.0.0.1:3000");
  } else {
    mainWindow.loadURL(
      process.env.TXTHERO_APP_URL || `http://127.0.0.1:${packagedPort}`,
    );
  }

  mainWindow.on("closed", () => {
    mainWindow = undefined;
  });
}

if (hasSingleInstanceLock) app.whenReady().then(async () => {
  try {
    if (!isDevelopment) {
      await startPackagedBackend();
      if (!process.env.TXTHERO_APP_URL) {
        await startPackagedFrontend();
      }
    }

    createWindow();
  } catch (error) {
    dialog.showErrorBox(
      "TxtHero could not start",
      `${error.message}\n\nSee ${path.join(app.getPath("logs"), "backend.log")} for details.`,
    );
    app.quit();
    return;
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("second-instance", () => {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  isQuitting = true;
  frontendProcess?.kill();
  backendProcess?.kill();
  if (frontendLog !== undefined) {
    fs.closeSync(frontendLog);
    frontendLog = undefined;
  }
  if (backendLog !== undefined) {
    fs.closeSync(backendLog);
    backendLog = undefined;
  }

  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send("txthero:will-quit");
  }
});
