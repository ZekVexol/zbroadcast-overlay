const { contextBridge, ipcRenderer } = require("electron");

function getLocalDesktopAdminKey() {
    const prefix = "--zbroadcast-admin-key=";
    const arg = process.argv.find((value) => value.startsWith(prefix));

    if (!arg) {
        return "CHANGE_ME_NOW";
    }

    return decodeURIComponent(arg.slice(prefix.length));
}

function getRoomIdFromPath(pathname) {
    const parts = pathname.split("/").filter(Boolean);
    const roomIndex = parts.indexOf("room");

    if (roomIndex !== -1 && parts[roomIndex + 1]) {
        return decodeURIComponent(parts[roomIndex + 1]);
    }

    return "default-room";
}

(function () {
    try {
        const roomId = getRoomIdFromPath(window.location.pathname);
        const storageKey = `adminKey:${roomId}`;
        sessionStorage.setItem(storageKey, getLocalDesktopAdminKey());
    } catch (error) {
        console.warn("ZBroadcast desktop admin preload failed:", error);
    }
})();

contextBridge.exposeInMainWorld("zbroadcastDesktop", {
    getAdminKey: () => getLocalDesktopAdminKey(),
    quit: () => ipcRenderer.send("zbroadcast:quit"),
    openConsole: () => ipcRenderer.send("zbroadcast:open-console"),
    display: {
        listDisplays: () => ipcRenderer.invoke("zbroadcast:list-displays"),
        getCurrentDisplay: () => ipcRenderer.invoke("zbroadcast:get-current-display"),
        applySettings: (settings) => ipcRenderer.invoke("zbroadcast:apply-display-settings", {
            windowMode: settings?.windowMode,
            displayId: settings?.displayId
        })
    }
});
