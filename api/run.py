import json
import sys
import os
from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

# Fix imports for Vercel - add backend to path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
if BASE_DIR not in sys.path:
    sys.path.append(BASE_DIR)

try:
    from backend.mdp import MDP
    from backend.value_iteration import value_iteration
    from backend.policy_iteration import policy_iteration
except ImportError as e:
    print(f"Import error: {e}", file=sys.stderr)

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({"status": "API running. Use POST."}).encode('utf-8'))

    def do_POST(self):
        try:
            # Read POST body
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length).decode('utf-8')
            data = json.loads(post_data)

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

            obstacles = [tuple(map(int, o)) for o in data.get("obstacles", [])]

            mdp = MDP(rows, cols, goal_states, danger_states, obstacles)

            if algorithm == "policy":
                V, policy, history = policy_iteration(mdp, gamma, theta)
            else:
                V, history = value_iteration(mdp, gamma, theta)
                policy = {}

            history_out = [
                {f"{s[0]},{s[1]}": h.get(s, 0) for s in mdp.states}
                for h in history
            ]

            policy_out = {
                f"{s[0]},{s[1]}": policy.get(s, "")
                for s in mdp.states if s in policy
            }

            response_data = {
                "history": history_out,
                "policy": policy_out
            }

            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(response_data).encode('utf-8'))

        except Exception as e:
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))

    def log_message(self, format, *args):
        return  # Suppress logs
