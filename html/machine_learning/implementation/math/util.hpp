#ifndef UTIL_HPP
#define UTIL_HPP

#include "glm/glm.hpp"
#include <vector>

#include "objective_function.hpp"


using namespace std;

vector<glm::vec3> sample_from_obj_func(ObjFunc &obj_func, float dist, int n);

#endif // UTIL_HPP
