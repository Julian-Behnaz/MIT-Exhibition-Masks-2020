varying highp vec2 vTextureCoord;
varying vec2 msdfUnit;

float pxRange = 4.0;
attribute vec4 atlasRegion;
vec2 textureSize = vec2(1024,1024);

vec2 linMap(vec2 out1, vec2 out2, vec2 inV) {
  return out1 + inV*(out2 - out1);
}

void main() {
    // vec4 modelViewPosition = modelViewMatrix * vec4(position, 1.0);
    // gl_Position = projectionMatrix * modelViewPosition; 
    msdfUnit = pxRange/vec2(textureSize);
    vTextureCoord = 
        linMap(atlasRegion.xy/textureSize,
        atlasRegion.zw/textureSize,
        ((position.xy+1.0)*0.5));

    gl_Position = 
        projectionMatrix * viewMatrix * //from THREE.Camera
        modelMatrix * //from THREE.Mesh
        instanceMatrix * //we add this to the chain, 
        vec4(position,1.0) //from THREE.BufferGeometry
    ;
}