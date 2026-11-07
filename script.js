
/* ==========================================
   FLOW STATE — FINAL JAVASCRIPT
========================================== */

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];

function refreshIcons() {
    if (window.lucide) {
        window.lucide.createIcons();
    }
}


/* ==========================================
   1. TIMER SETTINGS
========================================== */

const defaultDurations = {
    focus: 40,
    short: 5,
    long: 15
};

let durations = { ...defaultDurations };

try {
    const saved = JSON.parse(
        localStorage.getItem("flowStateDurationsV2")
    );

    if (saved) {
        for (const mode of Object.keys(durations)) {
            const value = Number(saved[mode]);

            if (Number.isInteger(value) && value >= 1) {
                durations[mode] = value;
            }
        }
    }
} catch (error) {
    console.warn("Could not load saved timer settings.");
}

const modeLabels = {
    focus: "Focus Session",
    short: "Short Break",
    long: "Long Break"
};

let currentMode = "focus";
let totalSeconds = durations.focus * 60;
let remainingSeconds = totalSeconds;

let timerRunning = false;
let endTime = null;
let timerInterval = null;

const circumference = 2 * Math.PI * 137;

const timerText = $("#timerText");
const progressRing = $("#progressRing");

// END ALARM
const endAlarm = $("#endAlarm");
const stopAlarmButton = $("#stopAlarmButton");

function playEndAlarm() {
    stopAlarmButton.hidden = false;
    endAlarm.currentTime = 0;

    endAlarm.play().catch(error => {
        console.error("Alarm playback failed:", error);
    });
}

function stopEndAlarm() {
    endAlarm.pause();
    endAlarm.currentTime = 0;
    stopAlarmButton.hidden = true;
}

stopAlarmButton.addEventListener("click", stopEndAlarm);
const durationInputs = {
    focus: $("#focusDuration"),
    short: $("#shortDuration"),
    long: $("#longDuration")
};

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;

    return (
        String(minutes).padStart(2, "0") +
        ":" +
        String(secs).padStart(2, "0")
    );
}

function paintTimer() {
    timerText.textContent = formatTime(remainingSeconds);

    const progress = totalSeconds > 0
        ? remainingSeconds / totalSeconds
        : 0;

    progressRing.style.strokeDasharray = circumference;
    progressRing.style.strokeDashoffset =
        circumference * (1 - progress);

    document.title ="Flow State";
        
}

function updateStartButton() {
    $("#startText").textContent =
        timerRunning ? "Pause" : "Start";

    $("#startIcon").setAttribute(
        "data-lucide",
        timerRunning ? "pause" : "play"
    );

    refreshIcons();
}

function stopTimer() {
    timerRunning = false;
    endTime = null;

    clearInterval(timerInterval);
    timerInterval = null;

    updateStartButton();
}

function tick() {
    if (!timerRunning || endTime === null) return;

    remainingSeconds = Math.max(
        0,
        Math.ceil((endTime - Date.now()) / 1000)
    );

    paintTimer();

    if (remainingSeconds === 0) {
        stopTimer();
        $("#sessionLabel").textContent = "Session complete";
        playEndAlarm();
    }
}

function startTimer() {
    if (timerRunning) {
        tick();
        stopTimer();
        return;
    }

    if (remainingSeconds <= 0) {
        stopEndAlarm();
        remainingSeconds = totalSeconds;
    }

    timerRunning = true;
    endTime = Date.now() + remainingSeconds * 1000;

    updateStartButton();

    timerInterval = setInterval(tick, 200);
}

function resetTimer() {
    stopEndAlarm();
    stopTimer();

    remainingSeconds = totalSeconds;

    $("#sessionLabel").textContent =
        modeLabels[currentMode];

    paintTimer();
}

