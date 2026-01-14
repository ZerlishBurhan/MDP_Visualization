let gamma = 0.9;
let theta = 0.001;

let history = [];
let stepIndex = 0;

let goalStates = {};
let dangerStates = {};
let obstacles = [];
let currentPolicy = {};

// USE HTML ENTITIES (ENCODING-SAFE)
const ARROWS = {
  UP: "&uarr;",
  DOWN: "&darr;",
  LEFT: "&larr;",
  RIGHT: "&rarr;",
};

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
          ${
            currentPolicy[key]
              ? `<div class="arrow">${ARROWS[currentPolicy[key]]}</div>`
              : ""
          }
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
}

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
