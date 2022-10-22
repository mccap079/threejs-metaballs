import * as THREE from './three.module.js';
import Stats from 'three/examples/jsm/libs/stats.module';
import Detector from './detector.js';
import edgeTable from './edgeTable.js';
import triTable from './triTable.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GUI } from 'dat.gui';
/*
    Three.js "tutorials by example"
    Author: Lee Stemkoski
    Date: July 2013 (three.js v59dev)
*/

// MAIN

// standard global variables for Three.js
var scene, camera, renderer, controls, stats, gui, parameters;
var clock = new THREE.Clock();

// ball params
var bawlsMesh;
var colorMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff, side: THREE.DoubleSide });
var points;
var values;
var radius = 1; //10
var fieldSz = 5; //10
var fieldIncrements = 30; //30
var isoLevel = 0.5; //0.1
var ballsPos = [];

init();
animate();



// FUNCTIONS 		
function init() {
    // SCENE
    scene = new THREE.Scene();
    // CAMERA
    var SCREEN_WIDTH = window.innerWidth, SCREEN_HEIGHT = window.innerHeight;
    var VIEW_ANGLE = 45, ASPECT = SCREEN_WIDTH / SCREEN_HEIGHT, NEAR = 0.1, FAR = 20000;
    camera = new THREE.PerspectiveCamera(VIEW_ANGLE, ASPECT, NEAR, FAR);
    scene.add(camera);
    camera.position.set(10, 5, 10);
    camera.lookAt(scene.position);
    // RENDERER
    if (Detector.webgl)
        renderer = new THREE.WebGLRenderer({ antialias: true });
    else
        renderer = new THREE.CanvasRenderer();
    renderer.setSize(SCREEN_WIDTH, SCREEN_HEIGHT);
    document.body.appendChild(renderer.domElement);
    // EVENTS
    // CONTROLS
    controls = new OrbitControls(camera, renderer.domElement);
    // STATS
    stats = new Stats();
    stats.domElement.style.position = 'absolute';
    stats.domElement.style.bottom = '0px';
    stats.domElement.style.zIndex = 100;
    document.body.appendChild(stats.domElement);
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

    var field = setField();

    points = field.points;

    values = [];
    // initialize values
    for (var i = 0; i < field.size3; i++) values[i] = 0;

    // resetValues();
    //addBall(points, values, new THREE.Vector3(0, 3.5, 0));
    addBall(points, values, new THREE.Vector3(0, 0, 0), radius);
    addBall(points, values, new THREE.Vector3(0, 0, 0), radius);
    addBall(points, values, new THREE.Vector3(0, 0, 0), radius);


    var max = Math.max(...values);
    var min = Math.min(...values);
    console.log("max ", max);
    console.log("min ", min);

    var geometry = marchingCubes(field.points, values, isoLevel);
    console.log("init:: values = ", values);

    bawlsMesh = new THREE.Mesh(geometry, colorMaterial);

    scene.add(bawlsMesh);
    // GUI for experimenting with parameters

    gui = new GUI();
    parameters = { a: isoLevel, c: false, d: radius, e: 10.0, f: 30.0 };
    //0.000     // 1.100    // 0.001
    var aGUI = gui.add(parameters, 'a').min(0.00000000001).max(1).step(0.001).name("isoLevel").listen();
    aGUI.onChange(
        function (value) {
            scene.remove(bawlsMesh);
            isoLevel = parameters.a;
            var newGeometry = marchingCubes(points, values, isoLevel);
            bawlsMesh = new THREE.Mesh(newGeometry, colorMaterial);
            scene.add(bawlsMesh);
        }
    );

    var cGUI = gui.add(parameters, 'c').name("animate values");

    var dGUI = gui.add(parameters, 'd').min(1.0).max(400.0).step(0.01).name("radius").listen();
    dGUI.onChange(
        function (value) {
            resetValues(values);
            radius = parameters.d;
            addBall(points, values, new THREE.Vector3(0, 0, 0), radius);
            addBall(points, values, new THREE.Vector3(0, 0, 0), radius);

            scene.remove(bawlsMesh);
            var newGeometry = marchingCubes(points, values, isoLevel);
            bawlsMesh = new THREE.Mesh(newGeometry, colorMaterial);
            scene.add(bawlsMesh);
        }
    );

    var eGUI = gui.add(parameters, 'e').min(10.0).max(100.0).step(1).name("fieldSz").listen();
    eGUI.onChange(
        function (value) {
            fieldSz = parameters.e;
            var field = setField();
            points = field.points;
            resetValues(values);
            addBall(points, values, new THREE.Vector3(0, 0, 0), radius);
            addBall(points, values, new THREE.Vector3(0, 0, 0), radius);

            scene.remove(bawlsMesh);
            var newGeometry = marchingCubes(points, values, isoLevel);
            bawlsMesh = new THREE.Mesh(newGeometry, colorMaterial);
            scene.add(bawlsMesh);
        }
    );

    var fGUI = gui.add(parameters, 'f').min(10.0).max(100.0).step(1).name("fieldIncrements").listen();
    fGUI.onChange(
        function (value) {
            fieldIncrements = parameters.f;
            var field = setField();
            points = field.points;
            // initialize values
            values.length = field.size3;
            resetValues(values);
            addBall(points, values, new THREE.Vector3(0, 0, 0), radius);
            addBall(points, values, new THREE.Vector3(0, 0, 0), radius);

            scene.remove(bawlsMesh);
            var newGeometry = marchingCubes(points, values, isoLevel);
            bawlsMesh = new THREE.Mesh(newGeometry, colorMaterial);
            scene.add(bawlsMesh);
        }
    );

}

