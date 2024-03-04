import time
import functools
from typing import List, Dict

'''Constraint Satisfaction Routines
   A) class Variable

      This class allows one to define CSP variables.

      On initialization the variable object can be given a name, and
      an original domain of values. This list of domain values can be
      added but NOT deleted from.
      
      To support constraint propagation, the class also maintains a
      set of flags to indicate if a value is still in its current domain.
      So one can remove values, add them back, and query if they are 
      still current. 

    B) class constraint

      This class allows one to define constraints specified by tables
      of satisfying assignments.

      On initialization the variables the constraint is over is
      specified (i.e. the scope of the constraint). This must be an
      ORDERED list of variables. This list of variables cannot be
      changed once the constraint object is created.

      Once initialized the constraint can be incrementally initialized
      with a list of satisfying tuples. Each tuple specifies a value
      for each variable in the constraint (in the same ORDER as the
      variables of the constraint were specified).

    C) Backtracking routine---takes propagator and CSP as arguments
       so that basic backtracking, forward-checking or GAC can be 
       executed depending on the propagator used.

'''

class Variable: 

    '''Class for defining CSP variables.  On initialization the
       variable object should be given a name, and optionally a list of
       domain values. Later on more domain values an be added...but
       domain values can never be removed.

       The variable object offers two types of functionality to support
       search. 
       (a) It has a current domain, implimented as a set of flags 
           determining which domain values are "current", i.e., unpruned.
           - you can prune a value, and restore it.
           - you can obtain a list of values in the current domain, or count
             how many are still there

       (b) You can assign and unassign a value to the variable.
           The assigned value must be from the variable domain, and
           you cannot assign to an already assigned variable.

           You can get the assigned value e.g., to find the solution after
           search.
           
           Assignments and current domain interact at the external interface
           level. Assignments do not affect the internal state of the current domain 
           so as not to interact with value pruning and restoring during search. 

           But conceptually when a variable is assigned it only has
           the assigned value in its current domain (viewing it this
           way makes implementing the propagators easier). Hence, when
           the variable is assigned, the 'cur_domain' returns the
           assigned value as the sole member of the current domain,
           and 'in_cur_domain' returns True only for the assigned
           value. However, the internal state of the current domain
           flags are not changed so that pruning and unpruning can
           work independently of assignment and unassignment. 
           '''
    #
    #set up and info methods
    #
    def __init__(self, name, domain=[]):
        '''Create a variable object, specifying its name (a
        string). Optionally specify the initial domain.
        '''
        self.name = name                #text name for variable
        self.dom = list(domain)         #Make a copy of passed domain
        self.curdom = [True] * len(domain)      #using list
        #for bt_search
        self.assignedValue = None

    def add_domain_values(self, values):
        '''Add additional domain values to the domain
           Removals not supported removals'''
        for val in values: 
            self.dom.append(val)
            self.curdom.append(True)

    def domain_size(self):
        '''Return the size of the (permanent) domain'''
        return(len(self.dom))

    def domain(self):
        '''return the variable's (permanent) domain'''
        return(list(self.dom))

    #
    #methods for current domain (pruning and unpruning)
    #

    def prune_value(self, value):
        '''Remove value from CURRENT domain'''
        self.curdom[self.value_index(value)] = False

    def unprune_value(self, value):
        '''Restore value to CURRENT domain'''
        self.curdom[self.value_index(value)] = True

    def cur_domain(self) -> List:
        '''return list of values in CURRENT domain (if assigned 
           only assigned value is viewed as being in current domain)'''
        vals = []
        if self.is_assigned():
            vals.append(self.get_assigned_value())
        else:
            for i, val in enumerate(self.dom):
                if self.curdom[i]:
                    vals.append(val)
        return vals

    def in_cur_domain(self, value):
        '''check if value is in CURRENT domain (without constructing list)
           if assigned only assigned value is viewed as being in current 
           domain'''
        if not value in self.dom:
            return False
        if self.is_assigned():
            return value == self.get_assigned_value()
        else:
            return self.curdom[self.value_index(value)]

    def cur_domain_size(self):
        '''Return the size of the variables domain (without construcing list)'''
        if self.is_assigned():
            return 1
        else:
            return(sum(1 for v in self.curdom if v))

    def restore_curdom(self):
        '''return all values back into CURRENT domain'''
        for i in range(len(self.curdom)):
            self.curdom[i] = True

    #
    #methods for assigning and unassigning
    #

    def is_assigned(self) -> bool:
        return self.assignedValue != None
    
    def assign(self, value):
        '''
        Used by bt_search. When we assign we remove all other values
           values from curdom. We save this information so that we can
           reverse it on unassign

           '''

        if self.is_assigned() or not self.in_cur_domain(value):
            print("ERROR: trying to assign variable", self, 
                  "that is already assigned or illegal value (not in curdom)")
            return

        self.assignedValue = value

    def unassign(self):
        '''Used by bt_search. Unassign and restore old curdom'''
        if not self.is_assigned():
            print("ERROR: trying to unassign variable", self, " not yet assigned")
            return
        self.assignedValue = None

    def get_assigned_value(self):
        '''return assigned value...returns None if is unassigned'''
        return self.assignedValue

    #
    #internal methods
    #

    def value_index(self, value):
        '''Domain values need not be numbers, so return the index
           in the domain list of a variable value'''
        return self.dom.index(value)

    def __repr__(self):
        return("Var-{}".format(self.name))

    def __str__(self):
        return("Var--{}".format(self.name))

    def print_all(self):
        '''Also print the variable domain and current domain'''
        print("Var--\"{}\": Dom = {}, CurDom = {}".format(self.name, 
                                                             self.dom, 
                                                             self.curdom))
