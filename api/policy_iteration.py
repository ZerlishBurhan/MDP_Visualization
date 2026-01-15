def policy_iteration(mdp, gamma, theta):
    policy = {s: mdp.actions[0] for s in mdp.states}
    V = {s: 0 for s in mdp.states}
    history = []

    while True:
        # Policy Evaluation
        while True:
            delta = 0
            for s in mdp.states:
                if mdp.grid.is_terminal(s):
                    continue
                a = policy[s]
                val = sum(
                    p * (mdp.get_reward(ns) + gamma * V[ns])
                    for ns, p in mdp.get_transition_states_and_probs(s, a)
                )
                delta = max(delta, abs(V[s] - val))
                V[s] = val
            if delta < theta:
                break

        # Policy Improvement
        stable = True
        for s in mdp.states:
            if mdp.grid.is_terminal(s):
                continue

            best_a = max(
                mdp.actions,
                key=lambda a: sum(
                    p * (mdp.get_reward(ns) + gamma * V[ns])
                    for ns, p in mdp.get_transition_states_and_probs(s, a)
                )
            )

            if best_a != policy[s]:
                policy[s] = best_a
                stable = False

        history.append(V.copy())
        if stable:
            break

    return V, policy, history
