//
// Created by ccn on 24/03/24.
//

#ifndef GRADIENT_DESCENT_CHARACTER_HPP
#define GRADIENT_DESCENT_CHARACTER_HPP

#include "glm/vec3.hpp"
#include "../camera/camera.hpp"

class Character {
public:
    glm::vec3 position = glm::vec3(0.0f, 0.0f, 0.0f);
    Camera camera;
};

#endif //GRADIENT_DESCENT_CHARACTER_HPP
