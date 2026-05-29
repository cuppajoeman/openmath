from cspbase import *
from propagators import *
import itertools

x = Variable('X', [1, 2, 3])
y = Variable('Y', [1, 2, 3])
z = Variable('Z', [1, 2, 3])
w = Variable('W', [1, 2, 3, 4])

def w_eq_sum_x_y_z(wxyz):
    #note inputs lists of value
    w = wxyz[0]
    x = wxyz[1]
    y = wxyz[2]
    z = wxyz[3]
    return(w == x + y + z)

c1 = Constraint('C1', [x, y, z])
#c1 is constraint x == y + z. Below are all of the satisfying tuples
c1.add_satisfying_tuples([[2, 1, 1], [3, 1, 2], [3, 2, 1]])

c2 = Constraint('C2', [w, x, y, z])
#c2 is constraint w == x + y + z. Instead of writing down the satisfying
#tuples we compute them

varDoms = []
for v in [w, x, y, z]:
    varDoms.append(v.domain())    

sat_tuples = []
for t in itertools.product(*varDoms):
    #NOTICE use of * to convert the list v to a sequence of arguments to product
    if w_eq_sum_x_y_z(t):
        sat_tuples.append(t)

c2.add_satisfying_tuples(sat_tuples)

simpleCSP = CSP("SimpleEqs", [x,y,z,w])
simpleCSP.add_constraint(c1)
simpleCSP.add_constraint(c2)

btracker = BT(simpleCSP)
#btracker.trace_on()

print("Plain Bactracking on simple CSP")
btracker.bt_search(prop_BT)
print("=======================================================")
#print("Forward Checking on simple CSP")
#btracker.bt_search(prop_FC)
#print("=======================================================")
#print("Full Inference on simple CSP")
#btracker.bt_search(prop_FI)

#Now n-Queens example

def queensCheck(qi: int, qj: int, i: int, j: int) -> bool:
    '''
    Return true if i and j can be assigned to the queen in row qi and row qj 
       respectively. Used to find satisfying tuples.
    '''
    return i != j and abs(i-j) != abs(qi-qj)

def nQueens(n: int) -> CSP:
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

def solve_nQueens(n, propType, trace=False) -> None:
    csp = nQueens(n)
    solver = BT(csp)
    if trace:
        solver.trace_on()
    if propType == 'BT':
        solver.bt_search(prop_BT)
    elif propType == 'FC':
        solver.bt_search(prop_FC)
    elif propType == 'FI':
        solver.bt_search(prop_FI)
        
#trace = True
trace = False
# print("Plain Bactracking on 8-queens")
# solve_nQueens(8, 'BT', trace)
# print("=======================================================")
# print("Forward Checking 8-queens")
# solve_nQueens(8, 'FC', trace)
print("=======================================================")
print("FI 8-queens")
solve_nQueens(8, 'FI', trace)

