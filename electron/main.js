const { app, BrowserWindow, Menu, ipcMain, screen } = require("electron");
const { spawn } = require("child_process");
const http = require("http");
const path = require("path");

const CASTER_COMMAND_URL = "http://localhost:3000/caster-command.html";
const SERVER_ENTRY = path.join(__dirname, "..", "server.js");
const PRELOAD_ENTRY = path.join(__dirname, "preload.js");
const PROJECT_ROOT = path.join(__dirname, "..");
const READY_TIMEOUT_MS = 15000;
const POLL_INTERVAL_MS = 300;
const LOCAL_DESKTOP_ADMIN_KEY = process.env.ADMIN_PASSWORD || "CHANGE_ME_NOW";

let mainWindow = null;
let childServerProcess = null;
let lastWindowedBounds = null;

function loadAppUrl(url) {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.loadURL(url);
    }
}

function createApplicationMenu() {
    Menu.setApplicationMenu(null);
}

ipcMain.on("zbroadcast:quit", () => {
    app.quit();
});

function getDisplayResolution(display) {
    const scaleFactor = typeof display.scaleFactor === "number" && display.scaleFactor > 0
        ? display.scaleFactor
        : 1;
    const bounds = display.bounds || {};
    const size = display.size || {};
    const width = typeof bounds.width === "number"
        ? Math.round(bounds.width * scaleFactor)
        : size.width;
    const height = typeof bounds.height === "number"
        ? Math.round(bounds.height * scaleFactor)
        : size.height;

    return {
        width: width || 0,
        height: height || 0
    };
}

function getDisplayLabel(display, index) {
    const resolution = getDisplayResolution(display);
    const displayName = typeof display.label === "string" && display.label.trim() !== ""
        ? ` - ${display.label.trim()}`
        : "";

    return `Display ${index + 1}${displayName} - ${resolution.width}x${resolution.height}`;
}

function serializeDisplay(display, index) {
    const resolution = getDisplayResolution(display);

    return {
        id: String(display.id),
        index,
        name: typeof display.label === "string" ? display.label : "",
        label: getDisplayLabel(display, index),
        resolution,
        bounds: display.bounds,
        workArea: display.workArea,
        scaleFactor: display.scaleFactor,
        primary: display.id === screen.getPrimaryDisplay().id
    };
}

function getDisplays() {
    return screen.getAllDisplays().map(serializeDisplay);
}

function findDisplay(displayId) {
    const displays = screen.getAllDisplays();

    if (displayId && displayId !== "default") {
        const selectedDisplay = displays.find((display) => String(display.id) === String(displayId));

        if (selectedDisplay) {
            return selectedDisplay;
        }
    }

    if (mainWindow && !mainWindow.isDestroyed()) {
        return screen.getDisplayMatching(mainWindow.getBounds());
    }

    return screen.getPrimaryDisplay();
}

function getCurrentWindowDisplayInfo() {
    if (!mainWindow || mainWindow.isDestroyed()) {
        return null;
    }

    const display = screen.getDisplayMatching(mainWindow.getBounds());
    const displays = screen.getAllDisplays();
    const index = displays.findIndex((candidate) => candidate.id === display.id);

    return {
        display: serializeDisplay(display, index === -1 ? 0 : index),
        bounds: mainWindow.getBounds(),
        fullscreen: mainWindow.isFullScreen()
    };
}

function rememberWindowedBounds() {
    if (!mainWindow || mainWindow.isDestroyed() || mainWindow.isFullScreen() || !mainWindow.isResizable()) {
        return;
    }

    lastWindowedBounds = mainWindow.getBounds();
}

async function applyWindowDisplaySettings(settings) {
    if (!mainWindow || mainWindow.isDestroyed()) {
        return { success: false, error: "Main window is not available." };
    }

    const windowMode = ["windowed", "fullscreen"].includes(settings?.windowMode)
        ? settings.windowMode
        : "windowed";
    const targetDisplay = findDisplay(settings?.displayId);

    try {
        if (windowMode === "windowed") {
            mainWindow.setFullScreen(false);
            mainWindow.setResizable(true);

            if (lastWindowedBounds) {
                mainWindow.setBounds(lastWindowedBounds);
            } else {
                mainWindow.setBounds({
                    x: targetDisplay.workArea.x + 60,
                    y: targetDisplay.workArea.y + 60,
                    width: 1180,
                    height: 760
                });
            }

            mainWindow.focus();
            return { success: true, mode: windowMode, current: getCurrentWindowDisplayInfo() };
        }

        rememberWindowedBounds();

        mainWindow.setResizable(true);
        mainWindow.setBounds(targetDisplay.bounds);
        mainWindow.setFullScreen(true);
        mainWindow.focus();

        return { success: true, mode: windowMode, current: getCurrentWindowDisplayInfo() };
    } catch (error) {
        console.warn("Could not apply ZBroadcast display settings.", error);
        return { success: false, error: error.message || "Display settings failed." };
    }
}

