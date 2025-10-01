"use strict";

        const { vec4 } = glMatrix;

        var canvas;
        var gl;

        var points = [];
        var colors = [];

        var xAxis = 0;
        var yAxis = 1;
        var zAxis = 2;

        var axis = 0;
        var theta = [0, 0, 0];
        var translate = [0, 0, 0];
        var scale= [0.5, 0.5, 0.5];

        var scaleLoc;
        var thetaLoc;
        var translateLoc; // 新增：平移uniform的位置

        // 平移控制标志
        var translateXPositive = false;
        var translateXNegative = false;
        var translateYPositive = false;
        var translateYNegative = false;
        var translateZPositive = false;
        var translateZNegative = false;

        window.onload = function initCube() {
            canvas = document.getElementById("rtcb-canvas");

            gl = canvas.getContext("webgl2");
            if (!gl) {
                alert("WebGL isn't available");
            }

            makeCube();

            gl.viewport(0, 0, canvas.width, canvas.height);
            gl.clearColor(1.0, 1.0, 1.0, 1.0);

            gl.enable(gl.DEPTH_TEST);

            // 加载着色器并初始化属性缓冲区
            var program = initShaders(gl, "rtvshader", "rtfshader");
            gl.useProgram(program);

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

            // 旋转uniform
            thetaLoc = gl.getUniformLocation(program, "theta");
            gl.uniform3fv(thetaLoc, theta);


            translateLoc = gl.getUniformLocation(program, "translate");
            gl.uniform3fv(translateLoc, translate);

            scaleLoc = gl.getUniformLocation(program, "scale");
            gl.uniform3fv(scaleLoc, scale);

            // 旋转控制按钮
            document.getElementById("xbutton").onclick = function () {
                axis = xAxis;
            }

            document.getElementById("ybutton").onclick = function () {
                axis = yAxis;
            }

            document.getElementById("zbutton").onclick = function () {
                axis = zAxis;
            }

            //缩放控制按钮
            document.getElementById("sx-inc").onclick = function () {
                scale[0] = Math.min(2.0, scale[0] + 0.1);
                gl.uniform3fv(scaleLoc, scale);
                updateScaleDisplay();
            }
            document.getElementById("sx-dec").onclick = function () {
                scale[0] = Math.max(0.1, scale[0] - 0.1);
                gl.uniform3fv(scaleLoc, scale);
                updateScaleDisplay();
            }
            document.getElementById("sy-inc").onclick = function () {
                scale[1] = Math.min(2.0, scale[1] + 0.1);
                gl.uniform3fv(scaleLoc, scale);
                updateScaleDisplay();
            }
            document.getElementById("sy-dec").onclick = function () {
                scale[1] = Math.max(0.1, scale[1] - 0.1);
                gl.uniform3fv(scaleLoc, scale);
                updateScaleDisplay();
            }
            document.getElementById("sz-inc").onclick = function () {
                scale[2] = Math.min(2.0, scale[2] + 0.1);
                gl.uniform3fv(scaleLoc, scale);
                updateScaleDisplay();
            }
            document.getElementById("sz-dec").onclick = function () {
                scale[2] = Math.max(0.1, scale[2] - 0.1);
                gl.uniform3fv(scaleLoc, scale);
                updateScaleDisplay();
            }

            document.getElementById("scale-reset").onclick = function () {
                scale = [0.5, 0.5, 0.5];
                gl.uniform3fv(scaleLoc, scale);
                updateScaleDisplay()
            }

            // 新增：平移控制按钮
            document.getElementById("tx-pos").onmousedown = function() {
                translateXPositive = true;
            }
            document.getElementById("tx-pos").onmouseup = function() {
                translateXPositive = false;
            }
            document.getElementById("tx-neg").onmousedown = function() {
                translateXNegative = true;
            }
            document.getElementById("tx-neg").onmouseup = function() {
                translateXNegative = false;
            }

            document.getElementById("ty-pos").onmousedown = function() {
                translateYPositive = true;
            }
            document.getElementById("ty-pos").onmouseup = function() {
                translateYPositive = false;
            }
            document.getElementById("ty-neg").onmousedown = function() {
                translateYNegative = true;
            }
            document.getElementById("ty-neg").onmouseup = function() {
                translateYNegative = false;
            }

            document.getElementById("tz-pos").onmousedown = function() {
                translateZPositive = true;
            }
            document.getElementById("tz-pos").onmouseup = function() {
                translateZPositive = false;
            }
            document.getElementById("tz-neg").onmousedown = function() {
                translateZNegative = true;
            }
            document.getElementById("tz-neg").onmouseup = function() {
                translateZNegative = false;
            }

            // 新增：重置按钮
            document.getElementById("reset").onclick = function() {
                translate = [0, 0, 0];
                theta = [0, 0, 0];
                scale = [0.5, 0.5, 0.5];
                axis = 0;
                gl.uniform3fv(translateLoc, translate);
                gl.uniform3fv(scaleLoc,scale);
                updateScaleDisplay();
            }

            updateScaleDisplay();
            render();
        }

        function updateScaleDisplay() {
            document.getElementById("scale-x").textContent = scale[0].toFixed(1);
            document.getElementById("scale-y").textContent = scale[1].toFixed(1);
            document.getElementById("scale-z").textContent = scale[2].toFixed(1);
        }
        function makeCube() {
            var vertices = [
                vec4.fromValues(-0.5, -0.5, 0.5, 1.0),
                vec4.fromValues(-0.5, 0.5, 0.5, 1.0),
                vec4.fromValues(0.5, 0.5, 0.5, 1.0),
                vec4.fromValues(0.5, -0.5, 0.5, 1.0),
                vec4.fromValues(-0.5, -0.5, -0.5, 1.0),
                vec4.fromValues(-0.5, 0.5, -0.5, 1.0),
                vec4.fromValues(0.5, 0.5, -0.5, 1.0),
                vec4.fromValues(0.5, -0.5, -0.5, 1.0),
            ];

            var vertexColors = [
                vec4.fromValues(0.0, 0.0, 0.0, 1.0), // 黑色
                vec4.fromValues(1.0, 0.0, 0.0, 1.0), // 红色
                vec4.fromValues(1.0, 1.0, 0.0, 1.0), // 黄色
                vec4.fromValues(0.0, 1.0, 0.0, 1.0), // 绿色
                vec4.fromValues(0.0, 0.0, 1.0, 1.0), // 蓝色
                vec4.fromValues(1.0, 0.0, 1.0, 1.0), // 紫色
                vec4.fromValues(0.0, 1.0, 1.0, 1.0), // 青色
                vec4.fromValues(1.0, 1.0, 1.0, 1.0)  // 白色
            ];

            var faces = [
                1, 0, 3, 1, 3, 2, // 正面
                2, 3, 7, 2, 7, 6, // 右面
                3, 0, 4, 3, 4, 7, // 底面
                6, 5, 1, 6, 1, 2, // 顶面
                4, 5, 6, 4, 6, 7, // 背面
                5, 4, 0, 5, 0, 1  // 左面
            ];

            for (var i = 0; i < faces.length; i++) {
                points.push(vertices[faces[i]][0], vertices[faces[i]][1], vertices[faces[i]][2]);
                colors.push(vertexColors[Math.floor(i / 6)][0], vertexColors[Math.floor(i / 6)][1], vertexColors[Math.floor(i / 6)][2], vertexColors[Math.floor(i / 6)][3]);
            }
        }

        function render() {
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

            // 更新旋转角度
            theta[axis] += 0.05;
            gl.uniform3fv(thetaLoc, theta);

            // 新增：更新平移位置
            var translationSpeed = 0.01;
            if (translateXPositive) translate[0] += translationSpeed;
            if (translateXNegative) translate[0] -= translationSpeed;
            if (translateYPositive) translate[1] += translationSpeed;
            if (translateYNegative) translate[1] -= translationSpeed;
            if (translateZPositive) translate[2] += translationSpeed;
            if (translateZNegative) translate[2] -= translationSpeed;

            gl.uniform3fv(translateLoc, translate);

            gl.drawArrays(gl.TRIANGLES, 0, points.length / 3);

            requestAnimFrame(render);
        }