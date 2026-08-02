const { app, BrowserWindow, dialog, ipcMain, Menu, shell } = require("electron");
const { autoUpdater } = require("electron-updater");
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
let hasUnsavedChanges = false;
let updateDownloaded = false;
let manualUpdateCheck = false;

function readBuildInfo() {
  try {
    return JSON.parse(fs.readFileSync(path.join(__dirname, "build-info.json"), "utf8"));
  } catch {
    return { commit: "unknown", branch: "unknown", builtAt: null, release: null };
  }
}

const buildInfo = readBuildInfo();

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

function versionSummary() {
  return [
    `Version: ${app.getVersion()}`,
    `Commit: ${buildInfo.commit}`,
    `Branch: ${buildInfo.branch}`,
    `Built: ${buildInfo.builtAt || "local development"}`,
  ].join("\n");
}

async function installDownloadedUpdate() {
  if (!updateDownloaded) {
    await dialog.showMessageBox(mainWindow, {
      type: "info",
      title: "No downloaded update",
      message: "Check for updates first. An update can be installed after its download completes.",
    });
    return false;
  }
  if (hasUnsavedChanges) {
    await dialog.showMessageBox(mainWindow, {
      type: "warning",
      title: "Save before updating",
      message: "TxtHero has unsaved editor changes.",
      detail: "Save your work, then choose Help → Install Downloaded Update. The update will never restart TxtHero while unsaved changes are reported.",
    });
    return false;
  }
  const { response } = await dialog.showMessageBox(mainWindow, {
    type: "question",
    title: "Install TxtHero update",
    message: "The update is ready to install.",
    detail: "TxtHero will close and restart with the new GitHub release.",
    buttons: ["Install and Restart", "Later"],
    defaultId: 0,
    cancelId: 1,
    noLink: true,
  });
  if (response !== 0) return false;
  isQuitting = true;
  autoUpdater.quitAndInstall(false, true);
  return true;
}

async function checkForUpdates(manual = false) {
  if (isDevelopment || !app.isPackaged) {
    if (manual) await dialog.showMessageBox(mainWindow, { type: "info", title: "Development build", message: "Automatic updates are available in packaged TxtHero releases." });
    return { supported: false };
  }
  manualUpdateCheck = manual;
  try {
    const result = await autoUpdater.checkForUpdates();
    return { supported: true, version: result?.updateInfo?.version || null };
  } catch (error) {
    manualUpdateCheck = false;
    if (manual) await dialog.showMessageBox(mainWindow, { type: "error", title: "Update check failed", message: "TxtHero could not check GitHub Releases.", detail: error.message });
    return { supported: true, error: "update_check_failed" };
  }
}

function configureUpdates() {
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = false;
  autoUpdater.allowPrerelease = false;

  autoUpdater.on("update-available", async (info) => {
    manualUpdateCheck = false;
    const { response } = await dialog.showMessageBox(mainWindow, {
      type: "info",
      title: "TxtHero update available",
      message: `Version ${info.version} is available from GitHub Releases.`,
      detail: "Download it now? TxtHero will not restart until you explicitly install it, and unsaved work blocks installation.",
      buttons: ["Download", "Later"],
      defaultId: 0,
      cancelId: 1,
      noLink: true,
    });
    if (response === 0) {
      try {
        await autoUpdater.downloadUpdate();
      } catch (error) {
        await dialog.showMessageBox(mainWindow, {
          type: "error",
          title: "Update download failed",
          message: "TxtHero could not download the GitHub release.",
          detail: error.message,
        });
      }
    }
  });
  autoUpdater.on("update-not-available", async () => {
    if (!manualUpdateCheck) return;
    manualUpdateCheck = false;
    await dialog.showMessageBox(mainWindow, { type: "info", title: "TxtHero is up to date", message: `Version ${app.getVersion()} is the newest published release.` });
  });
  autoUpdater.on("update-downloaded", async () => {
    updateDownloaded = true;
    await installDownloadedUpdate();
  });
  autoUpdater.on("error", async (error) => {
    if (!manualUpdateCheck) return;
    manualUpdateCheck = false;
    await dialog.showMessageBox(mainWindow, { type: "error", title: "Update failed", message: "TxtHero could not complete the GitHub update request.", detail: error.message });
  });
}

function configureApplicationMenu() {
  const template = [
    { label: "File", submenu: [{ role: "quit" }] },
    { label: "Edit", submenu: [{ role: "undo" }, { role: "redo" }, { type: "separator" }, { role: "cut" }, { role: "copy" }, { role: "paste" }, { role: "selectAll" }] },
    { label: "View", submenu: [{ role: "reload" }, { role: "forceReload" }, { type: "separator" }, { role: "resetZoom" }, { role: "zoomIn" }, { role: "zoomOut" }, { type: "separator" }, { role: "togglefullscreen" }] },
    { label: "Help", submenu: [
      { label: "Check for Updates…", click: () => checkForUpdates(true) },
      { label: "Install Downloaded Update…", click: () => installDownloadedUpdate() },
      { type: "separator" },
      { label: "About TxtHero", click: () => dialog.showMessageBox(mainWindow, { type: "info", title: "About TxtHero", message: "TxtHero", detail: versionSummary() }) },
    ] },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

ipcMain.handle("txthero:version", () => ({ version: app.getVersion(), ...buildInfo }));
ipcMain.handle("txthero:check-for-updates", () => checkForUpdates(true));
ipcMain.handle("txthero:install-update", () => installDownloadedUpdate());
ipcMain.on("txthero:unsaved-changes", (_event, dirty) => { hasUnsavedChanges = dirty === true; });

if (hasSingleInstanceLock) app.whenReady().then(async () => {
  try {
    if (!isDevelopment) {
      await startPackagedBackend();
      if (!process.env.TXTHERO_APP_URL) {
        await startPackagedFrontend();
      }
    }

    createWindow();
    configureApplicationMenu();
    if (!isDevelopment && app.isPackaged) {
      configureUpdates();
      if (process.env.TXTHERO_DISABLE_AUTO_UPDATE !== "1") {
        setTimeout(() => checkForUpdates(false), 10_000);
        const timer = setInterval(() => checkForUpdates(false), 4 * 60 * 60 * 1000);
        timer.unref();
      }
    }
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
