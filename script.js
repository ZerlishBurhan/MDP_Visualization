const grid = document.getElementById("grid");
const gammaVal = document.getElementById("gammaVal");
const thetaVal = document.getElementById("thetaVal");
const algo = document.getElementById("algo");
const cellMode = document.getElementById("cellMode");
const loadingOverlay = document.getElementById("loadingOverlay");

const statAlgo = document.getElementById("statAlgo");
const statIter = document.getElementById("statIter");
const statConv = document.getElementById("statConv");
const statDelta = document.getElementById("statDelta");

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

function setLoading(active) {
  if (active) {
    loadingOverlay.classList.remove('hidden');
  } else {
    loadingOverlay.classList.add('hidden');
  }
}

function updateStats(historyData, algorithm) {
  statAlgo.innerText = algorithm === 'value' ? 'Value Iteration' : 'Policy Iteration';
  
  if (historyData && historyData.length > 0) {
    statIter.innerText = historyData.length;
    statConv.innerText = "Yes"; // If backend returned, it converged or hit max iter
    
    // Calculate Max Delta of last step if valid
    if (historyData.length > 1) {
      const last = historyData[historyData.length - 1];
      const prev = historyData[historyData.length - 2];
      let maxDelta = 0;
      // Last and prev are dictionaries with "r,c" keys
      // Wait, API returns "r,c" keys.
      for (let key in last) {
        let valLast = last[key] || 0;
        let valPrev = prev[key] || 0;
        maxDelta = Math.max(maxDelta, Math.abs(valLast - valPrev));
      }
      statDelta.innerText = maxDelta.toFixed(5);
    } else {
      statDelta.innerText = "N/A";
    }
  } else {
    statIter.innerText = "--";
    statConv.innerText = "--";
    statDelta.innerText = "--";
  }
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
  setLoading(true);
  
  // Artificial delay to show smooth loading state
  setTimeout(() => {
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
        updateStats(history, algo.value); // UPADTE STATS HERE
        animateConvergence(history, algo.value);
        drawComparisonChart().then(() => setLoading(false));
      })
      .catch((err) => {
        console.error("Error:", err);
        setLoading(false);
        alert("An error occurred. Check console for details.");
      });
  }, 500);
}

// ================ NEXT STEP ===================
function stepMDP() {
  if (history.length === 0) return;
  
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
  
  if (chart) {
    chart.data.labels = [];
    chart.data.datasets.forEach((dataset) => {
        dataset.data = [];
    });
    chart.update();
  }
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
  gradient.addColorStop(0, "#22d3ee"); /* Cyan */
  gradient.addColorStop(1, "#3b82f6"); /* Blue */

  Chart.defaults.color = '#94a3b8';
  Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.1)';

  chart = new Chart(ctx, {
    type: "line",
    data: {
      labels: diffs.map((_, i) => `Iter ${i + 1}`),
      datasets: [
        {
          label: `${algoName === 'value' ? 'Value' : 'Policy'} Iteration Convergence`,
          data: diffs,
          fill: true,
          borderColor: "#22d3ee",
          backgroundColor: "rgba(34, 211, 238, 0.1)",
          borderWidth: 2,
          tension: 0.4,
          pointBackgroundColor: "#0f172a",
          pointBorderColor: "#22d3ee",
          pointRadius: 4,
          pointHoverRadius: 6
        },
      ],
    },
    options: {
      responsive: true,
      animation: { duration: 1000, easing: 'easeOutQuart' },
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { font: { family: 'Inter', size: 12 } } },
        tooltip: {
          backgroundColor: "#1e293b",
          titleColor: "#f8fafc",
          bodyColor: "#cbd5e1",
          borderColor: "rgba(255,255,255,0.1)",
          borderWidth: 1,
          padding: 10,
          displayColors: false,
        },
      },
      scales: {
        x: { grid: { display: false } },
        y: { grid: { borderDash: [4, 4] } },
      },
    },
  });
}

// ================ ALGORITHM COMPARISON ===================
async function drawComparisonChart() {
  const algorithms = ["value", "policy"];
  const results = {};

  // Parallel fetch for speed
  await Promise.all(algorithms.map(async (algoType) => {
    try {
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
    } catch (e) {
        console.error(e);
        results[algoType] = [];
    }
  }));

  const ctx2 = document.getElementById("comparisonChart").getContext("2d");
  if (comparisonChart) comparisonChart.destroy();

  comparisonChart = new Chart(ctx2, {
    type: "line",
    data: {
      labels: results["value"].map((_, i) => `Iter ${i + 1}`),
      datasets: [
        {
          label: "Value Iteration",
          data: results["value"],
          borderColor: "#3b82f6", /* Blue */
          backgroundColor: "#3b82f6",
          tension: 0.4,
          borderWidth: 2,
          pointRadius: 0
        },
        {
          label: "Policy Iteration",
          data: results["policy"],
          borderColor: "#22c55e", /* Green */
          backgroundColor: "#22c55e",
          tension: 0.4,
          borderWidth: 2,
          pointRadius: 0
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { font: { family: 'Inter', size: 12 } } },
      },
      scales: {
        x: { grid: { display: false } },
        y: { grid: { borderDash: [4, 4] } },
      },
    },
  });
}

// ================ STARTUP ===================
updateUI();
drawGrid();

// Add keyboard navigation for legend items to meet accessibility
document.querySelectorAll(".legend-item").forEach((item) => {
  item.addEventListener("mouseenter", () => highlightCells(item.dataset.type));
  item.addEventListener("mouseleave", clearHighlights);
  
  // Focus support
  item.addEventListener("focus", () => highlightCells(item.dataset.type));
  item.addEventListener("blur", clearHighlights);
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
