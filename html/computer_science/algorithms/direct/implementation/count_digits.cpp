#include <cstdio>
#include <cassert>

int count_digits_in_base_representation(int n, int b) {

    assert(b >= 1);
    int num_digits = 0;

    while (n != 0) {
        n = n / b;
        num_digits += 1;
    }
    return num_digits;
}

int main() {
    int x = 1234;
    int num_dig = count_digits_in_base_representation(x, 10);
    printf("number of digits in %d : %d \n", x, num_dig);
}
