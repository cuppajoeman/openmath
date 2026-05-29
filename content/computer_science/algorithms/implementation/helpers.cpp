#include "helpers.hpp"
#include <iostream>

/**
 * \note see https://www.openmath.net/combinatorics/basics.html for a proof
 */
int number_of_integers_between_two_integers_inclusive(int a, int b) {
	return b - a + 1;
}

void print_array(int array[], int size) {
	for (int i = 0; i < size; i++) {
		std::cout << array[i]  << ", ";
	}
	std::cout  << "\n";
}
