#version 300 es
precision highp float;

uniform vec2 resolution;
uniform sampler2D velocityTexture;
uniform sampler2D fillTexture;

in vec2 vUv;
out vec4 outColor;

void main() {
  vec4 velocity = texture(velocityTexture, vUv);

  float prev;
  {
    vec2 px = 1.0 / resolution;
    const float range = 5.0;
    const float halfRange = (range - 1.0) / 2.0;
    for (float i = -halfRange; i <= halfRange; i++) {
      for (float j = -halfRange; j <= halfRange; j++) {
        prev += texture(fillTexture, vUv + vec2(i, j) * px).r;
      }
    }
    prev /= range * range;
  }

  float fill = min(prev + length(velocity.xy) * 0.5, 1.0);
  outColor = vec4(fill, 0.0, 0.0, 1.0);
}