function selectMode(mode) {
    if (!durations[mode]) return;

    stopEndAlarm();
    stopTimer();

    currentMode = mode;
    totalSeconds = durations[mode] * 60;
    remainingSeconds = totalSeconds;

    $$(".session-button").forEach(button => {
        button.classList.toggle(
            "active",
            button.dataset.mode === mode
        );
    });

    $("#sessionLabel").textContent = modeLabels[mode];

    paintTimer();
}

$("#startButton").addEventListener("click", startTimer);
$("#resetButton").addEventListener("click", resetTimer);

$$(".session-button").forEach(button => {
    button.addEventListener("click", () => {
        selectMode(button.dataset.mode);
    });
});


/* ==========================================
   2. CLICK-TO-EDIT TIMER
========================================== */

function beginTimeEdit() {
    if (timerRunning) return;

    const input = $("#timeEdit");

    input.value = formatTime(remainingSeconds);

    $("#timeDisplay").hidden = true;
    input.hidden = false;

    input.focus();
    input.select();
}

function finishTimeEdit(save) {
    const input = $("#timeEdit");

    if (input.hidden) return;

    if (save) {
        const raw = input.value.trim();
        let seconds = NaN;

        // Accept MM:SS
        if (/^\d{1,3}:\d{1,2}$/.test(raw)) {
            const [minutes, secs] = raw.split(":").map(Number);

            if (secs < 60) {
                seconds = minutes * 60 + secs;
            }
        }

        // Accept minutes alone, e.g. 45
        else if (/^\d{1,3}$/.test(raw)) {
            seconds = Number(raw) * 60;
        }

        if (
            Number.isFinite(seconds) &&
            seconds >= 60 &&
            seconds <= 180 * 60
        ) {
            stopTimer();

            totalSeconds = seconds;
            remainingSeconds = seconds;

            durations[currentMode] = Math.ceil(seconds / 60);

            localStorage.setItem(
                "flowStateDurationsV2",
                JSON.stringify(durations)
            );

            durationInputs[currentMode].value =
                durations[currentMode];

            $("#sessionLabel").textContent =
                modeLabels[currentMode];

            paintTimer();
        }
    }

    input.hidden = true;
    $("#timeDisplay").hidden = false;
}

$("#timeDisplay").addEventListener("click", beginTimeEdit);

$("#timeEdit").addEventListener("keydown", event => {
    if (event.key === "Enter") {
        finishTimeEdit(true);
    }

    if (event.key === "Escape") {
        finishTimeEdit(false);
    }
});

$("#timeEdit").addEventListener("blur", () => {
    finishTimeEdit(true);
});


/* ==========================================
   3. LIVE CLOCK
========================================== */

function updateClock() {
    $("#liveClock").textContent =
        new Intl.DateTimeFormat(undefined, {
            hour: "2-digit",
            minute: "2-digit"
        }).format(new Date());
}

updateClock();
setInterval(updateClock, 30000);


/* ==========================================
   4. FLOATING PANELS
========================================== */

const panels = {
    music: $("#musicPanel"),
    tasks: $("#tasksPanel"),
    custom: $("#customPanel")
};

function openPanel(name) {
    Object.entries(panels).forEach(([key, panel]) => {
        const shouldOpen = key === name;

        panel.classList.toggle("open", shouldOpen);
        panel.setAttribute("aria-hidden", String(!shouldOpen));
    });

    $("#panelBackdrop").classList.add("open");

    $$(".side-button").forEach(button => {
        button.classList.toggle(
            "active",
            button.dataset.open === name
        );
    });
}

function closePanels() {
    Object.values(panels).forEach(panel => {
        panel.classList.remove("open");
        panel.setAttribute("aria-hidden", "true");
    });

    $("#panelBackdrop").classList.remove("open");

    $$(".side-button").forEach(button => {
        button.classList.toggle(
            "active",
            button.dataset.open === "home"
        );
    });
}

