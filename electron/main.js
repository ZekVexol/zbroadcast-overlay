const { app, BrowserWindow, Menu } = require("electron");
const { spawn } = require("child_process");
const http = require("http");
const path = require("path");

const CASTER_COMMAND_URL = "http://localhost:3000/caster-command.html";
const CONTROL_URL = "http://localhost:3000/room/default-room/control";
const OVERLAY_PREVIEW_URL = "http://localhost:3000/room/default-room/overlay";
const SERVER_ENTRY = path.join(__dirname, "..", "server.js");
const PRELOAD_ENTRY = path.join(__dirname, "preload.js");
const PROJECT_ROOT = path.join(__dirname, "..");
const READY_TIMEOUT_MS = 15000;
const POLL_INTERVAL_MS = 300;
const LOCAL_DESKTOP_ADMIN_KEY = process.env.ADMIN_PASSWORD || "CHANGE_ME_NOW";

let mainWindow = null;
let childServerProcess = null;

function loadAppUrl(url) {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.loadURL(url);
    }
}

function createApplicationMenu() {
    const template = [
        {
            label: "ZBroadcast",
            submenu: [
                {
                    label: "Caster Command",
                    click: () => loadAppUrl(CASTER_COMMAND_URL)
                },
                {
                    label: "Control",
                    click: () => loadAppUrl(CONTROL_URL)
                },
                {
                    label: "Overlay Preview",
                    click: () => loadAppUrl(OVERLAY_PREVIEW_URL)
                },
                { type: "separator" },
                {
                    label: "Reload",
                    accelerator: "CmdOrCtrl+R",
                    click: () => {
                        if (mainWindow && !mainWindow.isDestroyed()) {
                            mainWindow.reload();
                        }
                    }
                }
            ]
        }
    ];

    Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

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
            ADMIN_PASSWORD: LOCAL_DESKTOP_ADMIN_KEY
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
        minWidth: 900,
        minHeight: 620,
        backgroundColor: "#111214",
        webPreferences: {
            preload: PRELOAD_ENTRY,
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
