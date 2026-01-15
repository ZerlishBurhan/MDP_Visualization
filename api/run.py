import json
import os
import sys
from flask import Flask, request, jsonify
from flask_cors import CORS

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(BASE_DIR)

from backend.mdp import MDP
from backend.value_iteration import value_iteration
from backend.policy_iteration import policy_iteration

app = Flask(__name__)
CORS(app) 

@app.route('/api/run', methods=['POST', 'GET'])
def run_mdp_api():
    if request.method == "GET":
        return jsonify({"status": "API is running"}), 200

    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400

        rows = data.get("rows", 4)
        cols = data.get("cols", 4)
        gamma = data.get("gamma", 0.9)
        theta = data.get("theta", 0.001)
        algorithm = data.get("algorithm", "value")

        # Convert keys from "0,0" strings to (0,0) tuples
        goal_states = {tuple(map(int, k.split(","))): v for k, v in data.get("goal_states", {}).items()}
        danger_states = {tuple(map(int, k.split(","))): v for k, v in data.get("danger_states", {}).items()}
        
        # Convert obstacles from [[0,1]] to [(0,1)]
        obstacles = [tuple(o) for o in data.get("obstacles", [])]

        mdp = MDP(rows, cols, goal_states, danger_states, obstacles)

        if algorithm == "policy":
            V, policy, history = policy_iteration(mdp, gamma, theta)
        else:
            V, history = value_iteration(mdp, gamma, theta)
            # Simple policy generation for value iteration
            policy = {}
            for s in mdp.states:
                if not mdp.grid.is_terminal(s):
                    best_a = max(mdp.actions, key=lambda a: sum(p * (mdp.get_reward(ns) + gamma * V[ns]) 
                                  for ns, p in mdp.get_transition_states_and_probs(s, a)))
                    policy[s] = best_a

        # Format output for JSON
        history_out = [{f"{s[0]},{s[1]}": h[s] for s in h} for h in history]
        policy_out = {f"{s[0]},{s[1]}": policy.get(s, "") for s in policy}

        return jsonify({
            "history": history_out,
            "policy": policy_out
        })

    except Exception as e:
        print(f"Error: {str(e)}")
        return jsonify({"error": str(e)}), 500

handler = app