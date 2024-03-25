#include "graphics.hpp"

#include <glad/gl.h>
#include <GLFW/glfw3.h>

#include <glm/gtc/matrix_transform.hpp>
#include <glm/gtc/type_ptr.hpp>
#include <vector>

void render(HeightMap height_map, Character character, Camera camera, int screen_width, int screen_height) {
    glClearColor(0.05f, 0.05f, 0.05f, 1.0f);
    glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);

    // don't forget to enable shader before setting uniforms
    glUseProgram(height_map.shader_pipeline.shader_program_id);

    // view/projection transformations
    glm::mat4 camera_to_clip = glm::perspective(glm::radians(75.0f), (float)screen_width / (float)screen_height, 0.1f, 100.0f);
    GLint camera_to_clip_uniform_location = glGetUniformLocation(height_map.shader_pipeline.shader_program_id, "camera_to_clip");
    glUniformMatrix4fv(camera_to_clip_uniform_location , 1, GL_FALSE, glm::value_ptr(camera_to_clip));

    glm::mat4 world_to_camera = glm::lookAt(character.position, character.position + camera.look_direction, camera.up_direction);
    GLint world_to_camera_uniform_location = glGetUniformLocation(height_map.shader_pipeline.shader_program_id, "world_to_camera");
    glUniformMatrix4fv(world_to_camera_uniform_location, 1, GL_FALSE, glm::value_ptr(world_to_camera));

    // render the loaded model
    glm::mat4 local_to_world = glm::mat4(1.0f);
    local_to_world = glm::translate(local_to_world, glm::vec3(0.0f, 0.0f, 0.0f)); // translate it down so it's at the center of the scene
    local_to_world = glm::scale(local_to_world, glm::vec3(1.0f, 1.0f, 1.0f));	// it's a bit too big for our scene, so scale it down


    GLint local_to_world_uniform_location = glGetUniformLocation(height_map.shader_pipeline.shader_program_id, "local_to_world");
    glUniformMatrix4fv(local_to_world_uniform_location , 1, GL_FALSE, glm::value_ptr(local_to_world));

    glPolygonMode( GL_FRONT_AND_BACK, GL_LINE );

    height_map.draw();
}