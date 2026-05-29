"""
An AI player for Othello. 
"""

import random
import sys
import time
from typing import Tuple, List, Callable

# You can use the functions in othello_shared to write your AI
from othello_shared import find_lines, get_possible_moves, get_score, play_move

cached_states = {}


def eprint(*args, **kwargs):  # you can use this for debugging, as it will print to sterr and not stdout
    print(*args, file=sys.stderr, **kwargs)


# Method to compute utility value of terminal state
def compute_utility(board: Tuple[Tuple[int]], color: int) -> int:
    """
    utility: the number of hectares a company own minus the number of hectares their competitor owns

    computes the utility of a terminal state for the specified company (identified with its color)
    """
    p1_score, p2_score = get_score(board)
    return (p1_score - p2_score) * (1 if color == 1 else -1)


# Better heuristic value of board
def compute_heuristic(board, color):  # not implemented, optional
    # IMPLEMENT
    return 0  # change this!


############ MINIMAX ###############################
def minimax_min_node(board: Tuple[Tuple[int]], color: int, limit: int, caching: int = 0) -> Tuple[Tuple[int, int], int]:
    """
    computes the utility assuming it is the opponents turn to claim land

    returns the chosen move along with the utility it ascertains
    """
    player = color
    other_player = 2 if player == 1 else 1
    possible_actions: List[Tuple[int, int]] = get_possible_moves(board, player)

    temp_heur = compute_utility

    if limit == 0:
        return (0, 0), temp_heur(board, player)

    if len(possible_actions) == 0:  # there are no possible moves to be made, therefore we are in a terminal state
        return (0, 0), compute_utility(board, player)  # TODO is returning (0, 0) ok
    # otherwise we have at least one action

    # can save mem by not using list
    max_player_min_utility_choice: Tuple[Tuple[int, int], int] = None
    first_iteration = True
    for action in possible_actions:
        i, j = action
        resulting_board = play_move(board, player, i, j)

        state = (resulting_board, player)
        if state in cached_states:
            max_player_pos_and_utility = (0, 0), cached_states[state]
        else:
            max_player_pos_and_utility: Tuple[Tuple[int, int], int] = minimax_max_node(resulting_board, player,
                                                                                       limit - 1)  # TODO limit
            cached_states[state] = max_player_pos_and_utility[1]

        if first_iteration:
            max_player_min_utility_choice = max_player_pos_and_utility
            first_iteration = False
        else:
            assert (max_player_pos_and_utility is not None)
            move, utility = max_player_pos_and_utility
            if utility < max_player_min_utility_choice[1]:
                max_player_min_utility_choice = max_player_pos_and_utility

    return max_player_min_utility_choice


def minimax_max_node(board, color, limit, caching=0) -> Tuple[Tuple[int, int], int]:
    """
    computes the utility assuming it is your turn to claim land, that is return the highest possible utility
    """
    player = color
    other_player = 2 if player == 1 else 1
    possible_actions: List[Tuple[int, int]] = get_possible_moves(board, player)

    temp_heur = compute_utility

    if limit == 0:
        return (0, 0), temp_heur(board, player)

    if len(possible_actions) == 0:  # there are no possible moves to be made, therefore we are in a terminal state
        return (0, 0), compute_utility(board, player)  # TODO is returning (0, 0) ok
    # otherwise we have at least one action

    # can save mem by not using list
    min_player_max_utility_choice: Tuple[Tuple[int, int], int] = None
    first_iteration = True
    for action in possible_actions:
        i, j = action
        resulting_board = play_move(board, player, i, j)

        state = (resulting_board, player)

        if state in cached_states:
            min_player_pos_and_utility = (0, 0), cached_states[state]
        else:
            min_player_pos_and_utility: Tuple[Tuple[int, int], int] = minimax_min_node(resulting_board, other_player,
                                                                                       limit - 1)
            cached_states[state] = min_player_pos_and_utility[1]

        if first_iteration:
            min_player_max_utility_choice = min_player_pos_and_utility
            first_iteration = False
        else:
            assert (min_player_pos_and_utility is not None)
            move, utility = min_player_pos_and_utility
            if utility < min_player_max_utility_choice[1]:
                min_player_max_utility_choice = min_player_pos_and_utility

    return min_player_max_utility_choice


