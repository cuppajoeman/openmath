#include "util.hpp"

using namespace std;

/**
 * Sample an evenly spaced n x n grid of points from (-dist, -dist) to
 * (dist, dist).
 *
 * @return The sampled points in row-major order.
 *
 * sample_from_obj_func(obj_func, 1, 3);
 * >> {(-1, y, 1), (0, y, 1), (1, y, 1),
 *     (-1, y, 0), (0, y, 0), (1, y, 0),
 *     (-1, y, -1), (0, y, -1), (1, y, -1)}
 */
vector<glm::vec3> sample_from_obj_func(ObjFunc &obj_func, float dist, int n)
{
    float step = 2 * dist / (n - 1);

    std::vector<glm::vec3> samples;
    for (float z = dist; z >= -dist; z -= step)
    {
        for (float x = -dist; x <= dist; x += step)
        {
            glm::vec3 sample(x, obj_func.eval(Eigen::Vector2f(x, z)), z);
            samples.push_back(sample);
        }
    }

    return samples;
}
