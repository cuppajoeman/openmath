#ifndef GRADIENT_DESCENT_DIV_HPP
#define GRADIENT_DESCENT_DIV_HPP

#include "../shader_pipeline/shader_pipeline.hpp"

// Drawable Indexed Vertices
class Div {
public:
    int num_vertices, num_indices;
    float *vertices;
    unsigned int *indices;
    Div(float vertices[], int num_vertices, unsigned int indices[], int num_indices);
    void draw();
    void update_vertices_and_indices(float vertices[], int num_vertices, unsigned int indices[], int num_indices);
    ShaderPipeline shader_pipeline;
private:
    unsigned int vertex_attribute_object, vertex_buffer_object, index_buffer_object;
    void bind_index_vertex_data_to_opengl_for_later_use() const;
    void bind_vertex_attribute_interpretation_to_opengl_for_later_use() const;
    void generate_opengl_vertex_array_and_buffers();
};

#endif //GRADIENT_DESCENT_DIV_HPP
