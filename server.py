
import sys
import os
import json
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

# Add 'api' directory to Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'api'))

# Import backend logic
try:
    from mdp import MDP
    from value_iteration import value_iteration
    from policy_iteration import policy_iteration
except ImportError as e:
    print(f"Error importing modules: {e}")
    print("Ensure 'api' folder exists and contains mdp.py, value_iteration.py, policy_iteration.py")
    sys.exit(1)

app = Flask(__name__, static_folder='.')
CORS(app)

@app.route('/')
def serve_index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('.', path)

@app.route('/api/run', methods=['POST'])
def run_mdp():
    try:
        data = request.get_json()
        
        rows = data.get("rows", 4)
        cols = data.get("cols", 4)
        gamma = data.get("gamma", 0.9)
        theta = data.get("theta", 0.001)
        algorithm = data.get("algorithm", "value")

        # Parse states
        # Convert "r,c" keys to (r,c) tuples
        goal_states = {}
        if "goal_states" in data:
            for k, v in data["goal_states"].items():
                r, c = map(int, k.split(","))
                goal_states[(r, c)] = v
        
        danger_states = {}
        if "danger_states" in data:
            for k, v in data["danger_states"].items():
                r, c = map(int, k.split(","))
                danger_states[(r, c)] = v

        obstacles = []
        if "obstacles" in data:
            obstacles = [tuple(o) for o in data["obstacles"]]

        # Initialize MDP
        mdp = MDP(rows, cols, goal_states, danger_states, obstacles)

        # Run Algorithm
        policy = {}
        history = []
        
        if algorithm == "policy":
            V, policy, history = policy_iteration(mdp, gamma, theta)
        else:
            V, history = value_iteration(mdp, gamma, theta)
            # Value iteration doesn't return explicit policy in this implementation's return signature, 
            # but we can derive it if needed or the frontend handles value-only history.
            # checking api/run.py: policy = {} for value iteration.
            policy = {}

        # Format Response
        # History: list of dicts where keys are "r,c"
        history_out = [{f"{s[0]},{s[1]}": h.get(s, 0) for s in mdp.states} for h in history]
        
        # Policy: dict where keys are "r,c", value is action string
        policy_out = {f"{s[0]},{s[1]}": policy.get(s, "") for s in mdp.states}

        return jsonify({"history": history_out, "policy": policy_out})

    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    print("Starting MDP Visualization Server...")
    print("Open http://localhost:5000 in your browser")
    app.run(debug=True, port=5000)
