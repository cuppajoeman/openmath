#include "div.hpp"
#include "glad/gl.h"
#include <cstdio>

void Div::draw() {
    glUseProgram(shader_pipeline.shader_program_id);
    glBindVertexArray(vertex_attribute_object);
    glDrawElements(GL_TRIANGLES, this->num_indices, GL_UNSIGNED_INT, 0);
    glBindVertexArray(0); // unbinds current vertex_attribute_object
}

void Div::generate_opengl_vertex_array_and_buffers() {
    glGenVertexArrays(1, &vertex_attribute_object);
    glGenBuffers(1, &vertex_buffer_object);
    glGenBuffers(1, &index_buffer_object);
}

void Div::bind_index_vertex_data_to_opengl_for_later_use() const {

    glBindVertexArray(vertex_attribute_object);

    glBindBuffer(GL_ARRAY_BUFFER, vertex_buffer_object);
    glBufferData(GL_ARRAY_BUFFER, this->num_vertices * sizeof(float), vertices, GL_STATIC_DRAW);

    glBindBuffer(GL_ELEMENT_ARRAY_BUFFER, index_buffer_object);
    glBufferData(GL_ELEMENT_ARRAY_BUFFER, this->num_indices * sizeof(unsigned int), indices, GL_STATIC_DRAW);
}


void Div::bind_vertex_attribute_interpretation_to_opengl_for_later_use() const {
    // vertex positions
    GLuint position_attribute_location = glGetAttribLocation(shader_pipeline.shader_program_id, "position");
    glEnableVertexAttribArray(position_attribute_location);
    glVertexAttribPointer(position_attribute_location, 3, GL_FLOAT, GL_FALSE, 3 * sizeof(float), (void *) 0);
}

/**
 * precondition: opengl must be configured first
 */
Div::Div(float vertices[], int num_vertices, unsigned int indices[], int num_indices) {

    shader_pipeline.load_in_shaders_from_file("../graphics/shaders/CWL_v_transformation.vert", "../graphics/shaders/fixed_color.frag");
    this->generate_opengl_vertex_array_and_buffers();
    this->update_vertices_and_indices(vertices, num_vertices, indices, num_indices);
    this->bind_vertex_attribute_interpretation_to_opengl_for_later_use();
}


void Div::update_vertices_and_indices(float vertices[], int num_vertices, unsigned int indices[], int num_indices) {
    this->vertices = vertices;
    this->num_vertices = num_vertices;
    this->indices = indices;
    this->num_indices = num_indices;

    this->bind_index_vertex_data_to_opengl_for_later_use();
}