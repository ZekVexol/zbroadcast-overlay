(function () {
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

    try {
        if (window.location.pathname.includes("/control")) {
            const roomId = getRoomIdFromPath(window.location.pathname);
            const storageKey = `adminKey:${roomId}`;
            sessionStorage.setItem(storageKey, getLocalDesktopAdminKey());
        }
    } catch (error) {
        console.warn("ZBroadcast desktop admin preload failed:", error);
    }
})();