def select_move_minimax(board: Tuple[Tuple[int]], color: int, limit: int, caching=0) -> Tuple[int, int]:
    """
    Given a board and a player color, decide on a move. 
    The return value is a tuple of integers (i,j), where
    i is the column and j is the row on the board.

    my precondition: the board must not be in a terminal state

    Note that other parameters are accepted by this function:
    If limit is a positive integer, your code should enfoce a depth limit that is equal to the value of the parameter.
    Search only to nodes at a depth-limit equal to the limit.  If nodes at this level are non-terminal return a heuristic 
    value (see compute_utility)
    If caching is ON (i.e. 1), use state caching to reduce the number of state evaluations.
    If caching is OFF (i.e. 0), do NOT use state caching to reduce the number of state evaluations.    
    """
    player = color

    utility_function = minimax_min_node if player == 1 else minimax_max_node  # (U)
    update_condition = (lambda x, y: x > y) if player == 1 else (lambda x, y: x < y)  # (A)

    best_action = None
    best_utility = None

    possible_actions: List[Tuple[int, int]] = get_possible_moves(board, player)
    assert (len(possible_actions) != 0)
    first_iteration = True

    for action in possible_actions:
        i, j = action
        resulting_board = play_move(board, player, i, j)

        _, utility = utility_function(resulting_board, color, limit, caching)  # see (U)

        if first_iteration:
            best_action = action
            best_utility = utility
            first_iteration = False
        else:
            assert (best_utility is not None and best_utility is not None)
            if update_condition(utility, best_utility):  # see (A)
                best_action = action
                best_utility = utility

    return best_action


############ ALPHA-BETA PRUNING #####################

def sort_possible_actions_by_heuristic(board: Tuple[Tuple[int]], possible_actions: List[Tuple[int, int]],
                                       heur: Callable, player: int):
    if player == 1:  # then we are max player, we want to sort by lowest to biggets, sorted's default behavior
        reverse = False
    else:
        reverse = True  # min player, sort by smallest first to bring down lower bound fast.

    heur_of_resulting_board = lambda move_tup: heur(play_move(board, player, move_tup[0], move_tup[1]), player)

    return sorted(possible_actions, key=heur_of_resulting_board, reverse=reverse)


def alphabeta_min_node(board: Tuple[Tuple[int]], color: int, alpha: int, beta: int, limit: int, caching=0, ordering=0):
    max_player_best_utility_lower_bound = alpha
    min_player_best_utility_upper_bound = beta

    player = color
    other_player = 2 if player == 1 else 1
    possible_actions: List[Tuple[int, int]] = get_possible_moves(board, player)

    temp_heur = compute_utility

    if limit == 0:
        return (0, 0), temp_heur(board, player)

    if len(possible_actions) == 0:  # there are no possible moves to be made, therefore we are in a terminal state
        return (0, 0), compute_utility(board, player)  # TODO is returning (0, 0) ok
    # otherwise we have at least one action

    # sorte
    if ordering:
        possible_actions = sort_possible_actions_by_heuristic(board, possible_actions, temp_heur, player)

    # can save mem by not using list
    max_player_min_utility_choice: Tuple[Tuple[int, int], int] = None
    first_iteration = True
    for action in possible_actions:
        i, j = action
        resulting_board = play_move(board, player, i, j)

        state = (resulting_board, player)

        if state in cached_states:
            max_player_pos_and_utility = (0, 0), cached_states[state]
        else:
            max_player_pos_and_utility: Tuple[Tuple[int, int], int] = alphabeta_max_node(resulting_board, other_player,
                                                                                         max_player_best_utility_lower_bound,
                                                                                         min_player_best_utility_upper_bound,
                                                                                         limit - 1)
            cached_states[state] = max_player_pos_and_utility[1]

        if first_iteration:
            max_player_min_utility_choice = max_player_pos_and_utility
            first_iteration = False
        else:
            assert (max_player_pos_and_utility is not None)
            move, utility = max_player_pos_and_utility
            if utility < max_player_min_utility_choice[1]:
                max_player_min_utility_choice = max_player_pos_and_utility

        # at each iteration our the upper bound on our returned utility can only get smaller because we update at each
        # iteration by taking the min. Our parent is a max node, and if it's at least calculated one of it's children fully
        # then it has a lower bound on what it's going to return, if we find that our upper bound becomes lower than it's lower
        # bound, then we know that our eventual return value will always be below the parents lower bound, and so the moment
        # this occurs we should stop, and just return our current upper bound (which is lower than our parents lower bound)
        # note that this doesn't actually return the correct utility anymore, but just an upper bound on it, which is fine
        # because it will be ignored by the parent anways
        min_upper_bound = max_player_min_utility_choice[1]
        if min_upper_bound < max_player_best_utility_lower_bound:
            return max_player_min_utility_choice  # this is not the min utility choice anymore, just a upperbound.
        else:
            min_player_best_utility_upper_bound = min_upper_bound

    return max_player_min_utility_choice

    return ((0, 0), 0)  # change this!


