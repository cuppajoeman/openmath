#ifndef GRADIENT_DESCENT_GRAPHICS_HPP
#define GRADIENT_DESCENT_GRAPHICS_HPP

#include "shader_pipeline/shader_pipeline.hpp"
#include "../interaction/character/character.hpp"
#include "render_primitives/height_map.hpp"

void render(HeightMap height_map, Character character, Camera camera, int screen_width, int screen_height);

#endif //GRADIENT_DESCENT_GRAPHICS_HPP
