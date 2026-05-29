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
from sys import unraisablehook
from cspbase import CSP, Constraint, Variable
from typing import Any, List, Tuple
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

def prop_FC(csp :CSP, newVar=None) -> Tuple[bool, List[Tuple[Variable, Any]]]:
    '''
    brief:
        perform forward checking infererce/propagation:

    description:
        for every constraint that has exactly one uninstantiated variable
        perform the forward checking algorithm:

    parameters:
        - a CSP object csp 
        - (optionally) a Variable newly_assigned_var

    postcondition:
        no variable in this csp should have it's domain changed

    returns a tuple (t1: bool, t2: List) such that:

        t1 is true iff :
            there exists at least one assignment to variables in 
            every constraint of interest such that the csp problem is satisfied
            OR
            Every constraint does not have one unassigned variable

        t2:
            a list of tuples (Variable, value) pairs that have been pruned 

   '''

    newly_assigned_var = newVar
    constraints_of_interest: List[Constraint]
    if newly_assigned_var is None:
        constraints_of_interest = csp.get_all_cons()
    else:
        constraints_of_interest = csp.get_cons_with_var(newly_assigned_var)

    impossible_var_val_pairs = []

    c: Constraint
    for c in constraints_of_interest:

        if c.get_n_unasgn() != 1:
            continue

        assert(len(c.get_unasgn_vars()) == 1)
        unassigned_var :Variable = c.get_unasgn_vars()[0]
        assert(unassigned_var != newly_assigned_var)

        possible_values = unassigned_var.cur_domain()
        for possible_value in possible_values:

            vals = []
            scope_var: Variable
            for scope_var in c.get_scope():
                if scope_var.is_assigned():
                    vals.append(scope_var.get_assigned_value())
                else:
                    vals.append(possible_value)

            if not c.check(vals):
                unassigned_var.prune_value(possible_value)
                impossible_var_val_pairs.append((unassigned_var, possible_value))

                if unassigned_var.cur_domain_size() == 0: # domain wipe out
                    return False, impossible_var_val_pairs

    return True, impossible_var_val_pairs 


def prop_FI(csp :CSP, newly_assigned_var=None) -> Tuple[bool, List[Tuple[Variable, Any]]]:
    '''
    brief: Do full inference

    description:

    If newVar is None we initialize the queue with all variables.

    returns a tuple (t1, t2) such that:

    t1 is true iff by adding every variable of interest to the queue,
    popping and popping each off in fifo order [TODO] what does this do?
   '''
    impossible_var_val_pairs = []
    var_queue = Queue()

    if newly_assigned_var is None:
        for var in csp.vars:
            var_queue.put(var)
    else:
        var_queue.put(newly_assigned_var)

    while not var_queue.empty():
        curr_var = var_queue.get()
        constraints_of_interest = csp.get_cons_with_var(curr_var)
        c: Constraint

        for c in constraints_of_interest: # coi
            coi_var: Variable

            for coi_var in c.get_scope():
                if coi_var == curr_var or coi_var.is_assigned():
                    continue # skip over newly assigned vars or already assigned vars
                possible_values = coi_var.cur_domain()

                for possible_value in possible_values:
                    if not c.has_support(coi_var, possible_value):
                        coi_var.prune_value(possible_value)
                        impossible_var_val_pairs.append((coi_var, possible_value))

                        if coi_var.cur_domain_size() == 0: # if it loses it's whole domain stop.
                            return False, impossible_var_val_pairs

                if possible_values != coi_var.cur_domain():
                    var_queue.put(coi_var)

        print("=====END=====\n")


    return True, impossible_var_val_pairs 

