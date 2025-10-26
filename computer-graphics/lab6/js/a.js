"use strict";

const { vec3, vec4, mat3, mat4 } = glMatrix;

function Renderer(canvasName, vertSrc, fragSrc) {
    let canvas, gl;
    this.modelFile = null;
    this.mesh = null;

    // 默认状态
    let modelTrans = vec3.create(); // 模型平移
    let modelRot = vec3.create();   // 模型旋转 (角度)
    let modelScale = vec3.fromValues(1, 1, 1);

    let cameraPos = vec3.fromValues(0, 0, 5); // 初始相机位置
    let cameraRot = vec3.create(); // 相机旋转（欧拉角）

    let projectionType = "perspective"; // 或 "ortho"
    let bgColor = vec4.fromValues(1, 1, 1, 1); // 白色背景
    let objColor = vec4.fromValues(0, 0.67, 1, 1); // RGB: #00aaff

    let drawMode = "wireframe"; // "wireframe" or "solid"

    // 投影参数
    let fovy = 60 * Math.PI / 180;
    let near = 0.01, far = 200;
    let left = -5, right = 5, bottom = -5, top = 5;

    // 着色器相关
    let progID, vertexLoc, colorLoc;
    let modelViewMatrixLoc, projectionMatrixLoc;
    let modelViewMatrix = mat4.create();
    let projectionMatrix = mat4.create();

    // 着色器编译函数
    function compileShader(source, type) {
        const shader = gl.createShader(type);

        // 确保着色器源代码格式正确
        const cleanedSource = source.trim();
        console.log('Compiling shader:', type, cleanedSource.substring(0, 50) + '...');

        gl.shaderSource(shader, cleanedSource);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            const error = gl.getShaderInfoLog(shader);
            console.error('着色器编译错误:', error);
            console.error('Shader source:', cleanedSource);
            gl.deleteShader(shader);
            return null;
        }

        return shader;
    }

    function setupShaders() {
        // 编译顶点着色器
        const vertexShader = compileShader(vertSrc, gl.VERTEX_SHADER);
        if (!vertexShader) {
            alert('顶点着色器编译失败，请查看控制台获取详细信息');
            return false;
        }

        // 编译片元着色器
        const fragmentShader = compileShader(fragSrc, gl.FRAGMENT_SHADER);
        if (!fragmentShader) {
            alert('片元着色器编译失败，请查看控制台获取详细信息');
            gl.deleteShader(vertexShader);
            return false;
        }

        // 创建着色器程序
        progID = gl.createProgram();
        gl.attachShader(progID, vertexShader);
        gl.attachShader(progID, fragmentShader);
        gl.linkProgram(progID);

        if (!gl.getProgramParameter(progID, gl.LINK_STATUS)) {
            const error = gl.getProgramInfoLog(progID);
            console.error('着色器程序链接错误:', error);
            gl.deleteProgram(progID);
            gl.deleteShader(vertexShader);
            gl.deleteShader(fragmentShader);
            return false;
        }

        gl.useProgram(progID);

        // 获取属性位置
        vertexLoc = gl.getAttribLocation(progID, "vPosition");
        colorLoc = gl.getAttribLocation(progID, "vColor");

        // 获取uniform位置
        modelViewMatrixLoc = gl.getUniformLocation(progID, "modelViewMatrix");
        projectionMatrixLoc = gl.getUniformLocation(progID, "projectionMatrix");

        console.log('Shader attributes - vPosition:', vertexLoc, 'vColor:', colorLoc);
        console.log('Shader uniforms - modelViewMatrix:', modelViewMatrixLoc, 'projectionMatrix:', projectionMatrixLoc);

        // 清理着色器对象
        gl.deleteShader(vertexShader);
        gl.deleteShader(fragmentShader);

        return true;
    }

    this.init = function () {
        canvas = document.getElementById(canvasName);
        gl = canvas.getContext("webgl2");
        if (!gl) {
            // 回退到WebGL 1.0
            gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
            if (!gl) {
                alert("WebGL 不可用");
                return;
            }
            console.warn("使用 WebGL 1.0 代替 WebGL 2.0");
        }

        console.log("WebGL上下文创建成功:", gl.getParameter(gl.VERSION));

        gl.clearColor(...bgColor);
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.enable(gl.DEPTH_TEST);

        if (!setupShaders()) {
            console.error("着色器初始化失败");
            return;
        }

        console.log("渲染器初始化完成");
    };

    this.initModel = function () {
        const fileReader = new FileReader();
        fileReader.onload = (e) => {
            const text = e.target.result;
            document.getElementById("fileDisplay").textContent = "文件加载完成";

            try {
                this.mesh = new OBJ.Mesh(text);
                OBJ.initMeshBuffers(gl, this.mesh);

                // 自动居中 & 缩放到合适大小
                const bbox = computeBoundingBox(this.mesh.vertices);
                const cx = (bbox.minX + bbox.maxX) / 2;
                const cy = (bbox.minY + bbox.maxY) / 2;
                const cz = (bbox.minZ + bbox.maxZ) / 2;
                const size = Math.max(bbox.maxX - bbox.minX, bbox.maxY - bbox.minY, bbox.maxZ - bbox.minZ);

                modelTrans = vec3.fromValues(-cx, -cy, -cz);
                modelScale = vec3.fromValues(2 / size, 2 / size, 2 / size);

                // 更新UI滑块范围
                updateUIRanges(bbox);

                this.display();
            } catch (error) {
                console.error("模型加载错误:", error);
                document.getElementById("fileDisplay").textContent = "模型加载失败: " + error.message;
            }
        };

        fileReader.onerror = () => {
            document.getElementById("fileDisplay").textContent = "文件读取失败";
        };

        fileReader.readAsText(this.modelFile);
    };

    function computeBoundingBox(vertices) {
        let minX = Infinity, minY = Infinity, minZ = Infinity;
        let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
        for (let i = 0; i < vertices.length; i += 3) {
            const x = vertices[i], y = vertices[i + 1], z = vertices[i + 2];
            minX = Math.min(minX, x); maxX = Math.max(maxX, x);
            minY = Math.min(minY, y); maxY = Math.max(maxY, y);
            minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z);
        }
        return { minX, minY, minZ, maxX, maxY, maxZ };
    }

    function updateUIRanges(bbox) {
        const size = Math.max(bbox.maxX - bbox.minX, bbox.maxY - bbox.minY, bbox.maxZ - bbox.minZ);
        const range = Math.ceil(size * 2);

        // 更新平移范围
        document.getElementById("transX").max = range;
        document.getElementById("transX").min = -range;
        document.getElementById("transY").max = range;
        document.getElementById("transY").min = -range;
        document.getElementById("transZ").max = range;
        document.getElementById("transZ").min = -range;
    }

    this.display = function () {
        if (!this.mesh) return;

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.clearColor(...bgColor);

        // 获取当前 UI 值
        updateFromUI();

        // 构造 ModelView 矩阵
        mat4.identity(modelViewMatrix);

        // 根据变换目标决定先应用哪个变换
        const isTransformingCamera = document.getElementById("transformCamera").checked;

        if (isTransformingCamera) {
            // 先移动/旋转模型到原点附近
            mat4.translate(modelViewMatrix, modelViewMatrix, modelTrans);
            mat4.scale(modelViewMatrix, modelViewMatrix, modelScale);
            mat4.rotateX(modelViewMatrix, modelViewMatrix, modelRot[0] * Math.PI / 180);
            mat4.rotateY(modelViewMatrix, modelViewMatrix, modelRot[1] * Math.PI / 180);
            mat4.rotateZ(modelViewMatrix, modelViewMatrix, modelRot[2] * Math.PI / 180);

            // 再应用相机反向变换
            mat4.rotateX(modelViewMatrix, modelViewMatrix, -cameraRot[0] * Math.PI / 180);
            mat4.rotateY(modelViewMatrix, modelViewMatrix, -cameraRot[1] * Math.PI / 180);
            mat4.translate(modelViewMatrix, modelViewMatrix, [-cameraPos[0], -cameraPos[1], -cameraPos[2]]);
        } else {
            // 变换模型
            mat4.translate(modelViewMatrix, modelViewMatrix, [cameraPos[0], cameraPos[1], cameraPos[2]]);
            mat4.rotateX(modelViewMatrix, modelViewMatrix, cameraRot[0] * Math.PI / 180);
            mat4.rotateY(modelViewMatrix, modelViewMatrix, cameraRot[1] * Math.PI / 180);

            mat4.translate(modelViewMatrix, modelViewMatrix, modelTrans);
            mat4.scale(modelViewMatrix, modelViewMatrix, modelScale);
            mat4.rotateX(modelViewMatrix, modelViewMatrix, modelRot[0] * Math.PI / 180);
            mat4.rotateY(modelViewMatrix, modelViewMatrix, modelRot[1] * Math.PI / 180);
            mat4.rotateZ(modelViewMatrix, modelViewMatrix, modelRot[2] * Math.PI / 180);
        }

        // 构建投影矩阵
        mat4.identity(projectionMatrix);
        const aspect = canvas.width / canvas.height;

        if (projectionType === "perspective") {
            mat4.perspective(projectionMatrix, fovy, aspect, near, far);
        } else {
            // 调整正交投影参数以保持宽高比
            const adjustedLeft = left * aspect;
            const adjustedRight = right * aspect;
            mat4.ortho(projectionMatrix, adjustedLeft, adjustedRight, bottom, top, near, far);
        }

        // 上传矩阵
        gl.uniformMatrix4fv(modelViewMatrixLoc, false, modelViewMatrix);
        gl.uniformMatrix4fv(projectionMatrixLoc, false, projectionMatrix);

        // 绑定顶点数据
        gl.bindBuffer(gl.ARRAY_BUFFER, this.mesh.vertexBuffer);
        gl.vertexAttribPointer(vertexLoc, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(vertexLoc);

        // 创建并绑定颜色数据
        const colorBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
        const colors = new Float32Array(this.mesh.vertices.length / 3 * 4);
        for (let i = 0; i < colors.length; i += 4) {
            colors[i] = objColor[0];
            colors[i + 1] = objColor[1];
            colors[i + 2] = objColor[2];
            colors[i + 3] = objColor[3];
        }
        gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW);
        gl.vertexAttribPointer(colorLoc, 4, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(colorLoc);

        // 绘制
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.mesh.indexBuffer);
        const primitive = drawMode === "wireframe" ? gl.LINES : gl.TRIANGLES;

        if (drawMode === "wireframe") {
            // 线框模式需要重新组织索引
            const wireframeIndices = createWireframeIndices(this.mesh.indices);
            const wireframeBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, wireframeBuffer);
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(wireframeIndices), gl.STATIC_DRAW);
            gl.drawElements(gl.LINES, wireframeIndices.length, gl.UNSIGNED_SHORT, 0);
            gl.deleteBuffer(wireframeBuffer);
        } else {
            gl.drawElements(primitive, this.mesh.indices.length, gl.UNSIGNED_SHORT, 0);
        }

        // 清理
        gl.disableVertexAttribArray(vertexLoc);
        gl.disableVertexAttribArray(colorLoc);
        gl.deleteBuffer(colorBuffer);
    };

    function createWireframeIndices(triangleIndices) {
        const wireframeIndices = [];
        for (let i = 0; i < triangleIndices.length; i += 3) {
            const v0 = triangleIndices[i];
            const v1 = triangleIndices[i + 1];
            const v2 = triangleIndices[i + 2];

            // 添加三角形的三条边
            wireframeIndices.push(v0, v1, v1, v2, v2, v0);
        }
        return wireframeIndices;
    }

    function updateFromUI() {
        // 投影类型
        projectionType = document.getElementById("ortho").checked ? "ortho" : "perspective";

        // 参数读取
        fovy = parseFloat(document.getElementById("fovy").value) * Math.PI / 180;
        near = parseFloat(document.getElementById(projectionType === "ortho" ? "near" : "nearPersp").value);
        far = parseFloat(document.getElementById(projectionType === "ortho" ? "far" : "farPersp").value);

        if (projectionType === "ortho") {
            left = -Math.abs(parseFloat(document.getElementById("left").value));
            right = Math.abs(parseFloat(document.getElementById("right").value));
            bottom = -Math.abs(parseFloat(document.getElementById("bottom").value));
            top = Math.abs(parseFloat(document.getElementById("top").value));
        }

        // 变换值
        modelTrans[0] = parseFloat(document.getElementById("transX").value);
        modelTrans[1] = parseFloat(document.getElementById("transY").value);
        modelTrans[2] = parseFloat(document.getElementById("transZ").value);

        modelRot[0] = parseFloat(document.getElementById("rotX").value);
        modelRot[1] = parseFloat(document.getElementById("rotY").value);
        modelRot[2] = parseFloat(document.getElementById("rotZ").value);

        modelScale[0] = parseFloat(document.getElementById("scaleX").value);
        modelScale[1] = parseFloat(document.getElementById("scaleY").value);
        modelScale[2] = parseFloat(document.getElementById("scaleZ").value);

        // 相机位置
        cameraPos[2] = parseFloat(document.getElementById("transZ").value) + 5;
        cameraRot[0] = parseFloat(document.getElementById("rotX").value);
        cameraRot[1] = parseFloat(document.getElementById("rotY").value);

        // 颜色转换
        const hexToVec4 = (hex) => {
            const r = parseInt(hex.slice(1, 3), 16) / 255;
            const g = parseInt(hex.slice(3, 5), 16) / 255;
            const b = parseInt(hex.slice(5, 7), 16) / 255;
            return vec4.fromValues(r, g, b, 1);
        };

        objColor = hexToVec4(document.getElementById("objColor").value);
        bgColor = hexToVec4(document.getElementById("bgColor").value);

        // 绘制模式
        drawMode = document.getElementById("solid").checked ? "solid" : "wireframe";
    }
}

// 全局 render 函数
function render() {
    if (window.renderer && window.renderer.mesh) {
        window.renderer.display();
    }
}