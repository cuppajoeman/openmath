#ifndef OBJECTIVE_FUNCTION_HPP
#define OBJECTIVE_FUNCTION_HPP

#include <Eigen/Dense>
#include <functional>
#include <queue>

using namespace std;

class ObjFunc
{
public:
    virtual ~ObjFunc(){};
    virtual Eigen::Vector2f grad(Eigen::Vector2f pos) = 0;
    virtual float eval(Eigen::Vector2f pos) = 0;
};

class ObjFuncWithoutData : public ObjFunc
{
public:
    ObjFuncWithoutData(function<float(Eigen::Vector2f)> obj_func);
    Eigen::Vector2f grad(Eigen::Vector2f pos);
    float eval(Eigen::Vector2f pos);

private:
    function<float(Eigen::Vector2f)> obj_func;
};

// class ObjFuncWithData : public ObjFunc
// {
// public:
//     ObjFuncWithData(function<float(const Eigen::MatrixXf &, Eigen::Vector2f)> obj_func,
//                               const Eigen::MatrixXf &data,
//                               size_t batch_size);
//     Eigen::Vector2f grad(Eigen::Vector2f pos);
//     float eval(Eigen::Vector2f pos);

// private:
//     function<float(const Eigen::MatrixXf &, Eigen::Vector2f)> obj_func;
//     const Eigen::MatrixXf &data;
//     size_t batch_size;
//     queue<Eigen::MatrixXf> batches;

//     void batch(Eigen::MatrixXf &batch);
// };

#endif // OBJECTIVE_FUNCTION_HPP
