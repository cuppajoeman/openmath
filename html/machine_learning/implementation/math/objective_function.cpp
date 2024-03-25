#include <numeric>
#include <vector>

#include "objective_function.hpp"

using namespace std;

ObjFuncWithoutData::ObjFuncWithoutData(function<float(Eigen::Vector2f)> obj_func) : obj_func(obj_func){};

Eigen::Vector2f ObjFuncWithoutData::grad(Eigen::Vector2f pos)
{
    float h = 1e-5;
    float grad_x = (obj_func(pos + Eigen::Vector2f(h, 0.f)) - obj_func(pos - Eigen::Vector2f(h, 0.f))) / (2.0 * h);
    float grad_y = (obj_func(pos + Eigen::Vector2f(0.f, h)) - obj_func(pos - Eigen::Vector2f(0.f, h))) / (2.0 * h);

    Eigen::Vector2f grad(grad_x, grad_y);

    return grad;
}

float ObjFuncWithoutData::eval(Eigen::Vector2f pos) {
    return obj_func(pos);
}

// ObjFuncWithData::ObjFuncWithData(function<float(const Eigen::MatrixXf &, Eigen::Vector2f)> obj_func,
//                                                      const Eigen::MatrixXf &data,
//                                                      size_t batch_size) : obj_func(obj_func),
//                                                                           data(data),
//                                                                           batch_size(batch_size) {}

// Eigen::Vector2f ObjFuncWithData::grad(Eigen::Vector2f pos)
// {
//     Eigen::MatrixXf batch;
//     batch(batch);

//     float h = 1e-5;
//     float grad_x = (obj_func(batch, Eigen::Vector2f(pos.x + h, pos.y)) - obj_func(batch, Eigen::Vector2f(pos.x - h, pos.y))) / (2.0 * h);
//     float grad_y = (obj_func(batch, Eigen::Vector2f(pos.x, pos.y + h)) - obj_func(batch, Eigen::Vector2f(pos.x, pos.y - h))) / (2.0 * h);

//     Eigen::Vector2f grad(grad_x, grad_y);
//     return grad;
// }

// void ObjFuncWithData::batch(Eigen::MatrixXf &batch)
// {
//     if (batches.empty())
//     {
//         vector<int> indices(data.rows());
//         iota(indices.begin(), indices.end(), 0);
//         random_shuffle(indices.begin(), indices.end());

//         for (int low = 0; low < data.rows(); low += batch_size)
//         {
//             int high = min(low + batch_size, data.rows());
//             batches.push(data(vector<int>(indices.begin() + low, indices.begin() + high), Eigen::placeholders::all));
//         }
//     }

//     batch = batches.front();
//     batches.pop();
// }
