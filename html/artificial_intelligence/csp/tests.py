import unittest
import sys
import itertools
import traceback

from cspbase import *
from puzzle_csp import *
from propagators import *
import propagators

BOARDS = [ [[3],[11,21,3,0],[12,22,2,1],[13,23,33,6,3],[31,32,5,0]],
[[4],[11,21,6,3],[12,13,3,0],[14,24,3,1],[22,23,7,0],[31,32,2,2],[33,43,3,1],[34,44,6,3],[41,42,7,0]],
[[5],[11,21,4,1],[12,13,2,2],[14,24,1,1],[15,25,1,1],[22,23,9,0],[31,32,3,1],[33,34,44,6,3],[35,45,9,0],[41,51,7,0],[42,43,3,1],[52,53,6,3],[54,55,4,1]],
[[6],[11,21,11,0],[12,13,2,2],[14,24,20,3],[15,16,26,36,6,3],[22,23,3,1],[25,35,3,2],[31,32,41,42,240,3],[33,34,6,3],[43,53,6,3],[44,54,55,7,0],[45,46,30,3],[51,52,6,3],[56,66,9,0],[61,62,63,8,0],[64,65,2,2]],
[[5],[11,12,21,22,10,0],[13,14,23,24,34,18,0],[15,25,35,2,1],[31,32,33,1,1],[41,42,43,51,52,53,600,3],[44,54,55,2,2],[45,3]], 
[[6],[11,12,13,2,2],[14,15,3,1],[16,26,36,11,0],[21,22,23,2,2],[24,25,34,35,40,3],[31,41,51,61,14,0],[32,33,42,43,52,53,3600,3],[44,54,64,120,3],[45,46,55,56,1,1],[62,63,5,1],[65,66,5,0]]]

## HELPER FUNCTIONS
def check_diff(vars, board):
    N = board[0][0]
    for i in range(0,N):
        for j in range(0,N):
            #row diff-constraints
            for k in range(j+1,N):
                if vars[i][j].get_assigned_value() == vars[i][k].get_assigned_value():
                    return False
            #col diff-constraints
            for l in range(i+1,N):
                if vars[i][j].get_assigned_value() == vars[l][j].get_assigned_value():
                    return False
    return True
    
def add_check(values, target):
        sum = 0
        for v in values:
            sum += v
        if sum != target:
            return False
        return True

def sub_check(values, target):
        for perm in itertools.permutations(values):
            #calculate value
            result = perm[0]
            i = 1
            while(i < len(values)):
                result -= perm[i]
                i += 1
            if result == target:
                return True
        return False
        
def div_check(values, target):
        for perm in itertools.permutations(values):
            #calculate value
            result = perm[0]
            i = 1
            while(i < len(values)):
                result //= perm[i]
                i += 1
            if result == target:
                return True
        return False
        
def mult_check(values, target):
        prod = 1
        for v in values:
            prod *= v
        if prod != target:
            return False
        return True
    
