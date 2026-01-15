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
let comparisonChart = null;

// ARROW SYMBOLS
const ARROWS = {
  UP: "&uarr;",
  DOWN: "&darr;",
  LEFT: "&larr;",
  RIGHT: "&rarr;",
};

// ================ BASIC UI UPDATE ===================
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

// ================ GRID DRAW FUNCTION ===================
function drawGrid(values = {}, policy = {}) {
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
          ${
            policy[key]
              ? `<div class="arrow">${ARROWS[policy[key]]}</div>`
              : ""
          }
        `;
      }

      cell.onclick = () => cellClick(key);
      grid.appendChild(cell);
    }
  }
}

// ================ COLOR SCALE ===================
function heat(v) {
  if (v < -5) return "low";
  if (v < 2) return "mid";
  return "high";
}

// ================ CELL CLICK LOGIC ===================
function cellClick(key) {
  const mode = cellMode.value;
  if (mode === "goal") {
    goalStates[key] = 10;
    delete dangerStates[key];
    obstacles = obstacles.filter((o) => o !== key);
  } else if (mode === "danger") {
    dangerStates[key] = -10;
    delete goalStates[key];
    obstacles = obstacles.filter((o) => o !== key);
  } else if (mode === "obstacle") {
    if (!obstacles.includes(key)) obstacles.push(key);
    delete goalStates[key];
    delete dangerStates[key];
  }
  drawGrid();
}

// ================ RUN MDP ===================
function runMDP() {
  fetch("/api/run", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      rows: 4,
      cols: 4,
      gamma,
      theta,
      algorithm: algo.value,
      goal_states: goalStates,
      danger_states: dangerStates,
      obstacles: obstacles.map((o) => o.split(",").map(Number)),
    }),
  })
    .then((res) => res.json())
    .then((data) => {
      history = data.history;
      currentPolicy = data.policy || {};
      stepIndex = 0;

      drawGrid(history[0], {});
      animateConvergence(history, algo.value);
      drawComparisonChart();
    })
    .catch((err) => console.error("Error:", err));
}

// ================ NEXT STEP ===================
function stepMDP() {
  if (stepIndex < history.length) {
    drawGrid(history[stepIndex], {});
    stepIndex++;
  } else {
    drawGrid(history[history.length - 1], currentPolicy); // show final optimal policy
  }
}

// ================ RESET GRID ===================
function resetGrid() {
  goalStates = {};
  dangerStates = {};
  obstacles = [];
  history = [];
  stepIndex = 0;
  drawGrid();
}

// ================ ANIMATE CONVERGENCE GRAPH ===================
function animateConvergence(history, algoName) {
  const diffs = [];
  for (let i = 1; i < history.length; i++) {
    let diff = 0;
    const keys = Object.keys(history[i]);
    keys.forEach((k) => {
      diff += Math.abs(history[i][k] - history[i - 1][k]);
    });
    diffs.push(diff.toFixed(5));
  }

  const ctx = document.getElementById("convergenceChart").getContext("2d");
  if (chart) chart.destroy();

  const gradient = ctx.createLinearGradient(0, 0, 0, 400);
  gradient.addColorStop(0, "#22d3ee");
  gradient.addColorStop(0.5, "#3b82f6");
  gradient.addColorStop(1, "#22c55e");

  chart = new Chart(ctx, {
    type: "line",
    data: {
      labels: diffs.map((_, i) => `Iter ${i + 1}`),
      datasets: [
        {
          label: `${algoName.toUpperCase()} Convergence (Δ)`,
          data: diffs,
          fill: true,
          borderColor: gradient,
          backgroundColor: "rgba(59, 130, 246, 0.08)",
          borderWidth: 3,
          tension: 0.4,
          pointRadius: 4,
          pointBackgroundColor: "#38bdf8",
        },
      ],
    },
    options: {
      responsive: true,
      animation: { duration: 1200 },
      plugins: {
        legend: { labels: { color: "#cbd5e1" } },
        tooltip: {
          backgroundColor: "#1e293b",
          borderColor: "#38bdf8",
          borderWidth: 1,
          displayColors: false,
          callbacks: {
            label: (context) => `Δ = ${context.formattedValue}`,
          },
        },
      },
      scales: {
        x: { ticks: { color: "#cbd5e1" }, grid: { color: "#1e293b" } },
        y: { ticks: { color: "#cbd5e1" }, grid: { color: "#1e293b" } },
      },
    },
  });
}

// ================ ALGORITHM COMPARISON ===================
async function drawComparisonChart() {
  const algorithms = ["value", "policy"];
  const results = {};

  for (let algoType of algorithms) {
    const response = await fetch("/api/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rows: 4,
        cols: 4,
        gamma,
        theta,
        algorithm: algoType,
        goal_states: goalStates,
        danger_states: dangerStates,
        obstacles: obstacles.map((o) => o.split(",").map(Number)),
      }),
    });
    const data = await response.json();
    const diffs = [];
    for (let i = 1; i < data.history.length; i++) {
      let diff = 0;
      const keys = Object.keys(data.history[i]);
      keys.forEach((k) => {
        diff += Math.abs(data.history[i][k] - data.history[i - 1][k]);
      });
      diffs.push(diff.toFixed(5));
    }
    results[algoType] = diffs;
  }

  const ctx2 = document.getElementById("comparisonChart").getContext("2d");
  if (comparisonChart) comparisonChart.destroy();

  comparisonChart = new Chart(ctx2, {
    type: "line",
    data: {
      labels: results["value"].map((_, i) => `Iter ${i + 1}`),
      datasets: [
        {
          label: "Value Iteration Δ",
          data: results["value"],
          borderColor: "#3b82f6",
          tension: 0.4,
          borderWidth: 3,
        },
        {
          label: "Policy Iteration Δ",
          data: results["policy"],
          borderColor: "#22c55e",
          tension: 0.4,
          borderWidth: 3,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { labels: { color: "#cbd5e1" } },
      },
      scales: {
        x: { ticks: { color: "#cbd5e1" }, grid: { color: "#1e293b" } },
        y: { ticks: { color: "#cbd5e1" }, grid: { color: "#1e293b" } },
      },
    },
  });
}

// ================ STARTUP ===================
updateUI();
drawGrid();

document.querySelectorAll(".legend-item").forEach((item) => {
  item.addEventListener("mouseenter", () => highlightCells(item.dataset.type));
  item.addEventListener("mouseleave", clearHighlights);
});

function highlightCells(type) {
  document.querySelectorAll(".cell").forEach((cell) => {
    cell.classList.remove("highlight");

    if (
      (type === "goal" && cell.classList.contains("goal")) ||
      (type === "danger" && cell.classList.contains("danger")) ||
      (type === "obstacle" && cell.classList.contains("obstacle")) ||
      (type === "value" &&
        (cell.classList.contains("low") ||
          cell.classList.contains("mid") ||
          cell.classList.contains("high")))
    ) {
      cell.classList.add("highlight");
    }
  });
}

function clearHighlights() {
  document
    .querySelectorAll(".cell")
    .forEach((cell) => cell.classList.remove("highlight"));
}
