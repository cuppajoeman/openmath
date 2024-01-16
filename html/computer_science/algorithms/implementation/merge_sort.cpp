#include <assert.h>
#include <iostream>
#include "helpers.hpp"

/**
 * \brief Given an array, this function sorts the sub-array from left to right inclusive
 * in ascending order
 *
 * \pre array[left_idx ... split_idx] and array[split_idx + 1 ... right_idx] are sorted in
 * ascending order (using inclusive indexing above)
 */
void merge(int array[], int left_idx, int split_idx, int right_idx) {

	// We start by splitting the subarray into two parts labelled left and right
	// left contains indices left_idx ... split_idx right contains split_idx + 1 ... right
	
	int size_of_left_split = number_of_integers_between_two_integers_inclusive(left_idx, split_idx);
	int size_of_right_split = number_of_integers_between_two_integers_inclusive(split_idx + 1, right_idx);

	// create temporary arrays containing the data
	int left_split[size_of_left_split];
	int right_split[size_of_right_split];

	for (int i = 0; i < size_of_left_split; i ++) {
		left_split[i] = array[left_idx + i];
	}

	for (int i = 0; i < size_of_right_split; i ++) {
		right_split[i] = array[split_idx + 1 + i];	
	}

	int left_split_idx = 0, right_split_idx = 0;
	int merge_idx = left_idx;

	while (left_split_idx < size_of_left_split && right_split_idx < size_of_right_split) {
		if (left_split[left_split_idx] <= right_split[right_split_idx]) {
			array[merge_idx] = left_split[left_split_idx];  // overwriting with sorted value
			left_split_idx += 1;
		} else {
			array[merge_idx] = right_split[right_split_idx];  // overwriting with sorted value
			right_split_idx += 1;
		}
		merge_idx += 1;
	}

	bool ran_out_of_left_split_elements = left_split_idx >= size_of_right_split;
	bool ran_out_of_right_split_elements = right_split_idx >= size_of_right_split;
	// assert(ran_out_of_left_split_elements != ran_out_of_right_split_elements); // xor

	// copy remaining elements, exactly one of these while loops will iterate

	while (left_split_idx < size_of_left_split) {
		array[merge_idx] = left_split[left_split_idx]; // already incremented on while loop exit
		left_split_idx += 1;
		merge_idx += 1;
	}

	while (right_split_idx < size_of_right_split) {
		array[merge_idx] = right_split[right_split_idx];
		right_split_idx += 1;
		merge_idx += 1;
	}

}

void merge_sort(int array[], int begin_idx, int end_idx) {

	if (begin_idx >= end_idx) {
		return;
	}

	int split_idx = begin_idx + (end_idx - begin_idx) / 2;
	merge_sort(array, begin_idx, split_idx);
	merge_sort(array, split_idx + 1, end_idx);

	merge(array, begin_idx, split_idx, end_idx);
}


int main() {

	int arr[] = { 12, 11, 13, 5, 6, 7 };
    int arr_size = sizeof(arr) / sizeof(arr[0]);
 
    print_array(arr, arr_size);
 
    merge_sort(arr, 0, arr_size - 1);
 
	std::cout << "\nSorted array is \n";
    print_array(arr, arr_size);

	return 0;
}