def alphabeta_max_node(board, color, alpha, beta, limit, caching=0, ordering=0):
    """
    computes the utility assuming it is your turn to claim land, that is return the highest possible utility
    """

    max_player_best_utility_lower_bound = alpha
    min_player_best_utility_upper_bound = beta

    player = color
    other_player = 2 if player == 1 else 1

    possible_actions: List[Tuple[int, int]] = get_possible_moves(board, other_player)

    temp_heur = compute_utility

    if limit == 0:
        return (0, 0), temp_heur(board, player)

    if len(possible_actions) == 0:  # there are no possible moves to be made, therefore we are in a terminal state
        return (0, 0), compute_utility(board, player)  # TODO is returning (0, 0) ok
    # otherwise we have at least one action

    # sorte
    if ordering:
        possible_actions = sort_possible_actions_by_heuristic(board, possible_actions, temp_heur, player)

    # can save mem by not using list
    min_player_max_utility_choice: Tuple[Tuple[int, int], int] = None
    first_iteration = True
    for action in possible_actions:
        i, j = action
        resulting_board = play_move(board, player, i, j)

        state = (resulting_board, player, max_player_best_utility_lower_bound, min_player_best_utility_upper_bound)

        if state in cached_states:
            min_player_pos_and_utility = cached_states[state]
        else:
            min_player_pos_and_utility: Tuple[Tuple[int, int], int] = alphabeta_min_node(resulting_board, player,
                                                                                         max_player_best_utility_lower_bound,
                                                                                         min_player_best_utility_upper_bound,
                                                                                         limit - 1, caching, ordering)  # TODO limit
            cached_states[state] = min_player_pos_and_utility

        if first_iteration:
            min_player_max_utility_choice = min_player_pos_and_utility
            first_iteration = False
        else:
            assert (min_player_pos_and_utility is not None)
            move, utility = min_player_pos_and_utility
            if utility < min_player_max_utility_choice[1]:
                min_player_max_utility_choice = min_player_pos_and_utility

        # because max player takes the max, then we know that the result it will eventually return will be
        # a number larger than every utility created by the next min players choice eg) min_player_max_utility_choice[1]
        # therefore, if our parent (which is a min player) has choice that uses less utility, there is no point in
        # continuing the search of this nodes values, it is already too big think of our max player sandwhiched
        # between two min layers, and how it's value is lower bounded by a value bigger than something it's already
        # seen to have lower utility, this allows us to see that the parent wouldn't need to explore anything else

        #  m = 3 (min plr uprbd 3)
        # | | \
        # 3 8   M lbd = 8
        #    | |   \
        #    3 8

        if max_player_curr_lower_bound < min_player_best_utility_upper_bound:
            max_player_best_utility_lower_bound = max_player_curr_lower_bound

        max_player_curr_lower_bound = min_player_max_utility_choice[1]
        if max_player_curr_lower_bound > min_player_best_utility_upper_bound:
            # we don't actually care what this specifically returns because we're not going to be using this data, we're pruing here,
            # therefore we'll just return the lower bound that was greater than some min_utility of our parent
            return min_player_max_utility_choice  # this is not the max utility choice anymore, just a lowerbound.

    return min_player_max_utility_choice


