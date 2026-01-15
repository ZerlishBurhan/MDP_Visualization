import json
from http.server import BaseHTTPRequestHandler
import sys
import os

# Taake api folder ki baaki files import ho sakein
sys.path.append(os.path.dirname(__file__))

from mdp import MDP
from value_iteration import value_iteration
from policy_iteration import policy_iteration

class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        # Frontend requests ke liye CORS support
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_POST(self):
        try:
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data)

            rows = data.get("rows", 4)
            cols = data.get("cols", 4)
            gamma = data.get("gamma", 0.9)
            theta = data.get("theta", 0.001)
            algorithm = data.get("algorithm", "value")

            # Data parsing logic
            goal_states = {tuple(map(int, k.split(","))): v for k, v in data.get("goal_states", {}).items()}
            danger_states = {tuple(map(int, k.split(","))): v for k, v in data.get("danger_states", {}).items()}
            obstacles = [tuple(o) for o in data.get("obstacles", [])]

            mdp = MDP(rows, cols, goal_states, danger_states, obstacles)

            if algorithm == "policy":
                V, policy, history = policy_iteration(mdp, gamma, theta)
            else:
                V, history = value_iteration(mdp, gamma, theta)
                policy = {}

            # Response prepare karna
            history_out = [{f"{s[0]},{s[1]}": h.get(s, 0) for s in mdp.states} for h in history]
            policy_out = {f"{s[0]},{s[1]}": policy.get(s, "") for s in mdp.states}

            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            response = {"history": history_out, "policy": policy_out}
            self.wfile.write(json.dumps(response).encode('utf-8'))

        except Exception as e:
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))

    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({"status": "API is up"}).encode('utf-8'))