class Constraint: 
    '''Class for defining constraints variable objects specifes an
       ordering over variables.  This ordering is used when calling
       the satisfied function which tests if an assignment to the
       variables in the constraint's scope satisfies the constraint'''

    def __init__(self, name, scope): 
        '''create a constraint object, specify the constraint name (a
        string) and its scope (an ORDERED list of variable objects).
        The order of the variables in the scope is critical to the
        functioning of the constraint.

        Consraints are implemented as storing a set of satisfying
        tuples (i.e., each tuple specifies a value for each variable
        in the scope such that this sequence of values satisfies the
        constraints).

        NOTE: This is a very space expensive representation...a proper
        constraint object would allow for representing the constraint
        with a function.  
        '''

        self.scope = list(scope)
        self.name = name
        self.sat_tuples = dict()

        #The next object data item 'sup_tuples' will be used to help
        #support GAC propgation. It allows access to a list of 
        #satisfying tuples that contain a particular variable/value
        #pair.
        self.sup_tuples = dict()

    def add_satisfying_tuples(self, tuples):
        '''We specify the constraint by adding its complete list of satisfying tuples.'''
        for x in tuples:
            t = tuple(x)  #ensure we have an immutable tuple
            if not t in self.sat_tuples:
                self.sat_tuples[t] = True

            #now put t in as a support for all of the variable values in it
            for i, val in enumerate(t):
                var = self.scope[i]
                if not (var,val) in self.sup_tuples:
                    self.sup_tuples[(var,val)] = []
                self.sup_tuples[(var,val)].append(t)

    def get_scope(self):
        '''get list of variables the constraint is over'''
        return list(self.scope)

    def check(self, vals: List):
        '''
        Given list of values, one for each variable in the
           constraints scope, return true if and only if these value
           assignments satisfy the constraint by applying the
           constraints "satisfies" function.  

        precondition:
            the list of values are ordered in the same order as the list of
            variables in the constraints scope
       '''
        return tuple(vals) in self.sat_tuples

    def get_n_unasgn(self):
        '''return the number of unassigned variables in the constraint's scope'''
        n = 0
        v: Variable
        for v in self.scope:
            if not v.is_assigned():
                n = n + 1
        return n

    def get_unasgn_vars(self): 
        '''return list of unassigned variables in constraint's scope. Note
           more expensive to get the list than to then number'''
        vs = []
        for v in self.scope:
            if not v.is_assigned():
                vs.append(v)
        return vs

    def has_support(self, var, val):
        '''Test if a variable value pair has a supporting tuple (a set
           of assignments satisfying the constraint where each value is
           still in the corresponding variables current domain
        '''
        if (var, val) in self.sup_tuples:
            for t in self.sup_tuples[(var, val)]:
                if self.tuple_is_valid(t):
                    return True
        return False

    def tuple_is_valid(self, t):
        '''Internal routine. Check if every value in tuple is still in
           corresponding variable domains'''
        for i, var in enumerate(self.scope):
            if not var.in_cur_domain(t[i]):
                return False
        return True

    def __str__(self):
        return("{}({})".format(self.name,[var.name for var in self.scope]))

