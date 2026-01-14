import json
from backend.mdp import MDP
from backend.value_iteration import value_iteration
from backend.policy_iteration import policy_iteration

def serialize(d):
    return {f"{k[0]},{k[1]}": v for k, v in d.items()}

def handler(request):
    try:
        raw_body = request.body or "{}"
        if isinstance(raw_body, bytes):
            raw_body = raw_body.decode("utf-8")
        data = json.loads(raw_body)

        goal = {tuple(map(int, k.split(","))): v for k, v in data["goal_states"].items()}
        danger = {tuple(map(int, k.split(","))): v for k, v in data["danger_states"].items()}
        obstacles = [tuple(o) for o in data["obstacles"]]

        mdp = MDP(
            data["rows"],
            data["cols"],
            goal,
            danger,
            obstacles
        )

        if data["algorithm"] == "value":
            V, history = value_iteration(mdp, data["gamma"], data["theta"])
            return {
                "statusCode": 200,
                "headers": {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*"
                },
                "body": json.dumps({
                    "history": [serialize(h) for h in history],
                    "policy": None
                })
            }

        V, policy, history = policy_iteration(mdp, data["gamma"], data["theta"])
        return {
            "statusCode": 200,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            },
            "body": json.dumps({
                "history": [serialize(h) for h in history],
                "policy": serialize(policy)
            })
        }

    except Exception as e:
        return {
            "statusCode": 500,
            "body": json.dumps({ "error": str(e) })
        }