$$(".side-button").forEach(button => {
    button.addEventListener("click", () => {
        const name = button.dataset.open;

        if (name === "home") {
            closePanels();
        } else {
            openPanel(name);
        }
    });
});

$("#musicButton").addEventListener("click", () => {
    openPanel("music");
});

$("#tasksButton").addEventListener("click", () => {
    openPanel("tasks");
});

$("#panelBackdrop").addEventListener("click", closePanels);

$$(".panel-close").forEach(button => {
    button.addEventListener("click", closePanels);
});

document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
        closePanels();
    }
});


/* ==========================================
   5. BACKGROUND THEMES
========================================== */

function setTheme(theme) {
    const button = $$(".theme-option").find(
        item => item.dataset.themeChoice === theme
    );

    if (!button) return;

    document.body.dataset.theme = theme;

    localStorage.setItem("flowStateTheme", theme);

    $$(".theme-option").forEach(item => {
        item.classList.toggle(
            "selected",
            item.dataset.themeChoice === theme
        );
    });
}

const savedTheme =
    localStorage.getItem("flowStateTheme") || "night-des";

setTheme(savedTheme);

$$(".theme-option").forEach(button => {
    button.addEventListener("click", () => {
        setTheme(button.dataset.themeChoice);
    });
});


/* ==========================================
   6. CUSTOM TIMER DURATIONS
========================================== */

Object.keys(durationInputs).forEach(mode => {
    durationInputs[mode].value = durations[mode];
});

$("#applySettingsButton").addEventListener("click", () => {
    const limits = {
        focus: 180,
        short: 60,
        long: 90
    };

    const updated = {};

    for (const mode of Object.keys(durationInputs)) {
        const value = Number(durationInputs[mode].value);

        if (
            !Number.isInteger(value) ||
            value < 1 ||
            value > limits[mode]
        ) {
            durationInputs[mode].focus();
            return;
        }

        updated[mode] = value;
    }

    durations = updated;

    localStorage.setItem(
        "flowStateDurationsV2",
        JSON.stringify(durations)
    );

    selectMode(currentMode);
});


/* ==========================================
   7. MUSIC PLAYER
========================================== */

const tracks = {
    rain: {
        name: "Rain",
        src: "rain.mp3"
    },

    classical: {
        name: "Classical",
        src: "classical.mp3"
    },

    "lofi-focus": {
        name: "Lofi Focus",
        src: "lofi focus.mp3"
    },

    "lofi-relaxing": {
        name: "Lofi Relaxing",
        src: "lofi-relaxing.mp3"
    }
};

const audio = $("#audioPlayer");

let selectedTrack = "rain";
let lastVolume = 0.65;

audio.volume = lastVolume;
audio.loop = true;

function updateMusicButton(playing) {
    $("#musicPlayButton").innerHTML = playing
        ? '<i data-lucide="pause"></i><span>Pause</span>'
        : '<i data-lucide="play"></i><span>Play</span>';

    refreshIcons();
}

function selectTrack(key) {
    if (!tracks[key]) return;

    selectedTrack = key;

    // Stop the previous song and load the new one.
    // It will NOT play until the user presses Play.
    audio.pause();
    audio.src = tracks[key].src;
    audio.load();

    $$(".station-card").forEach(button => {
        button.classList.toggle(
            "selected",
            button.dataset.track === key
        );
    });

    $("#nowPlaying").textContent =
        `${tracks[key].name} selected`;

    $("#musicCurrentLabel").textContent =
        tracks[key].name;

    updateMusicButton(false);
}

async function playSelectedTrack() {
    try {
        await audio.play();

        $("#nowPlaying").textContent =
            `Playing ${tracks[selectedTrack].name}`;

        updateMusicButton(true);

    } catch (error) {
        $("#nowPlaying").textContent =
            "Couldn't play file — check its filename";

        updateMusicButton(false);
        console.error("Music playback error:", error);
    }
}

