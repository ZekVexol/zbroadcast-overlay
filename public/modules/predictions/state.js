(function () {
    "use strict";

    const STORAGE_KEY = "zbroadcast:module:predictions";
    const MOCK_CONFIG_KEY = "zbroadcast:module:predictions:mock-config";
    const CHANNEL_NAME = "zbroadcast:module:predictions:sync";
    const OPTION_NAME_MAX_LENGTH = 32;
    const TITLE_MAX_LENGTH = 72;
    const durations = [30, 60, 120, 300, 600, 900, 1200, 1800];
    const defaultState = {
        status: "inactive",
        title: "",
        durationSeconds: 120,
        startedAt: 0,
        options: [],
        submissionsOpen: false,
        winnerOptionId: "",
        cancelledAt: 0,
        completedAt: 0
    };
    const defaultMockConfig = {
        team1Name: "",
        team2Name: "",
        currentGameNumber: 1,
        seriesLength: 3,
        titleBehavior: "game",
        esportsMode: false
    };
    let listeners = [];
    let channel = null;

    function clone(value) {
        return JSON.parse(JSON.stringify(value));
    }

    function makeId(prefix) {
        if (window.crypto && typeof window.crypto.randomUUID === "function") {
            return `${prefix}-${window.crypto.randomUUID()}`;
        }

        return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }

    function clampText(value, maxLength) {
        return String(value || "").slice(0, maxLength);
    }

    function createOption(label, votes) {
        return {
            id: makeId("option"),
            label: clampText(toDisplayTitle(String(label || "").trim() || "Option"), OPTION_NAME_MAX_LENGTH),
            mockVotes: Math.max(0, Number(votes) || 0)
        };
    }

    function toDisplayTitle(value) {
        return String(value || "")
            .trim()
            .replace(/\s+/g, " ")
            .replace(/\b([a-z])/g, (match) => match.toUpperCase());
    }

    function toDisplayUpper(value) {
        return String(value || "")
            .trim()
            .replace(/\s+/g, " ")
            .toUpperCase();
    }

    function normalizeOptions(options) {
        return Array.isArray(options)
            ? options.map((option, index) => ({
                id: String(option.id || makeId("option")),
                label: clampText(toDisplayTitle(String(option.label || option.name || `Option ${index + 1}`).trim() || `Option ${index + 1}`), OPTION_NAME_MAX_LENGTH),
                mockVotes: Math.max(0, Number(option.mockVotes ?? option.votes ?? 0) || 0)
            }))
            : [];
    }

    function normalizeState(state) {
        const nextState = {
            ...clone(defaultState),
            ...(state && typeof state === "object" ? state : {})
        };
        const validStatuses = new Set(["inactive", "active", "completed", "cancelled"]);

        nextState.status = validStatuses.has(nextState.status) ? nextState.status : "inactive";
        nextState.title = clampText(String(nextState.title || "").trim(), TITLE_MAX_LENGTH);
        nextState.durationSeconds = durations.includes(Number(nextState.durationSeconds)) ? Number(nextState.durationSeconds) : 120;
        nextState.startedAt = Number.isFinite(Number(nextState.startedAt)) ? Number(nextState.startedAt) : 0;
        nextState.cancelledAt = Number.isFinite(Number(nextState.cancelledAt)) ? Number(nextState.cancelledAt) : 0;
        nextState.completedAt = Number.isFinite(Number(nextState.completedAt)) ? Number(nextState.completedAt) : 0;
        nextState.options = normalizeOptions(nextState.options);
        nextState.submissionsOpen = Boolean(nextState.submissionsOpen && nextState.status === "active");
        nextState.winnerOptionId = nextState.options.some((option) => option.id === nextState.winnerOptionId) ? nextState.winnerOptionId : "";

        if (nextState.status === "inactive") {
            nextState.title = "";
            nextState.startedAt = 0;
            nextState.options = [];
            nextState.submissionsOpen = false;
            nextState.winnerOptionId = "";
            nextState.cancelledAt = 0;
            nextState.completedAt = 0;
        }

        return nextState;
    }

    function load() {
        try {
            const stored = window.localStorage.getItem(STORAGE_KEY);
            return normalizeState(stored ? JSON.parse(stored) : defaultState);
        } catch (error) {
            console.warn("Could not load Predictions module state.", error);
            return clone(defaultState);
        }
    }

    function normalizeMockConfig(config) {
        const nextConfig = {
            ...clone(defaultMockConfig),
            ...(config && typeof config === "object" ? config : {})
        };

        nextConfig.team1Name = clampText(toDisplayTitle(String(nextConfig.team1Name || "").trim()), OPTION_NAME_MAX_LENGTH);
        nextConfig.team2Name = clampText(toDisplayTitle(String(nextConfig.team2Name || "").trim()), OPTION_NAME_MAX_LENGTH);
        nextConfig.currentGameNumber = Math.max(1, Math.round(Number(nextConfig.currentGameNumber) || 1));
        nextConfig.seriesLength = Math.max(1, Math.round(Number(nextConfig.seriesLength) || 1));
        nextConfig.titleBehavior = nextConfig.titleBehavior === "series" ? "series" : "game";
        nextConfig.esportsMode = Boolean(nextConfig.esportsMode);

        return nextConfig;
    }

    function loadMockConfig() {
        try {
            const stored = window.localStorage.getItem(MOCK_CONFIG_KEY);
            return normalizeMockConfig(stored ? JSON.parse(stored) : defaultMockConfig);
        } catch (error) {
            console.warn("Could not load Predictions mock config.", error);
            return clone(defaultMockConfig);
        }
    }

    function saveMockConfig(config) {
        const nextConfig = normalizeMockConfig(config);

        try {
            window.localStorage.setItem(MOCK_CONFIG_KEY, JSON.stringify(nextConfig));
        } catch (error) {
            console.warn("Could not save Predictions mock config.", error);
        }

        return nextConfig;
    }

    function emit(state) {
        listeners.forEach((listener) => listener(clone(state)));

        if (channel) {
            channel.postMessage({ type: "predictions-state", state });
        }
    }

    function save(state, options) {
        const nextState = normalizeState(state);

        try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
        } catch (error) {
            console.warn("Could not save Predictions module state.", error);
        }

        if (!options || options.broadcast !== false) {
            emit(nextState);
        }

        return nextState;
    }

    function update(updater) {
        const current = load();
        return save(typeof updater === "function" ? updater(clone(current)) : updater);
    }

    function reset() {
        return save(clone(defaultState));
    }

    function getTotals(state) {
        const totalVotes = state.options.reduce((sum, option) => sum + Math.max(0, Number(option.mockVotes) || 0), 0);
        if (totalVotes <= 0) {
            return state.options.map((option) => ({
                ...option,
                percent: 0,
                rawPercent: 0
            }));
        }

        const rawPercents = state.options.map((option) => {
            return (Math.max(0, Number(option.mockVotes) || 0) / totalVotes) * 100;
        });
        const flooredPercents = rawPercents.map((percent) => Math.floor(percent));
        let remainder = 100 - flooredPercents.reduce((sum, percent) => sum + percent, 0);
        const remainderOrder = rawPercents
            .map((percent, index) => ({ index, fraction: percent - Math.floor(percent) }))
            .sort((first, second) => second.fraction - first.fraction);

        for (let index = 0; index < remainderOrder.length && remainder > 0; index += 1) {
            flooredPercents[remainderOrder[index].index] += 1;
            remainder -= 1;
        }

        return state.options.map((option, index) => ({
            ...option,
            percent: flooredPercents[index] || 0,
            rawPercent: rawPercents[index] || 0
        }));
    }

    function addMockVotes(optionId, count) {
        return update((state) => {
            state.options = state.options.map((option) => {
                return option.id === optionId
                    ? { ...option, mockVotes: Math.max(0, (Number(option.mockVotes) || 0) + (Number(count) || 0)) }
                    : option;
            });
            return state;
        });
    }

    function closeSubmissions() {
        return update((state) => ({ ...state, submissionsOpen: false }));
    }

    function cancelPrediction() {
        return update((state) => ({
            ...state,
            status: "cancelled",
            submissionsOpen: false,
            cancelledAt: Date.now()
        }));
    }

    function completePrediction(optionId) {
        return update((state) => ({
            ...state,
            status: "completed",
            submissionsOpen: false,
            winnerOptionId: optionId,
            completedAt: Date.now()
        }));
    }

    function subscribe(listener) {
        listeners.push(listener);
        listener(load());

        return function unsubscribe() {
            listeners = listeners.filter((entry) => entry !== listener);
        };
    }

    function handleExternalState(state) {
        const normalizedState = normalizeState(state);
        listeners.forEach((listener) => listener(clone(normalizedState)));
    }

    if ("BroadcastChannel" in window) {
        try {
            channel = new BroadcastChannel(CHANNEL_NAME);
            channel.onmessage = (event) => {
                if (event.data && event.data.type === "predictions-state") {
                    handleExternalState(event.data.state);
                }
            };
        } catch (error) {
            channel = null;
        }
    }

    window.addEventListener("storage", (event) => {
        if (event.key !== STORAGE_KEY || !event.newValue) {
            return;
        }

        try {
            handleExternalState(JSON.parse(event.newValue));
        } catch (error) {
            console.warn("Could not sync Predictions module state.", error);
        }
    });

    window.ZBroadcastPredictions = {
        STORAGE_KEY,
        MOCK_CONFIG_KEY,
        OPTION_NAME_MAX_LENGTH,
        TITLE_MAX_LENGTH,
        durations,
        defaultState: clone(defaultState),
        defaultMockConfig: clone(defaultMockConfig),
        toDisplayTitle,
        toDisplayUpper,
        clampText,
        createOption,
        normalizeState,
        normalizeMockConfig,
        load,
        loadMockConfig,
        saveMockConfig,
        save,
        update,
        reset,
        subscribe,
        getTotals,
        addMockVotes,
        closeSubmissions,
        cancelPrediction,
        completePrediction
    };
}());
