/* ================= GLOBAL STATE ================= */
const grid = document.getElementById("grid");
const gammaVal = document.getElementById("gammaVal");
const thetaVal = document.getElementById("thetaVal");
const algo = document.getElementById("algo");
const cellMode = document.getElementById("cellMode");

let gamma = 0.9;
let theta = 0.001;
let history = [];
let stepIndex = 0;
let goalStates = {};
let dangerStates = {};
let obstacles = [];
let currentPolicy = {};
let chart = null;
let isPlaying = false;

const ARROWS = {
    UP: "&uarr;",
    DOWN: "&darr;",
    LEFT: "&larr;",
    RIGHT: "&rarr;",
};

/* ================= CHART LOGIC ================= */
function initChart() {
    const ctx = document.getElementById('convergenceChart').getContext('2d');
    if (chart) chart.destroy();
    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Max Delta (Convergence)',
                data: [],
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.1)' } },
                x: { grid: { display: false } }
            },
            plugins: { legend: { labels: { color: '#f8fafc' } } }
        }
    });
}

/* ================= UI UPDATES ================= */
function updateUI() {
    gammaVal.innerText = gamma.toFixed(2);
    thetaVal.innerText = theta.toFixed(4);
}

function changeGamma(d) {
    gamma = Math.min(0.99, Math.max(0, gamma + d));
    updateUI();
}

function changeTheta(d) {
    theta = Math.min(0.1, Math.max(0.0001, theta + d));
    updateUI();
}

function heat(v) {
    if (v < -2) return "low";
    if (v < 5) return "mid";
    return "high";
}

/* ================= GRID DRAWING ================= */
function drawGrid(values = {}) {
    grid.innerHTML = "";
    for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
            const key = `${r},${c}`;
            const cell = document.createElement("div");
            cell.className = "cell";

            if (goalStates[key]) {
                cell.classList.add("goal");
                cell.innerHTML = "<div class='arrow'>&#9733;</div>";
            } else if (dangerStates[key]) {
                cell.classList.add("danger");
                cell.innerHTML = "<div class='arrow'>X</div>";
            } else if (obstacles.includes(key)) {
                cell.classList.add("obstacle");
            } else if (values[key] !== undefined) {
                cell.classList.add(heat(values[key]));
                cell.innerHTML = `
                    <div class="value">${values[key].toFixed(2)}</div>
                    ${currentPolicy[key] ? `<div class="arrow">${ARROWS[currentPolicy[key]]}</div>` : ""}
                `;
            }
            cell.onclick = () => cellClick(key);
            grid.appendChild(cell);
        }
    }
}

function cellClick(key) {
    const mode = cellMode.value;
    if (mode === "goal") {
        goalStates[key] = 10;
        delete dangerStates[key];
        obstacles = obstacles.filter(o => o !== key);
    } else if (mode === "danger") {
        dangerStates[key] = -10;
        delete goalStates[key];
        obstacles = obstacles.filter(o => o !== key);
    } else if (mode === "obstacle") {
        if (!obstacles.includes(key)) obstacles.push(key);
        delete goalStates[key];
        delete dangerStates[key];
    } else {
        delete goalStates[key];
        delete dangerStates[key];
        obstacles = obstacles.filter(o => o !== key);
    }
    drawGrid();
}

/* ================= MDP EXECUTION ================= */
async function runMDP() {
    if (Object.keys(goalStates).length === 0) {
        alert("Please set at least one Goal state first!");
        return;
    }

    initChart();
    const response = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            rows: 4, cols: 4, gamma, theta,
            algorithm: algo.value,
            goal_states: goalStates,
            danger_states: dangerStates,
            obstacles: obstacles.map(o => o.split(",").map(Number)),
        }),
    });

    const data = await response.json();
    history = data.history;
    currentPolicy = data.policy || {};
    stepIndex = 0;

    // Calculate convergence deltas for graph
    const deltas = [];
    for (let i = 1; i < history.length; i++) {
        let maxDelta = 0;
        for (let key in history[i]) {
            let diff = Math.abs(history[i][key] - (history[i-1][key] || 0));
            if (diff > maxDelta) maxDelta = diff;
        }
        deltas.push(maxDelta);
    }

    // Update Chart
    chart.data.labels = deltas.map((_, i) => `Step ${i+1}`);
    chart.data.datasets[0].data = deltas;
    chart.update();

    // Auto-play the visualization
    autoPlaySteps();
}

function autoPlaySteps() {
    if (stepIndex < history.length) {
        stepMDP();
        setTimeout(autoPlaySteps, 300); // 300ms delay between steps
    }
}

function stepMDP() {
    if (stepIndex < history.length) {
        drawGrid(history[stepIndex]);
        // Add subtle animation class to all cells with values
        document.querySelectorAll('.cell').forEach(el => {
            if (el.querySelector('.value')) {
                el.style.transform = "scale(1.05)";
                setTimeout(() => el.style.transform = "scale(1)", 200);
            }
        });
        stepIndex++;
    }
}

function resetGrid() {
    goalStates = {};
    dangerStates = {};
    obstacles = [];
    history = [];
    stepIndex = 0;
    currentPolicy = {};
    initChart();
    drawGrid();
}

/* ================= INITIALIZATION ================= */
updateUI();
initChart();
drawGrid();

// Legend Highlights
document.querySelectorAll(".legend-item").forEach((item) => {
    item.addEventListener("mouseenter", () => highlightCells(item.dataset.type));
    item.addEventListener("mouseleave", clearHighlights);
});

function highlightCells(type) {
    document.querySelectorAll(".cell").forEach((cell) => {
        if ((type === "goal" && cell.classList.contains("goal")) ||
            (type === "danger" && cell.classList.contains("danger")) ||
            (type === "obstacle" && cell.classList.contains("obstacle"))) {
            cell.style.boxShadow = "0 0 15px #facc15";
            cell.style.border = "2px solid #facc15";
        }
    });
}

function clearHighlights() {
    document.querySelectorAll(".cell").forEach((cell) => {
        cell.style.boxShadow = "";
        cell.style.border = "";
    });
}