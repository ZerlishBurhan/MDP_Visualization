from gridworld import GridWorld
from config import *

class MDP:
    def __init__(self, rows, cols, goal_states, danger_states, obstacles):
        self.grid = GridWorld(rows, cols, goal_states, danger_states, obstacles)
        self.states = self.grid.get_all_states()
        self.actions = ACTIONS

    def get_next_state(self, state, action):
        r, c = state
        moves = {
            "UP": (r-1, c),
            "DOWN": (r+1, c),
            "LEFT": (r, c-1),
            "RIGHT": (r, c+1)
        }
        next_state = moves[action]
        if not self.grid.in_bounds(next_state) or self.grid.is_obstacle(next_state):
            return state
        return next_state

    def get_reward(self, state):
        if state in self.grid.terminal_states:
            return self.grid.terminal_states[state]
        return STEP_REWARD

    def get_transition_states_and_probs(self, state, action):
        transitions = []
        intended = self.get_next_state(state, action)
        transitions.append((intended, INTENDED_PROB))

        others = [a for a in ACTIONS if a != action]
        prob = RANDOM_PROB / len(others)

        for a in others:
            transitions.append((self.get_next_state(state, a), prob))

        return transitions