function setField() {
    var axisMin = -fieldSz;
    var axisMax = fieldSz;
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

    var size = fieldIncrements;
    var size2 = size * size;
    var size3 = size * size * size;

    var points = [];

    // generate the list of 3D points
    for (var k = 0; k < size; k++) {
        for (var j = 0; j < size; j++) {
            for (var i = 0; i < size; i++) {
                var x = axisMin + axisRange * i / (size - 1);
                var y = axisMin + axisRange * j / (size - 1);
                var z = axisMin + axisRange * k / (size - 1);
                points.push(new THREE.Vector3(x, y, z));
            }
        }
    }

    return { size3, points };
}

function animate() {
    requestAnimationFrame(animate);
    render();
    update();
}

function update() {
    controls.update();
    stats.update();

    // animation
    if (parameters.c) {
        var t = clock.getElapsedTime();
        var offset = 0.0;
        var speed = 1.0;
        var amplitude = 1.5;
        ballsPos[0] = [
            offset + Math.sin(t * speed) * amplitude,
            offset + Math.sin(t * (speed / 1.73)) * amplitude,
            offset + Math.sin(t * (speed / 0.87)) * amplitude
        ];

        ballsPos[1] = [
            offset + Math.sin(t * (speed * 1.3)) * amplitude / 2,
            offset + Math.sin(t * (speed * 0.9)) * amplitude / 2,
            offset + Math.sin(t * (speed / 0.5)) * amplitude / 2];

        ballsPos[2] = [
            offset + Math.sin(t * (speed * 3.2)) * amplitude,
            offset + Math.sin(t * (speed * 1.8)) * amplitude,
            offset + Math.sin(t * (speed * 0.3)) * amplitude];

        ballsPos[3] = [
            offset + Math.sin(t * (speed * 4.1)) * amplitude,
            offset + Math.sin(t * (speed * 2.2)) * amplitude,
            offset + Math.sin(t * (speed * 5.1)) * amplitude];

        updateBallsPos(ballsPos);
    }
}

