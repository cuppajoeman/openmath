# Look for #IMPLEMENT tags in this file.
'''
All encodings need to return a CSP object, and a list of lists of Variable objects 
representing the board. The returned list of lists is used to access the 
solution. 

For example, after these three lines of code

    csp, var_array = caged_csp(board)
    solver = BT(csp)
    solver.bt_search(prop_FC, var_ord)

var_array[0][0].get_assigned_value() should be the correct value in the top left
cell of the FunPuzz puzzle.

The grid-only encodings do not need to encode the cage constraints.

1. binary_ne_grid (worth 10/100 marks)
    - An enconding of a FunPuzz grid (without cage constraints) built using only 
      binary not-equal constraints for both the row and column constraints.

2. nary_ad_grid (worth 10/100 marks)
    - An enconding of a FunPuzz grid (without cage constraints) built using only n-ary 
      all-different constraints for both the row and column constraints. 

3. caged_csp (worth 25/100 marks) 
    - An enconding built using your choice of (1) binary binary not-equal, or (2) 
      n-ary all-different constraints for the grid.
    - Together with FunPuzz cage constraints.

'''
from cspbase import *
import itertools


def binary_ne_grid(fpuzz_grid: List[List[int]]) -> Tuple[CSP, List[List[Variable]]]:
    """
    description:
        given a "fun puzzle" as specified in tests.py return a CSP 
        that encodes the fact that every row and every column must use each number
        exactly once
    """
    grid_size: int = fpuzz_grid[0][0]
    possible_cell_values = [i + 1 for i in range(grid_size)]
    cell_variable_grid = [[Variable(f'C{x + 1}{y + 1}', possible_cell_values) for y in range(grid_size)] for x in
                          range(grid_size)]

    constraints = []

    for c in range(grid_size):
        for i in range(grid_size - 1):
            for j in range(i + 1, grid_size):
                satisfying_tuples = []
                print(f"C{i + 1}{c + 1} != C{j + 1}{c + 1}", cell_variable_grid[i][c], cell_variable_grid[j][c])
                pairwise_uniqueness_row = Constraint(f"C{i + 1}{c + 1} != C{j + 1}{c + 1}",
                                                     [cell_variable_grid[i][c], cell_variable_grid[j][c]])
                pairwise_uniqueness_column = Constraint(f"C{c + 1}{i + 1} != C{c + 1}{j + 1}",
                                                        [cell_variable_grid[c][i], cell_variable_grid[c][j]])

                for t in itertools.product(possible_cell_values, possible_cell_values):
                    if t[0] != t[1]:
                        satisfying_tuples.append(t)

                print(satisfying_tuples)

                pairwise_uniqueness_row.add_satisfying_tuples(satisfying_tuples)
                pairwise_uniqueness_column.add_satisfying_tuples(satisfying_tuples)

                constraints.append(pairwise_uniqueness_row)
                constraints.append(pairwise_uniqueness_column)

    # y fixed, x iterates through, produces flattened rows.
    flattened_variables = [cell_variable_grid[x][y] for x in range(grid_size) for y in range(grid_size)]

    fun_puzz_binary_ne = CSP(f"fpuzz grid/row uniqueness {grid_size}x{grid_size}", flattened_variables)

    for c in constraints:
        fun_puzz_binary_ne.add_constraint(c)

    return fun_puzz_binary_ne, cell_variable_grid


def nary_ad_grid(fpuzz_grid):
    grid_size: int = fpuzz_grid[0][0]
    possible_cell_values = [i + 1 for i in range(grid_size)]
    # each one is a column
    cell_variable_grid = [[Variable(f'C{x + 1}{y + 1}', possible_cell_values) for y in range(grid_size)] for x in
                          range(grid_size)]

    constraints = []

    for c in range(grid_size):
        row_of_vars: List[Variable] = []
        col_of_vars: List[Variable] = cell_variable_grid[c]
        for i in range(grid_size):
            row_of_vars.append(cell_variable_grid[i][c])  # fixed y value, i iterates through

        row_constraint = Constraint("".join([str(v) for v in row_of_vars]), row_of_vars)
        col_constraint = Constraint("".join([str(v) for v in col_of_vars]), col_of_vars)

        satisfying_tuples = list(itertools.permutations(possible_cell_values))

        row_constraint.add_satisfying_tuples(satisfying_tuples)
        col_constraint.add_satisfying_tuples(satisfying_tuples)
        print(row_constraint, satisfying_tuples)
        constraints.append(row_constraint)
        constraints.append(col_constraint)

    # y fixed, x iterates through, produces flattened rows.
    flattened_variables = [cell_variable_grid[x][y] for x in range(grid_size) for y in range(grid_size)]

    fun_puzz_ary_ad_grid = CSP(f"puzz grid/row uniquness nary {grid_size}x{grid_size}", flattened_variables)

    for c in constraints:
        fun_puzz_ary_ad_grid.add_constraint(c)

    return fun_puzz_ary_ad_grid, cell_variable_grid


def add_check(values, target):
    sum = 0
    for v in values:
        sum += v
    return sum == target


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
    return prod == target


def caged_csp(fpuzz_grid: List[List[int]]) -> Tuple[CSP, List[List[Variable]]]:
    """
    description: 
        create a CSP which inforces unique values in row/col and also
        that within every cage the numbers can be combined in any order
        to produce the cage's value
    """
    debugging = True
    grid_size: int = fpuzz_grid[0][0]
    possible_cell_values = [i + 1 for i in range(grid_size)]
    # we also need to add the constraints for row/col uniqueness
    nary_csp, cell_variable_grid = nary_ad_grid(fpuzz_grid)
    # y fixed, x iterates through, produces flattened rows.
    flattened_variables = [cell_variable_grid[x][y] for x in range(grid_size) for y in range(grid_size)]
    cage_constraint_problem = CSP(f"fpuzz grid satisfaction {grid_size}x{grid_size}", flattened_variables)
    for c in nary_csp.cons:
        cage_constraint_problem.add_constraint(c)
    constraints = []
    cages = fpuzz_grid[1:]
    for cage in cages:
        cell_indices, target_value, operator = cage[:-2], cage[-2], cage[-1]
        cell_indices_int_tups = map(lambda c: (int(str(c)[0]), int(str(c)[1])), cell_indices)
        vars_in_cage = [cell_variable_grid[x - 1][y - 1] for (x, y) in cell_indices_int_tups]
        cage_constraint = Constraint(f"cage: {cage}", vars_in_cage)
        num_cells_involved = len(cell_indices)
        all_possible_tuples = list(itertools.product(possible_cell_values, repeat=num_cells_involved))
        satisfying_tuples = []
        match operator:
            # exactly one of these cases will run
            case 0:
                for t in all_possible_tuples:
                    if add_check(t, target_value):
                        satisfying_tuples.append(t)
            case 1:
                for t in all_possible_tuples:
                    if sub_check(t, target_value):
                        satisfying_tuples.append(t)
            case 2:
                for t in all_possible_tuples:
                    if div_check(t, target_value):
                        satisfying_tuples.append(t)
            case 3:
                for t in all_possible_tuples:
                    if mult_check(t, target_value):
                        satisfying_tuples.append(t)

        cage_constraint.add_satisfying_tuples(satisfying_tuples)
        constraints.append(cage_constraint)

    for c in constraints:
        cage_constraint_problem.add_constraint(c)

    return cage_constraint_problem, cell_variable_grid
