(function () {
    "use strict";

    const STORAGE_KEY = "zbroadcast:module:rocket-league";
    const CHANNEL_NAME = "zbroadcast:module:rocket-league:sync";
    const defaultState = {
        status: "shell",
        version: 1,
        updatedAt: 0
    };
    let listeners = [];
    let channel = null;

    function clone(value) {
        return JSON.parse(JSON.stringify(value));
    }

    function normalizeState(state) {
        return {
            ...clone(defaultState),
            ...(state && typeof state === "object" ? state : {}),
            status: "shell",
            version: 1,
            updatedAt: Number.isFinite(Number(state && state.updatedAt)) ? Number(state.updatedAt) : 0
        };
    }

    function getDefaultState() {
        return clone(defaultState);
    }

    function loadState() {
        try {
            const stored = window.localStorage.getItem(STORAGE_KEY);
            return normalizeState(stored ? JSON.parse(stored) : defaultState);
        } catch (error) {
            console.warn("Could not load Rocket League module shell state.", error);
            return getDefaultState();
        }
    }

    function emit(state) {
        const nextState = clone(state);

        listeners.forEach((listener) => listener(nextState));

        if (channel) {
            channel.postMessage({ type: "rocket-league-state", state: nextState });
        }
    }

    function saveState(state, options) {
        const nextState = normalizeState({
            ...state,
            updatedAt: Date.now()
        });

        try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
        } catch (error) {
            console.warn("Could not save Rocket League module shell state.", error);
        }

        if (!options || options.broadcast !== false) {
            emit(nextState);
        }

        return nextState;
    }

    function resetState() {
        try {
            window.localStorage.removeItem(STORAGE_KEY);
        } catch (error) {
            console.warn("Could not reset Rocket League module shell state.", error);
        }

        const nextState = getDefaultState();
        emit(nextState);
        return nextState;
    }

    function subscribe(listener) {
        if (typeof listener !== "function") {
            return function unsubscribeNoop() {};
        }

        listeners.push(listener);
        listener(loadState());

        return function unsubscribe() {
            listeners = listeners.filter((currentListener) => currentListener !== listener);
        };
    }

    if ("BroadcastChannel" in window) {
        channel = new BroadcastChannel(CHANNEL_NAME);
        channel.addEventListener("message", (event) => {
            if (event.data && event.data.type === "rocket-league-state") {
                const nextState = normalizeState(event.data.state);
                listeners.forEach((listener) => listener(clone(nextState)));
            }
        });
    }

    window.ZBroadcastRocketLeague = {
        storageKey: STORAGE_KEY,
        getDefaultState,
        loadState,
        saveState,
        resetState,
        subscribe
    };
}());
