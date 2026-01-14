from http.server import BaseHTTPRequestHandler
import json

from backend.mdp import MDP
from backend.value_iteration import value_iteration
from backend.policy_iteration import policy_iteration


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            # ---- Read request body ----
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length)
            data = json.loads(body)

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

            # ---- Create MDP ----
            mdp = MDP(
                rows=rows,
                cols=cols,
                goal_states=goal_states,
                danger_states=danger_states,
                obstacles=obstacles,
            )

            # ---- Run Algorithm ----
            if algorithm == "policy":
                V, policy, history = policy_iteration(mdp, gamma, theta)
            else:
                V, history = value_iteration(mdp, gamma, theta)
                policy = {}

            # ---- Convert history for frontend ----
            history_out = []
            for h in history:
                history_out.append(
                    {f"{s[0]},{s[1]}": h[s] for s in h}
                )

            policy_out = {
                f"{s[0]},{s[1]}": policy[s]
                for s in policy
            }

            # ---- Response ----
            response = {
                "history": history_out,
                "policy": policy_out
            }

            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps(response).encode())

        except Exception as e:
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(
                json.dumps({"error": str(e)}).encode()
            )
