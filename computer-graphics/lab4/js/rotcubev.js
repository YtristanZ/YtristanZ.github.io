// 全局变量
        let canvas, gl;
        let program;
        let currentShape = 'triangle';
        let currentColor = [1.0, 0.34, 0.13, 1.0]; // 默认橙色
        let circleSides = 10;
        let objects = [];
        let objectCount = 0;

        // 初始化函数
        window.onload = function init() {
            canvas = document.getElementById("gl-canvas");
            gl = canvas.getContext("webgl2");

            if (!gl) {
                alert("WebGL 2.0 不被支持！");
                return;
            }

            // 设置视口和清除颜色
            gl.viewport(0, 0, canvas.width, canvas.height);
            gl.clearColor(0.1, 0.1, 0.1, 1.0);
            gl.enable(gl.DEPTH_TEST);

            // 初始化着色器程序
            program = initShaderProgram(gl,
                document.getElementById("vertex-shader").textContent,
                document.getElementById("fragment-shader").textContent
            );

            // 设置事件监听器
            setupEventListeners();

            // 开始渲染循环
            render();
        };

        // 初始化着色器程序
        function initShaderProgram(gl, vsSource, fsSource) {
            const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
            const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

            const shaderProgram = gl.createProgram();
            gl.attachShader(shaderProgram, vertexShader);
            gl.attachShader(shaderProgram, fragmentShader);
            gl.linkProgram(shaderProgram);

            if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
                alert('无法初始化着色器程序: ' + gl.getProgramInfoLog(shaderProgram));
                return null;
            }

            return shaderProgram;
        }

        // 加载着色器
        function loadShader(gl, type, source) {
            const shader = gl.createShader(type);
            gl.shaderSource(shader, source);
            gl.compileShader(shader);

            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                alert('编译着色器时出错: ' + gl.getShaderInfoLog(shader));
                gl.deleteShader(shader);
                return null;
            }

            return shader;
        }

        // 设置事件监听器
        function setupEventListeners() {
            // 图形选择按钮
            document.getElementById('triangle-btn').addEventListener('click', () => setCurrentShape('triangle'));
            document.getElementById('square-btn').addEventListener('click', () => setCurrentShape('square'));
            document.getElementById('cube-btn').addEventListener('click', () => setCurrentShape('cube'));
            document.getElementById('circle-btn').addEventListener('click', () => setCurrentShape('circle'));

            // 颜色选择器
            document.getElementById('color-picker').addEventListener('input', (e) => {
                const hex = e.target.value;
                currentColor = [
                    parseInt(hex.slice(1, 3), 16) / 255,
                    parseInt(hex.slice(3, 5), 16) / 255,
                    parseInt(hex.slice(5, 7), 16) / 255,
                    1.0
                ];
            });

            // 圆形边数滑块
            const sidesSlider = document.getElementById('sides-slider');
            const sidesValue = document.getElementById('sides-value');
            sidesSlider.addEventListener('input', (e) => {
                circleSides = parseInt(e.target.value);
                sidesValue.textContent = circleSides;
            });

            // 清空场景按钮
            document.getElementById('clear-btn').addEventListener('click', () => {
                objects = [];
                objectCount = 0;
                document.getElementById('object-count').textContent = objectCount;
            });

            // 画布点击事件
            canvas.addEventListener('click', (e) => {
                const rect = canvas.getBoundingClientRect();
                const x = ((e.clientX - rect.left) / canvas.width) * 2 - 1;
                const y = -(((e.clientY - rect.top) / canvas.height) * 2 - 1);

                addObject(currentShape, x, y);
            });
        }

        // 设置当前图形类型
        function setCurrentShape(shape) {
            currentShape = shape;

            // 更新按钮状态
            document.getElementById('triangle-btn').classList.remove('active');
            document.getElementById('square-btn').classList.remove('active');
            document.getElementById('cube-btn').classList.remove('active');
            document.getElementById('circle-btn').classList.remove('active');
            document.getElementById(shape + '-btn').classList.add('active');

            // 更新信息面板
            const shapeNames = {
                triangle: '正三角形',
                square: '正方形',
                cube: '立方体',
                circle: '圆形'
            };
            document.getElementById('current-shape').textContent = shapeNames[shape];
        }

        // 添加对象到场景
        function addObject(type, x, y) {
            const object = {
                type: type,
                position: [x, y, 0],
                color: [...currentColor],
                scale: 1.0,
                rotation: 0,
                translation: [0, 0],
                time: 0,
                id: objectCount++
            };

            // 根据类型设置初始状态
            if (type === 'triangle') {
                object.scaleDirection = 1;
            } else if (type === 'circle') {
                object.translationSpeed = [Math.random() * 0.02 - 0.01, Math.random() * 0.02 - 0.01];
            }

            objects.push(object);
            document.getElementById('object-count').textContent = objects.length;
        }

        // 渲染循环
        function render() {
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

            gl.useProgram(program);

            // 获取uniform位置
            const uModelViewMatrix = gl.getUniformLocation(program, "uModelViewMatrix");
            const uProjectionMatrix = gl.getUniformLocation(program, "uProjectionMatrix");

            // 设置投影矩阵
            const projectionMatrix = mat4.create();
            mat4.ortho(projectionMatrix, -1, 1, -1, 1, -1, 1);
            gl.uniformMatrix4fv(uProjectionMatrix, false, projectionMatrix);

            // 渲染每个对象
            objects.forEach(obj => {
                // 更新对象状态
                updateObject(obj);

                // 创建模型视图矩阵
                const modelViewMatrix = mat4.create();

                // 应用变换
                mat4.translate(modelViewMatrix, modelViewMatrix, [obj.position[0], obj.position[1], obj.position[2]]);

                if (obj.type === 'square') {
                    mat4.rotateZ(modelViewMatrix, modelViewMatrix, obj.rotation);
                } else if (obj.type === 'cube') {
                    mat4.rotate(modelViewMatrix, modelViewMatrix, obj.rotation, [1, 1, 0]);
                } else if (obj.type === 'triangle') {
                    mat4.scale(modelViewMatrix, modelViewMatrix, [obj.scale, obj.scale, obj.scale]);
                } else if (obj.type === 'circle') {
                    mat4.translate(modelViewMatrix, modelViewMatrix, [obj.translation[0], obj.translation[1], 0]);
                }

                gl.uniformMatrix4fv(uModelViewMatrix, false, modelViewMatrix);

                // 绘制对象
                drawObject(obj);
            });

            requestAnimationFrame(render);
        }

        // 更新对象状态
        function updateObject(obj) {
            obj.time += 0.016; // 假设60FPS

            switch(obj.type) {
                case 'triangle':
                    // 缩放动画
                    obj.scale += 0.02 * obj.scaleDirection;
                    if (obj.scale > 1.5 || obj.scale < 0.5) {
                        obj.scaleDirection *= -1;
                    }
                    break;

                case 'square':
                    // 旋转动画
                    obj.rotation += 0.03;
                    break;

                case 'cube':
                    // 旋转动画
                    obj.rotation += 0.02;
                    break;

                case 'circle':
                    // 平移动画
                    obj.translation[0] += obj.translationSpeed[0];
                    obj.translation[1] += obj.translationSpeed[1];

                    // 边界检查
                    if (obj.translation[0] > 0.8 || obj.translation[0] < -0.8) {
                        obj.translationSpeed[0] *= -1;
                    }
                    if (obj.translation[1] > 0.8 || obj.translation[1] < -0.8) {
                        obj.translationSpeed[1] *= -1;
                    }
                    break;
            }
        }

        // 绘制对象
        function drawObject(obj) {
            // 创建顶点和颜色缓冲区
            const positionBuffer = gl.createBuffer();
            const colorBuffer = gl.createBuffer();

            // 获取attribute位置
            const vPosition = gl.getAttribLocation(program, "vPosition");
            const vColor = gl.getAttribLocation(program, "vColor");

            let vertices, colors;

            switch(obj.type) {
                case 'triangle':
                    // 正三角形
                    vertices = new Float32Array([
                        0.0, 0.2, 0.0,
                        -0.2, -0.2, 0.0,
                        0.2, -0.2, 0.0
                    ]);
                    break;

                case 'square':
                    // 正方形
                    vertices = new Float32Array([
                        -0.15, 0.15, 0.0,
                        -0.15, -0.15, 0.0,
                        0.15, -0.15, 0.0,
                        0.15, 0.15, 0.0
                    ]);
                    break;

                case 'cube':
                    // 立方体 (简化为两个面)
                    vertices = new Float32Array([
                        // 前面
                        -0.1, 0.1, 0.1,
                        -0.1, -0.1, 0.1,
                        0.1, -0.1, 0.1,
                        0.1, 0.1, 0.1,
                        // 上面
                        -0.1, 0.1, -0.1,
                        -0.1, 0.1, 0.1,
                        0.1, 0.1, 0.1,
                        0.1, 0.1, -0.1
                    ]);
                    break;

                case 'circle':
                    // 圆形
                    vertices = [];
                    const radius = 0.15;
                    for (let i = 0; i < circleSides; i++) {
                        const angle = (i / circleSides) * 2 * Math.PI;
                        vertices.push(
                            Math.cos(angle) * radius,
                            Math.sin(angle) * radius,
                            0.0
                        );
                    }
                    vertices = new Float32Array(vertices);
                    break;
            }

            // 设置颜色数据
            colors = [];
            for (let i = 0; i < vertices.length / 3; i++) {
                colors.push(...obj.color);
            }
            colors = new Float32Array(colors);

            // 设置顶点缓冲区
            gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
            gl.vertexAttribPointer(vPosition, 3, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(vPosition);

            // 设置颜色缓冲区
            gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW);
            gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(vColor);

            // 绘制图形
            if (obj.type === 'circle') {
                gl.drawArrays(gl.TRIANGLE_FAN, 0, vertices.length / 3);
            } else if (obj.type === 'cube') {
                // 绘制前面
                gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
                // 绘制上面
                gl.drawArrays(gl.TRIANGLE_FAN, 4, 4);
            } else {
                gl.drawArrays(gl.TRIANGLE_FAN, 0, vertices.length / 3);
            }

            // 清理缓冲区
            gl.deleteBuffer(positionBuffer);
            gl.deleteBuffer(colorBuffer);
        }

        // 简化版矩阵库 (实际项目中应使用完整的gl-matrix库)
        const mat4 = {
            create: function() {
                return new Float32Array([
                    1, 0, 0, 0,
                    0, 1, 0, 0,
                    0, 0, 1, 0,
                    0, 0, 0, 1
                ]);
            },

            ortho: function(out, left, right, bottom, top, near, far) {
                const lr = 1 / (left - right);
                const bt = 1 / (bottom - top);
                const nf = 1 / (near - far);

                out[0] = -2 * lr;
                out[1] = 0;
                out[2] = 0;
                out[3] = 0;
                out[4] = 0;
                out[5] = -2 * bt;
                out[6] = 0;
                out[7] = 0;
                out[8] = 0;
                out[9] = 0;
                out[10] = 2 * nf;
                out[11] = 0;
                out[12] = (left + right) * lr;
                out[13] = (top + bottom) * bt;
                out[14] = (far + near) * nf;
                out[15] = 1;

                return out;
            },

            translate: function(out, a, v) {
                const x = v[0], y = v[1], z = v[2];

                out[12] = a[0] * x + a[4] * y + a[8] * z + a[12];
                out[13] = a[1] * x + a[5] * y + a[9] * z + a[13];
                out[14] = a[2] * x + a[6] * y + a[10] * z + a[14];
                out[15] = a[3] * x + a[7] * y + a[11] * z + a[15];

                return out;
            },

            rotateZ: function(out, a, rad) {
                const s = Math.sin(rad);
                const c = Math.cos(rad);
                const a00 = a[0];
                const a01 = a[1];
                const a02 = a[2];
                const a03 = a[3];
                const a10 = a[4];
                const a11 = a[5];
                const a12 = a[6];
                const a13 = a[7];

                out[0] = a00 * c + a10 * s;
                out[1] = a01 * c + a11 * s;
                out[2] = a02 * c + a12 * s;
                out[3] = a03 * c + a13 * s;
                out[4] = a10 * c - a00 * s;
                out[5] = a11 * c - a01 * s;
                out[6] = a12 * c - a02 * s;
                out[7] = a13 * c - a03 * s;

                return out;
            },

            rotate: function(out, a, rad, axis) {
                let x = axis[0], y = axis[1], z = axis[2];
                let len = Math.sqrt(x * x + y * y + z * z);

                if (len < 0.000001) { return null; }

                len = 1 / len;
                x *= len;
                y *= len;
                z *= len;

                const s = Math.sin(rad);
                const c = Math.cos(rad);
                const t = 1 - c;

                const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
                const a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
                const a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];

                const b00 = x * x * t + c, b01 = y * x * t + z * s, b02 = z * x * t - y * s;
                const b10 = x * y * t - z * s, b11 = y * y * t + c, b12 = z * y * t + x * s;
                const b20 = x * z * t + y * s, b21 = y * z * t - x * s, b22 = z * z * t + c;

                out[0] = a00 * b00 + a10 * b01 + a20 * b02;
                out[1] = a01 * b00 + a11 * b01 + a21 * b02;
                out[2] = a02 * b00 + a12 * b01 + a22 * b02;
                out[3] = a03 * b00 + a13 * b01 + a23 * b02;
                out[4] = a00 * b10 + a10 * b11 + a20 * b12;
                out[5] = a01 * b10 + a11 * b11 + a21 * b12;
                out[6] = a02 * b10 + a12 * b11 + a22 * b12;
                out[7] = a03 * b10 + a13 * b11 + a23 * b12;
                out[8] = a00 * b20 + a10 * b21 + a20 * b22;
                out[9] = a01 * b20 + a11 * b21 + a21 * b22;
                out[10] = a02 * b20 + a12 * b21 + a22 * b22;
                out[11] = a03 * b20 + a13 * b21 + a23 * b22;

                return out;
            },

            scale: function(out, a, v) {
                const x = v[0], y = v[1], z = v[2];

                out[0] = a[0] * x;
                out[1] = a[1] * x;
                out[2] = a[2] * x;
                out[3] = a[3] * x;
                out[4] = a[4] * y;
                out[5] = a[5] * y;
                out[6] = a[6] * y;
                out[7] = a[7] * y;
                out[8] = a[8] * z;
                out[9] = a[9] * z;
                out[10] = a[10] * z;
                out[11] = a[11] * z;

                return out;
            }
        };