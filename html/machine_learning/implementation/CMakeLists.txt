cmake_minimum_required(VERSION 3.10)

project(gradient_descent)

add_executable(gradient_descent
        main.cpp
        math/objective_function.cpp
        math/optimizer.cpp
        math/util.cpp
        graphics/graphics.cpp
)

# GLM: opengl mathematics
include_directories(external_libraries/glm)
add_subdirectory(external_libraries/glm)

# Eigen: linear algebra supporting arbitrary matrix sizes
add_subdirectory(external_libraries/eigen)
target_include_directories(gradient_descent PRIVATE external_libraries/eigen)
