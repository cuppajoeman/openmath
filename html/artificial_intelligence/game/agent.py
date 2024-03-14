"""
An AI player for Othello. 
"""

import random
import sys
import time
from typing import Tuple, List

# You can use the functions in othello_shared to write your AI
from othello_shared import find_lines, get_possible_moves, get_score, play_move

def eprint(*args, **kwargs): #you can use this for debugging, as it will print to sterr and not stdout
    print(*args, file=sys.stderr, **kwargs)
    
# Method to compute utility value of terminal state
def compute_utility(board : Tuple[Tuple[int]], color: int) -> int:
    """
    precondition: board is in a terminal state, no further moves can be made

    utility: the number of hectares a company own minus the number of hectares their competitor owns

    computes the utility of a terminal state for the specified company (identified with its color)
    """
    p1_score, p2_score = get_score(board)
    return (p1_score - p2_score) * (1 if color == 1 else -1)


# Better heuristic value of board
def compute_heuristic(board, color): #not implemented, optional
    #IMPLEMENT
    return 0 #change this!

############ MINIMAX ###############################
def minimax_min_node(board : Tuple[Tuple[int]], color: int, limit: int, caching: int = 0) -> Tuple[Tuple[int, int], int]:
    """
    computes the utility assuming it is the opponents turn to claim land

    returns the chosen move along with the utility it ascertains
    """
    player = color
    other_player = 2 if player == 1 else 1
    possible_actions: List[Tuple[int, int]] = get_possible_moves(board, player)

    if len(possible_actions) == 0: # there are no possible moves to be made, therefore we are in a terminal state
        return (0, 0), compute_utility(board, player) # TODO is returning (0, 0) ok
    # otherwise we have at least one action

    # can save mem by not using list
    max_player_min_utility_choice: Tuple[Tuple[int, int], int] = None
    first_iteration = True
    for action in possible_actions:
        i, j = action
        resulting_board = play_move(board, player, i, j)
        max_player_pos_and_utility: Tuple[Tuple[int, int], int] = minimax_max_node(resulting_board, other_player, limit) # TODO limit

        if first_iteration:
            max_player_min_utility_choice = max_player_pos_and_utility
            first_iteration = False
        else:
            assert(max_player_pos_and_utility is not None)
            move, utility = max_player_pos_and_utility
            if utility < max_player_min_utility_choice[1]:
                max_player_min_utility_choice = max_player_pos_and_utility

    return max_player_min_utility_choice

def minimax_max_node(board, color, limit, caching = 0) -> Tuple[Tuple[int, int], int]:
    """
    computes the utility assuming it is your turn to claim land, that is return the highest possible utility
    """
    player = color
    other_player = 2 if player == 1 else 1
    possible_actions: List[Tuple[int, int]] = get_possible_moves(board, player)

    if len(possible_actions) == 0: # there are no possible moves to be made, therefore we are in a terminal state
        return (0, 0), compute_utility(board, player) # TODO is returning (0, 0) ok
    # otherwise we have at least one action

    # can save mem by not using list
    min_player_max_utility_choice: Tuple[Tuple[int, int], int] = None
    first_iteration = True
    for action in possible_actions:
        i, j = action
        resulting_board = play_move(board, player, i, j)
        min_player_pos_and_utility: Tuple[Tuple[int, int], int] = minimax_min_node(resulting_board, other_player, limit) # TODO limit

        if first_iteration:
            min_player_max_utility_choice = min_player_pos_and_utility
            first_iteration = False
        else:
            assert(min_player_pos_and_utility is not None)
            move, utility = min_player_pos_and_utility
            if utility < min_player_max_utility_choice[1]:
                min_player_max_utility_choice = min_player_pos_and_utility

    return min_player_max_utility_choice

