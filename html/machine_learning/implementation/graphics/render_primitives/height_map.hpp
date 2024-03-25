#ifndef GRADIENT_DESCENT_HEIGHT_MAP_HPP
#define GRADIENT_DESCENT_HEIGHT_MAP_HPP

#include <vector>
#include "div.hpp"
#include "glm/vec3.hpp"

// Drawable Indexed Vertices
class HeightMap {
public:
    std::vector<unsigned int> indices;
    std::vector<float> vertices; // flattened vertices in row major order
//    unsigned int *indices;
    unsigned int num_strips;
    unsigned int num_indices_per_strip;
    HeightMap(std::vector<float> data_points, int width, int height);
    void draw();
    void update_vertices_and_indices(float vertices[], int num_vertices, std::vector<unsigned int> indices, int num_indices);
    ShaderPipeline shader_pipeline;
private:
    unsigned int vertex_attribute_object, vertex_buffer_object, index_buffer_object;
    void bind_index_vertex_data_to_opengl_for_later_use() const;
    void bind_vertex_attribute_interpretation_to_opengl_for_later_use() const;
    void generate_opengl_vertex_array_and_buffers();
};


#endif //GRADIENT_DESCENT_HEIGHT_MAP_HPP
