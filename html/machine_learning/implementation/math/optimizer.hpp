#ifndef OPTIMIZER_HPP
#define OPTIMIZER_HPP

#include <vector>

#include "objective_function.hpp"

using namespace std;

class Optim
{
public:
    virtual ~Optim(){};
    virtual Eigen::Vector2f update_pos() = 0;
};

class VanillaOptim : public Optim
{
public:
    VanillaOptim(ObjFunc &obj_func,
                 float alpha,
                 Eigen::Vector2f init_pos);
    Eigen::Vector2f update_pos();

private:
    ObjFunc &obj_func;
    float alpha;
    Eigen::Vector2f pos;
};

class MomentumOptim : public Optim
{
public:
    MomentumOptim(ObjFunc &obj_func,
                  float alpha,
                  float beta,
                  Eigen::Vector2f init_pos);
    Eigen::Vector2f update_pos();

private:
    ObjFunc &obj_func;
    float alpha;
    float beta;
    Eigen::Vector2f pos;
    Eigen::Vector2f vel;
};

#endif // OPTIMIZER_HPP