ipcMain.handle("zbroadcast:list-displays", () => {
    return getDisplays();
});

ipcMain.handle("zbroadcast:get-current-display", () => {
    return getCurrentWindowDisplayInfo();
});

ipcMain.handle("zbroadcast:apply-display-settings", (_event, settings) => {
    return applyWindowDisplaySettings(settings);
});

function checkUrl(url) {
    return new Promise((resolve) => {
        const request = http.get(url, (response) => {
            response.resume();
            resolve(response.statusCode >= 200 && response.statusCode < 500);
        });

        request.on("error", () => {
            resolve(false);
        });

        request.setTimeout(1000, () => {
            request.destroy();
            resolve(false);
        });
    });
}

function waitForUrl(url, timeoutMs) {
    const startTime = Date.now();

    return new Promise((resolve) => {
        async function poll() {
            if (await checkUrl(url)) {
                resolve(true);
                return;
            }

            if (Date.now() - startTime >= timeoutMs) {
                resolve(false);
                return;
            }

            setTimeout(poll, POLL_INTERVAL_MS);
        }

        poll();
    });
}

function getNodeExecutable() {
    return process.env.npm_node_execpath || process.env.NODE || process.execPath;
}

function startServer() {
    childServerProcess = spawn(getNodeExecutable(), [SERVER_ENTRY], {
        cwd: PROJECT_ROOT,
        env: {
            ...process.env,
            ADMIN_PASSWORD: LOCAL_DESKTOP_ADMIN_KEY,
            ZBROADCAST_DESKTOP: "1"
        },
        stdio: "inherit",
        windowsHide: true
    });

    childServerProcess.on("exit", () => {
        childServerProcess = null;
    });
}

function stopStartedServer() {
    if (!childServerProcess) {
        return;
    }

    childServerProcess.kill();
    childServerProcess = null;
}

function loadErrorPage(message) {
    const safeMessage = String(message).replace(/[&<>"']/g, (char) => {
        const replacements = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            "\"": "&quot;",
            "'": "&#39;"
        };
        return replacements[char];
    });

    mainWindow.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>ZBroadcast</title>
            <style>
                body {
                    margin: 0;
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: #111214;
                    color: #f4f6f8;
                    font-family: Arial, sans-serif;
                }
                main {
                    width: min(620px, calc(100% - 40px));
                    padding: 24px;
                    border: 1px solid #30343d;
                    border-radius: 8px;
                    background: #181a1f;
                }
                h1 {
                    margin: 0 0 12px 0;
                    font-size: 24px;
                }
                p {
                    margin: 0;
                    color: #c7ccd6;
                    line-height: 1.5;
                }
            </style>
        </head>
        <body>
            <main>
                <h1>ZBroadcast could not start</h1>
                <p>${safeMessage}</p>
            </main>
        </body>
        </html>
    `));
}

async function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1180,
        height: 760,
        minWidth: 1100,
        minHeight: 680,
        backgroundColor: "#111214",
        webPreferences: {
            preload: PRELOAD_ENTRY,
            // Responsiveness test: ZBroadcast is a live broadcast control app and should stay responsive during focus/background changes.
            backgroundThrottling: false,
            additionalArguments: [
                `--zbroadcast-admin-key=${encodeURIComponent(LOCAL_DESKTOP_ADMIN_KEY)}`
            ]
        }
    });

    createApplicationMenu();

    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        loadAppUrl(url);
        return { action: "deny" };
    });

    mainWindow.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>ZBroadcast</title>
            <style>
                body {
                    margin: 0;
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: #111214;
                    color: #f4f6f8;
                    font-family: Arial, sans-serif;
                }
            </style>
        </head>
        <body>Starting ZBroadcast...</body>
        </html>
    `));

    const alreadyRunning = await checkUrl(CASTER_COMMAND_URL);

    if (!alreadyRunning) {
        startServer();
    }

    const isReady = await waitForUrl(CASTER_COMMAND_URL, READY_TIMEOUT_MS);

    if (!isReady) {
        loadErrorPage("The local server did not respond at http://localhost:3000/caster-command.html. Check whether port 3000 is available, then try npm run desktop again.");
        return;
    }

    await mainWindow.loadURL(CASTER_COMMAND_URL);
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
    app.quit();
});

app.on("before-quit", () => {
    stopStartedServer();
});
