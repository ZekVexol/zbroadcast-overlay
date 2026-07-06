(function () {
    "use strict";

const ROCKET_LEAGUE_PLAYER_NAME_MAX_LENGTH = 24;
const STYLE_URL = "/modules/rocket-league/native-panel.css";

function ensureRocketLeagueNativeStyles() {
    const existingLink = document.querySelector('link[data-rocket-league-native-panel-style="true"]');

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
    link.dataset.rocketLeagueNativePanelStyle = "true";
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
    if (typeof panelOptions.closeModal === "function") {
        panelOptions.closeModal();
    }
}

function syncRocketLeagueFrameSize(size) {
    if (typeof panelOptions.syncFrameSize === "function") {
        panelOptions.syncFrameSize(size);
    }
}

let rocketLeagueNativePanel = null;
let rocketLeagueNativeState = null;
let unsubscribeRocketLeagueNativePanel = null;
let panelOptions = {};

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
            return `
                <div class="rocket-league-history-entry is-goal is-${escapeHtml(entry.teamSide || "neutral")}" style="--rocket-history-accent: ${escapeHtml(goalAccent)}; --rocket-history-contrast: ${escapeHtml(getReadableBorderColor(goalAccent))};">
                    <span>${escapeHtml(`${entry.teamName || entry.teamSide || "Team"} Goal`.toUpperCase())}</span>
                </div>
            `;
        }

        if (entry.type === "gameFinal") {
            const gameAccent = getSafeRocketLeagueEventColor(entry.eventColor, "#ffffff");
            return `
                <div class="rocket-league-history-entry is-game-final" style="--rocket-history-accent: ${escapeHtml(gameAccent)}; --rocket-history-contrast: ${escapeHtml(getReadableBorderColor(gameAccent))};">
                    <span>GAME ${entry.gameNumber} FINAL</span>
                    <strong>${escapeHtml(`${entry.winningTeamName || "Team"} Wins ${entry.blueScore}-${entry.orangeScore}`.toUpperCase())}</strong>
                </div>
            `;
        }

        if (entry.type === "seriesFinal") {
            const seriesAccent = getSafeRocketLeagueEventColor(entry.eventColor, "#ffffff");
            return `
                <div class="rocket-league-history-entry is-series-final" style="--rocket-history-accent: ${escapeHtml(seriesAccent)}; --rocket-history-contrast: ${escapeHtml(getReadableBorderColor(seriesAccent))};">
                    <span>SERIES FINAL</span>
                    <strong>${escapeHtml(`${entry.winningTeamName || "Team"} Wins ${entry.blueSeriesScore}-${entry.orangeSeriesScore}`.toUpperCase())}</strong>
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
            syncRocketLeagueFrameSize(card.getBoundingClientRect());
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
        <main class="rocket-league-panel rocket-league-native-panel">
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
        modalClass: "rocket-league-setup-modal",
        onCancel: closeRocketLeagueModal,
        renderBody: (container) => {
            container.innerHTML = `
                <div class="rocket-league-modal-team-grid">
                    ${renderRocketLeagueTeamModalFields(baseState, "blue")}
                    ${renderRocketLeagueTeamModalFields(baseState, "orange")}
                </div>
                <div class="rocket-league-teams-modal-footer">
                    <button type="button" class="action-button" data-rocket-league-teams-swap>Swap Teams</button>
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

window.ZBroadcastRocketLeagueNativePanel = {
    mount,
    unmount,
    openMatchSetup: showRocketLeagueMatchSetupModal,
    openTeams: showRocketLeagueTeamsModal,
    applyState: sendRocketLeaguePanelState,
    swapTeamsInState: swapRocketLeagueTeamsInState
};
}());
