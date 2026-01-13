from flask import Flask, request, jsonify
from flask_cors import CORS
from mdp import MDP
from value_iteration import value_iteration
from policy_iteration import policy_iteration

app = Flask(__name__)
CORS(app)

def serialize(d):
    return {f"{k[0]},{k[1]}": v for k, v in d.items()}

@app.route("/", methods=["GET"])
def home():
    return "MDP Backend is running"

@app.route("/run", methods=["POST"])
def run():
    data = request.json

    goal = {tuple(map(int,k.split(","))):v for k,v in data["goal_states"].items()}
    danger = {tuple(map(int,k.split(","))):v for k,v in data["danger_states"].items()}
    obstacles = [tuple(o) for o in data["obstacles"]]

    mdp = MDP(data["rows"], data["cols"], goal, danger, obstacles)

    if data["algorithm"] == "value":
        V, history = value_iteration(mdp, data["gamma"], data["theta"])
        return jsonify({
            "history": [serialize(h) for h in history],
            "policy": None
        })

    V, policy, history = policy_iteration(mdp, data["gamma"], data["theta"])
    return jsonify({
        "history": [serialize(h) for h in history],
        "policy": serialize(policy)
    })

if __name__ == "__main__":
    app.run(debug=True)