def check_cages(vars, board):
    N = board[0][0]
    for c in board:
        if len(c) == 1:#board size specification
            continue
        if len(c) == 2:#forced value to a cell
            val = c[1]
            cell_i = (c[0] // 10)-1
            cell_j = (c[0] % 10)-1
            if vars[cell_i][cell_j].get_assigned_value() != val:
                return False
        if len(c) > 2:#larger cage
            val = c[len(c)-2]
            op = c[len(c)-1]
            cage_values = []
            for v in range(0,len(c)-2):#get vars in cage
                cell_i = (c[v] // 10)-1
                cell_j = (c[v] % 10)-1
                cage_values.append(vars[cell_i][cell_j].get_assigned_value())
            if op == 0:
                if add_check(cage_values,val) == False:
                    return False
            elif op == 1:
                if sub_check(cage_values,val) == False:
                    return False
            elif op == 2:
                if div_check(cage_values,val) == False:
                    return False
            elif op ==3:
                if mult_check(cage_values,val) == False:
                    return False
    return True

########################################
##Necessary setup to generate CSP problems

def queensCheck(qi, qj, i, j):
    '''Return true if i and j can be assigned to the queen in row qi and row qj
       respectively. Used to find satisfying tuples.
    '''
    return i != j and abs(i-j) != abs(qi-qj)

def nQueens(n):
    '''Return an n-queens CSP'''
    i = 0
    dom = []
    for i in range(n):
        dom.append(i+1)

    vars = []
    for i in dom:
        vars.append(Variable('Q{}'.format(i), dom))

    cons = []
    for qi in range(len(dom)):
        for qj in range(qi+1, len(dom)):
            con = Constraint("C(Q{},Q{})".format(qi+1,qj+1),[vars[qi], vars[qj]])
            sat_tuples = []
            for t in itertools.product(dom, dom):
                if queensCheck(qi, qj, t[0], t[1]):
                    sat_tuples.append(t)
            con.add_satisfying_tuples(sat_tuples)
            cons.append(con)

    csp = CSP("{}-Queens".format(n), vars)
    for c in cons:
        csp.add_constraint(c)
    return csp

# SPECIFY WHAT TO TEST
TEST_ENCODINGS   = True
TEST_PROPAGATORS = True

class TestStringMethods(unittest.TestCase):
    def helper_prop(self, board, prop=prop_FC):
        csp, var_array = caged_csp(board)
        solver = BT(csp)
        solver.bt_search(prop)
        self.assertTrue(check_cages(var_array, board), "Incorect value in a cage!")
        self.assertTrue(check_diff(var_array, board), "Repeated value in a row or column!")

    def helper_bne_grid(self, board):
        new_b = []
        for sub_list in board:
            new_b.append(list(sub_list))
        csp, _ = binary_ne_grid(new_b)
        diff_const_count = (board[0][0]+board[0][0])*board[0][0]*(board[0][0]-1)//2 # number of all binary diff constraints
        cons = csp.get_all_cons()
        bin_count = 0 # number of binary constraints
        for c in cons:
            if len(c.get_scope()) == 2:
                bin_count += 1
        self.assertEqual(bin_count, diff_const_count, "Wrong number of binary not equal constraints for binary_ne_grid!")

    @unittest.skipUnless(TEST_ENCODINGS, "Not Testing Encodings.")
    def test_bne_grid_1(self):
        board = BOARDS[0]
        self.helper_bne_grid(board)

    @unittest.skipUnless(TEST_ENCODINGS, "Not Testing Encodings.")
    def test_bne_grid_2(self):
        board = BOARDS[1]
        self.helper_bne_grid(board)

    @unittest.skipUnless(TEST_PROPAGATORS and TEST_ENCODINGS, "Not Testing Propagators and Encodings.")
    def test_props_1(self):
        board = BOARDS[0]
        self.helper_prop(board)

    @unittest.skipUnless(TEST_PROPAGATORS and TEST_ENCODINGS, "Not Testing Propagators and Encodings.")
    def test_props_2(self):
        board = BOARDS[1]
        self.helper_prop(board)

    @unittest.skipUnless(TEST_PROPAGATORS and TEST_ENCODINGS, "Not Testing Propagators and Encodings.")
    def test_props_3(self):
        board = BOARDS[2]
        self.helper_prop(board)

    @unittest.skipUnless(TEST_PROPAGATORS and TEST_ENCODINGS, "Not Testing Propagators and Encodings.")
    def test_props_4(self):
        board = BOARDS[3]
        self.helper_prop(board, prop_FI)

    @unittest.skipUnless(TEST_PROPAGATORS and TEST_ENCODINGS, "Not Testing Propagators and Encodings.")   
    def test_props_5(self):
        board = BOARDS[4]
        self.helper_prop(board, prop_FI)

    @unittest.skipUnless(TEST_PROPAGATORS and TEST_ENCODINGS, "Not Testing Propagators and Encodings.")
    def test_props_6(self):
        board = BOARDS[5]
        self.helper_prop(board, prop_FI)

    ##Tests FC after the first queen is placed in position 1.
    @unittest.skipUnless(TEST_PROPAGATORS, "Not Testing Propagotors.")
    def test_simple_FC(self):
        queens = nQueens(8)
        curr_vars = queens.get_all_vars()
        curr_vars[0].assign(1)
        propagators.prop_FC(queens,newVar=curr_vars[0])
        answer = [[1],[3, 4, 5, 6, 7, 8],[2, 4, 5, 6, 7, 8],[2, 3, 5, 6, 7, 8],[2, 3, 4, 6, 7, 8],[2, 3, 4, 5, 7, 8],[2, 3, 4, 5, 6, 8],[2, 3, 4, 5, 6, 7]]
        var_domain = [x.cur_domain() for x in curr_vars]
        for i in range(len(curr_vars)):
            self.assertEqual(var_domain[i], answer[i], "Failed simple FC test: variable domains don't match expected results")
    
    @unittest.skipUnless(TEST_PROPAGATORS, "Not Testing Propagotors.")
    def test_DWO_FC(self):
        queens = nQueens(6)
        cur_var = queens.get_all_vars()
        cur_var[0].assign(2)
        pruned = propagators.prop_FC(queens,newVar=cur_var[0])
        self.assertTrue(pruned[0], "Failed a FC test: returned DWO too early.")
        cur_var[1].assign(5)
        pruned = propagators.prop_FC(queens,newVar=cur_var[1])
        self.assertTrue(pruned[0], "Failed a FC test: returned DWO too early.")
        cur_var[4].assign(1)
        pruned = propagators.prop_FC(queens,newVar=cur_var[4])

        self.assertFalse(pruned[0], "Failed a FC test: should have resulted in a DWO")

if __name__ == '__main__':
    unittest.main()