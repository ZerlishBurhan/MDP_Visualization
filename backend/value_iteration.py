def value_iteration(mdp, gamma, theta):
    V = {s: 0 for s in mdp.states}
    history = []

    while True:
        delta = 0
        new_V = V.copy()

        for s in mdp.states:
            if mdp.grid.is_terminal(s):
                new_V[s] = mdp.get_reward(s)
                continue

            best = float("-inf")
            for a in mdp.actions:
                val = sum(
                    p * (mdp.get_reward(ns) + gamma * V[ns])
                    for ns, p in mdp.get_transition_states_and_probs(s, a)
                )
                best = max(best, val)

            new_V[s] = best
            delta = max(delta, abs(V[s] - best))

        V = new_V
        history.append(V.copy())
        if delta < theta:
            break

    return V, history
