import * as THREE from 'three';
import Stats from 'three/examples/jsm/libs/stats.module';
import Detector from './detector.js';
import edgeTable from './edgeTable.js'
import triTable from './triTable.js'
import ConvexHull from 'three/examples/jsm/math/ConvexHull.js'
import { Face3 } from './Geometry.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// standard global variables for Three.js
var container, scene, camera, renderer, stats, controls;
var clock = new THREE.Clock();

var width, height, canvasCubeSize;
if (window.innerHeight >= window.innerWidth) {
    var width = window.innerWidth;
    var height = window.innerWidth;
    canvasCubeSize = height * 0.6;
} else {
    var width = window.innerHeight;
    var height = window.innerHeight;
    canvasCubeSize = width * 0.6;
}

var metaballsMesh, colorMaterial;
var xPos = canvasCubeSize / 3;
var values = [];
var points = [];
let pointsAsVectors = [];

/////////////////////////////////////
// Marching cubes lookup tables
/////////////////////////////////////

// These tables are straight from Paul Bourke's page:
// http://paulbourke.net/geometry/polygonise/
// who in turn got them from Cory Gene Bloyd.

init();
animate();

// FUNCTIONS 		
function init() {
    // SCENE
    scene = new THREE.Scene();
    // CAMERA
    camera = new THREE.OrthographicCamera(width / -2, width / 2, height / 2, height / -2, 1, 5000);
    scene.add(camera);
    // camera.position.set(10, 5, 10);
    camera.position.set(canvasCubeSize, canvasCubeSize, canvasCubeSize);
    camera.lookAt(scene.position);

    //create boundary box
    var boundCube_geom = new THREE.BoxGeometry(canvasCubeSize, canvasCubeSize, canvasCubeSize);
    var boundCube_mat = new THREE.MeshBasicMaterial({
        wireframe: true,
        visible: true,
        color: 0xffffff
    });
    // boundCube_mat.visible = true;
    var boundCube_mesh = new THREE.Mesh(boundCube_geom, boundCube_mat);
    scene.add(boundCube_mesh);

    // RENDERER
    if (Detector.webgl)
        renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
    else
        renderer = new THREE.CanvasRenderer();
    renderer.setSize(width, height);
    document.body.appendChild(renderer.domElement);
    // LIGHT
    var light = new THREE.PointLight(0xff0000);
    light.position.set(10, 0, 0);
    scene.add(light);
    var light = new THREE.PointLight(0x00cc00);
    light.position.set(0, 10, 0);
    scene.add(light);
    var light = new THREE.PointLight(0x0000ff);
    light.position.set(0, 0, 10);
    scene.add(light);
    var light = new THREE.PointLight(0x333333);
    light.position.set(-10, -10, -10);
    scene.add(light);
    //var light = new THREE.AmbientLight(0x333333);
    //scene.add(light);

    ////////////
    // CUSTOM //
    ////////////

    var axisMin = -(canvasCubeSize / 2);
    var axisMax = canvasCubeSize / 2;
    var axisRange = axisMax - axisMin;

    scene.add(new THREE.AxisHelper(axisMax));

    // The Marching Cubes Algorithm draws an isosurface of a given value.
    // To use this for a Metaballs simulation, we need to:
    // (1) Initialize the domain - create a grid of size*size*size points in space
    // (2) Initialize the range  - a set of values, corresponding to each of the points, to zero.
    // (3) Add 1 to values array for points on boundary of the sphere;
    //       values should decrease to zero quickly for points away from sphere boundary.
    // (4) Repeat step (3) as desired
    // (5) Implement Marching Cubes algorithm with isovalue slightly less than 1.


    // (1) Initialize the domain - create a grid of size*size*size points in space

    var size = 9;
    var size2 = size * size;
    var size3 = size * size * size;

    var colors = [];

    // generate the list of 3D points
    for (var k = 0; k < size; k++) {
        for (var j = 0; j < size; j++) {
            for (var i = 0; i < size; i++) {
                var x = axisMin + axisRange * i / (size - 1);
                var y = axisMin + axisRange * j / (size - 1);
                var z = axisMin + axisRange * k / (size - 1);
                points.push(x, y, z);
            }
        }
    }

    // (2) Initialize the range  - a set of values, corresponding to each of the points, to zero.

    // initialize values
    for (var i = 0; i < size3; i++) values[i] = 0;

    // (3) Add 1 to values array for points on boundary of the sphere;
    //      Negative values are inside the ball, poz are outside

    addBallOld(points, values, new THREE.Vector3(0, 0, 0), canvasCubeSize / 6);
    addBallOld(points, values, new THREE.Vector3(canvasCubeSize / 3, 0, 0), canvasCubeSize / 6);

    var maxVal = Math.max(...values);
    var minVal = Math.min(...values);
    var medVal = (maxVal + minVal) / 2;

    console.log("medVal = " + medVal);

    for (var i = 0; i < values.length; i++) {
        if (values[i] > medVal) colors.push(0.3, 0, 0); //If this point is outside the ball
        else colors.push(1, 0, 0); //If this point is inside the ball
    }
    var pointsVisualizer_g = new THREE.BufferGeometry();
    pointsVisualizer_g.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    pointsVisualizer_g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    pointsVisualizer_g.computeBoundingSphere();
    var pointsVisualizer_m = new THREE.PointsMaterial({ size: 10, vertexColors: true });
    var pointsVisualizer_mesh = new THREE.Points(pointsVisualizer_g, pointsVisualizer_m);
    scene.add(pointsVisualizer_mesh);

    // (5) Implement Marching Cubes algorithm with isovalue slightly less than 1.

    // isolevel = 0.5;
    for (let i = 0; i < points.length; i += 3) {
        var v = new THREE.Vector3(points[i], points[i + 1], points[i + 2]);
        pointsAsVectors.push(v);
    }

    var geometry = marchingCubes(pointsAsVectors, values, 0.5);

    colorMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00, side: THREE.DoubleSide });
    metaballsMesh = new THREE.Mesh(geometry, colorMaterial);
    scene.add(metaballsMesh);

    controls = new OrbitControls(camera, renderer.domElement);

}