class CSP:
    '''Class for packing up a set of variables into a CSP problem.
       Contains various utility routines for accessing the problem.
       The variables of the CSP can be added later or on initialization.
       The constraints must be added later'''

    def __init__(self, name, vars=[]):
        '''create a CSP object. Specify a name (a string) and 
           optionally a set of variables'''

        self.name = name
        self.vars = []
        self.cons = []
        self.vars_to_cons : Dict[Variable, List[Constraint]] = dict()
        for v in vars:
            self.add_var(v)

    def add_var(self,v):
        '''Add variable object to CSP while setting up an index
           to obtain the constraints over this variable'''
        if not type(v) is Variable:
            print("Trying to add non variable ", v, " to CSP object")
        elif v in self.vars_to_cons:
            print("Trying to add variable ", v, " to CSP object that already has it")
        else:
            self.vars.append(v)
            self.vars_to_cons[v] = []

    def add_constraint(self,c):
        '''Add constraint to CSP. Note that all variables in the 
           constraints scope must already have been added to the CSP'''
        if not type(c) is Constraint:
            print("Trying to add non constraint ", c, " to CSP object")
        else:
            for v in c.scope:
                if not v in self.vars_to_cons:
                    print("Trying to add constraint ", c, " with unknown variables to CSP object")
                    return
                self.vars_to_cons[v].append(c)
            self.cons.append(c)

    def get_all_cons(self):
        '''return list of all constraints in the CSP'''
        return self.cons
        
    def get_cons_with_var(self, var) -> List:
        '''return list of constraints that include var in their scope'''
        return list(self.vars_to_cons[var])

    def get_all_vars(self):
        '''return list of variables in the CSP'''
        return list(self.vars)

    def get_all_unasgn_vars(self):
        '''return list of unassigned variables in the CSP'''
        return [v for v in self.vars if not v.is_assigned()]

    def print_all(self):
        print("CSP", self.name)
        print("   Variables = ", self.vars)
        print("   Constraints = ", self.cons)


    def print_soln(self):
        print("CSP", self.name, " Assignments = ")
        for v in self.vars:
            print(v, " = ", v.get_assigned_value(), "    ", end='')
        print("")

########################################################
# Backtracking Routine                                 #
########################################################

