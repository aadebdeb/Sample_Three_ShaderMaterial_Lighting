const diffuseColor = new THREE.Color(0xffffff);

const shaderMat = new THREE.ShaderMaterial({
  vertexShader: `
varying vec3 vViewPosition;
varying vec3 vNormal;

void main(void) {
  vNormal = normalMatrix * normal;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  vViewPosition = mvPosition.xyz;
  gl_Position = projectionMatrix * mvPosition;
}
  `,
  fragmentShader: `
uniform vec3 diffuse;
uniform vec3 emissive;

varying vec3 vViewPosition;
varying vec3 vNormal;

#include <common>
#include <bsdfs>
#include <lights_pars_begin>

void main(void) {
  vec3 mvPosition = vViewPosition;
  vec3 transformedNormal = vNormal;
  
  // ref: https://github.com/mrdoob/three.js/blob/master/src/renderers/shaders/ShaderChunk/lights_lambert_vertex.glsl.js
  GeometricContext geometry;
  geometry.position = mvPosition.xyz;
  geometry.normal = normalize(transformedNormal);
  geometry.viewDir = (normalize(-mvPosition.xyz));
  vec3 lightFront = vec3(0.0);
  vec3 indirectFront = vec3(0.0);
  IncidentLight directLight;
  float dotNL;
  vec3 directLightColor_Diffuse;
  #if NUM_POINT_LIGHTS > 0
  #pragma unroll_loop
  for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
    getPointDirectLightIrradiance(pointLights[ i ], geometry, directLight);
    dotNL = dot(geometry.normal, directLight.direction);
    directLightColor_Diffuse = PI * directLight.color;
    lightFront += saturate(dotNL) * directLightColor_Diffuse;
	}
  #endif
  #if NUM_SPOT_LIGHTS > 0
  #pragma unroll_loop
  for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {
    getSpotDirectLightIrradiance(spotLights[ i ], geometry, directLight);
    dotNL = dot(geometry.normal, directLight.direction);
    directLightColor_Diffuse = PI * directLight.color;
    lightFront += saturate(dotNL) * directLightColor_Diffuse;
  }
  #endif
  #if NUM_DIR_LIGHTS > 0
  #pragma unroll_loop
  for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
    getDirectionalDirectLightIrradiance(directionalLights[ i ], geometry, directLight);
    dotNL = dot(geometry.normal, directLight.direction);
    directLightColor_Diffuse = PI * directLight.color;
    lightFront += saturate(dotNL) * directLightColor_Diffuse;
  }
  #endif
  #if NUM_HEMI_LIGHTS > 0
  #pragma unroll_loop
  for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {
    indirectFront += getHemisphereLightIrradiance( hemisphereLights[ i ], geometry );
  }
  #endif

  // ref: https://github.com/mrdoob/three.js/blob/dev/src/renderers/shaders/ShaderLib/meshlambert_frag.glsl.js
  vec4 diffuseColor = vec4(diffuse, 1.0);
  ReflectedLight reflectedLight = ReflectedLight(vec3(0.0), vec3(0.0), vec3(0.0), vec3(0.0));
  vec3 totalEmissiveRadiance = emissive;
  reflectedLight.indirectDiffuse = getAmbientLightIrradiance(ambientLightColor);
  reflectedLight.indirectDiffuse += indirectFront;
  reflectedLight.indirectDiffuse *= BRDF_Diffuse_Lambert(diffuseColor.rgb);
  reflectedLight.directDiffuse = lightFront;
  reflectedLight.directDiffuse *= BRDF_Diffuse_Lambert(diffuseColor.rgb);
  vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	gl_FragColor = vec4(outgoingLight, diffuseColor.a);
}
  `,
  uniforms: THREE.UniformsUtils.merge([
    THREE.UniformsLib.lights,
    {
      'diffuse': { value: diffuseColor },
      'emissive': { value: new THREE.Color(0x000000) },
    }
  ]),
  lights: true,
});

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const lambertMat = new THREE.MeshLambertMaterial({color: diffuseColor});

const cubeGeom = new THREE.BoxBufferGeometry();
const sphereGeom = new THREE.SphereBufferGeometry();
const torusKnotGeom = new THREE.TorusKnotBufferGeometry();

const shaderGrp = new THREE.Group();
shaderGrp.position.z = 1.5;
const cubeS = new THREE.Mesh(cubeGeom, shaderMat);
cubeS.position.x = 2.0;
shaderGrp.add(cubeS);
const sphereS = new THREE.Mesh(sphereGeom, shaderMat);
shaderGrp.add(sphereS);
const torusKnotS = new THREE.Mesh(torusKnotGeom, shaderMat);
torusKnotS.position.x = -3.0;
shaderGrp.add(torusKnotS);
scene.add(shaderGrp);

const lambertGrp = new THREE.Group();
lambertGrp.position.z = -2.0;
const cubeL = new THREE.Mesh(cubeGeom, lambertMat);
cubeL.position.x = 1.5;
lambertGrp.add(cubeL);
const sphereL = new THREE.Mesh(sphereGeom, lambertMat);
lambertGrp.add(sphereL);
const torusKnotL = new THREE.Mesh(torusKnotGeom, lambertMat);
torusKnotL.position.x = -3.0;
lambertGrp.add(torusKnotL);
scene.add(lambertGrp);

const ambientLight = new THREE.AmbientLight(0x404040, 0.2);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0x0000cc, 0.3);
scene.add(directionalLight);

const pointLight = new THREE.PointLight(0xcc0000, 0.7);
pointLight.position.set(0.0, 2.0, 0.0);
scene.add(pointLight);

const spotLight = new THREE.SpotLight(0x00cc00, 0.3);
spotLight.position.set(0.0, 2.0, 0.0);
scene.add(spotLight);

const hemisphereLight = new THREE.HemisphereLight(0x666600, 0x006666, 0.3);
scene.add(hemisphereLight);

camera.position.x = 3;
camera.position.y = 3;
camera.position.z = 3;
camera.lookAt(new THREE.Vector3());

function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene,camera);
}

const gui = new dat.GUI();

const parameters = {
  'ambient': ambientLight.intensity,
  'directional': directionalLight.intensity,
  'point': pointLight.intensity,
  'spot': spotLight.intensity,
  'hemisphere': hemisphereLight.intensity,
}

gui.add(parameters, 'ambient', 0, 1).onChange((v) => ambientLight.intensity = v);
gui.add(parameters, 'directional', 0, 1).onChange((v) => directionalLight.intensity = v);
gui.add(parameters, 'point', 0, 1).onChange((v) => pointLight.intensity = v);
gui.add(parameters, 'spot', 0, 1).onChange((v) => spotLight.intensity = v);
gui.add(parameters, 'hemisphere', 0, 1).onChange((v) => hemisphereLight.intensity = v);

animate();

addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / innerHeight;
  camera.updateProjectionMatrix();
});