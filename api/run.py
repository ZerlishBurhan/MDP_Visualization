import json
import os
import sys

# Path setup takay backend folder mil sakay
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.append(BASE_DIR)

from backend.mdp import MDP
from backend.value_iteration import value_iteration
from backend.policy_iteration import policy_iteration

# Vercel expects a function named 'handler' in serverless functions
def handler(request):
    # Method check (Vercel passes a Flask-like request object)
    if request.method == "GET":
        return {
            "statusCode": 200,
            "body": json.dumps({"status": "API is online"})
        }

    try:
        # Request body parse karna
        data = request.get_json()

        rows = data.get("rows", 4)
        cols = data.get("cols", 4)
        gamma = data.get("gamma", 0.9)
        theta = data.get("theta", 0.001)
        algorithm = data.get("algorithm", "value")

        # Frontend se "0,1" keys ko tuple (0, 1) mein convert karna
        goal_states = {tuple(map(int, k.split(","))): v for k, v in data.get("goal_states", {}).items()}
        danger_states = {tuple(map(int, k.split(","))): v for k, v in data.get("danger_states", {}).items()}
        obstacles = [tuple(o) for o in data.get("obstacles", [])]

        mdp = MDP(rows, cols, goal_states, danger_states, obstacles)

        if algorithm == "policy":
            V, policy, history = policy_iteration(mdp, gamma, theta)
        else:
            V, history = value_iteration(mdp, gamma, theta)
            # Value iteration ke liye policy generate karna (optional but helpful)
            policy = {s: max(mdp.actions, key=lambda a: sum(p * (mdp.get_reward(ns) + gamma * V[ns]) 
                      for ns, p in mdp.get_transition_states_and_probs(s, a))) 
                      for s in mdp.states if not mdp.grid.is_terminal(s)}

        # Response ko JSON serializable banana
        history_out = [{f"{s[0]},{s[1]}": h[s] for s in h} for h in history]
        policy_out = {f"{s[0]},{s[1]}": policy.get(s, "") for s in policy}

        return {
            "statusCode": 200,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({
                "history": history_out,
                "policy": policy_out
            })
        }

    except Exception as e:
        return {
            "statusCode": 500,
            "body": json.dumps({"error": str(e)})
        }