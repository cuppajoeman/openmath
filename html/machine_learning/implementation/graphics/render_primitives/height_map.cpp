#include "height_map.hpp"

#include "glad/gl.h"
#include <cstdio>
#include <utility>

void HeightMap::draw() {
    glUseProgram(shader_pipeline.shader_program_id);
    glBindVertexArray(vertex_attribute_object);

    for (unsigned int strip = 0; strip < num_strips; strip++) {
        glDrawElements(GL_TRIANGLE_STRIP, num_indices_per_strip, GL_UNSIGNED_INT, (void *)(sizeof(unsigned int) * num_indices_per_strip * strip));
    }

    glBindVertexArray(0); // unbinds current vertex_attribute_object
}

void HeightMap::generate_opengl_vertex_array_and_buffers() {
    glGenVertexArrays(1, &vertex_attribute_object);
    glGenBuffers(1, &vertex_buffer_object);
    glGenBuffers(1, &index_buffer_object);
}

void HeightMap::bind_index_vertex_data_to_opengl_for_later_use() const {

    glBindVertexArray(vertex_attribute_object);

    glBindBuffer(GL_ARRAY_BUFFER, vertex_buffer_object);
    glBufferData(GL_ARRAY_BUFFER, vertices.size() * sizeof(float), &vertices[0], GL_STATIC_DRAW);

    glBindBuffer(GL_ELEMENT_ARRAY_BUFFER, index_buffer_object);
    glBufferData(GL_ELEMENT_ARRAY_BUFFER, vertices.size() * sizeof(unsigned int), &indices[0], GL_STATIC_DRAW);
}


void HeightMap::bind_vertex_attribute_interpretation_to_opengl_for_later_use() const {
    // vertex positions
    GLuint position_attribute_location = glGetAttribLocation(shader_pipeline.shader_program_id, "position");
    glEnableVertexAttribArray(position_attribute_location);
    glVertexAttribPointer(position_attribute_location, 3, GL_FLOAT, GL_FALSE, 3 * sizeof(float), (void *) 0);
}

/**
 * precondition: opengl must be configured first
 */
HeightMap::HeightMap(std::vector<float> data_points, int width, int height) {

    // get indices in row major order
    for(unsigned y = 0; y < height-1; y += 1) // - 1 because we look ahead one row.
    {
        for(unsigned x = 0; x < width; x += 1)
        {
            for(unsigned k = 0; k < 2; k++) // add at this x pos, and exactly in the next row below.
            {
                indices.push_back(x + width * (y + k));
            }
        }
    }
    vertices = std::move(data_points);
    num_strips = height - 1;
    num_indices_per_strip = width * 2;
    // note that in a strip there are num_indices_per_strip - 2 triangles because the first two indices boostrap the
    // process and subsequently every new index produces a new triangle

    //    float vertices[], int num_vertices, unsigned int indices[], int num_indices
    shader_pipeline.load_in_shaders_from_file("../graphics/shaders/CWL_v_transformation.vert", "../graphics/shaders/fixed_color.frag");
    this->generate_opengl_vertex_array_and_buffers();
    this->bind_index_vertex_data_to_opengl_for_later_use();
    this->bind_vertex_attribute_interpretation_to_opengl_for_later_use();
}


//// TODO we probably don't need this anymore?
//void HeightMap::update_vertices_and_indices(float vertices[], int num_vertices, std::vector<unsigned int> indices, int num_indices) {
//    this->vertices = vertices;
//    this->num_vertices = num_vertices;
//    this->indices = indices;
//    this->num_indices = num_indices;
//
//    this->bind_index_vertex_data_to_opengl_for_later_use();
//}
