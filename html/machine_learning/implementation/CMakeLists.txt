cmake_minimum_required(VERSION 3.10)

project(gradient_descent)

add_executable(gradient_descent
        main.cpp
        math/math.cpp
        graphics/graphics.cpp
)

# GLM: opengl mathematics
include_directories(external_libraries/glm)
add_subdirectory(external_libraries/glm)
