#include "optimizer.hpp"

using namespace std;

VanillaOptim::VanillaOptim(ObjFunc &obj_func,
                                   float alpha,
                                   Eigen::Vector2f init_pos) : obj_func(obj_func),
                                                               alpha(alpha),
                                                               pos(init_pos) {}

Eigen::Vector2f VanillaOptim::update_pos()
{
    pos = pos - alpha * obj_func.grad(pos);
    return pos;
}

MomentumOptim::MomentumOptim(ObjFunc &obj_func,
                                     float alpha,
                                     float beta,
                                     Eigen::Vector2f init_pos) : obj_func(obj_func),
                                                                 alpha(alpha),
                                                                 beta(beta),
                                                                 pos(init_pos),
                                                                 vel(Eigen::Vector2f(0.f, 0.f)) {}

Eigen::Vector2f MomentumOptim::update_pos()
{
    vel = beta * vel + obj_func.grad(pos);
    pos = pos - alpha * vel;
    return pos;
}
