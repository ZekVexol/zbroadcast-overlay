(function () {
    "use strict";

const ROCKET_LEAGUE_PLAYER_NAME_MAX_LENGTH = 24;
const ROCKET_LEAGUE_SAVED_TEAM_COLUMN_COUNT = 3;
const ROCKET_LEAGUE_SAVED_TEAM_MIN_ROWS_PER_COLUMN = 6;
const ROCKET_LEAGUE_SAVED_TEAM_BUTTON_HEIGHT = 32;
const ROCKET_LEAGUE_SAVED_TEAM_BUTTON_GAP = 6;
const STYLE_URL = "/modules/rocket-league/panel.css";

function ensureRocketLeagueNativeStyles() {
    const existingLink = document.querySelector('link[data-rocket-league-panel-style="true"]');

    if (existingLink) {
        return existingLink.dataset.loaded === "true"
            ? Promise.resolve()
            : new Promise((resolve, reject) => {
                existingLink.addEventListener("load", resolve, { once: true });
                existingLink.addEventListener("error", reject, { once: true });
            });
    }

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = STYLE_URL;
    link.dataset.rocketLeaguePanelStyle = "true";
    document.head.appendChild(link);

    return new Promise((resolve, reject) => {
        link.addEventListener("load", () => {
            link.dataset.loaded = "true";
            resolve();
        }, { once: true });
        link.addEventListener("error", reject, { once: true });
    });
}

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function showRocketLeagueModal(config) {
    if (typeof panelOptions.showModal === "function") {
        panelOptions.showModal(config);
    }
}

function closeRocketLeagueModal() {
    closeRocketLeagueSavedTeamsPanel();
    if (typeof panelOptions.closeModal === "function") {
        panelOptions.closeModal();
    }
}

function syncRocketLeaguePanelSize(size) {
    if (typeof panelOptions.syncFrameSize === "function") {
        panelOptions.syncFrameSize(size);
    }
}

let rocketLeagueNativePanel = null;
let rocketLeagueNativeState = null;
let unsubscribeRocketLeagueNativePanel = null;
let panelOptions = {};
let rocketLeagueSavedTeamsPanel = null;
let rocketLeagueSavedTeamsResizeHandler = null;
let rocketLeagueSavedTeamsSelection = [];
let rocketLeagueSavedTeamsPage = 0;

function getRocketLeagueStateApi() {
    return panelOptions.stateApi || window.ZBroadcastRocketLeague || null;
}

function getReadableBorderColor(hexColor) {
    const normalizedHex = String(hexColor || "").replace("#", "");

    if (!/^[0-9a-fA-F]{6}$/.test(normalizedHex)) {
        return "rgba(255, 255, 255, 0.82)";
    }

    const red = parseInt(normalizedHex.slice(0, 2), 16);
    const green = parseInt(normalizedHex.slice(2, 4), 16);
    const blue = parseInt(normalizedHex.slice(4, 6), 16);
    const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255;

    return luminance > 0.62 ? "#05080d" : "#ffffff";
}

function clampRocketLeagueValue(value, min, max) {
    return Math.min(max, Math.max(min, Math.round(Number(value) || 0)));
}

function getRocketLeagueWinCondition(bestOf) {
    return Math.floor(bestOf / 2) + 1;
}

function getRocketLeagueSeriesStatus(state) {
    const bestOf = Number(state.match.bestOf) || 1;
    const winCondition = getRocketLeagueWinCondition(bestOf);
    const blueSeries = Number(state.teams.blue.seriesScore) || 0;
    const orangeSeries = Number(state.teams.orange.seriesScore) || 0;
    const completedGames = blueSeries + orangeSeries;
    const winningSide = blueSeries >= winCondition ? "blue" : (orangeSeries >= winCondition ? "orange" : "");
    const isComplete = Boolean(winningSide) || completedGames >= bestOf;
    const currentGame = isComplete ? bestOf : Math.min(bestOf, completedGames + 1);

    return {
        bestOf,
        winCondition,
        blueSeries,
        orangeSeries,
        winningSide,
        isComplete,
        currentGame
    };
}

function snapshotRocketLeagueScores(state) {
    return {
        blueScore: state.teams.blue.score,
        orangeScore: state.teams.orange.score,
        blueSeriesScore: state.teams.blue.seriesScore,
        orangeSeriesScore: state.teams.orange.seriesScore
    };
}

function createRocketLeagueActionId() {
    return `rocket-action-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function pushRocketLeagueUndoSnapshot(state) {
    state.undo = state.undo || {};
    state.undo.scoreSnapshots = Array.isArray(state.undo.scoreSnapshots) ? state.undo.scoreSnapshots : [];
    state.undo.scoreSnapshots.push(snapshotRocketLeagueScores(rocketLeagueNativeState || state));
    state.undo.scoreSnapshots = state.undo.scoreSnapshots.slice(-20);
    state.undo.undoDepth = state.undo.scoreSnapshots.length;
}

function restoreRocketLeagueSnapshot(state, snapshot) {
    state.teams.blue.score = snapshot.blueScore;
    state.teams.orange.score = snapshot.orangeScore;
    state.teams.blue.seriesScore = snapshot.blueSeriesScore;
    state.teams.orange.seriesScore = snapshot.orangeSeriesScore;
}

function getRocketLeagueTeamName(state, side) {
    return state.teams[side].name || side.toUpperCase();
}

function getRocketLeagueTeamEventColor(state, side) {
    return state.teams[side] && state.teams[side].accentColor ? state.teams[side].accentColor : "#ffffff";
}

function getSafeRocketLeagueEventColor(color, fallbackColor) {
    const normalizedColor = String(color || "").trim();
    return /^#[0-9a-fA-F]{6}$/.test(normalizedColor) ? normalizedColor : fallbackColor;
}

function normalizeRocketLeagueIdentityValue(value) {
    return String(value || "").trim().toLowerCase();
}

function getRocketLeagueHistoryCurrentSide(entry, state) {
    const blue = state.teams && state.teams.blue ? state.teams.blue : {};
    const orange = state.teams && state.teams.orange ? state.teams.orange : {};
    const entryName = normalizeRocketLeagueIdentityValue(entry.teamName || entry.winningTeamName);

    if (entryName) {
        if (entryName === normalizeRocketLeagueIdentityValue(blue.name)) {
            return "blue";
        }

        if (entryName === normalizeRocketLeagueIdentityValue(orange.name)) {
            return "orange";
        }
    }

    const entryColor = normalizeRocketLeagueIdentityValue(entry.eventColor);
    if (entryColor) {
        const blueColor = normalizeRocketLeagueIdentityValue(blue.accentColor);
        const orangeColor = normalizeRocketLeagueIdentityValue(orange.accentColor);

        if (entryColor === blueColor && entryColor !== orangeColor) {
            return "blue";
        }

        if (entryColor === orangeColor && entryColor !== blueColor) {
            return "orange";
        }
    }

    return entry.teamSide || entry.winningSide || "neutral";
}

function formatRocketLeagueWinnerFirstScore(entry, winningSide, winnerScoreKey, loserScoreKey) {
    const winnerScore = winningSide === "orange" ? entry[loserScoreKey] : entry[winnerScoreKey];
    const loserScore = winningSide === "orange" ? entry[winnerScoreKey] : entry[loserScoreKey];
    return `${Number(winnerScore) || 0}-${Number(loserScore) || 0}`;
}

function appendRocketLeagueHistoryEvent(state, event) {
    state.history = Array.isArray(state.history) ? state.history : [];
    state.history.push({
        id: `${event.type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        createdAt: Date.now(),
        ...event
    });
    state.history = state.history.slice(-100);
}

function setRocketLeagueScoreValue(root, name, value) {
    const field = root.querySelector(`[data-score-value="${name}"]`);
    if (field) {
        field.textContent = value;
    }
}

function getRocketLeaguePipState(index, status) {
    if (index < status.blueSeries) {
        return "blue";
    }

    if (index >= status.bestOf - status.orangeSeries) {
        return "orange";
    }

    return "";
}

function renderRocketLeagueNativeSeriesPips(root, state) {
    const pips = root.querySelector("[data-series-pips]");
    const status = getRocketLeagueSeriesStatus(state);

    if (!pips) {
        return;
    }

    pips.innerHTML = "";
    for (let index = 0; index < status.bestOf; index += 1) {
        const pip = document.createElement("span");
        const pipState = getRocketLeaguePipState(index, status);
        pip.className = `rocket-league-pip${pipState ? ` is-${pipState}` : ""}${status.bestOf % 2 === 1 && index === Math.floor(status.bestOf / 2) ? " is-center" : ""}`;
        pips.appendChild(pip);
    }
}

function renderRocketLeagueNativeLogo(root, side, team) {
    const logo = root.querySelector(`[data-preview-logo="${side}"]`);

    if (!logo) {
        return;
    }

    logo.textContent = team.logoPath ? "" : side.slice(0, 3).toUpperCase();
    logo.style.backgroundImage = team.logoPath ? `url("${team.logoPath}")` : "";
}

function applyRocketLeagueNameLengthClass(element, name) {
    element.classList.toggle("is-long", name.length > 12);
    element.classList.toggle("is-extra-long", name.length > 15);
    element.classList.toggle("is-max-long", name.length > 17);
}

function fitRocketLeagueNameText(element) {
    const textElement = element && element.querySelector(".rocket-league-preview-name-text");
    const fontSizes = [52, 50, 48, 46, 44, 42, 40, 38, 36, 34, 32, 30, 28, 26, 24, 22, 20, 18, 16, 14, 13];

    if (!textElement) {
        return;
    }

    element.style.removeProperty("--rocket-name-size");
    for (const size of fontSizes) {
        element.style.setProperty("--rocket-name-size", `${size}px`);
        textElement.offsetWidth;
        if (textElement.scrollWidth <= textElement.clientWidth + 1) {
            return;
        }
    }
}

function getRocketLeagueMetaText(state) {
    const status = getRocketLeagueSeriesStatus(state);
    return status.isComplete
        ? `Bo${status.bestOf} / Final`
        : `Bo${status.bestOf} / Game ${status.currentGame}`;
}

function getRocketLeagueMatchInfoLines(state) {
    return {
        primary: state.match.tournamentName || "",
        secondary: [
            state.match.seriesInfo,
            state.match.weekRound
        ].filter(Boolean).join(" | ")
    };
}

function renderRocketLeagueNativeHistory(root, state) {
    const historyElement = root.querySelector("[data-event-history]");
    const history = Array.isArray(state.history) ? state.history : [];

    if (!historyElement) {
        return;
    }

    if (!history.length) {
        historyElement.innerHTML = `<div class="rocket-league-history-empty">No events yet</div>`;
        return;
    }

    historyElement.innerHTML = history.slice().reverse().map((entry) => {
        if (entry.type === "goal") {
            const goalAccent = getSafeRocketLeagueEventColor(entry.eventColor, "#ffffff");
            const currentSide = getRocketLeagueHistoryCurrentSide(entry, state);
            return `
                <div class="rocket-league-history-entry is-goal is-${escapeHtml(currentSide)}" style="--rocket-history-accent: ${escapeHtml(goalAccent)}; --rocket-history-contrast: ${escapeHtml(getReadableBorderColor(goalAccent))};">
                    <span>${escapeHtml(`${entry.teamName || entry.teamSide || "Team"} Goal`.toUpperCase())}</span>
                </div>
            `;
        }

        if (entry.type === "gameFinal") {
            const gameAccent = getSafeRocketLeagueEventColor(entry.eventColor, "#ffffff");
            const gameScore = formatRocketLeagueWinnerFirstScore(entry, entry.winningSide, "blueScore", "orangeScore");
            return `
                <div class="rocket-league-history-entry is-game-final" style="--rocket-history-accent: ${escapeHtml(gameAccent)}; --rocket-history-contrast: ${escapeHtml(getReadableBorderColor(gameAccent))};">
                    <span>GAME ${entry.gameNumber} FINAL</span>
                    <strong>${escapeHtml(`${entry.winningTeamName || "Team"} Wins ${gameScore}`.toUpperCase())}</strong>
                </div>
            `;
        }

        if (entry.type === "seriesFinal") {
            const seriesAccent = getSafeRocketLeagueEventColor(entry.eventColor, "#ffffff");
            const seriesScore = formatRocketLeagueWinnerFirstScore(entry, entry.winningSide, "blueSeriesScore", "orangeSeriesScore");
            return `
                <div class="rocket-league-history-entry is-series-final" style="--rocket-history-accent: ${escapeHtml(seriesAccent)}; --rocket-history-contrast: ${escapeHtml(getReadableBorderColor(seriesAccent))};">
                    <span>SERIES FINAL</span>
                    <strong>${escapeHtml(`${entry.winningTeamName || "Team"} Wins ${seriesScore}`.toUpperCase())}</strong>
                </div>
            `;
        }

        return `
            <div class="rocket-league-history-entry">
                <span>${escapeHtml(entry.label || "Event")}</span>
                <strong>${escapeHtml(entry.teamName || "")}</strong>
            </div>
        `;
    }).join("");
}

function renderRocketLeagueNativePanelState(state) {
    const stateApi = getRocketLeagueStateApi();
    const root = rocketLeagueNativePanel;

    if (!stateApi || !root) {
        return;
    }

    rocketLeagueNativeState = stateApi.normalizeState(state);
    const blue = rocketLeagueNativeState.teams.blue;
    const orange = rocketLeagueNativeState.teams.orange;
    const blueName = blue.name || "BLUE";
    const orangeName = orange.name || "ORANGE";
    const blueNameElement = root.querySelector('[data-preview-name="blue"]');
    const orangeNameElement = root.querySelector('[data-preview-name="orange"]');

    setRocketLeagueScoreValue(root, "blueScore", blue.score);
    setRocketLeagueScoreValue(root, "blueSeriesScore", blue.seriesScore);
    setRocketLeagueScoreValue(root, "orangeScore", orange.score);
    setRocketLeagueScoreValue(root, "orangeSeriesScore", orange.seriesScore);

    if (blueNameElement) {
        blueNameElement.querySelector(".rocket-league-preview-name-text").textContent = blueName;
        blueNameElement.title = blueName;
        applyRocketLeagueNameLengthClass(blueNameElement, blueName);
    }

    if (orangeNameElement) {
        orangeNameElement.querySelector(".rocket-league-preview-name-text").textContent = orangeName;
        orangeNameElement.title = orangeName;
        applyRocketLeagueNameLengthClass(orangeNameElement, orangeName);
    }

    const bluePreviewScore = root.querySelector('[data-preview-score="blue"]');
    const orangePreviewScore = root.querySelector('[data-preview-score="orange"]');
    const previewMeta = root.querySelector("[data-preview-meta]");
    const matchInfoElement = root.querySelector("[data-match-info]");

    if (bluePreviewScore) {
        bluePreviewScore.textContent = blue.score;
    }

    if (orangePreviewScore) {
        orangePreviewScore.textContent = orange.score;
    }

    if (previewMeta) {
        previewMeta.textContent = getRocketLeagueMetaText(rocketLeagueNativeState);
    }

    if (matchInfoElement) {
        const matchInfo = getRocketLeagueMatchInfoLines(rocketLeagueNativeState);
        matchInfoElement.querySelector("[data-match-info-primary]").textContent = matchInfo.primary;
        matchInfoElement.querySelector("[data-match-info-secondary]").textContent = matchInfo.secondary;
        matchInfoElement.hidden = !matchInfo.primary && !matchInfo.secondary;
    }

    root.style.setProperty("--rocket-blue", blue.accentColor || "#2f80ff");
    root.style.setProperty("--rocket-orange", orange.accentColor || "#ff8a24");
    root.style.setProperty("--rocket-blue-pip-border", getReadableBorderColor(blue.accentColor || "#2f80ff"));
    root.style.setProperty("--rocket-orange-pip-border", getReadableBorderColor(orange.accentColor || "#ff8a24"));
    renderRocketLeagueNativeLogo(root, "blue", blue);
    renderRocketLeagueNativeLogo(root, "orange", orange);
    renderRocketLeagueNativeSeriesPips(root, rocketLeagueNativeState);
    renderRocketLeagueNativeHistory(root, rocketLeagueNativeState);
    window.requestAnimationFrame(() => {
        fitRocketLeagueNameText(blueNameElement);
        fitRocketLeagueNameText(orangeNameElement);
        const card = root.querySelector(".rocket-league-panel-card");
        if (card) {
            syncRocketLeaguePanelSize(card.getBoundingClientRect());
        }
    });
}

function readRocketLeagueNativeScoreState() {
    const stateApi = getRocketLeagueStateApi();
    return stateApi ? stateApi.normalizeState(rocketLeagueNativeState || stateApi.loadState()) : null;
}

function saveRocketLeagueNativeState(nextState) {
    const stateApi = getRocketLeagueStateApi();
    if (!stateApi) {
        return null;
    }

    const savedState = stateApi.saveState(nextState);
    renderRocketLeagueNativePanelState(savedState);
    return savedState;
}

function updateRocketLeagueNativeScore(mutator) {
    const nextState = readRocketLeagueNativeScoreState();

    if (!nextState) {
        return;
    }

    pushRocketLeagueUndoSnapshot(nextState);
    mutator(nextState);
    saveRocketLeagueNativeState(nextState);
}

function adjustRocketLeagueNativeGameScore(side, delta) {
    updateRocketLeagueNativeScore((state) => {
        state.teams[side].score = clampRocketLeagueValue(state.teams[side].score + delta, 0, 999);
    });
}

function adjustRocketLeagueNativeSeriesScore(side, delta) {
    updateRocketLeagueNativeScore((state) => {
        const status = getRocketLeagueSeriesStatus(state);
        const otherSide = side === "blue" ? "orange" : "blue";
        const currentValue = state.teams[side].seriesScore;

        if (delta > 0 && (status.isComplete || currentValue >= status.winCondition || currentValue + state.teams[otherSide].seriesScore >= status.bestOf)) {
            return;
        }

        state.teams[side].seriesScore = clampRocketLeagueValue(currentValue + delta, 0, status.winCondition);
        state.teams.blue.score = 0;
        state.teams.orange.score = 0;
    });
}

function recordRocketLeagueNativeGoal(side) {
    const nextState = readRocketLeagueNativeScoreState();

    if (!nextState) {
        return;
    }

    const snapshotBefore = snapshotRocketLeagueScores(nextState);
    const status = getRocketLeagueSeriesStatus(nextState);

    if (status.isComplete) {
        return;
    }

    nextState.teams[side].score = clampRocketLeagueValue(nextState.teams[side].score + 1, 0, 999);
    appendRocketLeagueHistoryEvent(nextState, {
        actionId: createRocketLeagueActionId(),
        type: "goal",
        teamSide: side,
        teamName: getRocketLeagueTeamName(nextState, side),
        eventColor: getRocketLeagueTeamEventColor(nextState, side),
        blueScore: nextState.teams.blue.score,
        orangeScore: nextState.teams.orange.score,
        gameNumber: status.currentGame,
        snapshotBefore
    });
    saveRocketLeagueNativeState(nextState);
}

function completeRocketLeagueNativeGame(side) {
    const nextState = readRocketLeagueNativeScoreState();

    if (!nextState) {
        return;
    }

    const status = getRocketLeagueSeriesStatus(nextState);
    const otherSide = side === "blue" ? "orange" : "blue";
    const snapshotBefore = snapshotRocketLeagueScores(nextState);
    const actionId = createRocketLeagueActionId();

    if (status.isComplete || nextState.teams[side].seriesScore >= status.winCondition || nextState.teams[side].seriesScore + nextState.teams[otherSide].seriesScore >= status.bestOf) {
        return;
    }

    appendRocketLeagueHistoryEvent(nextState, {
        actionId,
        type: "gameFinal",
        winningSide: side,
        winningTeamName: getRocketLeagueTeamName(nextState, side),
        eventColor: getRocketLeagueTeamEventColor(nextState, side),
        blueScore: nextState.teams.blue.score,
        orangeScore: nextState.teams.orange.score,
        gameNumber: status.currentGame,
        snapshotBefore
    });

    nextState.teams[side].seriesScore = clampRocketLeagueValue(nextState.teams[side].seriesScore + 1, 0, status.winCondition);
    nextState.teams.blue.score = 0;
    nextState.teams.orange.score = 0;

    const nextStatus = getRocketLeagueSeriesStatus(nextState);
    if (nextStatus.isComplete && nextStatus.winningSide) {
        appendRocketLeagueHistoryEvent(nextState, {
            actionId,
            type: "seriesFinal",
            winningSide: nextStatus.winningSide,
            winningTeamName: getRocketLeagueTeamName(nextState, nextStatus.winningSide),
            eventColor: getRocketLeagueTeamEventColor(nextState, nextStatus.winningSide),
            blueSeriesScore: nextState.teams.blue.seriesScore,
            orangeSeriesScore: nextState.teams.orange.seriesScore,
            gameNumber: status.currentGame,
            snapshotBefore
        });
    }

    saveRocketLeagueNativeState(nextState);
}

function undoRocketLeagueNativeScore() {
    const nextState = readRocketLeagueNativeScoreState();

    if (!nextState) {
        return;
    }

    const history = Array.isArray(nextState.history) ? nextState.history : [];
    const lastEvent = history[history.length - 1];

    if (lastEvent && lastEvent.snapshotBefore) {
        const actionId = lastEvent.actionId || lastEvent.id;

        restoreRocketLeagueSnapshot(nextState, lastEvent.snapshotBefore);
        while (history.length && (history[history.length - 1].actionId || history[history.length - 1].id) === actionId) {
            history.pop();
        }
        nextState.history = history;
        saveRocketLeagueNativeState(nextState);
        return;
    }

    const snapshots = nextState.undo && Array.isArray(nextState.undo.scoreSnapshots) ? nextState.undo.scoreSnapshots : [];
    const snapshot = snapshots.pop();

    if (!snapshot) {
        return;
    }

    restoreRocketLeagueSnapshot(nextState, snapshot);
    nextState.undo.scoreSnapshots = snapshots;
    nextState.undo.undoDepth = snapshots.length;
    saveRocketLeagueNativeState(nextState);
}

function resetRocketLeagueNativeGame() {
    updateRocketLeagueNativeScore((state) => {
        const history = Array.isArray(state.history) ? state.history : [];
        const lastCompletedIndex = Math.max(
            history.map((entry, index) => entry.type === "gameFinal" || entry.type === "seriesFinal" ? index : -1).reduce((max, index) => Math.max(max, index), -1)
        );
        state.teams.blue.score = 0;
        state.teams.orange.score = 0;
        state.history = lastCompletedIndex >= 0 ? history.slice(0, lastCompletedIndex + 1) : [];
    });
}

function resetRocketLeagueNativeSeries() {
    updateRocketLeagueNativeScore((state) => {
        state.teams.blue.score = 0;
        state.teams.orange.score = 0;
        state.teams.blue.seriesScore = 0;
        state.teams.orange.seriesScore = 0;
        state.history = [];
    });
}

function swapRocketLeagueNativeTeams() {
    const nextState = readRocketLeagueNativeScoreState();

    if (!nextState) {
        return;
    }

    const swappedState = swapRocketLeagueTeamsInState(nextState);
    saveRocketLeagueNativeState(swappedState);
}

function bindRocketLeagueNativePanel(root) {
    root.querySelector("[data-open-match-setup]").addEventListener("click", () => showRocketLeagueMatchSetupModal(readRocketLeagueNativeScoreState() || {}));
    root.querySelector("[data-open-teams]").addEventListener("click", () => showRocketLeagueTeamsModal(readRocketLeagueNativeScoreState() || {}));
    root.querySelector("[data-swap-teams]").addEventListener("click", swapRocketLeagueNativeTeams);
    root.querySelector("[data-reset-game-score]").addEventListener("click", resetRocketLeagueNativeGame);
    root.querySelector("[data-reset-series]").addEventListener("click", resetRocketLeagueNativeSeries);
    root.querySelector("[data-undo-score]").addEventListener("click", undoRocketLeagueNativeScore);
    root.querySelectorAll("[data-score-action]").forEach((button) => {
        button.addEventListener("click", () => {
            const side = button.dataset.side;
            const delta = Number(button.dataset.delta || 0);

            if (button.dataset.scoreAction === "goal") {
                recordRocketLeagueNativeGoal(side);
            } else if (button.dataset.scoreAction === "win") {
                completeRocketLeagueNativeGame(side);
            } else if (button.dataset.scoreAction === "adjust-game") {
                adjustRocketLeagueNativeGameScore(side, delta);
            } else if (button.dataset.scoreAction === "adjust-series") {
                adjustRocketLeagueNativeSeriesScore(side, delta);
            }
        });
    });
}

function renderRocketLeagueNativePanel(host) {
    const stateApi = getRocketLeagueStateApi();

    if (!stateApi) {
        host.innerHTML = `<div class="rocket-league-history-empty">Rocket League state API unavailable.</div>`;
        return;
    }

    if (unsubscribeRocketLeagueNativePanel) {
        unsubscribeRocketLeagueNativePanel();
        unsubscribeRocketLeagueNativePanel = null;
    }

    host.innerHTML = `
        <main class="rocket-league-panel rocket-league-app-panel">
            <section class="rocket-league-panel-card">
                <div class="rocket-league-toolbar">
                    <div class="rocket-league-toolbar-left">
                        <button type="button" class="rocket-league-primary-button" data-open-match-setup>Match Setup</button>
                        <button type="button" class="rocket-league-secondary-button" data-open-teams>Teams</button>
                        <button type="button" class="rocket-league-secondary-button" data-swap-teams>Swap Teams</button>
                    </div>
                    <div class="rocket-league-match-info" data-match-info hidden>
                        <div data-match-info-primary></div>
                        <div data-match-info-secondary></div>
                    </div>
                    <div class="rocket-league-toolbar-right">
                        <button type="button" class="rocket-league-secondary-button" data-undo-score>Undo</button>
                        <button type="button" class="rocket-league-secondary-button" data-reset-game-score>Reset Game</button>
                        <button type="button" class="rocket-league-danger-button" data-reset-series>Reset Series</button>
                    </div>
                </div>
                <section class="rocket-league-scoreboard-preview" aria-label="Rocket League local scoreboard preview">
                    <div class="rocket-league-preview-logo rocket-league-preview-logo-blue" data-preview-logo="blue">BLU</div>
                    <div class="rocket-league-preview-name rocket-league-preview-name-blue" data-preview-name="blue"><span class="rocket-league-preview-name-text" data-preview-name-text="blue">BLUE</span></div>
                    <div class="rocket-league-preview-score rocket-league-preview-score-blue" data-preview-score="blue">0</div>
                    <div class="rocket-league-preview-center">
                        <div class="rocket-league-preview-meta" data-preview-meta></div>
                        <div class="rocket-league-series-pips" data-series-pips></div>
                    </div>
                    <div class="rocket-league-preview-score rocket-league-preview-score-orange" data-preview-score="orange">0</div>
                    <div class="rocket-league-preview-name rocket-league-preview-name-orange" data-preview-name="orange"><span class="rocket-league-preview-name-text" data-preview-name-text="orange">ORANGE</span></div>
                    <div class="rocket-league-preview-logo rocket-league-preview-logo-orange" data-preview-logo="orange">ORG</div>
                </section>
                <div class="rocket-league-team-grid">
                    <section class="rocket-league-section rocket-league-team-section rocket-league-team-blue" aria-label="Blue score controls">
                        <div class="rocket-league-control-row">
                            <button type="button" class="rocket-league-team-action" data-score-action="goal" data-side="blue">GOAL</button>
                            <div class="rocket-league-score-value" data-score-value="blueScore" aria-label="Blue game score">0</div>
                            <button type="button" class="rocket-league-step-button is-minus" data-score-action="adjust-game" data-side="blue" data-delta="-1">-</button>
                            <button type="button" class="rocket-league-step-button is-plus" data-score-action="adjust-game" data-side="blue" data-delta="1">+</button>
                        </div>
                        <div class="rocket-league-control-row">
                            <button type="button" class="rocket-league-team-action" data-score-action="win" data-side="blue">WIN</button>
                            <div class="rocket-league-score-value" data-score-value="blueSeriesScore" aria-label="Blue series score">0</div>
                            <button type="button" class="rocket-league-step-button is-minus" data-score-action="adjust-series" data-side="blue" data-delta="-1">-</button>
                            <button type="button" class="rocket-league-step-button is-plus" data-score-action="adjust-series" data-side="blue" data-delta="1">+</button>
                        </div>
                    </section>
                    <section class="rocket-league-history-section" aria-label="Rocket League event history">
                        <div class="rocket-league-history-list" data-event-history></div>
                    </section>
                    <section class="rocket-league-section rocket-league-team-section rocket-league-team-orange" aria-label="Orange score controls">
                        <div class="rocket-league-control-row">
                            <button type="button" class="rocket-league-team-action" data-score-action="goal" data-side="orange">GOAL</button>
                            <div class="rocket-league-score-value" data-score-value="orangeScore" aria-label="Orange game score">0</div>
                            <button type="button" class="rocket-league-step-button is-minus" data-score-action="adjust-game" data-side="orange" data-delta="-1">-</button>
                            <button type="button" class="rocket-league-step-button is-plus" data-score-action="adjust-game" data-side="orange" data-delta="1">+</button>
                        </div>
                        <div class="rocket-league-control-row">
                            <button type="button" class="rocket-league-team-action" data-score-action="win" data-side="orange">WIN</button>
                            <div class="rocket-league-score-value" data-score-value="orangeSeriesScore" aria-label="Orange series score">0</div>
                            <button type="button" class="rocket-league-step-button is-minus" data-score-action="adjust-series" data-side="orange" data-delta="-1">-</button>
                            <button type="button" class="rocket-league-step-button is-plus" data-score-action="adjust-series" data-side="orange" data-delta="1">+</button>
                        </div>
                    </section>
                </div>
            </section>
        </main>
    `;

    rocketLeagueNativePanel = host;
    bindRocketLeagueNativePanel(host);
    unsubscribeRocketLeagueNativePanel = stateApi.subscribe(renderRocketLeagueNativePanelState);
}



function cloneRocketLeagueModalState(state) {
    return JSON.parse(JSON.stringify(state || {}));
}

function sendRocketLeaguePanelState(state) {
    const stateApi = getRocketLeagueStateApi();

    if (!stateApi) {
        return;
    }

    saveRocketLeagueNativeState(stateApi.normalizeState(state));
}

function swapRocketLeagueTeamsInState(state) {
    const nextState = cloneRocketLeagueModalState(state);
    nextState.teams = nextState.teams || {};
    const blueTeam = nextState.teams.blue || {};
    const orangeTeam = nextState.teams.orange || {};

    nextState.teams.blue = {
        ...orangeTeam,
        id: "blue",
        side: "blue"
    };
    nextState.teams.orange = {
        ...blueTeam,
        id: "orange",
        side: "orange"
    };
    return nextState;
}

function normalizeRocketLeagueSavedTeamName(name) {
    return String(name || "").trim().toLowerCase();
}

function getRocketLeagueDefaultTeamSlot(side) {
    const isBlue = side === "blue";

    return {
        id: side,
        side,
        name: "",
        score: 0,
        seriesScore: 0,
        logoPath: "",
        accentColor: isBlue ? "#2f80ff" : "#ff8a24",
        players: [1, 2, 3].map((slot) => ({
            id: `${side}-player-${slot}`,
            name: ""
        })),
        subs: [1, 2].map((slot) => ({
            id: `${side}-sub-${slot}`,
            name: ""
        }))
    };
}

function createRocketLeagueSavedTeamFromTeam(team) {
    const name = String(team && team.name || "").trim();

    if (!name) {
        return null;
    }

    return {
        id: `saved-team-${normalizeRocketLeagueSavedTeamName(name).replace(/[^a-z0-9]+/g, "-") || Date.now()}`,
        name,
        logoPath: String(team.logoPath || "").trim(),
        accentColor: String(team.accentColor || "#2f80ff").trim(),
        players: Array.isArray(team.players)
            ? team.players.slice(0, 3).map((player, index) => ({
                id: `saved-player-${index + 1}`,
                name: String(player && player.name || "").trim()
            }))
            : [],
        subs: Array.isArray(team.subs)
            ? team.subs.slice(0, 2).map((player, index) => ({
                id: `saved-sub-${index + 1}`,
                name: String(player && player.name || "").trim()
            }))
            : [],
        createdAt: Date.now(),
        updatedAt: Date.now()
    };
}

function mergeRocketLeagueSavedTeams(existingTeams, teamsToSave) {
    const savedTeams = Array.isArray(existingTeams) ? existingTeams.slice() : [];
    const existingNames = new Set(savedTeams.map((team) => normalizeRocketLeagueSavedTeamName(team && team.name)).filter(Boolean));

    teamsToSave.forEach((team) => {
        const savedTeam = createRocketLeagueSavedTeamFromTeam(team);
        const normalizedName = normalizeRocketLeagueSavedTeamName(savedTeam && savedTeam.name);

        if (!savedTeam || !normalizedName || existingNames.has(normalizedName)) {
            return;
        }

        existingNames.add(normalizedName);
        savedTeams.push(savedTeam);
    });

    return savedTeams.sort((first, second) => String(first.name || "").localeCompare(String(second.name || "")));
}

function applyRocketLeagueSavedTeamToSlot(savedTeam, side, currentTeam) {
    const slotTeam = currentTeam || getRocketLeagueDefaultTeamSlot(side);

    return {
        ...slotTeam,
        id: side,
        side,
        name: savedTeam.name || "",
        logoPath: savedTeam.logoPath || "",
        accentColor: savedTeam.accentColor || (side === "blue" ? "#2f80ff" : "#ff8a24"),
        players: [1, 2, 3].map((slot, index) => ({
            ...(slotTeam.players && slotTeam.players[index] ? slotTeam.players[index] : {}),
            id: `${side}-player-${slot}`,
            name: savedTeam.players && savedTeam.players[index] ? savedTeam.players[index].name || "" : ""
        })),
        subs: [1, 2].map((slot, index) => ({
            ...(slotTeam.subs && slotTeam.subs[index] ? slotTeam.subs[index] : {}),
            id: `${side}-sub-${slot}`,
            name: savedTeam.subs && savedTeam.subs[index] ? savedTeam.subs[index].name || "" : ""
        }))
    };
}

function collectRocketLeagueMatchState(baseState) {
    const nextState = cloneRocketLeagueModalState(baseState);
    nextState.match = nextState.match || {};
    nextState.match.tournamentName = document.getElementById("rocketLeagueMatchTournamentName").value;
    nextState.match.seriesInfo = document.getElementById("rocketLeagueMatchSeriesInfo").value;
    nextState.match.weekRound = document.getElementById("rocketLeagueMatchWeekRound").value;
    nextState.match.eventTitle = nextState.match.tournamentName;
    nextState.match.matchTitle = nextState.match.seriesInfo;
    nextState.match.bestOf = Number(document.getElementById("rocketLeagueMatchBestOf").value) || 5;
    return nextState;
}

function getRocketLeagueTeamModalValue(side, fieldName) {
    const input = document.querySelector(`[data-rocket-league-team="${side}"][data-rocket-league-field="${fieldName}"]`);
    return input ? input.value : "";
}

function collectRocketLeagueTeamsState(baseState) {
    const nextState = cloneRocketLeagueModalState(baseState);
    nextState.teams = nextState.teams || {};

    ["blue", "orange"].forEach((side) => {
        const currentTeam = nextState.teams[side] || {};
        currentTeam.name = getRocketLeagueTeamModalValue(side, "name");
        currentTeam.logoPath = getRocketLeagueTeamModalValue(side, "logoPath");
        currentTeam.accentColor = getRocketLeagueTeamModalValue(side, "accentColor") || (side === "blue" ? "#2f80ff" : "#ff8a24");
        currentTeam.players = [1, 2, 3].map((slot, index) => ({
            ...(currentTeam.players && currentTeam.players[index] ? currentTeam.players[index] : {}),
            id: `${side}-player-${slot}`,
            name: getRocketLeagueTeamModalValue(side, `player${slot}`)
        }));
        currentTeam.subs = [1, 2].map((slot, index) => ({
            ...(currentTeam.subs && currentTeam.subs[index] ? currentTeam.subs[index] : {}),
            id: `${side}-sub-${slot}`,
            name: getRocketLeagueTeamModalValue(side, `sub${slot}`)
        }));
        nextState.teams[side] = currentTeam;
    });

    return nextState;
}

function clearRocketLeagueTeamsState(baseState) {
    const nextState = cloneRocketLeagueModalState(baseState);
    nextState.teams = nextState.teams || {};
    nextState.teams.blue = getRocketLeagueDefaultTeamSlot("blue");
    nextState.teams.orange = getRocketLeagueDefaultTeamSlot("orange");
    return nextState;
}

function saveRocketLeagueTeamsToLibrary(baseState) {
    const stateApi = getRocketLeagueStateApi();
    const currentState = stateApi ? stateApi.loadState() : baseState;
    const modalState = collectRocketLeagueTeamsState(baseState);
    const nextState = cloneRocketLeagueModalState(currentState || baseState);

    nextState.savedTeams = mergeRocketLeagueSavedTeams(
        nextState.savedTeams,
        [modalState.teams.blue, modalState.teams.orange]
    );
    baseState.savedTeams = nextState.savedTeams;
    saveRocketLeagueNativeState(nextState);
    return nextState.savedTeams;
}

function positionRocketLeagueSavedTeamsPanel() {
    if (!rocketLeagueSavedTeamsPanel) {
        return;
    }

    const teamsModal = document.querySelector(".app-modal.rocket-league-teams-modal");

    if (!teamsModal) {
        return;
    }

    const modalRect = teamsModal.getBoundingClientRect();
    const gap = 12;
    const availableRight = window.innerWidth - modalRect.right - gap - 16;
    const availableLeft = modalRect.left - gap - 16;
    const canFitRight = availableRight >= 360;
    const availableWidth = canFitRight ? availableRight : availableLeft;
    const panelWidth = Math.min(420, Math.max(320, availableWidth));
    const panelTop = Math.max(12, modalRect.top);
    const panelHeight = Math.min(modalRect.height, window.innerHeight - panelTop - 12);

    rocketLeagueSavedTeamsPanel.style.width = `${panelWidth}px`;
    rocketLeagueSavedTeamsPanel.style.top = `${panelTop}px`;
    rocketLeagueSavedTeamsPanel.style.left = canFitRight
        ? `${modalRect.right + gap}px`
        : `${Math.max(12, modalRect.left - gap - panelWidth)}px`;
    rocketLeagueSavedTeamsPanel.style.height = `${panelHeight}px`;
}

function closeRocketLeagueSavedTeamsPanel() {
    if (rocketLeagueSavedTeamsResizeHandler) {
        window.removeEventListener("resize", rocketLeagueSavedTeamsResizeHandler);
        rocketLeagueSavedTeamsResizeHandler = null;
    }

    if (rocketLeagueSavedTeamsPanel) {
        rocketLeagueSavedTeamsPanel.remove();
        rocketLeagueSavedTeamsPanel = null;
    }

    rocketLeagueSavedTeamsSelection = [];
    rocketLeagueSavedTeamsPage = 0;
}

function getRocketLeagueSavedTeamRowsPerColumn() {
    const teamsModal = document.querySelector(".app-modal.rocket-league-teams-modal");

    if (!teamsModal) {
        return ROCKET_LEAGUE_SAVED_TEAM_MIN_ROWS_PER_COLUMN;
    }

    const modalRect = teamsModal.getBoundingClientRect();
    const estimatedPanelChrome = 10 + 10 + 8 + 26 + 8 + 32;
    const availableListHeight = Math.max(0, modalRect.height - estimatedPanelChrome);
    const rowPitch = ROCKET_LEAGUE_SAVED_TEAM_BUTTON_HEIGHT + ROCKET_LEAGUE_SAVED_TEAM_BUTTON_GAP;

    return Math.max(
        ROCKET_LEAGUE_SAVED_TEAM_MIN_ROWS_PER_COLUMN,
        Math.floor((availableListHeight + ROCKET_LEAGUE_SAVED_TEAM_BUTTON_GAP) / rowPitch)
    );
}

function renderRocketLeagueSavedTeamsPanel(baseState, preservedSelectedNames = rocketLeagueSavedTeamsSelection, pageIndex = rocketLeagueSavedTeamsPage) {
    closeRocketLeagueSavedTeamsPanel();
    const savedTeams = Array.isArray(baseState.savedTeams) ? baseState.savedTeams.slice() : [];

    const sortedTeams = savedTeams
        .filter((team) => team && team.name)
        .sort((first, second) => String(first.name || "").localeCompare(String(second.name || "")));

    const panel = document.createElement("aside");
    panel.className = "rocket-league-saved-teams-panel";
    panel.setAttribute("aria-label", "Saved Rocket League teams");
    rocketLeagueSavedTeamsPanel = panel;
    rocketLeagueSavedTeamsSelection = preservedSelectedNames.slice(0, 2);

    function deleteSelectedTeams(selectedNames) {
        const stateApi = getRocketLeagueStateApi();
        const currentState = stateApi ? stateApi.loadState() : baseState;
        const selectedSet = new Set(selectedNames.map(normalizeRocketLeagueSavedTeamName));
        const nextState = cloneRocketLeagueModalState(currentState || baseState);

        nextState.savedTeams = (Array.isArray(nextState.savedTeams) ? nextState.savedTeams : [])
            .filter((team) => !selectedSet.has(normalizeRocketLeagueSavedTeamName(team && team.name)));
        baseState.savedTeams = nextState.savedTeams;
        saveRocketLeagueNativeState(nextState);
        renderRocketLeagueSavedTeamsPanel(baseState);
    }

    function showDeleteConfirmation(selectedNames) {
        const existingConfirm = panel.querySelector("[data-rocket-league-delete-confirm]");

        if (existingConfirm) {
            existingConfirm.remove();
        }

        const confirmation = document.createElement("div");
        confirmation.className = "rocket-league-saved-team-confirm";
        confirmation.dataset.rocketLeagueDeleteConfirm = "true";
        confirmation.innerHTML = `
            <div>${selectedNames.length > 1 ? "Delete selected saved teams?" : "Delete selected saved team?"}</div>
            <div class="rocket-league-saved-team-confirm-actions">
                <button type="button" class="action-button" data-rocket-league-delete-cancel>Cancel</button>
                <button type="button" class="action-button danger" data-rocket-league-delete-confirm-button>Delete</button>
            </div>
        `;
        panel.appendChild(confirmation);
        confirmation.querySelector("[data-rocket-league-delete-cancel]").addEventListener("click", () => confirmation.remove());
        confirmation.querySelector("[data-rocket-league-delete-confirm-button]").addEventListener("click", () => {
            confirmation.remove();
            deleteSelectedTeams(selectedNames);
        });
    }

    if (!sortedTeams.length) {
        panel.innerHTML = `
            <div class="rocket-league-saved-teams-empty">No saved teams yet.</div>
            <div class="rocket-league-saved-teams-pager" aria-hidden="true"></div>
            <div class="rocket-league-saved-teams-footer">
                <button type="button" class="action-button rocket-league-saved-teams-footer-button" data-rocket-league-load-cancel>Close</button>
            </div>
        `;
        document.body.appendChild(panel);
        panel.querySelector("[data-rocket-league-load-cancel]").addEventListener("click", closeRocketLeagueSavedTeamsPanel);
        positionRocketLeagueSavedTeamsPanel();
        return;
    }

    const rowsPerColumn = getRocketLeagueSavedTeamRowsPerColumn();
    const pageCapacity = rowsPerColumn * ROCKET_LEAGUE_SAVED_TEAM_COLUMN_COUNT;
    const pageCount = Math.max(1, Math.ceil(sortedTeams.length / pageCapacity));
    rocketLeagueSavedTeamsPage = Math.min(Math.max(0, pageIndex), pageCount - 1);
    const pageTeams = sortedTeams.slice(
        rocketLeagueSavedTeamsPage * pageCapacity,
        (rocketLeagueSavedTeamsPage + 1) * pageCapacity
    );
    const teamColumns = Array.from({ length: ROCKET_LEAGUE_SAVED_TEAM_COLUMN_COUNT }, (_, columnIndex) => {
        const columnTeams = pageTeams.slice(columnIndex * rowsPerColumn, (columnIndex + 1) * rowsPerColumn);
        return `
            <div class="rocket-league-saved-team-column">
                ${columnTeams.map((team) => {
                    const teamIndex = sortedTeams.indexOf(team);
                    const nameLengthClass = team.name.length <= 4
                        ? " is-tiny-name"
                        : (team.name.length <= 6 ? " is-short-name" : (team.name.length >= 20 ? " is-extra-long-name" : (team.name.length >= 14 ? " is-long-name" : " is-medium-name")));
                    return `
                        <button type="button" class="rocket-league-saved-team-button${nameLengthClass}" data-rocket-league-saved-team-index="${teamIndex}" data-rocket-league-saved-team-name="${escapeHtml(team.name)}">
                            <span class="rocket-league-saved-team-logo" aria-hidden="true"></span>
                            <span class="rocket-league-saved-team-name">${escapeHtml(team.name.toUpperCase())}</span>
                        </button>
                    `;
                }).join("")}
            </div>
        `;
    }).join("");

    panel.innerHTML = `
        <div class="rocket-league-saved-teams-list">
            <span class="rocket-league-saved-teams-divider is-first" aria-hidden="true"></span>
            <span class="rocket-league-saved-teams-divider is-second" aria-hidden="true"></span>
            ${teamColumns}
        </div>
        <div class="rocket-league-saved-teams-pager" aria-label="Saved teams pages">
            ${rocketLeagueSavedTeamsPage > 0 ? `<button type="button" class="rocket-league-saved-teams-page-button" data-rocket-league-page-prev aria-label="Previous saved teams page">&lt;</button>` : `<span></span>`}
            ${rocketLeagueSavedTeamsPage < pageCount - 1 ? `<button type="button" class="rocket-league-saved-teams-page-button" data-rocket-league-page-next aria-label="Next saved teams page">&gt;</button>` : `<span></span>`}
        </div>
        <div class="rocket-league-saved-teams-footer">
            <button type="button" class="action-button rocket-league-saved-teams-footer-button" data-rocket-league-load-cancel>Close</button>
            <button type="button" class="action-button danger rocket-league-saved-teams-footer-button" data-rocket-league-delete-selected disabled>Delete</button>
            <button type="button" class="action-button primary rocket-league-saved-teams-footer-button" data-rocket-league-load-apply disabled>Load Selected</button>
        </div>
    `;

    const availableNames = new Map(sortedTeams.map((team) => [normalizeRocketLeagueSavedTeamName(team.name), team.name]));
    const selectedNames = preservedSelectedNames
        .map((name) => availableNames.get(normalizeRocketLeagueSavedTeamName(name)))
        .filter(Boolean)
        .slice(0, 2);
    const applyButton = panel.querySelector("[data-rocket-league-load-apply]");
    const deleteButton = panel.querySelector("[data-rocket-league-delete-selected]");

    function syncSelectionState() {
        const isFull = selectedNames.length >= 2;

        panel.querySelectorAll("[data-rocket-league-saved-team-index]").forEach((button) => {
            const name = sortedTeams[Number(button.dataset.rocketLeagueSavedTeamIndex)].name;
            const isSelected = selectedNames.includes(name);
            button.classList.toggle("is-selected", isSelected);
            button.classList.toggle("is-disabled", isFull && !isSelected);
            button.disabled = isFull && !isSelected;
        });
        rocketLeagueSavedTeamsSelection = selectedNames.slice();
        applyButton.disabled = selectedNames.length !== 2;
        deleteButton.disabled = selectedNames.length === 0;
    }

    panel.querySelectorAll("[data-rocket-league-saved-team-index]").forEach((button) => {
        const team = sortedTeams[Number(button.dataset.rocketLeagueSavedTeamIndex)];

        const logo = button.querySelector(".rocket-league-saved-team-logo");

        if (team && team.logoPath && logo) {
            logo.style.backgroundImage = `url("${team.logoPath.replace(/"/g, '\\"')}")`;
        }

        button.addEventListener("click", () => {
            const name = team.name;
            const selectedIndex = selectedNames.indexOf(name);

            if (selectedIndex >= 0) {
                selectedNames.splice(selectedIndex, 1);
            } else if (selectedNames.length < 2) {
                selectedNames.push(name);
            }

            syncSelectionState();
        });
    });

    panel.querySelector("[data-rocket-league-load-cancel]").addEventListener("click", closeRocketLeagueSavedTeamsPanel);
    const previousPageButton = panel.querySelector("[data-rocket-league-page-prev]");
    const nextPageButton = panel.querySelector("[data-rocket-league-page-next]");

    if (previousPageButton) {
        previousPageButton.addEventListener("click", () => renderRocketLeagueSavedTeamsPanel(baseState, selectedNames, rocketLeagueSavedTeamsPage - 1));
    }

    if (nextPageButton) {
        nextPageButton.addEventListener("click", () => renderRocketLeagueSavedTeamsPanel(baseState, selectedNames, rocketLeagueSavedTeamsPage + 1));
    }

    deleteButton.addEventListener("click", () => {
        if (selectedNames.length) {
            showDeleteConfirmation(selectedNames.slice());
        }
    });
    applyButton.addEventListener("click", () => {
        if (selectedNames.length !== 2) {
            return;
        }

        const firstTeam = sortedTeams.find((team) => team.name === selectedNames[0]);
        const secondTeam = sortedTeams.find((team) => team.name === selectedNames[1]);

        baseState.teams = baseState.teams || {};
        baseState.teams.blue = applyRocketLeagueSavedTeamToSlot(firstTeam, "blue", baseState.teams.blue);
        baseState.teams.orange = applyRocketLeagueSavedTeamToSlot(secondTeam, "orange", baseState.teams.orange);
        closeRocketLeagueSavedTeamsPanel();
        showRocketLeagueTeamsModal(baseState);
    });

    document.body.appendChild(panel);
    syncSelectionState();
    positionRocketLeagueSavedTeamsPanel();
    rocketLeagueSavedTeamsResizeHandler = () => renderRocketLeagueSavedTeamsPanel(baseState, rocketLeagueSavedTeamsSelection, rocketLeagueSavedTeamsPage);
    window.addEventListener("resize", rocketLeagueSavedTeamsResizeHandler);
}

function updateRocketLeagueLogoPreview(side, logoPath) {
    const preview = document.querySelector(`[data-rocket-league-logo-preview="${side}"]`);

    if (!preview) {
        return;
    }

    preview.textContent = logoPath ? "" : "Logo";
    preview.style.backgroundImage = logoPath ? `url("${logoPath}")` : "";
}

function bindRocketLeagueLogoInput(side) {
    const fileInput = document.querySelector(`[data-rocket-league-team="${side}"][data-rocket-league-field="logoFile"]`);
    const logoPathInput = document.querySelector(`[data-rocket-league-team="${side}"][data-rocket-league-field="logoPath"]`);

    if (!fileInput || !logoPathInput) {
        return;
    }

    fileInput.addEventListener("change", () => {
        const file = fileInput.files && fileInput.files[0];

        if (!file) {
            return;
        }

        const reader = new FileReader();
        reader.addEventListener("load", () => {
            logoPathInput.value = typeof reader.result === "string" ? reader.result : "";
            updateRocketLeagueLogoPreview(side, logoPathInput.value);
            if (fileInput.parentElement && fileInput.parentElement.firstChild) {
                fileInput.parentElement.firstChild.nodeValue = "Change Logo";
            }
        });
        reader.readAsDataURL(file);
    });
}

function bindRocketLeagueColorControls(side) {
    const colorInput = document.querySelector(`[data-rocket-league-team="${side}"][data-rocket-league-field="accentColor"]`);
    const hexInput = document.querySelector(`[data-rocket-league-team="${side}"][data-rocket-league-field="accentHex"]`);

    if (!colorInput || !hexInput) {
        return;
    }

    colorInput.addEventListener("input", () => {
        hexInput.value = colorInput.value;
    });
    hexInput.addEventListener("input", () => {
        if (/^#[0-9a-fA-F]{6}$/.test(hexInput.value)) {
            colorInput.value = hexInput.value;
        }
    });
}

function bindRocketLeagueRosterSwapControls() {
    let armedButton = null;

    document.querySelectorAll("[data-rocket-league-player-swap]").forEach((button) => {
        button.addEventListener("click", () => {
            const side = button.dataset.rocketLeagueTeam;
            const fieldName = button.dataset.rocketLeaguePlayerSwap;
            const input = document.querySelector(`[data-rocket-league-team="${side}"][data-rocket-league-field="${fieldName}"]`);

            if (!input || !input.value.trim()) {
                return;
            }

            if (armedButton === button) {
                button.classList.remove("is-armed");
                armedButton = null;
                return;
            }

            if (!armedButton || armedButton.dataset.rocketLeagueTeam !== side) {
                if (armedButton) {
                    armedButton.classList.remove("is-armed");
                }
                armedButton = button;
                armedButton.classList.add("is-armed");
                return;
            }

            const armedFieldName = armedButton.dataset.rocketLeaguePlayerSwap;
            const armedInput = document.querySelector(`[data-rocket-league-team="${side}"][data-rocket-league-field="${armedFieldName}"]`);

            if (armedInput && input !== armedInput) {
                const nextValue = input.value;
                input.value = armedInput.value;
                armedInput.value = nextValue;
            }

            armedButton.classList.remove("is-armed");
            armedButton = null;
        });
    });
}

function renderRocketLeagueTeamModalFields(state, side) {
    const team = state.teams && state.teams[side] ? state.teams[side] : {};
    const players = Array.isArray(team.players) ? team.players : [];
    const subs = Array.isArray(team.subs) ? team.subs : [];
    const accentColor = team.accentColor || (side === "blue" ? "#2f80ff" : "#ff8a24");
    const title = side === "blue" ? "Blue" : "Orange";
    const renderPlayerRow = (fieldName, placeholder, value) => `
        <div class="rocket-league-modal-player-row">
            <input class="rocket-league-modal-input" type="text" maxlength="${ROCKET_LEAGUE_PLAYER_NAME_MAX_LENGTH}" placeholder="${placeholder}" value="${escapeHtml(String(value || "").slice(0, ROCKET_LEAGUE_PLAYER_NAME_MAX_LENGTH))}" data-rocket-league-team="${side}" data-rocket-league-field="${fieldName}">
            <button type="button" class="rocket-league-modal-swap-button" aria-label="Arm ${placeholder} swap" data-rocket-league-player-swap="${fieldName}" data-rocket-league-team="${side}">&#x1F500;</button>
        </div>
    `;

    return `
        <section class="rocket-league-modal-team is-${side}">
            <input class="rocket-league-modal-input" type="text" maxlength="18" placeholder="${title} Team" value="${escapeHtml(team.name || "")}" data-rocket-league-team="${side}" data-rocket-league-field="name">
            <div class="rocket-league-modal-roster-group">
                ${[1, 2, 3].map((slot, index) => renderPlayerRow(`player${slot}`, `Player ${slot}`, players[index] && players[index].name ? players[index].name : "")).join("")}
            </div>
            <div class="rocket-league-modal-sub-group">
                ${[1, 2].map((slot, index) => renderPlayerRow(`sub${slot}`, `Sub ${slot}`, subs[index] && subs[index].name ? subs[index].name : "")).join("")}
            </div>
            <div class="rocket-league-modal-logo-row">
                <div class="rocket-league-modal-logo-preview" data-rocket-league-logo-preview="${side}">Logo</div>
                <label class="rocket-league-modal-logo-button">
                    ${team.logoPath ? "Change Logo" : "Choose Logo"}
                    <input class="rocket-league-modal-file-input" type="file" accept="image/*" data-rocket-league-team="${side}" data-rocket-league-field="logoFile">
                </label>
            </div>
            <input type="hidden" value="${escapeHtml(team.logoPath || "")}" data-rocket-league-team="${side}" data-rocket-league-field="logoPath">
            <div class="rocket-league-modal-color-row">
                <input class="rocket-league-modal-input" type="color" value="${escapeHtml(accentColor)}" data-rocket-league-team="${side}" data-rocket-league-field="accentColor" aria-label="${title} team color">
                <input class="rocket-league-modal-input" type="text" maxlength="7" value="${escapeHtml(accentColor)}" data-rocket-league-team="${side}" data-rocket-league-field="accentHex" aria-label="${title} color hex">
            </div>
        </section>
    `;
}

function showRocketLeagueTeamsModal(state) {
    const baseState = cloneRocketLeagueModalState(state);

    showRocketLeagueModal({
        title: "",
        modalClass: "rocket-league-setup-modal rocket-league-teams-modal",
        onCancel: closeRocketLeagueModal,
        renderBody: (container) => {
            closeRocketLeagueSavedTeamsPanel();
            container.innerHTML = `
                <div class="rocket-league-modal-team-grid">
                    ${renderRocketLeagueTeamModalFields(baseState, "blue")}
                    ${renderRocketLeagueTeamModalFields(baseState, "orange")}
                </div>
                <div class="rocket-league-teams-modal-footer">
                    <div class="rocket-league-teams-management-actions">
                        <div class="rocket-league-teams-action-stack">
                            <button type="button" class="action-button" data-rocket-league-teams-clear>Clear</button>
                            <button type="button" class="action-button" data-rocket-league-teams-swap>Swap</button>
                        </div>
                        <div class="rocket-league-teams-action-stack">
                            <button type="button" class="action-button" data-rocket-league-teams-load>Load</button>
                            <button type="button" class="action-button" data-rocket-league-teams-save>Save</button>
                        </div>
                    </div>
                    <div class="rocket-league-teams-modal-actions">
                        <button type="button" class="action-button danger" data-rocket-league-teams-cancel>Cancel</button>
                        <button type="button" class="action-button primary" data-rocket-league-teams-apply>Apply</button>
                    </div>
                </div>
            `;
            ["blue", "orange"].forEach((side) => {
                updateRocketLeagueLogoPreview(side, getRocketLeagueTeamModalValue(side, "logoPath"));
                bindRocketLeagueLogoInput(side);
                bindRocketLeagueColorControls(side);
            });
            bindRocketLeagueRosterSwapControls();
            container.querySelector("[data-rocket-league-teams-swap]").addEventListener("click", () => {
                const swappedState = swapRocketLeagueTeamsInState(baseState);
                baseState.teams = swappedState.teams;
                sendRocketLeaguePanelState(swappedState);
                showRocketLeagueTeamsModal(swappedState);
            });
            container.querySelector("[data-rocket-league-teams-clear]").addEventListener("click", () => {
                const clearedState = clearRocketLeagueTeamsState(baseState);
                baseState.teams = clearedState.teams;
                showRocketLeagueTeamsModal(baseState);
            });
            container.querySelector("[data-rocket-league-teams-save]").addEventListener("click", () => {
                saveRocketLeagueTeamsToLibrary(baseState);
                if (rocketLeagueSavedTeamsPanel) {
                    renderRocketLeagueSavedTeamsPanel(baseState, rocketLeagueSavedTeamsSelection, rocketLeagueSavedTeamsPage);
                }
            });
            container.querySelector("[data-rocket-league-teams-load]").addEventListener("click", () => {
                const currentState = getRocketLeagueStateApi() ? getRocketLeagueStateApi().loadState() : baseState;
                baseState.savedTeams = currentState.savedTeams || baseState.savedTeams || [];
                renderRocketLeagueSavedTeamsPanel(baseState);
            });
            container.querySelector("[data-rocket-league-teams-cancel]").addEventListener("click", closeRocketLeagueModal);
            container.querySelector("[data-rocket-league-teams-apply]").addEventListener("click", () => {
                sendRocketLeaguePanelState(collectRocketLeagueTeamsState(baseState));
                closeRocketLeagueModal();
            });
        },
        actions: []
    });
}

function showRocketLeagueMatchSetupModal(state) {
    const baseState = cloneRocketLeagueModalState(state);
    const match = baseState.match || {};
    const tournamentName = match.tournamentName || match.eventTitle || "";
    const seriesInfo = match.seriesInfo || match.matchTitle || "";

    showRocketLeagueModal({
        title: "",
        modalClass: "rocket-league-setup-modal rocket-league-match-modal",
        onCancel: closeRocketLeagueModal,
        renderBody: (container) => {
            container.innerHTML = `
                <div class="rocket-league-match-modal-layout">
                    <div class="rocket-league-match-field-stack">
                        <input class="rocket-league-modal-input" id="rocketLeagueMatchTournamentName" type="text" maxlength="80" placeholder="Event Name" value="${escapeHtml(tournamentName)}">
                        <input class="rocket-league-modal-input" id="rocketLeagueMatchSeriesInfo" type="text" maxlength="80" placeholder="Division / Season / Etc" value="${escapeHtml(seriesInfo)}">
                        <input class="rocket-league-modal-input" id="rocketLeagueMatchWeekRound" type="text" maxlength="80" placeholder="Week / Round" value="${escapeHtml(match.weekRound || "")}">
                    </div>
                    <div class="rocket-league-match-modal-footer">
                        <div class="rocket-league-modal-series-row">
                            <strong>Series Length</strong>
                            <select class="rocket-league-modal-select" id="rocketLeagueMatchBestOf">
                                ${[1, 2, 3, 5, 7].map((bestOf) => `<option value="${bestOf}" ${Number(match.bestOf) === bestOf ? "selected" : ""}>Bo${bestOf}</option>`).join("")}
                            </select>
                        </div>
                        <div class="rocket-league-match-modal-actions">
                            <button type="button" class="action-button danger" data-rocket-league-match-cancel>Cancel</button>
                            <button type="button" class="action-button" data-rocket-league-match-teams>Teams &rarr;</button>
                            <button type="button" class="action-button primary" data-rocket-league-match-apply>Apply</button>
                        </div>
                    </div>
                </div>
            `;
            container.querySelector("[data-rocket-league-match-cancel]").addEventListener("click", closeRocketLeagueModal);
            container.querySelector("[data-rocket-league-match-teams]").addEventListener("click", () => {
                    const matchState = collectRocketLeagueMatchState(baseState);
                    sendRocketLeaguePanelState(matchState);
                    showRocketLeagueTeamsModal(matchState);
            });
            container.querySelector("[data-rocket-league-match-apply]").addEventListener("click", () => {
                sendRocketLeaguePanelState(collectRocketLeagueMatchState(baseState));
                closeRocketLeagueModal();
            });
        }
    });
}

function unmount() {
    closeRocketLeagueSavedTeamsPanel();

    if (unsubscribeRocketLeagueNativePanel) {
        unsubscribeRocketLeagueNativePanel();
        unsubscribeRocketLeagueNativePanel = null;
    }

    if (rocketLeagueNativePanel) {
        rocketLeagueNativePanel.replaceChildren();
    }

    rocketLeagueNativePanel = null;
    rocketLeagueNativeState = null;
}

async function mount(hostElement, options = {}) {
    panelOptions = options || {};
    await ensureRocketLeagueNativeStyles();
    renderRocketLeagueNativePanel(hostElement);
}

window.ZBroadcastRocketLeaguePanel = {
    mount,
    unmount,
    openMatchSetup: showRocketLeagueMatchSetupModal,
    openTeams: showRocketLeagueTeamsModal,
    applyState: sendRocketLeaguePanelState,
    swapTeamsInState: swapRocketLeagueTeamsInState
};
}());
