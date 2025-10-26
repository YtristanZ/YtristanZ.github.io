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
var radius = 3.0;                    // 初始距离
var theta = -Math.PI / 6;            // 方位角（绕 Y 轴）
var phi = Math.PI / 6;               // 仰角（上下）
var dtheta = 5.0 * Math.PI / 180.0;  // 每次旋转角度增量（5度）

// 透视投影参数
var fovy = 45.0 * Math.PI / 180.0;   // 视场角，弧度
var aspect = 1.0;                    // 宽高比 (canvas 512x512)

// 目标点和上方向
const eyeat = vec3.fromValues(0.0, 0.0, 0.0);
const eyeup = vec3.fromValues(0.0, 1.0, 0.0);

/**
 * 创建一个彩色立方体（每个面一种颜色）
 */
function makeColorCube() {
    var vertices = [
        vec4.fromValues(-0.5, -0.5,  0.5, 1.0), // v0
        vec4.fromValues(-0.5,  0.5,  0.5, 1.0), // v1
        vec4.fromValues( 0.5,  0.5,  0.5, 1.0), // v2
        vec4.fromValues( 0.5, -0.5,  0.5, 1.0), // v3
        vec4.fromValues(-0.5, -0.5, -0.5, 1.0), // v4
        vec4.fromValues(-0.5,  0.5, -0.5, 1.0), // v5
        vec4.fromValues( 0.5,  0.5, -0.5, 1.0), // v6
        vec4.fromValues( 0.5, -0.5, -0.5, 1.0)  // v7
    ];

    var vertexColors = [
        vec4.fromValues(0.0, 0.0, 0.0, 1.0), // 黑色
        vec4.fromValues(1.0, 0.0, 0.0, 1.0), // 红
        vec4.fromValues(1.0, 1.0, 0.0, 1.0), // 黄
        vec4.fromValues(0.0, 1.0, 0.0, 1.0), // 绿
        vec4.fromValues(0.0, 0.0, 1.0, 1.0), // 蓝
        vec4.fromValues(1.0, 0.0, 1.0, 1.0), // 紫
        vec4.fromValues(0.0, 1.0, 1.0, 1.0), // 青
        vec4.fromValues(1.0, 1.0, 1.0, 1.0)  // 白
    ];

    // 立方体的12个三角形（6个面，每面2个三角形）
    var indices = [
        0, 1, 2,   0, 2, 3,  // 前
        3, 2, 6,   3, 6, 7,  // 右
        4, 0, 3,   4, 3, 7,  // 下
        1, 5, 6,   1, 6, 2,  // 上
        4, 5, 1,   4, 1, 0,  // 后
        4, 7, 6,   4, 6, 5   // 左
    ];

    for (var i = 0; i < indices.length; i++) {
        var idx = indices[i];
        var v = vertices[idx];
        points.push(v[0], v[1], v[2]);

        // 每个面分配一种颜色（0~7）
        var faceIndex = Math.floor(i / 6);
        var c = vertexColors[faceIndex];
        colors.push(c[0], c[1], c[2], c[3]);
    }
}

/**
 * 更新状态栏显示信息
 */
function updateStatus() {
    var statusElement = document.getElementById("status");
    var ex = eye ? eye[0].toFixed(2) : 0;
    var ey = eye ? eye[1].toFixed(2) : 0;
    var ez = eye ? eye[2].toFixed(2) : 0;
    var fovDeg = (fovy * 180 / Math.PI).toFixed(1);

    statusElement.innerHTML =
        `视点位置: (${ex}, ${ey}, ${ez}) | 视场角: ${fovDeg}° | ` +
        `半径: ${radius.toFixed(2)} | 方位角: ${(theta * 180 / Math.PI).toFixed(1)}° | ` +
        `仰角: ${(phi * 180 / Math.PI).toFixed(1)}°`;
}

/**
 * 根据球坐标计算视点位置
 * @returns {vec3} eye 位置
 */
function calculateEyePosition() {
    var x = radius * Math.cos(phi) * Math.sin(theta);
    var y = radius * Math.sin(phi);
    var z = radius * Math.cos(phi) * Math.cos(theta);
    return vec3.fromValues(x, y, z);
}

/**
 * 初始化 WebGL 并设置渲染流程
 */
function initCube() {
    canvas = document.getElementById("proj-canvas");

    // 尝试获取 WebGL 2 上下文
    gl = canvas.getContext("webgl2");
    if (!gl) {
        alert("您的浏览器不支持 WebGL 2");
        return;
    }

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.9, 0.9, 0.9, 1.0); // 浅灰背景
    gl.enable(gl.DEPTH_TEST);          // 开启深度测试
    gl.frontFace(gl.CCW);              // 逆时针为正面

    // 初始化着色器程序
    var program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    // 构建立方体数据
    makeColorCube();

    // 创建颜色缓冲区
    var cBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);

    var vColor = gl.getAttribLocation(program, "vColor");
    gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vColor);

    // 创建顶点缓冲区
    var vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(points), gl.STATIC_DRAW);

    var vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    // 获取 uniform 变量地址
    modelViewMatrix = gl.getUniformLocation(program, "modelViewMatrix");
    projectionMatrix = gl.getUniformLocation(program, "projectionMatrix");

    // === 按钮事件绑定 ===
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
        fovy = Math.min(fovy + 0.1, Math.PI * 0.9); // 最大接近180°
    };
    document.getElementById("btn10").onclick = function () {
        fovy = Math.max(fovy - 0.1, 0.1); // 最小0.1弧度
    };

    document.getElementById("btn11").onclick = function () {
        radius = 3.0;
        theta = -Math.PI / 6;
        phi = Math.PI / 6;
        fovy = 45.0 * Math.PI / 180.0;
    };

    // 开始渲染循环
    render();
}

/**
 * 渲染函数（每帧调用）
 */
function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    eye = calculateEyePosition();

    // 设置模型视图矩阵
    mat4.lookAt(mvMatrix, eye, eyeat, eyeup);
    // 设置透视投影矩阵
    mat4.perspective(pMatrix, fovy, aspect, near, far);

    // 传递矩阵到着色器
    gl.uniformMatrix4fv(modelViewMatrix, false, mvMatrix);
    gl.uniformMatrix4fv(projectionMatrix, false, pMatrix);

    // 绘制立方体
    gl.drawArrays(gl.TRIANGLES, 0, numVertices);

    // 更新状态显示
    updateStatus();

    // 循环渲染
    requestAnimationFrame(render);
}

// 页面加载完成后初始化
window.addEventListener("load", initCube);