function pauseMusic() {
    audio.pause();

    $("#nowPlaying").textContent =
        `${tracks[selectedTrack].name} selected`;

    updateMusicButton(false);
}

$$(".station-card").forEach(button => {
    button.addEventListener("click", () => {
        selectTrack(button.dataset.track);
    });
});

$("#musicPlayButton").addEventListener("click", () => {
    if (audio.paused) {
        playSelectedTrack();
    } else {
        pauseMusic();
    }
});

// Update button if playback ends or fails.
audio.addEventListener("pause", () => {
    updateMusicButton(false);
});

audio.addEventListener("play", () => {
    updateMusicButton(true);
});

audio.addEventListener("error", () => {
    $("#nowPlaying").textContent =
        "Audio file unavailable — check its path";

    updateMusicButton(false);
});

// Volume slider.

$("#volumeSlider").addEventListener("input", event => {
    const value = Number(event.target.value);

    audio.volume = value / 100;

    if (value > 0) {
        lastVolume = value / 100;
    }

    $("#volumeValue").textContent = `${value}%`;

    $("#muteButton").innerHTML = value === 0
        ? '<i data-lucide="volume-x"></i>'
        : '<i data-lucide="volume-2"></i>';

    refreshIcons();
});

// Mute / unmute.

$("#muteButton").addEventListener("click", () => {
    if (audio.volume > 0) {
        lastVolume = audio.volume;
        audio.volume = 0;
    } else {
        audio.volume = lastVolume || 0.65;
    }

    const value = Math.round(audio.volume * 100);

    $("#volumeSlider").value = value;
    $("#volumeValue").textContent = `${value}%`;

    $("#muteButton").innerHTML = value === 0
        ? '<i data-lucide="volume-x"></i>'
        : '<i data-lucide="volume-2"></i>';

    refreshIcons();
});

// Start with Rain selected, but do not autoplay.
selectTrack("rain");


/* ==========================================
   8. TASK MANAGER
========================================== */

let tasks = [];

try {
    const savedTasks = JSON.parse(
        localStorage.getItem("flowStateTasks") || "[]"
    );

    if (Array.isArray(savedTasks)) {
        tasks = savedTasks
            .filter(task => task && typeof task.title === "string")
            .map(task => ({
                id: String(task.id || Date.now() + Math.random()),
                title: task.title,
                priority: ["high", "medium", "low"].includes(task.priority)
                    ? task.priority
                    : "medium",
                due: typeof task.due === "string" ? task.due : "",
                notes: typeof task.notes === "string" ? task.notes : "",
                tags: Array.isArray(task.tags) ? task.tags : [],
                done: Boolean(task.done),
                created: Number(task.created) || Date.now()
            }));
    }
} catch (error) {
    console.warn("Could not load saved tasks.");
}

const taskList = $("#taskList");

function saveTasks() {
    localStorage.setItem(
        "flowStateTasks",
        JSON.stringify(tasks)
    );
}

function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

