class GridWorld:
    def __init__(self, rows, cols, goal_states, danger_states, obstacles):
        self.rows = rows
        self.cols = cols
        self.goal_states = goal_states
        self.danger_states = danger_states
        self.obstacles = obstacles

        self.terminal_states = {}
        self.terminal_states.update(goal_states)
        self.terminal_states.update(danger_states)

    def in_bounds(self, state):
        r, c = state
        return 0 <= r < self.rows and 0 <= c < self.cols

    def is_terminal(self, state):
        return state in self.terminal_states

    def is_obstacle(self, state):
        return state in self.obstacles

    def get_all_states(self):
        return [
            (r, c)
            for r in range(self.rows)
            for c in range(self.cols)
            if (r, c) not in self.obstacles
        ]
