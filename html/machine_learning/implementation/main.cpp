/*
 * I can make a window, mouse/keyboard input, draw the things
*/

#include <cstdio>
#include "math/math.hpp"

#include <glad/gl.h>
#include <GLFW/glfw3.h>

#include <glm/glm.hpp>

#include <optional>
#include <vector>

#include "interaction/character/character.hpp"
#include "interaction/camera/camera.hpp"
#include "interaction/mouse/mouse.hpp"

#include "graphics/shader_pipeline/shader_pipeline.hpp"
#include "graphics/window/window.hpp"
#include "graphics/graphics.hpp"
#include "graphics/render_primitives/div.hpp"
#include "graphics/render_primitives/height_map.hpp"

const unsigned int SCR_WIDTH = 800;
const unsigned int SCR_HEIGHT = 600;

Character character;
Camera camera;
Mouse mouse;

float deltaTime = 0.0f;
float lastFrame = 0.0f;

// glfw: whenever the window size changed (by OS or user resize) this callback function executes
void on_window_size_change(GLFWwindow* window, int width, int height)
{
    // make sure the viewport matches the new window dimensions; note that width and
    // height will be significantly larger than specified on retina displays.
    glViewport(0, 0, width, height);
}

void on_mouse_move(GLFWwindow* window, double mouse_position_x, double mouse_position_y) {
    auto [change_in_yaw_angle, change_in_pitch_angle] = mouse.get_yaw_pitch_deltas(mouse_position_x, mouse_position_y)    ;
    camera.update_look_direction(change_in_yaw_angle, change_in_pitch_angle);
}

// process all input: query GLFW whether relevant keys are pressed/released this frame and react accordingly
void process_input(GLFWwindow *window)
{
    if (glfwGetKey(window, GLFW_KEY_ESCAPE) == GLFW_PRESS)
        glfwSetWindowShouldClose(window, true);

    glm::vec3 strafe_direction = glm::cross(camera.look_direction, camera.up_direction);

    if (glfwGetKey(window, GLFW_KEY_W) == GLFW_PRESS)
        character.position += camera.look_direction * deltaTime;
    if (glfwGetKey(window, GLFW_KEY_S) == GLFW_PRESS)
        character.position -= camera.look_direction * deltaTime;
    if (glfwGetKey(window, GLFW_KEY_D) == GLFW_PRESS)
        character.position += strafe_direction * deltaTime;
    if (glfwGetKey(window, GLFW_KEY_A) == GLFW_PRESS)
        character.position -= strafe_direction * deltaTime;
    if (glfwGetKey(window, GLFW_KEY_LEFT_SHIFT) == GLFW_PRESS)
        character.position -= camera.up_direction * deltaTime;
    if (glfwGetKey(window, GLFW_KEY_SPACE) == GLFW_PRESS)
        character.position += camera.up_direction * deltaTime;
}


std::optional<GLFWwindow *> initialize() {

    auto optional_window = initialize_glfw_and_return_window(SCR_WIDTH, SCR_HEIGHT);

    if (!optional_window.has_value()) {
        return std::nullopt;
    }

    GLFWwindow * window = optional_window.value();

    glfwSetFramebufferSizeCallback(window, on_window_size_change);
    glfwSetCursorPosCallback(window, on_mouse_move);
    mouse.configure_with_glfw(window);

    glEnable(GL_DEPTH_TEST); // configure global opengl state

    return {window};

}

int main() {

    std::optional<GLFWwindow*> id = initialize();
    if (!id.has_value()) {
        return -1;
    }
    auto window = id.value();

    std::vector<float> parabola_points;

    int range = 100;
    for (float x = -range/2; x < range/2; x++) {
        for (float y = -range/2; y < range/2; y++) {
            parabola_points.push_back(x);
            parabola_points.push_back( x + y );
            parabola_points.push_back(y);
        }
    }

    HeightMap height_map(parabola_points, range, range);

//    float vertices[] = {
//            0.5f,  0.5f, 3.0f,  // top right
//            0.5f, -0.5f, 0.0f,  // bottom right
//            -0.5f, -0.5f, 3.0f,  // bottom left
//            -0.5f,  0.5f, 0.0f   // top left
//    };
//    unsigned int indices[] = {  // note that we start from 0!
//            0, 1, 3,   // first triangle
//            1, 2, 3    // second triangle
//    };
//
//    Div heightmap(vertices, 12, indices, 6);

    while (!glfwWindowShouldClose(window))
    {
        // per-frame time logic
        float currentFrame = static_cast<float>(glfwGetTime());
        deltaTime = currentFrame - lastFrame;
        lastFrame = currentFrame;

        process_input(window);
        render(height_map, character, camera, SCR_WIDTH, SCR_HEIGHT);

        // glfw: swap buffers and poll IO events (keys pressed/released, mouse moved etc.)
        glfwSwapBuffers(window);
        glfwPollEvents();
    }


    glfwTerminate(); // glfw: terminate, clearing all previously allocated GLFW resources.
    return 0;
}


//int main() {
//    glm::vec2 grad = get_gradient_general();
//    printf("%f", grad.x);
//}