function animate() {
    requestAnimationFrame(animate);
    render();
    update();
}

var doOnce = false;

function update() {
    controls.update();

    xPos -= 0.3;

    // resetValues(values);
    // addBall(points, values, new THREE.Vector3(0, 0, 0), canvasCubeSize / 6);
    // addBall(points, values, new THREE.Vector3(xPos, 0, 0), canvasCubeSize / 6);

    // scene.remove(metaballsMesh);
    // if (!doOnce) {
    //     console.log("points = ", points);
    //     doOnce = true;
    // }
    // var newGeometry = marchingCubes(pointsAsVectors, values, 0.5);
    // metaballsMesh = new THREE.Mesh(newGeometry, colorMaterial);
    // scene.add(metaballsMesh);
}

function render() {
    renderer.render(scene, camera);
}

// METABALLS FUNCTIONS

function resetValues(values) {
    for (var i = 0; i < values.length; i++)
        values[i] = 0;
}


// add values corresponding to a ball with radius 1 to values array
function addBallOld(points, values, center, radius) {
    let j = 0;
    for (var i = 0; i < values.length; i++) {
        var pointAsVector = new THREE.Vector3(points[j], points[j + 1], points[j + 2]);
        var OneMinusD2 = 1.0 - center.distanceToSquared(pointAsVector);
        console.log(i + " --------- Old value = " + (-(OneMinusD2 * OneMinusD2)));

        values[i] += Math.exp(-(OneMinusD2 * OneMinusD2));
        console.log("New value = " + values[i]);

        j += 3;
    }
}


// add values corresponding to a ball with radius 1 to values array
// This is not adding a new set of values for every ball. It's actually adding a value to the existing value for
// every new ball.
function addBall(points, values, center, radius) {
    // values = distance of each point from circle surface
    let j = 0;
    // For each point, calc its distance to the ball center
    for (var i = 0; i < values.length; i++) {
        var pointAsVector = new THREE.Vector3(points[j], points[j + 1], points[j + 2]);
        var distFromCenter = center.distanceTo(pointAsVector);
        var distFromSurface = distFromCenter - radius;
        console.log(i + " -------------- distFromSurface: " + (-1 * distFromSurface));
        values[i] += -(distFromSurface);
        console.log("New value = " + values[i]);
        j += 3;
    }
}


