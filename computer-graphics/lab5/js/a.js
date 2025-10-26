"use strict";

const { vec3, vec4, mat4 } = glMatrix;

var canvas;
var gl;

var eye;
var mvMatrix = mat4.create();
var pMatrix = mat4.create();
var modelViewMatrix, projectionMatrix;

var numVertices = 36;

var points = [];
var colors = [];

// 视点参数
var near = 0.1;
var far = 10.0;
var radius = 3.0;         // 初始距离远一点
var theta = -Math.PI / 6; // 初始方位角（稍微偏右）
var phi = Math.PI / 6;    // 初始仰角（从上往下看）
var dtheta = 5.0 * Math.PI / 180.0;

// 投影参数
var left = -1.5;
var right = 1.5;
var ytop = 1.5;
var ybottom = -1.5;

const eyeat = vec3.fromValues(0.0, 0.0, 0.0); // 目标点：原点
const eyeup = vec3.fromValues(0.0, 1.0, 0.0); // 上方向

function makeColorCube() {
    var vertices = [
        vec4.fromValues(-0.5, -0.5,  0.5, 1.0),  // v0
        vec4.fromValues(-0.5,  0.5,  0.5, 1.0),  // v1
        vec4.fromValues( 0.5,  0.5,  0.5, 1.0),  // v2
        vec4.fromValues( 0.5, -0.5,  0.5, 1.0),  // v3
        vec4.fromValues(-0.5, -0.5, -0.5, 1.0),  // v4
        vec4.fromValues(-0.5,  0.5, -0.5, 1.0),  // v5
        vec4.fromValues( 0.5,  0.5, -0.5, 1.0),  // v6
        vec4.fromValues( 0.5, -0.5, -0.5, 1.0)   // v7
    ];

    var vertexColors = [
        vec4.fromValues(0.0, 0.0, 0.0, 1.0),  // 黑色
        vec4.fromValues(1.0, 0.0, 0.0, 1.0),  // 红
        vec4.fromValues(1.0, 1.0, 0.0, 1.0),  // 黄
        vec4.fromValues(0.0, 1.0, 0.0, 1.0),  // 绿
        vec4.fromValues(0.0, 0.0, 1.0, 1.0),  // 蓝
        vec4.fromValues(1.0, 0.0, 1.0, 1.0),  // 紫
        vec4.fromValues(0.0, 1.0, 1.0, 1.0),  // 青
        vec4.fromValues(1.0, 1.0, 1.0, 1.0)   // 白
    ];

    // 修复：每个面6个顶点，共36个
    var indices = [
        // 正面 (z = 0.5)
        0, 1, 2,
        0, 2, 3,
        // 右侧面 (x = 0.5)
        3, 2, 6,
        3, 6, 7,
        // 底面 (y = -0.5)
        4, 0, 3,
        4, 3, 7,
        // 顶面 (y = 0.5)
        1, 5, 6,
        1, 6, 2,
        // 背面 (z = -0.5)
        4, 5, 1,
        4, 1, 0,
        // 左侧面 (x = -0.5)
        4, 7, 6,
        4, 6, 5
    ];

    for (var i = 0; i < indices.length; i++) {
        var idx = indices[i];
        var v = vertices[idx];
        points.push(v[0], v[1], v[2]);

        // 每个面一种颜色（按面编号）
        var faceIndex = Math.floor(i / 6);
        var c = vertexColors[faceIndex];
        colors.push(c[0], c[1], c[2], c[3]);
    }
}

function updateStatus() {
    var statusElement = document.getElementById("status");
    var ex = eye ? eye[0].toFixed(2) : 0;
    var ey = eye ? eye[1].toFixed(2) : 0;
    var ez = eye ? eye[2].toFixed(2) : 0;
    var range = right.toFixed(2);

    statusElement.innerHTML =
        `视点位置: (${ex}, ${ey}, ${ez}) | 投影范围: [-${range}, ${range}] | ` +
        `半径: ${radius.toFixed(2)} | 方位角: ${(theta * 180 / Math.PI).toFixed(1)}° | ` +
        `仰角: ${(phi * 180 / Math.PI).toFixed(1)}°`;
}

function calculateEyePosition() {
    // 标准轨道相机：theta 绕 Y 轴旋转，phi 是上下仰角
    var x = radius * Math.cos(phi) * Math.sin(theta);
    var y = radius * Math.sin(phi);
    var z = radius * Math.cos(phi) * Math.cos(theta);

    return vec3.fromValues(x, y, z);
}

function initCube() {
    canvas = document.getElementById("proj-canvas");

    // 尝试 WebGL 1 兼容模式
    gl = canvas.getContext("webgl2");
    if (!gl) {
        alert("您的浏览器不支持WebGL");
    }

    gl.viewport(0, 0, canvas.width, canvas.height);

    gl.clearColor(0.9, 0.9, 0.9, 1.0);

    gl.enable(gl.DEPTH_TEST);
    // gl.enable(gl.CULL_FACE); // 可选：开启面剔除，需保证顶点顺序一致
    gl.frontFace(gl.CCW); // 默认逆时针为正面

    var program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    makeColorCube();

    // 颜色缓冲区
    var cBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);

    var vColor = gl.getAttribLocation(program, "vColor");
    gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vColor);

    // 顶点缓冲区
    var vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(points), gl.STATIC_DRAW);

    var vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    // 获取 uniform 变量地址
    modelViewMatrix = gl.getUniformLocation(program, "modelViewMatrix");
    projectionMatrix = gl.getUniformLocation(program, "projectionMatrix");

    // 设置按钮事件
    document.getElementById("btn1").onclick = function () {
        radius *= 1.1;
        if (radius > 10) radius = 10;
    };
    document.getElementById("btn2").onclick = function () {
        radius *= 0.9;
        if (radius < 0.5) radius = 0.5;
    };

    document.getElementById("btn5").onclick = function () {
        theta += dtheta;
    };
    document.getElementById("btn6").onclick = function () {
        theta -= dtheta;
    };
    document.getElementById("btn7").onclick = function () {
        phi = Math.min(phi + dtheta, Math.PI / 2);
    };
    document.getElementById("btn8").onclick = function () {
        phi = Math.max(phi - dtheta, -Math.PI / 2);
    };

    document.getElementById("btn9").onclick = function () {
        left *= 1.1;
        right *= 1.1;
        ytop *= 1.1;
        ybottom *= 1.1;
    };
    document.getElementById("btn10").onclick = function () {
        left *= 0.9;
        right *= 0.9;
        ytop *= 0.9;
        ybottom *= 0.9;
    };

    document.getElementById("btn11").onclick = function () {
        radius = 3.0;
        theta = -Math.PI / 6;
        phi = Math.PI / 6;
        left = -1.5;
        right = 1.5;
        ytop = 1.5;
        ybottom = -1.5;
    };

    render();
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    eye = calculateEyePosition();

    mat4.lookAt(mvMatrix, eye, eyeat, eyeup);
    mat4.ortho(pMatrix, left, right, ybottom, ytop, near, far);

    gl.uniformMatrix4fv(modelViewMatrix, false, mvMatrix);
    gl.uniformMatrix4fv(projectionMatrix, false, pMatrix);

    gl.drawArrays(gl.TRIANGLES, 0, numVertices);

    updateStatus();

    requestAnimationFrame(render);
}

window.onload = initCube;