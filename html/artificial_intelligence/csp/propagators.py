#Look for #IMPLEMENT tags in this file. These tags indicate what has
#to be implemented to complete problem solution.  

'''This file will contain different constraint propagators to be used within
   bt_search.

   propagator == a function with the following template
      propagator(csp, newly_instantiated_variable=None)
           ==> returns (True/False, [(Variable, Value), (Variable, Value) ...]

      csp is a CSP object---the propagator can use this to get access
      to the variables and constraints of the problem. The assigned variables
      can be accessed via methods, the values assigned can also be accessed.

      newly_instaniated_variable is an optional argument.
      if newly_instantiated_variable is not None:
          then newly_instantiated_variable is the most
           recently assigned variable of the search.
      else:
          progator is called before any assignments are made
          in which case it must decide what processing to do
           prior to any variables being assigned. SEE BELOW

       The propagator returns True/False and a list of (Variable, Value) pairs.
       Return is False if a deadend has been detected by the propagator.
       in this case bt_search will backtrack
       return is true if we can continue.

      The list of variable values pairs are all of the values
      the propagator pruned (using the variable's prune_value method). 
      bt_search NEEDS to know this in order to correctly restore these 
      values when it undoes a variable assignment.

      NOTE propagator SHOULD NOT prune a value that has already been 
      pruned! Nor should it prune a value twice

      PROPAGATOR called with newly_instantiated_variable = None
      PROCESSING REQUIRED:
        for plain backtracking (where we only check fully instantiated 
        constraints) 
        we do nothing...return true, []

        for forward checking (where we only check constraints with one
        remaining variable)
        we look for unary constraints of the csp (constraints whose scope 
        contains only one variable) and we forward_check these constraints.


      PROPAGATOR called with newly_instantiated_variable = a variable V
      PROCESSING REQUIRED:
         for plain backtracking we check all constraints with V (see csp method
         get_cons_with_var) that are fully assigned.

         for forward checking we forward check all constraints with V
         that have one unassigned variable left

   '''
from cspbase import CSP, Constraint, Variable
from typing import List, Tuple
from queue import Queue

def prop_BT(csp :CSP, newly_assigned_var=None) -> Tuple[bool, List]:
    '''
    Do plain backtracking propagation. That is, do no 
    propagation at all. Just check fully instantiated constraints, in other words:

    returns true iff:
        new_var is NONE OR
        every constraint involving the new variable that has all
        of its variables bound and under these bindings the constraint
        satisfies the given constraint satisfaction problem

    returns false iff:
        there exists a constraint that uses new_var, has all of it's 
        variables bound, but this binding does not satisfy the constraint
        satisfaction problem

    '''
    
    if not newly_assigned_var:
        return True, []

    c: Constraint
    for c in csp.get_cons_with_var(newly_assigned_var):
        # we can only verify things if all variables are assigned
        if c.get_n_unasgn() == 0: # A
            vals = []
            vars_in_scope = c.get_scope()
            var: Variable

            for var in vars_in_scope:
                # we know that it has assigned variable by A
                vals.append(var.get_assigned_value())

            if not c.check(vals):
                return False, []

    return True, [] # 

def prop_FC(csp :CSP, newly_assigned_var=None) -> Tuple[bool, List]:
    '''
    Do forward checking. That is check constraints with 
       only one uninstantiated variable. Remember to keep 
       track of all pruned variable,value pairs and return 

    returns true iff:
        every constraint involving the newly assigned variable which 
        has exactly one unbound variable


    Note: In forward checking a queue is not required as in regular inference

   '''

    if not newly_assigned_var:
        return True, []

    c: Constraint
    for c in csp.get_cons_with_var(newly_assigned_var):

        if c.get_n_unasgn() != 1:
            continue

        assert(len(c.get_unasgn_vars()) == 1)
        unassigned_var :Variable = c.get_unasgn_vars()[0]

        at_least_one_possible_assignment = False
        possible_values = unassigned_var.cur_domain()
        # try every possible value, see if it works
        for possible_value in possible_values:
            if unassigned_var.is_assigned(): 
                # second or more iteration
                unassigned_var.unassign()
                unassigned_var.assign(possible_value)
            else: # first iteration
                unassigned_var.assign(possible_value)

            vals = []
            scope_var: Variable
            for scope_var in c.get_scope():
                vals.append(scope_var.get_assigned_value())

            if c.check(vals):
                at_least_one_possible_assignment = True

        if not at_least_one_possible_assignment: 
            # TODO about to remove the bad value from the domain of nav

    return True, [] # empty list probably wrong here.











def prop_FI(csp :CSP, newVar=None):
    '''Do full inference. If newVar is None we initialize the queue
       with all variables.'''
    #IMPLEMENT