// MARCHING CUBES ALGORITHM
// parameters: domain points, range values, isolevel 
// returns: geometry
function marchingCubes(points, values, isolevel) {
    // assumes the following global values have been defined: 
    //   edgeTable, triTable

    // console.log("points = ", points);
    // console.log("values = ", points);

    isolevel = 4.0;
    var size = Math.round(Math.pow(values.length, 1 / 3));
    var size2 = size * size;
    var size3 = size * size * size;

    // Vertices may occur along edges of cube, when the values at the edge's endpoints
    //   straddle the isolevel value.
    // Actual position along edge weighted according to function values.
    var vlist = new Array(12);

    var geometry = new THREE.BufferGeometry();
    //var geometry;
    var verts = [];
    var vertexIndex = 0;

    for (var z = 0; z < size - 1; z++) {
        for (var y = 0; y < size - 1; y++) {
            for (var x = 0; x < size - 1; x++) {

                // These are the 8 points that make up the 8 corners of this cube
                // index of base point, and also adjacent points on cube
                var p = x + size * y + size2 * z,
                    px = p + 1,
                    py = p + size,
                    pxy = py + 1,
                    pz = p + size2,
                    pxz = px + size2,
                    pyz = py + size2,
                    pxyz = pxy + size2;

                // console.log("p: " + p);
                // console.log("px: " + px);
                // console.log("py: " + py);
                // console.log("pxy: " + pxy);
                // console.log("pz: " + pz);
                // console.log("pxz: " + pxz);
                // console.log("pyz: " + pyz);
                // console.log("pxyz: " + pxyz);

                // store scalar values corresponding to vertices
                var value0 = values[p],
                    value1 = values[px],
                    value2 = values[py],
                    value3 = values[pxy],
                    value4 = values[pz],
                    value5 = values[pxz],
                    value6 = values[pyz],
                    value7 = values[pxyz];

                // place a "1" in bit positions corresponding to vertices whose
                //   isovalue is less than given constant.

                //all values are GREATER THAN 0.5, and they're all IDENTICAL

                var cubeindex = 0;
                if (value0 < isolevel) cubeindex |= 1;
                if (value1 < isolevel) cubeindex |= 2;
                if (value2 < isolevel) cubeindex |= 8;
                if (value3 < isolevel) cubeindex |= 4;
                if (value4 < isolevel) cubeindex |= 16;
                if (value5 < isolevel) cubeindex |= 32;
                if (value6 < isolevel) cubeindex |= 128;
                if (value7 < isolevel) cubeindex |= 64;

                //console.log("cube idx = " + cubeindex);

                // bits = 12 bit number, indicates which edges are crossed by the isosurface
                var bits = edgeTable[cubeindex];

                //console.log("bits = ", bits);

                // if none are crossed, proceed to next iteration
                if (bits === 0) {
                    //console.log("No bits are crossed.");
                    continue;
                }

                // check which edges are crossed, and estimate the point location
                //    using a weighted average of scalar values at edge endpoints.
                // store the vertex in an array for use later.
                var mu = 0.5;

                // bottom of the cube
                if (bits & 1) {
                    mu = (isolevel - value0) / (value1 - value0);
                    vlist[0] = points[p].clone().lerp(points[px], mu);
                    // console.log("bottom of cube, mu = ", mu);
                    // console.log("bottom of cube, points[px] = ", points[px]);
                }
                if (bits & 2) {
                    mu = (isolevel - value1) / (value3 - value1);
                    vlist[1] = points[px].clone().lerp(points[pxy], mu);
                }
                if (bits & 4) {
                    mu = (isolevel - value2) / (value3 - value2);
                    vlist[2] = points[py].clone().lerp(points[pxy], mu);
                }
                if (bits & 8) {
                    mu = (isolevel - value0) / (value2 - value0);
                    vlist[3] = points[p].clone().lerp(points[py], mu);
                }
                // top of the cube
                if (bits & 16) {
                    mu = (isolevel - value4) / (value5 - value4);
                    vlist[4] = points[pz].clone().lerp(points[pxz], mu);
                }
                if (bits & 32) {
                    mu = (isolevel - value5) / (value7 - value5);
                    vlist[5] = points[pxz].clone().lerp(points[pxyz], mu);
                }
                if (bits & 64) {
                    mu = (isolevel - value6) / (value7 - value6);
                    vlist[6] = points[pyz].clone().lerp(points[pxyz], mu);
                }
                if (bits & 128) {
                    mu = (isolevel - value4) / (value6 - value4);
                    vlist[7] = points[pz].clone().lerp(points[pyz], mu);
                }
                // vertical lines of the cube
                if (bits & 256) {
                    mu = (isolevel - value0) / (value4 - value0);
                    vlist[8] = points[p].clone().lerp(points[pz], mu);
                }
                if (bits & 512) {
                    mu = (isolevel - value1) / (value5 - value1);
                    vlist[9] = points[px].clone().lerp(points[pxz], mu);
                }
                if (bits & 1024) {
                    mu = (isolevel - value3) / (value7 - value3);
                    vlist[10] = points[pxy].clone().lerp(points[pxyz], mu);
                }
                if (bits & 2048) {
                    mu = (isolevel - value2) / (value6 - value2);
                    vlist[11] = points[py].clone().lerp(points[pyz], mu);
                }

                // construct triangles -- get correct vertices from triTable.
                var i = 0;
                cubeindex <<= 4;  // multiply by 16... 
                // "Re-purpose cubeindex into an offset into triTable." 
                //  since each row really isn't a row.

                // the while loop should run at most 5 times,
                //   since the 16th entry in each row is a -1.
                while (triTable[cubeindex + i] != -1) {
                    var index1 = triTable[cubeindex + i];
                    var index2 = triTable[cubeindex + i + 1];
                    var index3 = triTable[cubeindex + i + 2];

                    // geometry.vertices.push(vlist[index1].clone());
                    // geometry.vertices.push(vlist[index2].clone());
                    // geometry.vertices.push(vlist[index3].clone());
                    verts.push(vlist[index1].clone().x, vlist[index1].clone().y, vlist[index1].clone().z);
                    verts.push(vlist[index2].clone().x, vlist[index2].clone().y, vlist[index2].clone().z);
                    verts.push(vlist[index3].clone().x, vlist[index3].clone().y, vlist[index3].clone().z);

                    //console.log("verts = ", verts);
                    /// Create a triangle from 3 verts
                    // var face = new THREE.Vector3(vertexIndex, vertexIndex + 1, vertexIndex + 2);
                    // geometry.faces.push(face);

                    // geometry.faceVertexUvs[0].push([new THREE.Vector2(0, 0), new THREE.Vector2(0, 1), new THREE.Vector2(1, 1)]);

                    vertexIndex += 3;
                    i += 3;
                }
            }
        }
    }
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
    geometry.computeBoundingSphere();

    return geometry;
}