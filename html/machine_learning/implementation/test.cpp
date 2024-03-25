#include <iostream>
#include <Eigen/Dense>

#include "glm/glm.hpp"
#include "math/optimizer.hpp"
#include "math/objective_function.hpp"
#include "math/util.hpp"

using namespace std;

float quadratic(Eigen::Vector2f pos)
{
    return pos.x() * pos.x() + pos.y() * pos.y();
}

int main()
{
    Eigen::Vector2f init_pos(2.f, 3.f);
    ObjFuncWithoutData obj_func(&quadratic);
    VanillaOptim optim(obj_func, 0.01, init_pos);

    cout << init_pos.x() << " " << init_pos.y() << endl;
    for (int i = 0; i < 200; i++)
    {
        Eigen::Vector2f pos = optim.update_pos();
        cout << pos.x() << " " << pos.y() << endl;
    }

    cout << endl;

    vector<glm::vec3> samples = sample_from_obj_func(obj_func, 1, 3);
    for (glm::vec3 sample : samples)
    {
        cout << sample.x << " " << sample.y << " " << sample.z << endl;
    }
}
