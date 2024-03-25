cmake_minimum_required(VERSION 3.10)

project(gradient_descent)

add_executable(gradient_descent
        main.cpp
        math/math.cpp

        graphics/graphics.cpp
        graphics/shader_pipeline/shader_pipeline.cpp
        graphics/window/window.cpp
        graphics/render_primitives/div.cpp

        interaction/character/character.hpp
        interaction/mouse/mouse.cpp
        interaction/camera/camera.cpp
        graphics/render_primitives/height_map.cpp
        graphics/render_primitives/height_map.hpp
)

# GLM: opengl mathematics
include_directories(external_libraries/glm)
add_subdirectory(external_libraries/glm)

# GLAD: opengl function loader

include_directories(external_libraries/glad_opengl_3.3_core/include)
add_subdirectory(external_libraries/glad_opengl_3.3_core)


# GLFW: opengl framework

# disable unnessary steps in build
set(GLFW_BUILD_DOCS OFF CACHE BOOL "" FORCE)
set(GLFW_BUILD_TESTS OFF CACHE BOOL "" FORCE)
set(GLFW_BUILD_EXAMPLES OFF CACHE BOOL "" FORCE)

add_subdirectory(external_libraries/glfw)

target_link_libraries(gradient_descent glfw glad)