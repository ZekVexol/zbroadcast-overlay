const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("zbroadcastDesktop", {
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