def select_move_alphabeta(board, color, limit, caching=0, ordering=0):
    """
    precondition:
        - color is the max player

    Given a board and a player color, decide on a move. 
    The return value is a tuple of integers (i,j), where
    i is the column and j is the row on the board.  

    Note that other parameters are accepted by this function:
    If limit is a positive integer, your code should enforce a depth limit that is equal to the value of the parameter.
    Search only to nodes at a depth-limit equal to the limit.  If nodes at this level are non-terminal return a heuristic 
    value (see compute_utility)
    If caching is ON (i.e. 1), use state caching to reduce the number of state evaluations.
    If caching is OFF (i.e. 0), do NOT use state caching to reduce the number of state evaluations.    
    If ordering is ON (i.e. 1), use node ordering to expedite pruning and reduce the number of state evaluations. 
    If ordering is OFF (i.e. 0), do NOT use node ordering to expedite pruning and reduce the number of state evaluations. 
    """
    move, utility = alphabeta_max_node(board, color, limit, caching, ordering)
    return move


    # player = color

    # utility_function = alphabeta_min_node if player == 1 else alphabeta_max_node  # (U)
    # update_condition = (lambda x, y: x > y) if player == 1 else (lambda x, y: x < y)  # (A)

    # best_action = None
    # best_utility = None
    #
    # possible_actions: List[Tuple[int, int]] = get_possible_moves(board, player)
    # assert (len(possible_actions) != 0)
    # first_iteration = True
    #
    # max_player_best_utility_lower_bound = -float('inf')
    # min_player_best_utility_upper_bound = float('inf')
    #
    # for action in possible_actions:
    #     i, j = action
    #     resulting_board = play_move(board, player, i, j)
    #     _, utility = max(resulting_board, color, max_player_best_utility_lower_bound,
    #                                   min_player_best_utility_upper_bound, limit, caching, ordering)  # see (U)
    #
    #     if first_iteration:
    #         best_action = action
    #         best_utility = utility
    #         first_iteration = False
    #     else:
    #         assert (best_utility is not None and best_utility is not None)
    #         if update_condition(utility, best_utility):  # see (A)
    #             best_action = action
    #             best_utility = utility
    #
    # return best_action


####################################################
def run_ai():
    """
    This function establishes communication with the game manager.
    It first introduces itself and receives its color.
    Then it repeatedly receives the current score and current board state
    until the game is over.
    """
    print("Othello AI")  # First line is the name of this AI
    arguments = input().split(",")

    color = int(arguments[0])  # Player color: 1 for dark (goes first), 2 for light.
    limit = int(arguments[1])  # Depth limit
    minimax = int(arguments[2])  # Minimax or alpha beta
    caching = int(arguments[3])  # Caching
    ordering = int(arguments[4])  # Node-ordering (for alpha-beta only)

    if (minimax == 1):
        eprint("Running MINIMAX")
    else:
        eprint("Running ALPHA-BETA")

    if (caching == 1):
        eprint("State Caching is ON")
    else:
        eprint("State Caching is OFF")

    if (ordering == 1):
        eprint("Node Ordering is ON")
    else:
        eprint("Node Ordering is OFF")

    if (limit == -1):
        eprint("Depth Limit is OFF")
    else:
        eprint("Depth Limit is ", limit)

    if (minimax == 1 and ordering == 1): eprint("Node Ordering should have no impact on Minimax")

    while True:  # This is the main loop
        # Read in the current game status, for example:
        # "SCORE 2 2" or "FINAL 33 31" if the game is over.
        # The first number is the score for player 1 (dark), the second for player 2 (light)
        next_input = input()
        status, dark_score_s, light_score_s = next_input.strip().split()
        dark_score = int(dark_score_s)
        light_score = int(light_score_s)

        if status == "FINAL":  # Game is over.
            print
        else:
            board = eval(input())  # Read in the input and turn it into a Python
            # object. The format is a list of rows. The
            # squares in each row are represented by
            # 0 : empty square
            # 1 : dark disk (player 1)
            # 2 : light disk (player 2)

            # Select the move and send it to the manager
            if (minimax == 1):  # run this if the minimax flag is given
                movei, movej = select_move_minimax(board, color, limit, caching)
            else:  # else run alphabeta
                movei, movej = select_move_alphabeta(board, color, limit, caching, ordering)

            print("{} {}".format(movei, movej))


if __name__ == "__main__":
    run_ai()