class BT:
    '''use a class to encapsulate things like statistics
       and bookeeping for pruning/unpruning variabel domains
       To use backtracking routine make one of these objects
       passing the CSP as a parameter. Then you can invoke
       that objects's bt_search routine with the right
       kind or propagator function to obtain plain backtracking
       forward-checking or gac'''

    def __init__(self, csp):
        '''csp == CSP object specifying the CSP to be solved'''

        self.csp = csp
        self.nDecisions = 0 #nDecisions is the number of variable 
                            #assignments made during search
        self.nPrunings  = 0 #nPrunings is the number of value prunings during search
        unasgn_vars = list() #used to track unassigned variables
        self.TRACE = False
        self.runtime = 0

    def trace_on(self):
        '''Turn search trace on'''
        self.TRACE = True

    def trace_off(self):
        '''Turn search trace off'''
        self.TRACE = False

        
    def clear_stats(self):
        '''Initialize counters'''
        self.nDecisions = 0
        self.nPrunings = 0
        self.runtime = 0

    def print_stats(self):
        print("Search made {} variable assignments and pruned {} variable values".format(
            self.nDecisions, self.nPrunings))

    def restoreValues(self,prunings):
        '''Restore list of values to variable domains
           each item in prunings is a pair (var, val)'''
        for var, val in prunings:
            var.unprune_value(val)

    def restore_all_variable_domains(self):
        '''Reinitialize all variable domains'''
        for var in self.csp.vars:
            if var.is_assigned():
                var.unassign()
            var.restore_curdom()

    def restoreUnasgnVar(self, var):
        '''Add variable back to list of unassigned vars'''
        self.unasgn_vars.append(var)
        
    def bt_search(self,propagator,var_ord=None,val_ord=None):
        '''Try to solve the CSP using specified propagator routine

           propagator == a function with the following template
           propagator(csp, newly_instantiated_variable=None)
           ==> returns (True/False, [(Variable, Value), (Variable, Value) ...]

           csp is a CSP object---the propagator can use this to get access
           to the variables and constraints of the problem.

           newly_instaniated_variable is an optional argument. 
           if newly_instantiated_variable is not None:
               then newly_instantiated_variable is the most
               recently assigned variable of the search.
           else:
               progator is called before any assignments are made
               in which case it must decide what processing to do
               prior to any variables being assigned.

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

           var_ord is the variable ordering function currently being used; 
           val_ord is the value ordering function currently being used.
           '''

        self.clear_stats()
        stime = time.process_time()

        self.restore_all_variable_domains()
        
        self.unasgn_vars = []
        for v in self.csp.vars:
            if not v.is_assigned():
                self.unasgn_vars.append(v)

        status, prunings = propagator(self.csp) #initial propagate no assigned variables.
        self.nPrunings = self.nPrunings + len(prunings)

        if self.TRACE:
            print(len(self.unasgn_vars), " unassigned variables at start of search")
            print("Root Prunings: ", prunings)

        if status == False:
            print("CSP{} detected contradiction at root".format(
                self.csp.name))
        else:
            status = self.bt_recurse(propagator, var_ord, val_ord, 1)   #now do recursive search

        self.restoreValues(prunings)
        if status == False:
            print("CSP{} unsolved. Has no solutions".format(self.csp.name))
        if status == True:
            print("CSP {} solved. CPU Time used = {}".format(self.csp.name,
                                                             time.process_time() - stime))
            self.csp.print_soln()

        print("bt_search finished")
        self.print_stats()

    def bt_recurse(self, propagator, var_ord, val_ord, level):
        '''Return true if found solution. False if still need to search.
           If top level returns false--> no solution'''

        if self.TRACE:
            print('  ' * level, "bt_recurse level ", level)
           
        if not self.unasgn_vars:
            #all variables assigned
            return True
        else:
            ##Figure out which variable to assign,
            ##Then remove it from the list of unassigned vars
            if var_ord:
              var = var_ord(self.csp)
            else:
              var = self.unasgn_vars[0]
            self.unasgn_vars.remove(var) 

            if self.TRACE:
                print('  ' * level, "bt_recurse var = ", var)

            if val_ord:
              value_order = val_ord(self.csp,var)
            else:
              value_order = var.cur_domain()

            for val in value_order:

                if self.TRACE:
                    print('  ' * level, "bt_recurse trying", var, "=", val)

                var.assign(val)
                self.nDecisions = self.nDecisions+1

                status, prunings = propagator(self.csp, var)
                self.nPrunings = self.nPrunings + len(prunings)

                if self.TRACE:
                    print('  ' * level, "bt_recurse prop status = ", status)
                    print('  ' * level, "bt_recurse prop pruned = ", prunings)

                if status:
                    if self.bt_recurse(propagator, var_ord,val_ord, level+1):
                        return True

                if self.TRACE:
                    print('  ' * level, "bt_recurse restoring ", prunings)
                self.restoreValues(prunings)
                var.unassign()

            self.restoreUnasgnVar(var)
            return False

