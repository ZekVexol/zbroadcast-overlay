(function () {
    "use strict";

    const MODULE_ID = "rocket-league-scoreboard";
    const SCHEMA_VERSION = 1;
    const STORAGE_KEY = "zbroadcast:module:rocket-league";
    const CHANNEL_NAME = "zbroadcast:module:rocket-league:sync";
    const TEAM_SIDES = ["blue", "orange"];
    const BEST_OF_OPTIONS = [1, 2, 3, 5, 7];
    const TEAM_NAME_MAX_LENGTH = 18;
    const PLAYER_NAME_MAX_LENGTH = 24;
    const defaultPlayerStats = {
        goals: 0,
        assists: 0,
        saves: 0,
        shots: 0
    };
    const defaultState = {
        moduleId: MODULE_ID,
        schemaVersion: SCHEMA_VERSION,
        updatedAt: 0,
        isMatchActive: false,
        match: {
            tournamentName: "",
            seriesInfo: "",
            weekRound: "",
            eventTitle: "",
            matchTitle: "",
            seriesMode: "best-of",
            bestOf: 5,
            gameNumber: 1
        },
        teams: {
            blue: createDefaultTeam("blue"),
            orange: createDefaultTeam("orange")
        },
        overlay: {
            overlayVisible: true,
            overlayTheme: "default",
            overlayPreset: "standard",
            delaySeconds: 0,
            queuedUpdates: []
        },
        history: [],
        savedTeams: [],
        undo: {
            undoDepth: 0,
            lastActionId: "",
            scoreSnapshots: []
        },
        dev: {
            mockMode: false,
            mockScenario: ""
        }
    };
    let listeners = [];
    let channel = null;

    function clone(value) {
        return JSON.parse(JSON.stringify(value));
    }

    function createDefaultPlayers(side) {
        return [1, 2, 3].map((slot) => ({
            id: `${side}-player-${slot}`,
            name: "",
            role: "",
            stats: clone(defaultPlayerStats)
        }));
    }

    function createDefaultTeam(side) {
        const isBlue = side === "blue";

        return {
            id: side,
            side,
            name: isBlue ? "BLUE" : "ORANGE",
            score: 0,
            seriesScore: 0,
            logoPath: "",
            accentColor: isBlue ? "#2f80ff" : "#ff8a24",
            players: createDefaultPlayers(side),
            subs: [1, 2].map((slot) => ({
                id: `${side}-sub-${slot}`,
                name: "",
                role: "",
                stats: clone(defaultPlayerStats)
            }))
        };
    }

    function clampNumber(value, min, max, fallback) {
        const number = Number(value);

        if (!Number.isFinite(number)) {
            return fallback;
        }

        return Math.min(max, Math.max(min, Math.round(number)));
    }

    function normalizeText(value) {
        return String(value || "").trim();
    }

    function limitText(value, maxLength) {
        return normalizeText(value).slice(0, maxLength);
    }

    function normalizeStats(stats) {
        return {
            goals: clampNumber(stats && stats.goals, 0, 999, 0),
            assists: clampNumber(stats && stats.assists, 0, 999, 0),
            saves: clampNumber(stats && stats.saves, 0, 999, 0),
            shots: clampNumber(stats && stats.shots, 0, 999, 0)
        };
    }

    function normalizePlayers(players, side) {
        const sourcePlayers = Array.isArray(players) ? players : [];
        const normalizedPlayers = sourcePlayers.slice(0, 6).map((player, index) => ({
            id: normalizeText(player && player.id) || `${side}-player-${index + 1}`,
            name: limitText(player && player.name, PLAYER_NAME_MAX_LENGTH),
            role: normalizeText(player && player.role),
            stats: normalizeStats(player && player.stats)
        }));

        while (normalizedPlayers.length < 3) {
            const slot = normalizedPlayers.length + 1;
            normalizedPlayers.push({
                id: `${side}-player-${slot}`,
                name: "",
                role: "",
                stats: clone(defaultPlayerStats)
            });
        }

        return normalizedPlayers;
    }

    function normalizeTeam(team, side) {
        const fallback = createDefaultTeam(side);
        const sourceTeam = team && typeof team === "object" ? team : {};

        return {
            id: side,
            side,
            name: limitText(sourceTeam.name, TEAM_NAME_MAX_LENGTH) || fallback.name,
            score: clampNumber(sourceTeam.score, 0, 999, fallback.score),
            seriesScore: clampNumber(sourceTeam.seriesScore, 0, 99, fallback.seriesScore),
            logoPath: normalizeText(sourceTeam.logoPath),
            accentColor: normalizeText(sourceTeam.accentColor) || fallback.accentColor,
            players: normalizePlayers(sourceTeam.players, side),
            subs: normalizePlayers(sourceTeam.subs, `${side}-sub`).slice(0, 2)
        };
    }

    function getWinCondition(bestOf) {
        return Math.floor(bestOf / 2) + 1;
    }

    function getDerivedGameNumber(bestOf, blueSeriesScore, orangeSeriesScore) {
        const completedGames = blueSeriesScore + orangeSeriesScore;
        const winCondition = getWinCondition(bestOf);
        const isComplete = blueSeriesScore >= winCondition || orangeSeriesScore >= winCondition || completedGames >= bestOf;

        return isComplete ? bestOf : Math.min(bestOf, completedGames + 1);
    }

    function clampSeriesScores(teams, bestOf) {
        const winCondition = getWinCondition(bestOf);
        let blueSeriesScore = clampNumber(teams.blue.seriesScore, 0, winCondition, 0);
        let orangeSeriesScore = clampNumber(teams.orange.seriesScore, 0, winCondition, 0);

        if (blueSeriesScore >= winCondition) {
            orangeSeriesScore = Math.min(orangeSeriesScore, winCondition - 1, bestOf - blueSeriesScore);
        } else if (orangeSeriesScore >= winCondition) {
            blueSeriesScore = Math.min(blueSeriesScore, winCondition - 1, bestOf - orangeSeriesScore);
        } else if (blueSeriesScore + orangeSeriesScore > bestOf) {
            const overflow = blueSeriesScore + orangeSeriesScore - bestOf;
            if (orangeSeriesScore >= blueSeriesScore) {
                orangeSeriesScore = Math.max(0, orangeSeriesScore - overflow);
            } else {
                blueSeriesScore = Math.max(0, blueSeriesScore - overflow);
            }
        }

        return {
            blue: {
                ...teams.blue,
                seriesScore: blueSeriesScore
            },
            orange: {
                ...teams.orange,
                seriesScore: orangeSeriesScore
            }
        };
    }

    function normalizeMatch(match) {
        const sourceMatch = match && typeof match === "object" ? match : {};
        const bestOf = clampNumber(sourceMatch.bestOf, 1, 99, defaultState.match.bestOf);

        return {
            tournamentName: normalizeText(sourceMatch.tournamentName || sourceMatch.eventTitle),
            seriesInfo: normalizeText(sourceMatch.seriesInfo || sourceMatch.matchTitle),
            weekRound: normalizeText(sourceMatch.weekRound),
            eventTitle: normalizeText(sourceMatch.eventTitle),
            matchTitle: normalizeText(sourceMatch.matchTitle),
            seriesMode: normalizeText(sourceMatch.seriesMode) || "best-of",
            bestOf: BEST_OF_OPTIONS.includes(bestOf) ? bestOf : defaultState.match.bestOf,
            gameNumber: clampNumber(sourceMatch.gameNumber, 1, 99, defaultState.match.gameNumber)
        };
    }

    function normalizeOverlay(overlay) {
        const sourceOverlay = overlay && typeof overlay === "object" ? overlay : {};

        return {
            overlayVisible: sourceOverlay.overlayVisible !== false,
            overlayTheme: normalizeText(sourceOverlay.overlayTheme) || defaultState.overlay.overlayTheme,
            overlayPreset: normalizeText(sourceOverlay.overlayPreset) || defaultState.overlay.overlayPreset,
            delaySeconds: clampNumber(sourceOverlay.delaySeconds, 0, 120, defaultState.overlay.delaySeconds),
            queuedUpdates: Array.isArray(sourceOverlay.queuedUpdates) ? sourceOverlay.queuedUpdates.slice(0, 20) : []
        };
    }

    function normalizeHistory(history) {
        return Array.isArray(history)
            ? history.slice(-100).map((entry, index) => {
                const snapshotBefore = entry && entry.snapshotBefore && typeof entry.snapshotBefore === "object"
                    ? {
                        blueScore: clampNumber(entry.snapshotBefore.blueScore, 0, 999, 0),
                        orangeScore: clampNumber(entry.snapshotBefore.orangeScore, 0, 999, 0),
                        blueSeriesScore: clampNumber(entry.snapshotBefore.blueSeriesScore, 0, 99, 0),
                        orangeSeriesScore: clampNumber(entry.snapshotBefore.orangeSeriesScore, 0, 99, 0)
                    }
                    : null;

                return {
                    id: normalizeText(entry && entry.id) || `history-${index + 1}`,
                    actionId: normalizeText(entry && entry.actionId),
                    type: normalizeText(entry && entry.type) || "note",
                    label: normalizeText(entry && entry.label),
                    teamSide: TEAM_SIDES.includes(entry && entry.teamSide) ? entry.teamSide : "",
                    teamName: limitText(entry && entry.teamName, TEAM_NAME_MAX_LENGTH),
                    eventColor: normalizeText(entry && entry.eventColor),
                    winningSide: TEAM_SIDES.includes(entry && entry.winningSide) ? entry.winningSide : "",
                    winningTeamName: limitText(entry && entry.winningTeamName, TEAM_NAME_MAX_LENGTH),
                    blueScore: clampNumber(entry && entry.blueScore, 0, 999, 0),
                    orangeScore: clampNumber(entry && entry.orangeScore, 0, 999, 0),
                    blueSeriesScore: clampNumber(entry && entry.blueSeriesScore, 0, 99, 0),
                    orangeSeriesScore: clampNumber(entry && entry.orangeSeriesScore, 0, 99, 0),
                    gameNumber: clampNumber(entry && entry.gameNumber, 1, 99, 1),
                    snapshotBefore,
                    createdAt: Number.isFinite(Number(entry && entry.createdAt)) ? Number(entry.createdAt) : 0
                };
            })
            : [];
    }

    function normalizeSavedTeams(savedTeams) {
        const seenNames = new Set();
        const sourceTeams = Array.isArray(savedTeams) ? savedTeams : [];

        return sourceTeams.reduce((teams, team, index) => {
            const sourceTeam = team && typeof team === "object" ? team : {};
            const name = limitText(sourceTeam.name, TEAM_NAME_MAX_LENGTH);
            const normalizedName = name.toLowerCase();

            if (!name || seenNames.has(normalizedName)) {
                return teams;
            }

            seenNames.add(normalizedName);
            teams.push({
                id: normalizeText(sourceTeam.id) || `saved-team-${index + 1}`,
                name,
                logoPath: normalizeText(sourceTeam.logoPath),
                accentColor: normalizeText(sourceTeam.accentColor) || "#2f80ff",
                players: normalizePlayers(sourceTeam.players, `saved-team-${index + 1}`).slice(0, 3),
                subs: normalizePlayers(sourceTeam.subs, `saved-team-${index + 1}-sub`).slice(0, 2),
                createdAt: Number.isFinite(Number(sourceTeam.createdAt)) ? Number(sourceTeam.createdAt) : 0,
                updatedAt: Number.isFinite(Number(sourceTeam.updatedAt)) ? Number(sourceTeam.updatedAt) : 0
            });
            return teams;
        }, []);
    }

    function normalizeScoreSnapshots(snapshots) {
        return Array.isArray(snapshots)
            ? snapshots.slice(-20).map((snapshot) => ({
                blueScore: clampNumber(snapshot && snapshot.blueScore, 0, 999, 0),
                orangeScore: clampNumber(snapshot && snapshot.orangeScore, 0, 999, 0),
                blueSeriesScore: clampNumber(snapshot && snapshot.blueSeriesScore, 0, 99, 0),
                orangeSeriesScore: clampNumber(snapshot && snapshot.orangeSeriesScore, 0, 99, 0)
            }))
            : [];
    }

    function normalizeState(state) {
        const sourceState = state && typeof state === "object" ? state : {};
        const match = normalizeMatch(sourceState.match);
        const teams = clampSeriesScores({
            blue: normalizeTeam(sourceState.teams && sourceState.teams.blue, "blue"),
            orange: normalizeTeam(sourceState.teams && sourceState.teams.orange, "orange")
        }, match.bestOf);

        match.gameNumber = getDerivedGameNumber(match.bestOf, teams.blue.seriesScore, teams.orange.seriesScore);

        return {
            moduleId: MODULE_ID,
            schemaVersion: SCHEMA_VERSION,
            updatedAt: Number.isFinite(Number(sourceState.updatedAt)) ? Number(sourceState.updatedAt) : 0,
            isMatchActive: Boolean(sourceState.isMatchActive),
            match,
            teams,
            overlay: normalizeOverlay(sourceState.overlay),
            history: normalizeHistory(sourceState.history),
            savedTeams: normalizeSavedTeams(sourceState.savedTeams),
            undo: {
                undoDepth: clampNumber(sourceState.undo && sourceState.undo.undoDepth, 0, 100, 0),
                lastActionId: normalizeText(sourceState.undo && sourceState.undo.lastActionId),
                scoreSnapshots: normalizeScoreSnapshots(sourceState.undo && sourceState.undo.scoreSnapshots)
            },
            dev: {
                mockMode: Boolean(sourceState.dev && sourceState.dev.mockMode),
                mockScenario: normalizeText(sourceState.dev && sourceState.dev.mockScenario)
            }
        };
    }

    function deepMerge(baseValue, patchValue) {
        if (!patchValue || typeof patchValue !== "object" || Array.isArray(patchValue)) {
            return patchValue;
        }

        const merged = { ...baseValue };

        Object.keys(patchValue).forEach((key) => {
            const currentValue = baseValue && baseValue[key];
            const nextValue = patchValue[key];

            if (
                currentValue &&
                nextValue &&
                typeof currentValue === "object" &&
                typeof nextValue === "object" &&
                !Array.isArray(currentValue) &&
                !Array.isArray(nextValue)
            ) {
                merged[key] = deepMerge(currentValue, nextValue);
                return;
            }

            merged[key] = nextValue;
        });

        return merged;
    }

    function getStorageKey() {
        return STORAGE_KEY;
    }

    function getDefaultState() {
        return clone(defaultState);
    }

    function loadState() {
        try {
            const stored = window.localStorage.getItem(STORAGE_KEY);
            return normalizeState(stored ? JSON.parse(stored) : defaultState);
        } catch (error) {
            console.warn("Could not load Rocket League module state.", error);
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

    function saveState(nextState, options) {
        const normalizedState = normalizeState({
            ...nextState,
            updatedAt: Date.now()
        });

        try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizedState));
        } catch (error) {
            console.warn("Could not save Rocket League module state.", error);
        }

        if (!options || options.broadcast !== false) {
            emit(normalizedState);
        }

        return normalizedState;
    }

    function updateState(updaterOrPatch) {
        const currentState = loadState();
        const nextState = typeof updaterOrPatch === "function"
            ? updaterOrPatch(clone(currentState))
            : deepMerge(currentState, updaterOrPatch || {});

        return saveState(nextState);
    }

    function resetState() {
        try {
            window.localStorage.removeItem(STORAGE_KEY);
        } catch (error) {
            console.warn("Could not reset Rocket League module state.", error);
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

    window.addEventListener("storage", (event) => {
        if (event.key !== STORAGE_KEY || !event.newValue) {
            return;
        }

        try {
            const nextState = normalizeState(JSON.parse(event.newValue));
            listeners.forEach((listener) => listener(clone(nextState)));
        } catch (error) {
            console.warn("Could not sync Rocket League module state.", error);
        }
    });

    window.ZBroadcastRocketLeague = {
        moduleId: MODULE_ID,
        schemaVersion: SCHEMA_VERSION,
        getStorageKey,
        getDefaultState,
        normalizeState,
        loadState,
        saveState,
        updateState,
        resetState,
        subscribe
    };
}());
