#!/usr/bin/env python3
# -*- coding: utf-8 -*
"""
Randy is an "AI" for Othello that randomly chooses a legal move. Play against
this AI to get familiar with the game. You can also have your AI compete
against your AI to test its performance. 

Thanks to original author Daniel Bauer, Columbia University
"""

import random
import sys
import time

# You can also use the functions in othello_shared to write your AI 
from othello_shared import find_lines, get_possible_moves

def select_move(board, color):
    """
    Given a board and a player color, decide on a move. 
    The return value is a tuple of integers (i,j), where
    i is the column and j is the row on the board.  
    """

    # We just get a list of all permitted moves in this state and 
    # select a random one!
    moves = get_possible_moves(board, color) # returns a list of (column, row) tuples.
    
    i,j = random.choice(moves)

    time.sleep(0.1) # Delay, so Randy doesn't look as simple as it really is.  
    return i,j 

def run_ai():
    """
    This function establishes communication with the game manager. 
    It first introduces itself and receives its color. 
    Then it repeatedly receives the current score and current board state
    until the game is over. 
    """
    print("Randy") # First line is the name of this AI  

    arguments = input().split(",")
    color = int(arguments[0]) # We read the color: 1 for dark (goes first), 2 for light. 
    
    #All of the arguments below have no impact on Randy but will impact your AI.
    limit = int(arguments[1]) #sets depth limit
    minimax = int(arguments[2]) #minimax or alpha beta?
    caching = int(arguments[3]) #caching or no?
    ordering = int(arguments[4]) #node-ordering (for alpha-beta) or no?
    
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
            movei, movej = select_move(board, color)
            print("{} {}".format(movei, movej)) 


if __name__ == "__main__":
    run_ai()
