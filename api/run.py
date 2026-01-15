import json
import sys
import os

BASE_DIR = os.path.dirname(os.path.dirname(__file__))
sys.path.append(BASE_DIR)

from backend.mdp import MDP
from backend.value_iteration import value_iteration
from backend.policy_iteration import policy_iteration

# Vercel Lambda style handler
def handler(event, context):
    try:
        # Health check (GET)
        if event.get("method", "GET") == "GET":
            return {
                "statusCode": 200,
                "headers": {"Content-Type": "application/json"},
                "body": json.dumps({"status": "API running. Use POST."})
            }

        # Read POST data
        body = event.get("body")
        if isinstance(body, str):
            data = json.loads(body)
        else:
            data = body or {}

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

        # Algorithm run
        if algorithm == "policy":
            V, policy, history = policy_iteration(mdp, gamma, theta)
        else:
            V, history = value_iteration(mdp, gamma, theta)
            policy = {}

        # Output data
        history_out = [{f"{s[0]},{s[1]}": h[s] for s in h} for h in history]
        policy_out = {f"{s[0]},{s[1]}": policy[s] for s in policy}

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
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({"error": str(e)})
        }