function updateBallsPos(pos) {
    resetValues(values);
    addBall(points, values, new THREE.Vector3(pos[0][0], pos[0][1], pos[0][2]), radius);
    addBall(points, values, new THREE.Vector3(pos[1][0], pos[1][1], pos[1][2]), radius * 1.5);
    addBall(points, values, new THREE.Vector3(pos[2][0], pos[2][1], pos[2][2]), radius * 0.5);
    addBall(points, values, new THREE.Vector3(pos[3][0], pos[3][1], pos[3][2]), radius * 0.1);

    //cant add and remove every scene
    scene.remove(bawlsMesh);
    var newGeometry = marchingCubes(points, values, isoLevel);
    bawlsMesh = new THREE.Mesh(newGeometry, colorMaterial);
    scene.add(bawlsMesh);
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
function addBall(points, values, center, r) {
    for (var i = 0; i < values.length; i++) {
        // console.log(i + " --------- point ", points[i]);
        var OneMinusD2 = r - center.distanceToSquared(points[i]);
        // console.log("Dist to circle center ", center.distanceTo(points[i]));
        // console.log("Dist to circle center squared", center.distanceToSquared(points[i]));
        values[i] += Math.exp(-(OneMinusD2 * OneMinusD2));
    }
}


// MARCHING CUBES ALGORITHM
// parameters: domain points, range values, isolevel 
// returns: geometry
function marchingCubes(points, values, isolevel) {
    // assumes the following global values have been defined: 
    //   THREE.edgeTable, triTable

    var size = Math.round(Math.pow(values.length, 1 / 3));
    var size2 = size * size;
    var size3 = size * size * size;

    // Vertices may occur along edges of cube, when the values at the edge's endpoints
    //   straddle the isolevel value.
    // Actual position along edge weighted according to function values.
    var vlist = new Array(12);

    var geometry = new THREE.Geometry();
    var vertexIndex = 0;

    for (var z = 0; z < size - 1; z++)
        for (var y = 0; y < size - 1; y++)
            for (var x = 0; x < size - 1; x++) {
                // index of base point, and also adjacent points on cube
                var p = x + size * y + size2 * z,
                    px = p + 1,
                    py = p + size,
                    pxy = py + 1,
                    pz = p + size2,
                    pxz = px + size2,
                    pyz = py + size2,
                    pxyz = pxy + size2;

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

                var cubeindex = 0;
                if (value0 < isolevel) cubeindex |= 1;
                if (value1 < isolevel) cubeindex |= 2;
                if (value2 < isolevel) cubeindex |= 8;
                if (value3 < isolevel) cubeindex |= 4;
                if (value4 < isolevel) cubeindex |= 16;
                if (value5 < isolevel) cubeindex |= 32;
                if (value6 < isolevel) cubeindex |= 128;
                if (value7 < isolevel) cubeindex |= 64;

                // bits = 12 bit number, indicates which edges are crossed by the isosurface
                var bits = edgeTable[cubeindex];

                // if none are crossed, proceed to next iteration
                if (bits === 0) continue;

                // check which edges are crossed, and estimate the point location
                //    using a weighted average of scalar values at edge endpoints.
                // store the vertex in an array for use later.
                var mu = 0.5;

                // bottom of the cube
                if (bits & 1) {
                    mu = (isolevel - value0) / (value1 - value0);
                    vlist[0] = points[p].clone().lerp(points[px], mu);
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

                    geometry.vertices.push(vlist[index1].clone());
                    geometry.vertices.push(vlist[index2].clone());
                    geometry.vertices.push(vlist[index3].clone());
                    var face = new THREE.Face3(vertexIndex, vertexIndex + 1, vertexIndex + 2);
                    geometry.faces.push(face);

                    geometry.faceVertexUvs[0].push([new THREE.Vector2(0, 0), new THREE.Vector2(0, 1), new THREE.Vector2(1, 1)]);

                    vertexIndex += 3;
                    i += 3;
                }
            }

    geometry.mergeVertices();
    geometry.computeFaceNormals();
    geometry.computeVertexNormals();

    return geometry;
}