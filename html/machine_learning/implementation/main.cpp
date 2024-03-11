/*
 * I can make a window, mouse/keyboard input, draw the things
*/

#include <cstdio>
#include "math/math.hpp"

int main() {
    glm::vec2 grad = get_gradient_general();
    printf("%f", grad.x);
}