"use strict";

const { vec3, vec4, mat3, mat4 } = glMatrix;

function ModelViewer(canvasName) {
    var canvas;
    var gl;

    // 着色器相关
    var progID = 0;
    var vertID = 0;
    var fragID = 0;

    // 顶点数据
    var vertexBuffer = null;
    var normalBuffer = null;
    var modelVertices = [];
    var modelNormals = [];
    var modelVertexCount = 0;

    // 变换矩阵
    var modelMatrix = mat4.create();
    var viewMatrix = mat4.create();
    var modelViewMatrix = mat4.create();
    var projectionMatrix = mat4.create();
    var normalMatrix = mat3.create();

    // 变换参数
    var translation = [0, 0, 0];
    var rotation = [0, 0, 0];
    var scale = 1.0;

    // 视点参数
    var eye = vec3.create();
    var at = vec3.fromValues(0.0, 0.0, 0.0);
    var up = vec3.fromValues(0.0, 1.0, 0.0);
    var radius = 30.0;
    var theta = 45.0;
    var phi = 45.0;

    // 投影参数
    var projectionType = 'ortho';
    var orthoParams = {
        left: -5,
        right: 5,
        bottom: -5,
        top: 5,
        near: 0.1,
        far: 100
    };
    var perspParams = {
        fov: 60,
        near: 0.1,
        far: 100
    };

    // 光照参数
    var lightPosition = vec4.fromValues(1.0, 1.0, 1.0, 1.0);
    var lightAmbient = vec4.fromValues(1.0, 1.0, 1.0, 1.0);
    var lightDiffuse = vec4.fromValues(1.0, 1.0, 1.0, 1.0);
    var lightSpecular = vec4.fromValues(1.0, 1.0, 1.0, 1.0);

    var materialAmbient = vec4.fromValues(1.0, 0.0, 0.0, 1.0);
    var materialDiffuse = vec4.fromValues(1.0, 1.0, 1.0, 1.0);
    var materialSpecular = vec4.fromValues(1.0, 1.0, 1.0, 1.0);
    var materialShininess = 80.0;

    var materialKa = 1.0;
    var materialKd = 1.0;
    var materialKs = 1.0;

    var clearColor = vec4.fromValues(0.0, 1.0, 1.0, 1.0);

    // 着色器源代码 - Phong着色
    var phongVertSrc = `#version 300 es
    in vec4 vPosition;
    in vec3 vNormal;
    
    uniform mat4 modelViewMatrix;
    uniform mat4 projectionMatrix;
    uniform mat3 normalMatrix;
    
    out vec3 normalInterp;
    out vec4 vertexPos;
    
    void main() {
        vertexPos = modelViewMatrix * vPosition;
        normalInterp = normalize(normalMatrix * vNormal);
        gl_Position = projectionMatrix * vertexPos;
    }`;

    var phongFragSrc = `#version 300 es
    precision mediump float;

    in vec3 normalInterp;
    in vec4 vertexPos;
    
    uniform vec4 lightPosition;
    uniform float shininess;
    
    uniform float materialKa;
    uniform float materialKd;
    uniform float materialKs;
    
    uniform vec4 ambientProduct;
    uniform vec4 diffuseProduct;
    uniform vec4 specularProduct;
    
    out vec4 fColor;
    
    void main() {
        vec3 N = normalize(normalInterp);
        vec3 L;
        
        if (lightPosition.w == 0.0) {
            L = normalize(lightPosition.xyz);
        } else {
            L = normalize(lightPosition.xyz - vertexPos.xyz);
        }
        
        vec4 ambient = ambientProduct;
        float Kd = max(dot(L, N), 0.0);
        vec4 diffuse = Kd * diffuseProduct;
        
        float Ks = 0.0;
        
        if (Kd > 0.0) {
            vec3 R = reflect(-L, N);
            vec3 V = normalize(-vertexPos.xyz);
            float specularAngle = max(dot(R, V), 0.0);
            Ks = pow(specularAngle, shininess);
        }
        
        vec4 specular = Ks * specularProduct;
        
        fColor = materialKa * ambient + materialKd * diffuse + materialKs * specular;
        fColor.a = 1.0;
    }`;

    // Gouraud着色器
    var gouraudVertSrc = `#version 300 es
    in vec4 vPosition;
    in vec3 vNormal;
    
    uniform mat4 modelViewMatrix;
    uniform mat4 projectionMatrix;
    uniform mat3 normalMatrix;
    
    uniform vec4 lightPosition;
    uniform float shininess;
    
    uniform float materialKa;
    uniform float materialKd;
    uniform float materialKs;
    
    uniform vec4 ambientProduct;
    uniform vec4 diffuseProduct;
    uniform vec4 specularProduct;
    
    out vec4 color;
    
    void main() {
        vec4 vertexPos = modelViewMatrix * vPosition;
        vec3 N = normalize(normalMatrix * vNormal);
        vec3 L;
        
        if (lightPosition.w == 0.0) {
            L = normalize(lightPosition.xyz);
        } else {
            L = normalize(lightPosition.xyz - vertexPos.xyz);
        }
        
        vec4 ambient = ambientProduct;
        float Kd = max(dot(L, N), 0.0);
        vec4 diffuse = Kd * diffuseProduct;
        
        float Ks = 0.0;
        
        if (Kd > 0.0) {
            vec3 R = reflect(-L, N);
            vec3 V = normalize(-vertexPos.xyz);
            float specularAngle = max(dot(R, V), 0.0);
            Ks = pow(specularAngle, shininess);
        }
        
        vec4 specular = Ks * specularProduct;
        
        color = materialKa * ambient + materialKd * diffuse + materialKs * specular;
        color.a = 1.0;
        
        gl_Position = projectionMatrix * vertexPos;
    }`;

    var gouraudFragSrc = `#version 300 es
    precision mediump float;
    
    in vec4 color;
    
    out vec4 fColor;
    
    void main() {
        fColor = color;
    }`;

    // 平面着色器
    var flatVertSrc = `#version 300 es
    in vec4 vPosition;
    
    uniform mat4 modelViewMatrix;
    uniform mat4 projectionMatrix;
    
    void main() {
        gl_Position = projectionMatrix * modelViewMatrix * vPosition;
    }`;

    var flatFragSrc = `#version 300 es
    precision mediump float;
    
    uniform vec4 uColor;
    
    out vec4 fColor;
    
    void main() {
        fColor = uColor;
    }`;

    // 当前着色器
    var vertSrc = phongVertSrc;
    var fragSrc = phongFragSrc;
    var currentShader = 'phong';

    // 属性位置
    var attribLocations = {
        position: null,
        normal: null
    };

    // uniform位置
    var uniformLocations = {
        modelViewMatrix: null,
        projectionMatrix: null,
        normalMatrix: null,
        lightPosition: null,
        shininess: null,
        materialKa: null,
        materialKd: null,
        materialKs: null,
        ambientProduct: null,
        diffuseProduct: null,
        specularProduct: null,
        color: null
    };

    this.init = function() {
        canvas = document.getElementById(canvasName);
        gl = canvas.getContext('webgl2');
        if (!gl) {
            alert('您的浏览器不支持WebGL 2.0');
            return;
        }

        gl.clearColor(clearColor[0], clearColor[1], clearColor[2], clearColor[3]);
        gl.enable(gl.DEPTH_TEST);

        setupShaders();
        initInterface();
        createDefaultCube();
        display();
    };

    function setupShaders() {
        // 创建着色器
        vertID = gl.createShader(gl.VERTEX_SHADER);
        fragID = gl.createShader(gl.FRAGMENT_SHADER);

        // 指定着色器源代码
        gl.shaderSource(vertID, vertSrc);
        gl.shaderSource(fragID, fragSrc);

        // 编译着色器
        gl.compileShader(vertID);
        gl.compileShader(fragID);

        var error = false;
        if (!gl.getShaderParameter(vertID, gl.COMPILE_STATUS)) {
            console.error('顶点着色器编译错误: ' + gl.getShaderInfoLog(vertID));
            error = true;
        }

        if (!gl.getShaderParameter(fragID, gl.COMPILE_STATUS)) {
            console.error('片段着色器编译错误: ' + gl.getShaderInfoLog(fragID));
            error = true;
        }

        if (error) return;

        // 创建程序并附加着色器
        progID = gl.createProgram();
        gl.attachShader(progID, vertID);
        gl.attachShader(progID, fragID);

        // 链接程序
        gl.linkProgram(progID);
        if (!gl.getProgramParameter(progID, gl.LINK_STATUS)) {
            console.error('程序链接错误: ' + gl.getProgramInfoLog(progID));
            return;
        }

        gl.useProgram(progID);

        // 获取attribute和uniform位置
        attribLocations.position = gl.getAttribLocation(progID, 'vPosition');

        // 根据当前着色器类型设置不同的属性
        if (currentShader === 'phong' || currentShader === 'gouraud') {
            attribLocations.normal = gl.getAttribLocation(progID, 'vNormal');
        }

        // 根据当前着色器类型设置不同的uniform
        uniformLocations.modelViewMatrix = gl.getUniformLocation(progID, 'modelViewMatrix');
        uniformLocations.projectionMatrix = gl.getUniformLocation(progID, 'projectionMatrix');

        if (currentShader === 'phong' || currentShader === 'gouraud') {
            uniformLocations.normalMatrix = gl.getUniformLocation(progID, 'normalMatrix');
            uniformLocations.lightPosition = gl.getUniformLocation(progID, 'lightPosition');
            uniformLocations.shininess = gl.getUniformLocation(progID, 'shininess');
            uniformLocations.materialKa = gl.getUniformLocation(progID, 'materialKa');
            uniformLocations.materialKd = gl.getUniformLocation(progID, 'materialKd');
            uniformLocations.materialKs = gl.getUniformLocation(progID, 'materialKs');
            uniformLocations.ambientProduct = gl.getUniformLocation(progID, 'ambientProduct');
            uniformLocations.diffuseProduct = gl.getUniformLocation(progID, 'diffuseProduct');
            uniformLocations.specularProduct = gl.getUniformLocation(progID, 'specularProduct');
        } else if (currentShader === 'flat') {
            uniformLocations.color = gl.getUniformLocation(progID, 'uColor');
        }

        // 创建顶点缓冲区和法向量缓冲区
        vertexBuffer = gl.createBuffer();
        if (currentShader === 'phong' || currentShader === 'gouraud') {
            normalBuffer = gl.createBuffer();
        }
    }

    function initInterface() {
        // 文件加载
        document.getElementById('fileInput').addEventListener('change', function(event) {
            loadModel(event.target.files[0]);
        });

        // 绘制方式
        document.querySelectorAll('input[name="drawtype"]').forEach(function(radio) {
            radio.addEventListener('change', function() {
                display();
            });
        });

        // 着色器选择
        document.getElementById('shader-select').addEventListener('change', function(event) {
            currentShader = event.target.value;
            switch(currentShader) {
                case 'phong':
                    vertSrc = phongVertSrc;
                    fragSrc = phongFragSrc;
                    break;
                case 'gouraud':
                    vertSrc = gouraudVertSrc;
                    fragSrc = gouraudFragSrc;
                    break;
                case 'flat':
                    vertSrc = flatVertSrc;
                    fragSrc = flatFragSrc;
                    break;
            }
            this.updateShader(vertSrc, fragSrc);
        }.bind(this));

        // 模型变换滑块
        setupSlider('tx', 'tx-value', function(value) {
            // 修复平移方向：在右手坐标系中，X向右为正，Y向上为正，Z向屏幕外为正
            translation[0] = parseFloat(value);
        }, function(value) { return value; });

        setupSlider('ty', 'ty-value', function(value) {
            translation[1] = parseFloat(value);
        }, function(value) { return value; });

        setupSlider('tz', 'tz-value', function(value) {
            // 修复平移方向：在右手坐标系中，Z向屏幕外为正
            translation[2] = parseFloat(value);
        }, function(value) { return value; });

        // 模型旋转滑块
        setupSlider('rx', 'rx-value', function(value) {
            rotation[0] = parseFloat(value);
        }, function(value) { return value + '°'; });

        setupSlider('ry', 'ry-value', function(value) {
            rotation[1] = parseFloat(value);
        }, function(value) { return value + '°'; });

        setupSlider('rz', 'rz-value', function(value) {
            rotation[2] = parseFloat(value);
        }, function(value) { return value + '°'; });

        // 模型缩放滑块
        setupSlider('scale', 'scale-value', function(value) {
            scale = parseFloat(value);
        }, function(value) { return value; });

        // 投影类型
        document.querySelectorAll('input[name="projection"]').forEach(function(radio) {
            radio.addEventListener('change', function() {
                projectionType = radio.value;
                document.getElementById('ortho-controls').style.display =
                    projectionType === 'ortho' ? 'block' : 'none';
                document.getElementById('persp-controls').style.display =
                    projectionType === 'persp' ? 'block' : 'none';
                display();
            });
        });

        // 正交投影参数
        setupInput('ortho-left', function(value) {
            orthoParams.left = parseFloat(value);
            display();
        });

        setupInput('ortho-right', function(value) {
            orthoParams.right = parseFloat(value);
            display();
        });

        setupInput('ortho-bottom', function(value) {
            orthoParams.bottom = parseFloat(value);
            display();
        });

        setupInput('ortho-top', function(value) {
            orthoParams.top = parseFloat(value);
            display();
        });

        // 透视投影参数
        setupInput('fov', function(value) {
            perspParams.fov = parseFloat(value);
            display();
        });

        setupInput('near', function(value) {
            perspParams.near = parseFloat(value);
            display();
        });

        setupInput('far', function(value) {
            perspParams.far = parseFloat(value);
            display();
        });

        // 光照控制
        document.getElementById("slider-ka").addEventListener("input", function(event) {
            materialKa = parseFloat(event.target.value);
            document.getElementById("slider-ka-value").innerHTML = materialKa.toFixed(2);
            display();
        });

        document.getElementById("slider-kd").addEventListener("input", function(event) {
            materialKd = parseFloat(event.target.value);
            document.getElementById("slider-kd-value").innerHTML = materialKd.toFixed(2);
            display();
        });

        document.getElementById("slider-ks").addEventListener("input", function(event) {
            materialKs = parseFloat(event.target.value);
            document.getElementById("slider-ks-value").innerHTML = materialKs.toFixed(2);
            display();
        });

        document.getElementById("slider-sh").addEventListener("input", function(event) {
            materialShininess = parseFloat(event.target.value);
            document.getElementById("slider-sh-value").innerHTML = materialShininess.toFixed(0);
            display();
        });

        document.getElementById("ka-color").addEventListener("input", function(event) {
            var hexcolor = event.target.value.substring(1);
            var rgbHex = hexcolor.match(/.{1,2}/g);
            materialAmbient = vec4.fromValues(
                parseInt(rgbHex[0], 16) * 1.0 / 255.0,
                parseInt(rgbHex[1], 16) * 1.0 / 255.0,
                parseInt(rgbHex[2], 16) * 1.0 / 255.0,
                1.0
            );
            display();
        });

        document.getElementById("kd-color").addEventListener("input", function(event) {
            var hexcolor = event.target.value.substring(1);
            var rgbHex = hexcolor.match(/.{1,2}/g);
            materialDiffuse = vec4.fromValues(
                parseInt(rgbHex[0], 16) * 1.0 / 255.0,
                parseInt(rgbHex[1], 16) * 1.0 / 255.0,
                parseInt(rgbHex[2], 16) * 1.0 / 255.0,
                1.0
            );
            display();
        });

        document.getElementById("ks-color").addEventListener("input", function(event) {
            var hexcolor = event.target.value.substring(1);
            var rgbHex = hexcolor.match(/.{1,2}/g);
            materialSpecular = vec4.fromValues(
                parseInt(rgbHex[0], 16) * 1.0 / 255.0,
                parseInt(rgbHex[1], 16) * 1.0 / 255.0,
                parseInt(rgbHex[2], 16) * 1.0 / 255.0,
                1.0
            );
            display();
        });

        document.getElementById("bk-color").addEventListener("input", function(event) {
            var hexcolor = event.target.value.substring(1);
            var rgbHex = hexcolor.match(/.{1,2}/g);
            clearColor = vec4.fromValues(
                parseInt(rgbHex[0], 16) * 1.0 / 255.0,
                parseInt(rgbHex[1], 16) * 1.0 / 255.0,
                parseInt(rgbHex[2], 16) * 1.0 / 255.0,
                1.0
            );
            gl.clearColor(clearColor[0], clearColor[1], clearColor[2], clearColor[3]);
            display();
        });

        document.getElementById("lt-ambient-color").addEventListener("input", function(event) {
            var hexcolor = event.target.value.substring(1);
            var rgbHex = hexcolor.match(/.{1,2}/g);
            lightAmbient = vec4.fromValues(
                parseInt(rgbHex[0], 16) * 1.0 / 255.0,
                parseInt(rgbHex[1], 16) * 1.0 / 255.0,
                parseInt(rgbHex[2], 16) * 1.0 / 255.0,
                1.0
            );
            display();
        });

        document.getElementById("lt-diffuse-color").addEventListener("input", function(event) {
            var hexcolor = event.target.value.substring(1);
            var rgbHex = hexcolor.match(/.{1,2}/g);
            lightDiffuse = vec4.fromValues(
                parseInt(rgbHex[0], 16) * 1.0 / 255.0,
                parseInt(rgbHex[1], 16) * 1.0 / 255.0,
                parseInt(rgbHex[2], 16) * 1.0 / 255.0,
                1.0
            );
            display();
        });

        document.getElementById("lt-specular-color").addEventListener("input", function(event) {
            var hexcolor = event.target.value.substring(1);
            var rgbHex = hexcolor.match(/.{1,2}/g);
            lightSpecular = vec4.fromValues(
                parseInt(rgbHex[0], 16) * 1.0 / 255.0,
                parseInt(rgbHex[1], 16) * 1.0 / 255.0,
                parseInt(rgbHex[2], 16) * 1.0 / 255.0,
                1.0
            );
            display();
        });

        document.getElementById("slider-x").addEventListener("input", function(event) {
            var lx = parseFloat(event.target.value);
            lightPosition[0] = lx;
            document.getElementById("slider-x-value").innerHTML = lx.toFixed(1);
            display();
        });

        document.getElementById("slider-y").addEventListener("input", function(event) {
            var ly = parseFloat(event.target.value);
            lightPosition[1] = ly;
            document.getElementById("slider-y-value").innerHTML = ly.toFixed(1);
            display();
        });

        document.getElementById("slider-z").addEventListener("input", function(event) {
            var lz = parseFloat(event.target.value);
            lightPosition[2] = lz;
            document.getElementById("slider-z-value").innerHTML = lz.toFixed(1);
            display();
        });

        // 视点控制
        document.getElementById("slider-radius").addEventListener("input", function(event) {
            radius = parseFloat(event.target.value);
            document.getElementById("slider-radius-value").innerHTML = radius.toFixed(1);
            display();
        });

        document.getElementById("slider-theta").addEventListener("input", function(event) {
            theta = parseFloat(event.target.value);
            document.getElementById("slider-theta-value").innerHTML = theta.toFixed(1) + '°';
            display();
        });

        document.getElementById("slider-phi").addEventListener("input", function(event) {
            phi = parseFloat(event.target.value);
            document.getElementById("slider-phi-value").innerHTML = phi.toFixed(1) + '°';
            display();
        });

        document.getElementById("slider-at-x").addEventListener("input", function(event) {
            at[0] = parseFloat(event.target.value);
            document.getElementById("slider-at-x-value").innerHTML = at[0].toFixed(1);
            display();
        });

        document.getElementById("slider-at-y").addEventListener("input", function(event) {
            at[1] = parseFloat(event.target.value);
            document.getElementById("slider-at-y-value").innerHTML = at[1].toFixed(1);
            display();
        });

        document.getElementById("slider-at-z").addEventListener("input", function(event) {
            at[2] = parseFloat(event.target.value);
            document.getElementById("slider-at-z-value").innerHTML = at[2].toFixed(1);
            display();
        });
    }

    function setupSlider(sliderId, valueId, callback, formatCallback) {
        var slider = document.getElementById(sliderId);
        var valueDisplay = document.getElementById(valueId);

        slider.addEventListener('input', function() {
            callback(slider.value);
            valueDisplay.textContent = formatCallback(slider.value);
            display();
        });
    }

    function setupInput(inputId, callback) {
        var input = document.getElementById(inputId);
        input.addEventListener('change', function() {
            callback(input.value);
        });
    }

    function loadModel(file) {
        if (!file) return;

        var reader = new FileReader();
        reader.onload = function(event) {
            var content = event.target.result;
            parseOBJ(content);
            document.getElementById('fileStatus').textContent =
                '已加载模型: ' + file.name + ', 顶点数: ' + modelVertexCount;
            display();
        };
        reader.readAsText(file);
    }

    function parseOBJ(content) {
        var lines = content.split('\n');
        var vertices = [];
        var normals = [];
        var faces = [];
        var faceNormals = [];

        // 解析顶点和法向量
        for (var i = 0; i < lines.length; i++) {
            var line = lines[i].trim();
            if (line.length === 0) continue;

            var parts = line.split(/\s+/);
            if (parts[0] === 'v') {
                // 顶点
                if (parts.length >= 4) {
                    vertices.push([
                        parseFloat(parts[1]),
                        parseFloat(parts[2]),
                        parseFloat(parts[3])
                    ]);
                }
            } else if (parts[0] === 'vn') {
                // 法向量
                if (parts.length >= 4) {
                    normals.push([
                        parseFloat(parts[1]),
                        parseFloat(parts[2]),
                        parseFloat(parts[3])
                    ]);
                }
            } else if (parts[0] === 'f') {
                // 面 - 处理各种格式 (v, v/vt, v/vt/vn, v//vn)
                var face = [];
                var normalIndices = [];

                for (var j = 1; j < parts.length; j++) {
                    var vertexData = parts[j].split('/');
                    // 取第一个索引（顶点索引）
                    var vertexIndex = parseInt(vertexData[0]);
                    if (!isNaN(vertexIndex) && vertexIndex > 0) {
                        face.push(vertexIndex - 1); // OBJ索引从1开始，转换为从0开始
                    }

                    // 取法向量索引（如果有）
                    if (vertexData.length >= 3 && vertexData[2] !== '') {
                        var normalIndex = parseInt(vertexData[2]);
                        if (!isNaN(normalIndex) && normalIndex > 0) {
                            normalIndices.push(normalIndex - 1);
                        }
                    } else {
                        normalIndices.push(-1); // 标记为没有法向量
                    }
                }

                if (face.length >= 3) {
                    faces.push(face);
                    faceNormals.push(normalIndices);
                }
            }
        }

        // 构建顶点数组和法向量数组 - 三角化处理
        modelVertices = [];
        modelNormals = [];

        for (var i = 0; i < faces.length; i++) {
            var face = faces[i];
            var normalIndices = faceNormals[i];

            // 三角化处理 - 将多边形分解为三角形扇形
            var firstVertex = face[0];
            var firstNormal = normalIndices[0] >= 0 ? normalIndices[0] : -1;

            for (var j = 1; j < face.length - 1; j++) {
                // 添加三角形的三个顶点
                modelVertices.push.apply(modelVertices, vertices[firstVertex]);
                modelVertices.push.apply(modelVertices, vertices[face[j]]);
                modelVertices.push.apply(modelVertices, vertices[face[j + 1]]);

                // 添加法向量
                if (firstNormal >= 0) {
                    // 使用OBJ文件中的法向量
                    modelNormals.push.apply(modelNormals, normals[firstNormal]);
                    modelNormals.push.apply(modelNormals, normals[normalIndices[j]]);
                    modelNormals.push.apply(modelNormals, normals[normalIndices[j + 1]]);
                } else {
                    // 计算面法向量
                    var v0 = vertices[firstVertex];
                    var v1 = vertices[face[j]];
                    var v2 = vertices[face[j + 1]];

                    var u = [v1[0] - v0[0], v1[1] - v0[1], v1[2] - v0[2]];
                    var v = [v2[0] - v0[0], v2[1] - v0[1], v2[2] - v0[2]];

                    // 计算叉积
                    var normal = [
                        u[1] * v[2] - u[2] * v[1],
                        u[2] * v[0] - u[0] * v[2],
                        u[0] * v[1] - u[1] * v[0]
                    ];

                    // 归一化
                    var length = Math.sqrt(normal[0] * normal[0] + normal[1] * normal[1] + normal[2] * normal[2]);
                    if (length > 0) {
                        normal[0] /= length;
                        normal[1] /= length;
                        normal[2] /= length;
                    }

                    // 为三个顶点使用相同的法向量
                    modelNormals.push.apply(modelNormals, normal);
                    modelNormals.push.apply(modelNormals, normal);
                    modelNormals.push.apply(modelNormals, normal);
                }
            }
        }

        modelVertexCount = modelVertices.length / 3;

        // 更新缓冲区
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(modelVertices), gl.STATIC_DRAW);

        if (currentShader === 'phong' || currentShader === 'gouraud') {
            gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(modelNormals), gl.STATIC_DRAW);
        }
    }

    function createDefaultCube() {
        // 立方体顶点数据（三角形列表）
        var cubeVertices = [
            // 前面
            -0.5, -0.5, 0.5,
            0.5, -0.5, 0.5,
            0.5, 0.5, 0.5,
            -0.5, -0.5, 0.5,
            0.5, 0.5, 0.5,
            -0.5, 0.5, 0.5,

            // 后面
            -0.5, -0.5, -0.5,
            -0.5, 0.5, -0.5,
            0.5, 0.5, -0.5,
            -0.5, -0.5, -0.5,
            0.5, 0.5, -0.5,
            0.5, -0.5, -0.5,

            // 上面
            -0.5, 0.5, -0.5,
            -0.5, 0.5, 0.5,
            0.5, 0.5, 0.5,
            -0.5, 0.5, -0.5,
            0.5, 0.5, 0.5,
            0.5, 0.5, -0.5,

            // 下面
            -0.5, -0.5, -0.5,
            0.5, -0.5, -0.5,
            0.5, -0.5, 0.5,
            -0.5, -0.5, -0.5,
            0.5, -0.5, 0.5,
            -0.5, -0.5, 0.5,

            // 右面
            0.5, -0.5, -0.5,
            0.5, 0.5, -0.5,
            0.5, 0.5, 0.5,
            0.5, -0.5, -0.5,
            0.5, 0.5, 0.5,
            0.5, -0.5, 0.5,

            // 左面
            -0.5, -0.5, -0.5,
            -0.5, -0.5, 0.5,
            -0.5, 0.5, 0.5,
            -0.5, -0.5, -0.5,
            -0.5, 0.5, 0.5,
            -0.5, 0.5, -0.5
        ];

        // 立方体法向量数据
        var cubeNormals = [
            // 前面 (0, 0, 1)
            0, 0, 1,
            0, 0, 1,
            0, 0, 1,
            0, 0, 1,
            0, 0, 1,
            0, 0, 1,

            // 后面 (0, 0, -1)
            0, 0, -1,
            0, 0, -1,
            0, 0, -1,
            0, 0, -1,
            0, 0, -1,
            0, 0, -1,

            // 上面 (0, 1, 0)
            0, 1, 0,
            0, 1, 0,
            0, 1, 0,
            0, 1, 0,
            0, 1, 0,
            0, 1, 0,

            // 下面 (0, -1, 0)
            0, -1, 0,
            0, -1, 0,
            0, -1, 0,
            0, -1, 0,
            0, -1, 0,
            0, -1, 0,

            // 右面 (1, 0, 0)
            1, 0, 0,
            1, 0, 0,
            1, 0, 0,
            1, 0, 0,
            1, 0, 0,
            1, 0, 0,

            // 左面 (-1, 0, 0)
            -1, 0, 0,
            -1, 0, 0,
            -1, 0, 0,
            -1, 0, 0,
            -1, 0, 0,
            -1, 0, 0
        ];

        modelVertices = cubeVertices;
        modelNormals = cubeNormals;
        modelVertexCount = modelVertices.length / 3;

        // 更新缓冲区
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(modelVertices), gl.STATIC_DRAW);

        if (currentShader === 'phong' || currentShader === 'gouraud') {
            gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(modelNormals), gl.STATIC_DRAW);
        }
    }

    function updateMatrices() {
        // 重置矩阵
        mat4.identity(modelMatrix);
        mat4.identity(viewMatrix);
        mat4.identity(modelViewMatrix);
        mat4.identity(projectionMatrix);
        mat3.identity(normalMatrix);

        // 应用模型变换 - 修复平移方向
        mat4.translate(modelMatrix, modelMatrix, translation);
        mat4.rotateX(modelMatrix, modelMatrix, rotation[0] * Math.PI / 180);
        mat4.rotateY(modelMatrix, modelMatrix, rotation[1] * Math.PI / 180);
        mat4.rotateZ(modelMatrix, modelMatrix, rotation[2] * Math.PI / 180);
        mat4.scale(modelMatrix, modelMatrix, [scale, scale, scale]);

        // 计算视点位置
        vec3.set(eye,
            radius * Math.sin(theta * Math.PI / 180.0) * Math.cos(phi * Math.PI / 180.0),
            radius * Math.sin(theta * Math.PI / 180.0) * Math.sin(phi * Math.PI / 180.0),
            radius * Math.cos(theta * Math.PI / 180.0)
        );

        // 应用视点变换
        mat4.lookAt(viewMatrix, eye, at, up);

        // 计算模型视图矩阵
        mat4.multiply(modelViewMatrix, viewMatrix, modelMatrix);

        // 计算法向量矩阵（模型视图矩阵的逆转置）
        if (currentShader === 'phong' || currentShader === 'gouraud') {
            mat3.fromMat4(normalMatrix, modelViewMatrix);
            mat3.invert(normalMatrix, normalMatrix);
            mat3.transpose(normalMatrix, normalMatrix);
        }

        // 计算投影矩阵
        var aspect = canvas.width / canvas.height;

        if (projectionType === 'ortho') {
            mat4.ortho(
                projectionMatrix,
                orthoParams.left * aspect, orthoParams.right * aspect,
                orthoParams.bottom, orthoParams.top,
                orthoParams.near, orthoParams.far
            );
        } else {
            mat4.perspective(
                projectionMatrix,
                perspParams.fov * Math.PI / 180,
                aspect,
                perspParams.near,
                perspParams.far
            );
        }
    }

    function display() {
        // 清除画布
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.clearColor(clearColor[0], clearColor[1], clearColor[2], clearColor[3]);

        // 如果没有模型数据，则绘制默认立方体
        if (modelVertexCount === 0) {
            createDefaultCube();
        }

        // 更新变换矩阵
        updateMatrices();

        // 设置顶点属性
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
        gl.vertexAttribPointer(
            attribLocations.position,
            3, // 每个顶点有3个分量 (x, y, z)
            gl.FLOAT,
            false,
            0,
            0
        );
        gl.enableVertexAttribArray(attribLocations.position);

        // 根据当前着色器类型设置不同的属性
        if (currentShader === 'phong' || currentShader === 'gouraud') {
            // 设置法向量属性
            gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
            gl.vertexAttribPointer(
                attribLocations.normal,
                3, // 每个法向量有3个分量 (x, y, z)
                gl.FLOAT,
                false,
                0,
                0
            );
            gl.enableVertexAttribArray(attribLocations.normal);
        }

        // 设置uniform变量
        gl.uniformMatrix4fv(uniformLocations.modelViewMatrix, false, modelViewMatrix);
        gl.uniformMatrix4fv(uniformLocations.projectionMatrix, false, projectionMatrix);

        if (currentShader === 'phong' || currentShader === 'gouraud') {
            // 计算光照乘积项
            var ambientProduct = vec4.create();
            vec4.multiply(ambientProduct, lightAmbient, materialAmbient);

            var diffuseProduct = vec4.create();
            vec4.multiply(diffuseProduct, lightDiffuse, materialDiffuse);

            var specularProduct = vec4.create();
            vec4.multiply(specularProduct, lightSpecular, materialSpecular);

            // 设置光照相关的uniform变量
            gl.uniformMatrix3fv(uniformLocations.normalMatrix, false, normalMatrix);
            gl.uniform4fv(uniformLocations.lightPosition, lightPosition);
            gl.uniform1f(uniformLocations.shininess, materialShininess);
            gl.uniform1f(uniformLocations.materialKa, materialKa);
            gl.uniform1f(uniformLocations.materialKd, materialKd);
            gl.uniform1f(uniformLocations.materialKs, materialKs);
            gl.uniform4fv(uniformLocations.ambientProduct, ambientProduct);
            gl.uniform4fv(uniformLocations.diffuseProduct, diffuseProduct);
            gl.uniform4fv(uniformLocations.specularProduct, specularProduct);
        } else if (currentShader === 'flat') {
            // 设置平面着色器的颜色
            var colorValue = hexToRgb(document.getElementById('objcolor').value);
            gl.uniform4f(uniformLocations.color, colorValue.r, colorValue.g, colorValue.b, 1.0);
        }

        // 绘制
        var isWireframe = document.querySelector('input[name="drawtype"]:checked').value === 'wireframe';

        if (isWireframe) {
            // 线框模式 - 需要特殊处理
            var lineVertices = [];
            for (var i = 0; i < modelVertices.length; i += 9) {
                // 三角形三个顶点
                var v0 = [modelVertices[i], modelVertices[i + 1], modelVertices[i + 2]];
                var v1 = [modelVertices[i + 3], modelVertices[i + 4], modelVertices[i + 5]];
                var v2 = [modelVertices[i + 6], modelVertices[i + 7], modelVertices[i + 8]];

                // 添加三条边
                lineVertices.push.apply(lineVertices, v0.concat(v1)); // 边1
                lineVertices.push.apply(lineVertices, v1.concat(v2)); // 边2
                lineVertices.push.apply(lineVertices, v2.concat(v0)); // 边3
            }

            var lineBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, lineBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(lineVertices), gl.STATIC_DRAW);
            gl.vertexAttribPointer(attribLocations.position, 3, gl.FLOAT, false, 0, 0);

            // 对于线框模式，使用简单的着色器
            if (currentShader === 'phong' || currentShader === 'gouraud') {
                gl.disableVertexAttribArray(attribLocations.normal);
            }

            gl.drawArrays(gl.LINES, 0, lineVertices.length / 3);

            if (currentShader === 'phong' || currentShader === 'gouraud') {
                gl.enableVertexAttribArray(attribLocations.normal);
            }

            // 清理临时缓冲区
            gl.deleteBuffer(lineBuffer);
        } else {
            // 实体模式
            gl.drawArrays(gl.TRIANGLES, 0, modelVertexCount);
        }
    }

    // 将十六进制颜色转换为RGB
    function hexToRgb(hex) {
        // 处理3位和6位十六进制颜色
        var hexCode = hex.slice(1);
        if (hexCode.length === 3) {
            hexCode = hexCode.split('').map(function(char) { return char + char; }).join('');
        }

        var result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hexCode);
        return result ? {
            r: parseInt(result[1], 16) / 255,
            g: parseInt(result[2], 16) / 255,
            b: parseInt(result[3], 16) / 255
        } : {r: 1, g: 0, b: 0}; // 默认为红色
    }

    // 更新着色器
    this.updateShader = function(newVertSrc, newFragSrc) {
        vertSrc = newVertSrc;
        fragSrc = newFragSrc;

        gl.deleteProgram(progID);
        gl.deleteShader(vertID);
        gl.deleteShader(fragID);

        setupShaders();
        display();
    };
}

// 页面加载完成后初始化查看器
window.addEventListener('load', function() {
    var viewer = new ModelViewer('gl-canvas');
    viewer.init();
});