function renderTasks() {
    const completed = tasks.filter(task => task.done).length;

    const percentage = tasks.length
        ? Math.round((completed / tasks.length) * 100)
        : 0;

    $("#taskProgressText").textContent =
        `${percentage}% completed`;

    $("#taskCount").textContent =
        `${tasks.length} ${tasks.length === 1 ? "task" : "tasks"}`;

    $("#taskProgressBar").style.width = `${percentage}%`;

    $("#taskCurrentLabel").textContent =
        `${tasks.filter(task => !task.done).length} active`;

    const search = $("#taskSearch").value.trim().toLowerCase();
    const filter = $("#taskFilter").value;
    const sort = $("#taskSort").value;

    let visible = tasks.filter(task => {
        const searchable = [
            task.title,
            task.notes,
            ...task.tags
        ].join(" ").toLowerCase();

        const matchesSearch = searchable.includes(search);

        const matchesFilter =
            filter === "all" ||
            (filter === "active" && !task.done) ||
            (filter === "completed" && task.done);

        return matchesSearch && matchesFilter;
    });

    if (sort === "priority") {
        const rank = { high: 0, medium: 1, low: 2 };

        visible.sort((a, b) =>
            rank[a.priority] - rank[b.priority]
        );

    } else if (sort === "due") {
        visible.sort((a, b) =>
            (a.due || "9999").localeCompare(b.due || "9999")
        );

    } else {
        visible.sort((a, b) => b.created - a.created);
    }

    $("#visibleTaskCount").textContent =
        `${visible.length} items`;

    if (!visible.length) {
        taskList.innerHTML = `
            <div class="empty-tasks">
                <i data-lucide="clipboard-check"></i>
                <strong>Nothing to show</strong>
                <span>Add a task or change your filters.</span>
            </div>
        `;

        refreshIcons();
        return;
    }

    taskList.innerHTML = visible.map(task => {
        const tags = task.tags.map(tag =>
            `<span class="task-tag">${escapeHTML(tag)}</span>`
        ).join("");

        const due = task.due
            ? `<span class="due-tag">Due ${escapeHTML(task.due)}</span>`
            : "";

        const notes = task.notes
            ? `<div class="task-details">${escapeHTML(task.notes)}</div>`
            : "";

        return `
            <article class="task-item ${task.done ? "completed" : ""}"
                     data-id="${escapeHTML(task.id)}">

                <div class="task-item-main">

                    <input
                        class="task-check"
                        type="checkbox"
                        ${task.done ? "checked" : ""}
                        aria-label="Mark task complete"
                    >

                    <span class="task-item-title">
                        ${escapeHTML(task.title)}
                    </span>

                    <button
                        class="task-delete"
                        type="button"
                        aria-label="Delete task"
                    >
                        <i data-lucide="trash-2"></i>
                    </button>

                </div>

                <div class="task-meta">
                    <span class="priority-tag ${task.priority}">
                        ${escapeHTML(task.priority)} priority
                    </span>

                    ${due}
                    ${tags}
                </div>

                ${notes}

            </article>
        `;
    }).join("");

    refreshIcons();
}

// Add task.

$("#taskForm").addEventListener("submit", event => {
    event.preventDefault();

    const title = $("#taskInput").value.trim();

    if (!title) return;

    const id = window.crypto?.randomUUID
        ? crypto.randomUUID()
        : String(Date.now() + Math.random());

    tasks.push({
        id,
        title,
        priority: $("#taskPriority").value,
        due: $("#taskDue").value,
        notes: $("#taskNotes").value.trim(),

        tags: $("#taskTags").value
            .split(",")
            .map(tag => tag.trim())
            .filter(Boolean),

        done: false,
        created: Date.now()
    });

    saveTasks();
    renderTasks();

    event.target.reset();

    $("#taskPriority").value = "medium";
    $("#taskInput").focus();
});

// Complete task.

taskList.addEventListener("change", event => {
    if (!event.target.classList.contains("task-check")) return;

    const item = event.target.closest(".task-item");
    const task = tasks.find(task => task.id === item.dataset.id);

    if (task) {
        task.done = event.target.checked;

        saveTasks();
        renderTasks();
    }
});

// Delete task.

taskList.addEventListener("click", event => {
    const button = event.target.closest(".task-delete");

    if (!button) return;

    const item = button.closest(".task-item");

    tasks = tasks.filter(task => task.id !== item.dataset.id);

    saveTasks();
    renderTasks();
});

// Search, filter and sort.

$("#taskSearch").addEventListener("input", renderTasks);
$("#taskFilter").addEventListener("change", renderTasks);
$("#taskSort").addEventListener("change", renderTasks);

renderTasks();


/* ==========================================
   9. INITIALISE WEBSITE
========================================== */

paintTimer();

$("#sessionLabel").textContent = modeLabels[currentMode];

refreshIcons();
