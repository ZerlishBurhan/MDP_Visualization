import json
import sys
import os

# Fix imports for Vercel
BASE_DIR = os.path.dirname(os.path.dirname(__file__))
sys.path.append(BASE_DIR)

from backend.mdp import MDP
from backend.value_iteration import value_iteration
from backend.policy_iteration import policy_iteration


def handler(request, response):
    try:
        if request.method == "GET":
            return response.status(200).json({"status": "API running. Use POST."})

        # Read POST body safely
        data = request.get_json()

        rows = data.get("rows", 4)
        cols = data.get("cols", 4)
        gamma = data.get("gamma", 0.9)
        theta = data.get("theta", 0.001)
        algorithm = data.get("algorithm", "value")

        goal_states = {
            tuple(map(int, k.split(","))): v
            for k, v in data.get("goal_states", {}).items()
        }

        danger_states = {
            tuple(map(int, k.split(","))): v
            for k, v in data.get("danger_states", {}).items()
        }

        obstacles = [tuple(o) for o in data.get("obstacles", [])]

        mdp = MDP(rows, cols, goal_states, danger_states, obstacles)

        if algorithm == "policy":
            V, policy, history = policy_iteration(mdp, gamma, theta)
        else:
            V, history = value_iteration(mdp, gamma, theta)
            policy = {}

        history_out = [
            {f"{s[0]},{s[1]}": h[s] for s in h} for h in history
        ]

        policy_out = {f"{s[0]},{s[1]}": policy[s] for s in policy}

        return response.status(200).json({
            "history": history_out,
            "policy": policy_out
        })

    except Exception as e:
        return response.status(500).json({"error": str(e)})
