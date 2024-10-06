#include "helpers.hpp"
#include <iostream>
/**
 * \brief Given an array, this function sorts the sub-array from left to right inclusive
 * in ascending order while counting the number of inversions across the split
 *
 * \pre array[left_idx ... split_idx] and array[split_idx + 1 ... right_idx] are sorted in
 * ascending order (using inclusive indexing above)
 */
int merge_and_count_inversions_across_split(int array[], int left_idx, int split_idx, int right_idx) {

	int size_of_left_split = number_of_integers_between_two_integers_inclusive(left_idx, split_idx);
	int size_of_right_split = number_of_integers_between_two_integers_inclusive(split_idx + 1, right_idx);

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

	int inversions_across_split = 0;

	while (left_split_idx < size_of_left_split && right_split_idx < size_of_right_split) {
		if (left_split[left_split_idx] <= right_split[right_split_idx]) {
			array[merge_idx] = left_split[left_split_idx];  // overwriting with sorted value
			left_split_idx += 1;
		} else {
			inversions_across_split += number_of_integers_between_two_integers_inclusive(left_split_idx, size_of_left_split - 1); 
			array[merge_idx] = right_split[right_split_idx];  // overwriting with sorted value
			right_split_idx += 1;
		}
		merge_idx += 1;
	}

	bool ran_out_of_left_split_elements = left_split_idx >= size_of_right_split;
	bool ran_out_of_right_split_elements = right_split_idx >= size_of_right_split;

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

	return inversions_across_split;
}

int merge_sort_and_count_inversions(int array[], int begin_idx, int end_idx) {

	if (begin_idx >= end_idx) {
		return 0; // there are no inversions in an empty list
	}

	int split_idx = begin_idx + (end_idx - begin_idx) / 2;

	int inversions_in_left_split = merge_sort_and_count_inversions(array, begin_idx, split_idx);
	int inversions_in_right_split = merge_sort_and_count_inversions(array, split_idx + 1, end_idx);
	
	int inversions_across_split = merge_and_count_inversions_across_split(array, begin_idx, split_idx, end_idx);

    return inversions_in_left_split + inversions_across_split + inversions_in_right_split;
}


// Driver code
int main()
{
    int arr[] = { 1, 20, 6, 4, 5 };
    int n = sizeof(arr) / sizeof(arr[0]);
    int ans = merge_sort_and_count_inversions(arr, 0, n - 1);
	std::cout << "There are " << ans << " inversions" << "\n";
    return 0;
}
