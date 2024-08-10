#version 300 es
precision highp float;

uniform vec2 resolution;
uniform sampler2D velocityTexture;
uniform sampler2D fillTexture;

in vec2 vUv;
out vec4 outColor;

#include './glsl/packing.glsl'

void main() {
  vec4 velocity = texture(velocityTexture, vUv);

  float prev = unpackRGBAToDepth(texture(fillTexture, vUv));

  float fill = min(prev + length(velocity.xy) * 0.5, 1.0);
  outColor = packDepthToRGBA(fill);
}