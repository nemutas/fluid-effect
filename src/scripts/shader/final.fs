#version 300 es
precision highp float;

uniform vec2 resolution;
uniform sampler2D velocityTexture;
uniform sampler2D fillTexture;
uniform sampler2D image;
uniform vec2 coveredScale;

in vec2 vUv;
out vec4 outColor;

void main() {
  vec2 px = 1.0 / resolution;
  vec4 velocity;
  const float range = 5.0;
  const float halfRange = (range - 1.0) / 2.0;
  for (float i = -halfRange; i <= halfRange; i++) {
    for (float j = -halfRange; j <= halfRange; j++) {
      velocity += texture(velocityTexture, vUv + vec2(i, j) * px);
    }
  }
  velocity /= range * range;

  vec2 uv = (vUv - 0.5) * coveredScale + 0.5;

  vec3 color;
  color.r = texture(image, uv - velocity.xy * 0.020).r;
  color.g = texture(image, uv - velocity.xy * 0.025).g;
  color.b = texture(image, uv - velocity.xy * 0.030).b;

  float gray = dot(color, vec3(0.299, 0.587, 0.114));

  float fill = texture(fillTexture, vUv).r;

  color = mix(vec3(gray) * 0.25, color, fill);
  color = mix(color, pow(color * 2.5, vec3(2.0)), length(velocity.xy));

  vec3 effect = vec3(sin(velocity.x) * 0.5 + 0.5, sin(velocity.y) * 0.5 + 0.5, 0.5) * length(velocity.xy) * 1.5;
  color += effect * effect;

  outColor = vec4(color, 1.0);
  // outColor = vec4(vec3(fill), 1.0);
}