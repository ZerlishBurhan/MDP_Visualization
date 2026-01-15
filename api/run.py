import json
import sys
from http.server import BaseHTTPRequestHandler

# Local imports (same folder)
from mdp import MDP
from value_iteration import value_iteration
from policy_iteration import policy_iteration

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({"status": "API running. Use POST."}).encode())

    def do_POST(self):
        try:
            content_length = int(self.headers['Content-Length'])
            data = json.loads(self.rfile.read(content_length))

            rows, cols = data.get("rows", 4), data.get("cols", 4)
            gamma, theta = data.get("gamma", 0.9), data.get("theta", 0.001)
            algorithm = data.get("algorithm", "value")

            goal_states = {tuple(map(int, k.split(","))): v for k, v in data.get("goal_states", {}).items()}
            danger_states = {tuple(map(int, k.split(","))): v for k, v in data.get("danger_states", {}).items()}
            obstacles = [tuple(map(int, o)) for o in data.get("obstacles", [])]

            mdp = MDP(rows, cols, goal_states, danger_states, obstacles)

            if algorithm == "policy":
                V, policy, history = policy_iteration(mdp, gamma, theta)
            else:
                V, history = value_iteration(mdp, gamma, theta)
                policy = {}

            # Flatten history/policy for frontend
            all_states = [(r, c) for r in range(rows) for c in range(cols) if (r, c) not in obstacles]
            history_out = [{f"{s[0]},{s[1]}": h.get(s, 0) for s in all_states} for h in history]
            policy_out = {f"{s[0]},{s[1]}": policy.get(s, "") for s in all_states}

            response = {"history": history_out, "policy": policy_out}

            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(response).encode())

        except Exception as e:
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode())

    def log_message(self, format, *args):
        return
