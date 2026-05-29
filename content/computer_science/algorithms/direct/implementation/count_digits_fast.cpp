#include <cstdio>
#include <cassert>
#include <math.h>

double log_base_b_of_a(int b, int a) {
    return log(a) / log(b);
}

int count_digits_in_base_representation_fast(int n, int b) {
    return floor(log_base_b_of_a(b, n)) + 1;
}

int main() {
    int x = 1234;
    int num_dig = count_digits_in_base_representation_fast(x, 10);
    printf("number of digits in %d : %d \n", x, num_dig);
}