def select_move_minimax(board: Tuple[Tuple[int]], color: int, limit: int, caching = 0) -> Tuple[int, int]:
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

    utility_function = minimax_min_node if player == 1 else minimax_max_node # (U)
    update_condition = (lambda x, y: x > y) if player == 1 else (lambda x, y: x < y) # (A)

    best_action = None
    best_utility = None

    possible_actions: List[Tuple[int, int]] = get_possible_moves(board, player)
    assert(len(possible_actions) != 0)
    first_iteration = True

    for action in possible_actions:
        i, j = action
        resulting_board = play_move(board, player, i, j)
        _, utility = utility_function(resulting_board, color, limit, caching) # see (U)

        if first_iteration:
            best_action = action
            best_utility = utility
            first_iteration = False
        else:
            assert(best_utility is not None and best_utility is not None)
            if update_condition(utility, best_utility): # see (A)
                best_action = action
                best_utility = utility

    return best_action

############ ALPHA-BETA PRUNING #####################
def alphabeta_min_node(board, color, alpha, beta, limit, caching = 0, ordering = 0):
    #IMPLEMENT (and replace the line below)
    return ((0,0),0) #change this!

def alphabeta_max_node(board, color, alpha, beta, limit, caching = 0, ordering = 0):
    #IMPLEMENT (and replace the line below)
    return ((0,0),0) #change this!

def select_move_alphabeta(board, color, limit, caching = 0, ordering = 0):
    """
    Given a board and a player color, decide on a move. 
    The return value is a tuple of integers (i,j), where
    i is the column and j is the row on the board.  

    Note that other parameters are accepted by this function:
    If limit is a positive integer, your code should enfoce a depth limit that is equal to the value of the parameter.
    Search only to nodes at a depth-limit equal to the limit.  If nodes at this level are non-terminal return a heuristic 
    value (see compute_utility)
    If caching is ON (i.e. 1), use state caching to reduce the number of state evaluations.
    If caching is OFF (i.e. 0), do NOT use state caching to reduce the number of state evaluations.    
    If ordering is ON (i.e. 1), use node ordering to expedite pruning and reduce the number of state evaluations. 
    If ordering is OFF (i.e. 0), do NOT use node ordering to expedite pruning and reduce the number of state evaluations. 
    """
    #IMPLEMENT (and replace the line below)
    return (0,0) #change this!

####################################################
def run_ai():
    """
    This function establishes communication with the game manager.
    It first introduces itself and receives its color.
    Then it repeatedly receives the current score and current board state
    until the game is over.
    """
    print("Othello AI") # First line is the name of this AI
    arguments = input().split(",")
    
    color = int(arguments[0]) #Player color: 1 for dark (goes first), 2 for light. 
    limit = int(arguments[1]) #Depth limit
    minimax = int(arguments[2]) #Minimax or alpha beta
    caching = int(arguments[3]) #Caching 
    ordering = int(arguments[4]) #Node-ordering (for alpha-beta only)

    if (minimax == 1): eprint("Running MINIMAX")
    else: eprint("Running ALPHA-BETA")

    if (caching == 1): eprint("State Caching is ON")
    else: eprint("State Caching is OFF")

    if (ordering == 1): eprint("Node Ordering is ON")
    else: eprint("Node Ordering is OFF")

    if (limit == -1): eprint("Depth Limit is OFF")
    else: eprint("Depth Limit is ", limit)

    if (minimax == 1 and ordering == 1): eprint("Node Ordering should have no impact on Minimax")

    while True: # This is the main loop
        # Read in the current game status, for example:
        # "SCORE 2 2" or "FINAL 33 31" if the game is over.
        # The first number is the score for player 1 (dark), the second for player 2 (light)
        next_input = input()
        status, dark_score_s, light_score_s = next_input.strip().split()
        dark_score = int(dark_score_s)
        light_score = int(light_score_s)

        if status == "FINAL": # Game is over.
            print
        else:
            board = eval(input()) # Read in the input and turn it into a Python
                                  # object. The format is a list of rows. The
                                  # squares in each row are represented by
                                  # 0 : empty square
                                  # 1 : dark disk (player 1)
                                  # 2 : light disk (player 2)

            # Select the move and send it to the manager
            if (minimax == 1): #run this if the minimax flag is given
                movei, movej = select_move_minimax(board, color, limit, caching)
            else: #else run alphabeta
                movei, movej = select_move_alphabeta(board, color, limit, caching, ordering)
            
            print("{} {}".format(movei, movej))

if __name__ == "__main__":
    run_ai()
