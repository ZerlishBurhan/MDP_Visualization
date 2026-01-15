const grid = document.getElementById("grid");
const gammaVal = document.getElementById("gammaVal");
const thetaVal = document.getElementById("thetaVal");
const algo = document.getElementById("algo");
const cellMode = document.getElementById("cellMode");
const algoDescription = document.getElementById("algoDescription");

let gamma = 0.9;
let theta = 0.001;
let history = [];
let stepIndex = 0;
let goalStates = {};
let dangerStates = {};
let obstacles = [];
let currentPolicy = {};
let chart = null;

const ARROWS = {
  UP: "&uarr;",
  DOWN: "&darr;",
  LEFT: "&larr;",
  RIGHT: "&rarr;",
};

function updateUI() {
  gammaVal.innerText = gamma.toFixed(2);
  thetaVal.innerText = theta.toFixed(4);
  updateAlgoDescription();
}

function updateAlgoDescription() {
  if (algo.value === "value") {
    algoDescription.innerHTML = `
      <b>Value Iteration:</b> Repeatedly updates each state's value 
      until it converges. It uses Bellman Optimality to estimate the 
      long-term reward from every state and action.`;
  } else {
    algoDescription.innerHTML = `
      <b>Policy Iteration:</b> Alternates between policy evaluation 
      (estimating the value of a policy) and policy improvement 
      (updating to a better policy) until stable.`;
  }
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
  if (v < -5) return "low";
  if (v < 2) return "mid";
  return "high";
}

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
          ${currentPolicy[key]
            ? `<div class="arrow">${ARROWS[currentPolicy[key]]}</div>`
            : ""}
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
      drawGrid(history[0]);
      animateConvergence(history);
    })
    .catch((err) => console.error("API Error:", err));
}

function animateConvergence(history) {
  const diffs = [];
  for (let i = 1; i < history.length; i++) {
    let diff = 0;
    const keys = Object.keys(history[i]);
    keys.forEach((k) => {
      diff += Math.abs(history[i][k] - history[i - 1][k]);
    });
    diffs.push(diff);
  }

  const ctx = document.getElementById("convergenceChart").getContext("2d");
  if (chart) chart.destroy();

  chart = new Chart(ctx, {
    type: "line",
    data: {
      labels: diffs.map((_, i) => `Iter ${i + 1}`),
      datasets: [{
        label: "Value Convergence (Δ)",
        data: diffs,
        fill: false,
        borderColor: "#38bdf8",
        tension: 0.3,
        pointRadius: 4,
      }]
    },
    options: {
      responsive: true,
      animation: {
        duration: 1200,
        easing: "easeOutQuart"
      },
      scales: {
        y: { beginAtZero: true, title: { display: true, text: "Δ Value Change" } },
        x: { title: { display: true, text: "Iteration Steps" } }
      }
    }
  });
}

function stepMDP() {
  if (stepIndex < history.length) {
    drawGrid(history[stepIndex]);
    stepIndex++;
  }
}

function resetGrid() {
  goalStates = {};
  dangerStates = {};
  obstacles = [];
  history = [];
  stepIndex = 0;
  drawGrid();
  if (chart) chart.destroy();
}

updateUI();
drawGrid();
