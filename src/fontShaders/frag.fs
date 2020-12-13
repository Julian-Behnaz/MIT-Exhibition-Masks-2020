varying highp vec2 vTextureCoord;
varying highp vec2 msdfUnit;
uniform sampler2D fontTexture;

precision highp float;

vec4 bgColor = vec4(0.0,0.0,0.0,1.0);
vec4 fgColor = vec4(1.0);

float median(float r, float g, float b) {
    return max(min(r, g), min(max(r, g), b));
}

void main() {
    vec3 smp = texture2D(fontTexture, vTextureCoord).rgb;
    float sigDist = median(smp.r, smp.g, smp.b) - 0.5;
    // sigDist*=length(msdfUnit);

    float alpha = clamp(sigDist + 0.5, 0.0, 1.0);

    sigDist *= dot(msdfUnit, 0.5/fwidth(vTextureCoord));
    float opacity = clamp(sigDist + 0.5, 0.0, 1.0);
    gl_FragColor = mix(bgColor, fgColor, opacity);
    gl_FragColor = mix(bgColor, gl_FragColor, alpha);
}