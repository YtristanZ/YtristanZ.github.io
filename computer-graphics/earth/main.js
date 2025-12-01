var Colors = {
    red:0xf25346,
    yellow:0xedeb27,
    white:0xd8d0d1,
    brown:0x59332e,
    pink:0xF5986E,
    brownDark:0x23190f,
    blue:0x68c3c0,
    green:0x458248,
    purple:0x551A8B,
    lightgreen:0x629265,
    lovePink:0xff69b4,
    warmYellow:0xffd700,
    //new rose+light_house
    roseRed: 0xe83e8c,    // 玫瑰红（爱情主色）
    rosePink: 0xffccd5,   // 浅粉（花瓣渐变）
    roseFog: 0xfff0f5,    // 爱情雾色
    lighthouseBrown: 0x8b4513, // 灯塔深棕
    lighthouseYellow: 0xffd700, // 灯塔暖黄
    lighthouseFog: 0xfff8e6, // 亲情雾色
};

// 光照控制参数
var lightingParams = {
    model: 'phong', // 'phong', 'raytrace'
    mainLightPosition: { x: 0, y: 600, z: 350 },
    mainLightIntensity: 0.9,
    ambientIntensity: 0.9,
    pointLightIntensity: 1.5,
    shadowQuality: 'medium',
    shadowMapSize: 2048
};

// 纹理控制参数
var textureParams = {
    enabled: true,
    quality: 'medium',
    bumpMapping: true,
    skyboxEnabled: false
};

// 纹理加载器
var textureLoader = new THREE.TextureLoader();
var loadedTextures = {};

// 天空盒相关
var skybox = null;
var currentSkyboxType = 'space';

//添加相机控制
var cameraSpeed = 5;//相机速度
var cameraMoveSpeed = 5;
var isDragging = false;
var previousMousePosition = { x: 0, y: 0 };// 上一次鼠标位置

var scene, camera, fieldOfView, aspectRatio, nearPlane, farPlane, HEIGHT, WIDTH, renderer, container;
var lighthouse;
var rose;
//new
var loveParticles = [];
var particlePool = []; // 粒子对象池（优化性能）
var maxParticles = 200;

// 新增：光线追踪相关变量
var raytraceMaterials = [];
var reflectionCube = null;

function createScene() {
    // Get the width and height of the screen
    // and use them to setup the aspect ratio
    // of the camera and the size of the renderer.
    HEIGHT = window.innerHeight;
    WIDTH = window.innerWidth;

    // Create the scene.
    scene = new THREE.Scene();

    // Add FOV Fog effect to the scene. Same colour as the BG int he stylesheet.
    scene.fog = new THREE.Fog(0xf7d9aa, 100, 950);

    // Create the camera
    aspectRatio = WIDTH / HEIGHT;
    fieldOfView = 60;
    nearPlane = 1;
    farPlane = 10000;
    camera = new THREE.PerspectiveCamera(
        fieldOfView,
        aspectRatio,
        nearPlane,
        farPlane
    );
    // Position the camera
    camera.position.x = 0;
    camera.position.y = 150;
    camera.position.z = 100;


    // Create the renderer

    renderer = new THREE.WebGLRenderer ({
    // Alpha makes the background transparent, antialias is performant heavy
        alpha: true,
        antialias:true
    });

    //set the size of the renderer to fullscreen
    renderer.setSize (WIDTH, HEIGHT);
    //enable shadow rendering
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; // 柔和阴影

    // Add the Renderer to the DOM, in the world div.
    container = document.getElementById('world');
    container.appendChild (renderer.domElement);

    //RESPONSIVE LISTENER
    window.addEventListener('resize', handleWindowResize, false);

    // 预加载纹理
    preloadTextures();

    //new
    // 初始化粒子对象池
    initParticlePool();

    // 初始化环境贴图用于光线追踪
    initReflectionCube();
}

// 预加载纹理
function preloadTextures() {
    // 地球纹理
    loadedTextures.earth = textureLoader.load('https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg');
    loadedTextures.earthBump = textureLoader.load('https://threejs.org/examples/textures/planets/earth_normal_2048.jpg');
    loadedTextures.earthSpecular = textureLoader.load('https://threejs.org/examples/textures/planets/earth_specular_2048.jpg');

    // 云纹理
    loadedTextures.clouds = textureLoader.load('https://threejs.org/examples/textures/planets/earth_clouds_1024.png');

    // 木纹纹理（用于树木和灯塔）
    loadedTextures.wood = textureLoader.load('wood.jpg');


    loadedTextures.wood.wrapS = loadedTextures.wood.wrapT = THREE.RepeatWrapping;
    loadedTextures.wood.repeat.set(2, 2);
}

// 初始化环境贴图
function initReflectionCube() {
    // 创建一个简单的立方体贴图用于反射效果
    const resolution = 128;

    // 创建立方体贴图 - 使用兼容旧版本的方法
    const cubeTexture = new THREE.CubeTexture([]);

    // 设置默认颜色
    const colors = [
        new THREE.Color(0x87CEEB), // 右
        new THREE.Color(0x98FB98), // 左
        new THREE.Color(0xF0E68C), // 上
        new THREE.Color(0xD2B48C), // 下
        new THREE.Color(0xFFB6C1), // 前
        new THREE.Color(0xDDA0DD)  // 后
    ];

    // 为每个面设置颜色
    reflectionCube = new THREE.CubeTexture(new Array(6));
    reflectionCube.format = THREE.RGBFormat;

    for (let i = 0; i < 6; i++) {
        reflectionCube[i] = colors[i];
    }
}

//RESPONSIVE FUNCTION
function handleWindowResize() {
    HEIGHT = window.innerHeight;
    WIDTH = window.innerWidth;
    renderer.setSize(WIDTH, HEIGHT);
    camera.aspect = WIDTH / HEIGHT;
    camera.updateProjectionMatrix();
}

var hemispshereLight, shadowLight,warmLight,loveLight,lighthouseGlobalLight;
var pointLights = []; // 存储所有点光源

var controlParams = {
    rotationSpeed:1.0 ,
    warmLightIntensity: 1.5, // 新增：暖光强度（给玫瑰花/灯塔用）
    particleCount: 15
};

function createLights(){
    // 根据光照模型设置光源
    updateLightingModel();

    // 创建可移动的主光源
    shadowLight = new THREE.DirectionalLight(0xffffff, lightingParams.mainLightIntensity);
    shadowLight.position.set(
        lightingParams.mainLightPosition.x,
        lightingParams.mainLightPosition.y,
        lightingParams.mainLightPosition.z
    );
    shadowLight.castShadow = true;

    // 根据质量设置阴影参数
    updateShadowQuality();

    // 环境光
    hemisphereLight = new THREE.HemisphereLight(0xaaaaaa, 0x000000, lightingParams.ambientIntensity);

    // 添加点光源
    createPointLights();

    // 新增：重逢暖光（初始隐藏）
    warmLight = new THREE.PointLight(Colors.warmYellow, 0, 200);
    warmLight.position.set(0, 50, 0);
    warmLight.castShadow = true;

    // Add the lights to the scene
    scene.add(hemisphereLight);
    scene.add(shadowLight);
    scene.add(warmLight); // 添加暖光到场景

    // 新增：初始化玫瑰花光源（初始强度0，不显示）
    loveLight = new THREE.PointLight(Colors.rosePink, 0, 250);
    loveLight.castShadow = true;
    scene.add(loveLight);

    lighthouseGlobalLight = new THREE.PointLight(Colors.lighthouseYellow, 0, 300);
    lighthouseGlobalLight.castShadow = true;
    scene.add(lighthouseGlobalLight); // 只添加一次
}

// 创建多个点光源
function createPointLights() {
    // 清除现有点光源
    pointLights.forEach(light => scene.remove(light));
    pointLights = [];

    // 创建3个点光源，分布在场景不同位置
    const positions = [
        { x: -300, y: 200, z: -200 },
        { x: 200, y: 150, z: 100 },
        { x: 100, y: 300, z: -300 }
    ];

    const colors = [0xff4444, 0x44ff44, 0x4444ff];

    positions.forEach((pos, index) => {
        const pointLight = new THREE.PointLight(
            colors[index],
            lightingParams.pointLightIntensity,
            500
        );
        pointLight.position.set(pos.x, pos.y, pos.z);
        pointLight.castShadow = true;
        pointLight.shadow.mapSize.width = 512;
        pointLight.shadow.mapSize.height = 512;
        pointLight.shadow.camera.near = 0.5;
        pointLight.shadow.camera.far = 1000;

        scene.add(pointLight);
        pointLights.push(pointLight);
    });
}

// 更新光照模型
function updateLightingModel() {
    // 更新材质
    updateMaterials();
}

// 更新阴影质量
function updateShadowQuality() {
    let mapSize, cameraSize;

    switch(lightingParams.shadowQuality) {
        case 'low':
            mapSize = 1024;
            cameraSize = 400;
            break;
        case 'medium':
            mapSize = 2048;
            cameraSize = 650;
            break;
    }

    shadowLight.shadow.mapSize.width = mapSize;
    shadowLight.shadow.mapSize.height = mapSize;
    shadowLight.shadow.camera.left = -cameraSize;
    shadowLight.shadow.camera.right = cameraSize;
    shadowLight.shadow.camera.top = cameraSize;
    shadowLight.shadow.camera.bottom = -cameraSize;
    shadowLight.shadow.camera.near = 1;
    shadowLight.shadow.camera.far = 1500;

    // 更新点光源阴影质量
    pointLights.forEach(light => {
        light.shadow.mapSize.width = mapSize / 2;
        light.shadow.mapSize.height = mapSize / 2;
    });
}

// 更新材质基于当前光照模型
function updateMaterials() {
    raytraceMaterials = [];

    scene.traverse((child) => {
        if (child.isMesh && child.material) {
            let newMaterial;

            switch(lightingParams.model) {
                case 'phong':
                    newMaterial = createPhongMaterial(child.material, child.userData);
                    break;
                case 'raytrace':
                    newMaterial = createRaytraceMaterial(child.material, child.userData);
                    raytraceMaterials.push(newMaterial);
                    break;
            }

            if (newMaterial) {
                child.material = newMaterial;
            }
        }
    });
}

// 创建Phong材质（带纹理支持）
function createPhongMaterial(originalMat, userData) {
    const isSpecialMaterial = originalMat.color && (
        originalMat.color.getHex() === Colors.red ||
        originalMat.color.getHex() === Colors.yellow ||
        originalMat.color.getHex() === Colors.blue
    );

    let materialParams = {
        color: originalMat.color || 0xffffff,
        specular: isSpecialMaterial ? 0xffffff : 0x111111,
        shininess: isSpecialMaterial ? 100 : 30,
        map: originalMat.map,
        transparent: originalMat.transparent,
        opacity: originalMat.opacity,
        flatShading: originalMat.flatShading
    };

    // 添加纹理映射
    if (textureParams.enabled && userData) {
        if (userData.textureType === 'earth') {
            materialParams.map = loadedTextures.earth;
            materialParams.bumpMap = textureParams.bumpMapping ? loadedTextures.earthBump : null;
            materialParams.bumpScale = 0.05;
            materialParams.specularMap = loadedTextures.earthSpecular;
        } else if (userData.textureType === 'cloud') {
            materialParams.map = loadedTextures.clouds;
            materialParams.transparent = true;
        } else if (userData.textureType === 'wood') {
            materialParams.map = loadedTextures.wood;
        } else if (userData.textureType === 'grass') {
            materialParams.map = loadedTextures.grass;
        } else if (userData.textureType === 'petal') {
            materialParams.map = loadedTextures.petal;
        }
    }

    return new THREE.MeshPhongMaterial(materialParams);
}

// 创建光线追踪材质（模拟）
function createRaytraceMaterial(originalMat, userData) {
    const isMetal = originalMat.color && (
        originalMat.color.getHex() === Colors.yellow || // 太阳
        originalMat.color.getHex() === Colors.white    // 云朵
    );

    let materialParams = {
        color: originalMat.color || 0xffffff,
        specular: isMetal ? 0xffffff : 0x222222,
        shininess: isMetal ? 200 : 50,
        map: originalMat.map,
        transparent: originalMat.transparent,
        opacity: originalMat.opacity,
        flatShading: originalMat.flatShading
    };

    // 添加纹理映射
    if (textureParams.enabled && userData) {
        if (userData.textureType === 'earth') {
            materialParams.map = loadedTextures.earth;
            materialParams.bumpMap = textureParams.bumpMapping ? loadedTextures.earthBump : null;
            materialParams.bumpScale = 0.05;
        }
    }

    // 如果是金属材质，添加反射效果
    if (isMetal && reflectionCube) {
        materialParams.envMap = reflectionCube;
        materialParams.combine = THREE.MixOperation;
        materialParams.reflectivity = isMetal ? 0.8 : 0.2;
    }

    return new THREE.MeshPhongMaterial(materialParams);
}

Land = function(){
    var geom = new THREE.CylinderGeometry(600,600,1700,40,10);
    //rotate on the x axis
    geom.applyMatrix(new THREE.Matrix4().makeRotationX(-Math.PI/2));

    var mat = new THREE.MeshPhongMaterial({
        color: Colors.lightgreen,
        specular: 0x050505,
        shininess: 20,
        flatShading: true,
    });

    // 标记为草地纹理
    geom.userData = { textureType: 'grass' };

    //create a mesh of the object
    this.mesh = new THREE.Mesh(geom, mat);
    //receive shadows
    this.mesh.receiveShadow = true;
}

Orbit = function(){
    var geom =new THREE.Object3D();
    this.mesh = geom;
}

Sun = function(){
    this.mesh = new THREE.Object3D();

    var sunGeom = new THREE.SphereGeometry( 400, 20, 10 );
    var sunMat = new THREE.MeshPhongMaterial({
        color: Colors.yellow,
        specular: 0xffffff,
        shininess: 100,
        flatShading: true,
    });
    var sun = new THREE.Mesh(sunGeom, sunMat);
    sun.castShadow = false;
    sun.receiveShadow = false;
    this.mesh.add(sun);
}

Cloud = function(){
    // Create an empty container for the cloud
    this.mesh = new THREE.Object3D();
    // Cube geometry and material
    var geom = new THREE.DodecahedronGeometry(20,0);
    var mat = new THREE.MeshPhongMaterial({
        color:Colors.white,
        specular: 0x222222,
        shininess: 10,
        flatShading: true,
    });

    // 标记为云纹理
    geom.userData = { textureType: 'cloud' };

    var nBlocs = 3+Math.floor(Math.random()*3);

    for (var i=0; i<nBlocs; i++ ){
        //Clone mesh geometry
        var m = new THREE.Mesh(geom, mat);
            //Randomly position each cube
            m.position.x = i*15;
            m.position.y = Math.random()*10;
            m.position.z = Math.random()*10;
            m.rotation.z = Math.random()*Math.PI*2;
            m.rotation.y = Math.random()*Math.PI*2;

            //Randomly scale the cubes
            var s = .1 + Math.random()*.9;
            m.scale.set(s,s,s);
            this.mesh.add(m);
    }
}

Sky = function(){
    this.mesh = new THREE.Object3D();

    // Number of cloud groups
    this.nClouds = 25;

    // Space the consistenly
    var stepAngle = Math.PI*2 / this.nClouds;

    // Create the Clouds

    for(var i=0; i<this.nClouds; i++){

        var c = new Cloud();

        //set rotation and position using trigonometry
        var a = stepAngle*i;
        // this is the distance between the center of the axis and the cloud itself
        var h = 800 + Math.random()*200;
        c.mesh.position.y = Math.sin(a)*h;
        c.mesh.position.x = Math.cos(a)*h;

        // rotate the cloud according to its position
        c.mesh.rotation.z = a + Math.PI/2;

        // random depth for the clouds on the z-axis
        c.mesh.position.z = -400-Math.random()*400;

        // random scale for each cloud
        var s = 1+Math.random()*2;
        c.mesh.scale.set(s,s,s);

        this.mesh.add(c.mesh);
    }
}

Tree = function () {
    this.mesh = new THREE.Object3D();

    var matTreeLeaves = new THREE.MeshPhongMaterial({
        color:Colors.green,
        specular: 0x030303,
        shininess: 5,
        flatShading: true
    });

    var geonTreeBase = new THREE.BoxGeometry( 10,20,10 );
    var matTreeBase = new THREE.MeshPhongMaterial({
        color:Colors.brown,
        specular: 0x050505,
        shininess: 10,
        flatShading: true
    });

    // 标记为木纹纹理
    geonTreeBase.userData = { textureType: 'wood' };

    var treeBase = new THREE.Mesh(geonTreeBase,matTreeBase);
    treeBase.castShadow = true;
    treeBase.receiveShadow = true;
    this.mesh.add(treeBase);

    var geomTreeLeaves1 = new THREE.CylinderGeometry(1, 12*3, 12*3, 4 );
    var treeLeaves1 = new THREE.Mesh(geomTreeLeaves1,matTreeLeaves);
    treeLeaves1.castShadow = true;
    treeLeaves1.receiveShadow = true;
    treeLeaves1.position.y = 20
    this.mesh.add(treeLeaves1);

    var geomTreeLeaves2 = new THREE.CylinderGeometry( 1, 9*3, 9*3, 4 );
    var treeLeaves2 = new THREE.Mesh(geomTreeLeaves2,matTreeLeaves);
    treeLeaves2.castShadow = true;
    treeLeaves2.position.y = 40;
    treeLeaves2.receiveShadow = true;
    this.mesh.add(treeLeaves2);

    var geomTreeLeaves3 = new THREE.CylinderGeometry( 1, 6*3, 6*3, 4);
    var treeLeaves3 = new THREE.Mesh(geomTreeLeaves3,matTreeLeaves);
    treeLeaves3.castShadow = true;
    treeLeaves3.position.y = 55;
    treeLeaves3.receiveShadow = true;
    this.mesh.add(treeLeaves3);
}

var petalColors = [Colors.red, Colors.yellow, Colors.blue];
Flower = function () {
    this.mesh = new THREE.Object3D();
    //new
    this.isTouched = false; // 标记是否被飞机触碰
    this.bloomScale = 1; // 绽放缩放比例

    var geomStem = new THREE.BoxGeometry( 5,50,5,1,1,1 );
    var matStem = new THREE.MeshPhongMaterial({
        color:Colors.green,
        specular: 0x030303,
        shininess: 5,
        flatShading: true
    });
    var stem = new THREE.Mesh(geomStem,matStem);
    stem.castShadow = false;
    stem.receiveShadow = true;
    this.mesh.add(stem);

    var geomPetalCore = new THREE.BoxGeometry(10,10,10,1,1,1);
    var matPetalCore = new THREE.MeshPhongMaterial({
        color:Colors.yellow,
        specular: 0xffffff,
        shininess: 100,
        flatShading: true
    });
    petalCore = new THREE.Mesh(geomPetalCore, matPetalCore);
    petalCore.castShadow = false;
    petalCore.receiveShadow = true;

    var petalColor = petalColors [Math.floor(Math.random()*3)];
    //new
    this.originalColor = petalColor; // 保存原始颜色
    this.bloomColor = Colors.lovePink; // 绽放后颜色

    var geomPetal = new THREE.BoxGeometry( 15,20,5,1,1,1 );

    // 标记为花瓣纹理
    geomPetal.userData = { textureType: 'petal' };

    var matPetal = new THREE.MeshPhongMaterial({
        color:petalColor,
        specular: 0xffffff,
        shininess: 80,
        flatShading: true
    });
    geomPetal.vertices[5].y-=4;
    geomPetal.vertices[4].y-=4;
    geomPetal.vertices[7].y+=4;
    geomPetal.vertices[6].y+=4;
    geomPetal.translate(12.5,0,3);

        var petals = [];
        for(var i=0; i<4; i++){

            petals[i]=new THREE.Mesh(geomPetal,matPetal);
            petals[i].rotation.z = i*Math.PI/2;
            petals[i].castShadow = true;
            petals[i].receiveShadow = true;
            this.petals = petals; // 保存花瓣引用，用于变色
        }

    petalCore.add(petals[0],petals[1],petals[2],petals[3]);
    petalCore.position.y = 30;
    petalCore.position.z = 3;
    this.mesh.add(petalCore);
    this.petalCore = petalCore; // 保存花芯引用
}

// 新增：花朵绽放动画
Flower.prototype.bloom = function() {
    if (this.isTouched) return;
    this.isTouched = true;
    console.log("花朵触发绽放！");

    // 颜色渐变：从原始色变为爱心粉
    TweenLite.to(this, 0.5, {
        bloomScale: 1.5,
        onUpdate: () => {
            this.petalCore.scale.set(this.bloomScale, this.bloomScale, this.bloomScale);
            this.petals.forEach(petal => {
                petal.material.color.setHex(
                    lerpColor(this.originalColor, this.bloomColor, this.bloomScale - 1)
                );
            });
        }
    });

    // 生成3个爱心粒子
    spawnLoveParticles(this.mesh.position,3,false);
};

Forest = function(){
    this.mesh = new THREE.Object3D();
    //new
    this.flowers = []; // 保存所有花朵实例

    // Number of Trees
    this.nTrees = 300;

    // Space the consistenly
    var stepAngle = Math.PI*2 / this.nTrees;

    // Create the Trees

    for(var i=0; i<this.nTrees; i++){

        var t = new Tree();

        //set rotation and position using trigonometry
        var a = stepAngle*i;
        // this is the distance between the center of the axis and the tree itself
        var h = 605;
        t.mesh.position.y = Math.sin(a)*h;
        t.mesh.position.x = Math.cos(a)*h;

        // rotate the tree according to its position
        t.mesh.rotation.z = a + (Math.PI/2)*3;

        //Andreas Trigo funtime
        //t.mesh.rotation.z = Math.atan2(t.mesh.position.y, t.mesh.position.x)-Math.PI/2;

        // random depth for the tree on the z-axis
        t.mesh.position.z = 0-Math.random()*600;

        // random scale for each tree
        var s = .3+Math.random()*.75;
        t.mesh.scale.set(s,s,s);

        this.mesh.add(t.mesh);
    }

    // Number of Trees
    this.nFlowers = 350;

    var stepAngle = Math.PI*2 / this.nFlowers;

    for(var i=0; i<this.nFlowers; i++){

        var f = new Flower();
        var a = stepAngle*i;

        var h = 605;
        f.mesh.position.y = Math.sin(a)*h;
        f.mesh.position.x = Math.cos(a)*h;

        f.mesh.rotation.z = a + (Math.PI/2)*3;

        f.mesh.position.z = 0-Math.random()*600;

        var s = .3+Math.random()*.3;
        f.mesh.scale.set(s,s,s);

        this.mesh.add(f.mesh);
        //new
        this.flowers.push(f); // 保存花朵引用
    }
}

var AirPlane = function() {

    this.mesh = new THREE.Object3D();

    // Create the cabin
    var geomCockpit = new THREE.BoxGeometry(80,50,50,1,1,1);
    var matCockpit = new THREE.MeshPhongMaterial({
        color:Colors.red,
        specular: 0xffffff,
        shininess: 100,
        flatShading: true
    });
    geomCockpit.vertices[4].y-=10;
    geomCockpit.vertices[4].z+=20;
    geomCockpit.vertices[5].y-=10;
    geomCockpit.vertices[5].z-=20;
    geomCockpit.vertices[6].y+=30;
    geomCockpit.vertices[6].z+=20;
    geomCockpit.vertices[7].y+=30;
    geomCockpit.vertices[7].z-=20;
    var cockpit = new THREE.Mesh(geomCockpit, matCockpit);
    cockpit.castShadow = true;
    cockpit.receiveShadow = true;
    this.mesh.add(cockpit);

    // Create the engine
    var geomEngine = new THREE.BoxGeometry(20,50,50,1,1,1);
    var matEngine = new THREE.MeshPhongMaterial({
        color:Colors.white,
        specular: 0x222222,
        shininess: 30,
        flatShading: true
    });
    var engine = new THREE.Mesh(geomEngine, matEngine);
    engine.position.x = 40;
    engine.castShadow = true;
    engine.receiveShadow = true;
    this.mesh.add(engine);

    // Create the tail
    var geomTailPlane = new THREE.BoxGeometry(15,20,5,1,1,1);
    var matTailPlane = new THREE.MeshPhongMaterial({
        color:Colors.red,
        specular: 0xffffff,
        shininess: 100,
        flatShading: true
    });
    var tailPlane = new THREE.Mesh(geomTailPlane, matTailPlane);
    tailPlane.position.set(-35,25,0);
    tailPlane.castShadow = true;
    tailPlane.receiveShadow = true;
    this.mesh.add(tailPlane);

    // Create the wing
    var geomSideWing = new THREE.BoxGeometry(40,4,150,1,1,1);
    var matSideWing = new THREE.MeshPhongMaterial({
        color:Colors.red,
        specular: 0xffffff,
        shininess: 100,
        flatShading: true
    });

    var sideWingTop = new THREE.Mesh(geomSideWing, matSideWing);
    var sideWingBottom = new THREE.Mesh(geomSideWing, matSideWing);
    sideWingTop.castShadow = true;
    sideWingTop.receiveShadow = true;
    sideWingBottom.castShadow = true;
    sideWingBottom.receiveShadow = true;

    sideWingTop.position.set(20,12,0);
    sideWingBottom.position.set(20,-3,0);
    this.mesh.add(sideWingTop);
    this.mesh.add(sideWingBottom);

    var geomWindshield = new THREE.BoxGeometry(3,15,20,1,1,1);
    var matWindshield = new THREE.MeshPhongMaterial({
        color:Colors.white,
        transparent:true,
        opacity:.3,
        specular: 0xffffff,
        shininess: 100,
        flatShading: true
    });;
    var windshield = new THREE.Mesh(geomWindshield, matWindshield);
    windshield.position.set(5,27,0);

    windshield.castShadow = true;
    windshield.receiveShadow = true;

    this.mesh.add(windshield);

    var geomPropeller = new THREE.BoxGeometry(20,10,10,1,1,1);
    geomPropeller.vertices[4].y-=5;
    geomPropeller.vertices[4].z+=5;
    geomPropeller.vertices[5].y-=5;
    geomPropeller.vertices[5].z-=5;
    geomPropeller.vertices[6].y+=5;
    geomPropeller.vertices[6].z+=5;
    geomPropeller.vertices[7].y+=5;
    geomPropeller.vertices[7].z-=5;
    var matPropeller = new THREE.MeshPhongMaterial({
        color:Colors.brown,
        specular: 0x222222,
        shininess: 20,
        flatShading: true
    });
    this.propeller = new THREE.Mesh(geomPropeller, matPropeller);
    this.propeller.castShadow = true;
    this.propeller.receiveShadow = true;

    var geomBlade1 = new THREE.BoxGeometry(1,100,10,1,1,1);
    var geomBlade2 = new THREE.BoxGeometry(1,10,100,1,1,1);
    var matBlade = new THREE.MeshPhongMaterial({
        color:Colors.brownDark,
        specular: 0x111111,
        shininess: 10,
        flatShading: true
    });

    var blade1 = new THREE.Mesh(geomBlade1, matBlade);
    blade1.position.set(8,0,0);
    blade1.castShadow = true;
    blade1.receiveShadow = true;

    var blade2 = new THREE.Mesh(geomBlade2, matBlade);
    blade2.position.set(8,0,0);
    blade2.castShadow = true;
    blade2.receiveShadow = true;
    this.propeller.add(blade1, blade2);
    this.propeller.position.set(50,0,0);
    this.mesh.add(this.propeller);

    var wheelProtecGeom = new THREE.BoxGeometry(30,15,10,1,1,1);
    var wheelProtecMat = new THREE.MeshPhongMaterial({
        color:Colors.white,
        specular: 0x222222,
        shininess: 30,
        flatShading: true
    });
    var wheelProtecR = new THREE.Mesh(wheelProtecGeom,wheelProtecMat);
    wheelProtecR.position.set(25,-20,25);
    this.mesh.add(wheelProtecR);

    var wheelTireGeom = new THREE.BoxGeometry(24,24,4);
    var wheelTireMat = new THREE.MeshPhongMaterial({
        color:Colors.brownDark,
        specular: 0x111111,
        shininess: 10,
        flatShading: true
    });
    var wheelTireR = new THREE.Mesh(wheelTireGeom,wheelTireMat);
    wheelTireR.position.set(25,-28,25);

    var wheelAxisGeom = new THREE.BoxGeometry(10,10,6);
    var wheelAxisMat = new THREE.MeshPhongMaterial({
        color:Colors.brown,
        specular: 0x222222,
        shininess: 20,
        flatShading: true
    });
    var wheelAxis = new THREE.Mesh(wheelAxisGeom,wheelAxisMat);
    wheelTireR.add(wheelAxis);

    this.mesh.add(wheelTireR);

    var wheelProtecL = wheelProtecR.clone();
    wheelProtecL.position.z = -wheelProtecR.position.z ;
    this.mesh.add(wheelProtecL);

    var wheelTireL = wheelTireR.clone();
    wheelTireL.position.z = -wheelTireR.position.z;
    this.mesh.add(wheelTireL);

    var wheelTireB = wheelTireR.clone();
    wheelTireB.scale.set(.5,.5,.5);
    wheelTireB.position.set(-35,-5,0);
    this.mesh.add(wheelTireB);

    var suspensionGeom = new THREE.BoxGeometry(4,20,4);
    suspensionGeom.applyMatrix(new THREE.Matrix4().makeTranslation(0,10,0))
    var suspensionMat = new THREE.MeshPhongMaterial({
        color:Colors.red,
        specular: 0xffffff,
        shininess: 100,
        flatShading: true
    });
    var suspension = new THREE.Mesh(suspensionGeom,suspensionMat);
    suspension.position.set(-35,-5,0);
    suspension.rotation.z = -.3;
    this.mesh.add(suspension);
};

var Fox = function() {

    this.mesh = new THREE.Object3D();
    //new
    this.isReunited = false; // 标记是否与飞机重逢
    this.tailRotation = 0; // 尾巴旋转角度
    this.headRotation = 0; // 头部旋转角度

    var redFurMat = new THREE.MeshPhongMaterial({
        color:Colors.red,
        specular: 0x222222,
        shininess: 20,
        flatShading: true
    });

    // Create the Body
    var geomBody = new THREE.BoxGeometry(100,50,50,1,1,1);
    var body = new THREE.Mesh(geomBody, redFurMat);
    body.castShadow = true;
    body.receiveShadow = true;
    this.mesh.add(body);

    // Create the Chest
    var geomChest = new THREE.BoxGeometry(50,60,70,1,1,1);
    var chest = new THREE.Mesh(geomChest, redFurMat);
    chest.position.x = 60;
    chest.castShadow = true;
    chest.receiveShadow = true;
    this.mesh.add(chest);

    // Create the Head
    var geomHead = new THREE.BoxGeometry(40,55,50,1,1,1);
    this.head = new THREE.Mesh(geomHead, redFurMat);
    this.head.position.set(80, 35, 0);
    this.head.castShadow = true;
    this.head.receiveShadow = true;

    // Create the Snout
    var geomSnout = new THREE.BoxGeometry(40,30,30,1,1,1);
    var snout = new THREE.Mesh(geomSnout, redFurMat);
    geomSnout.vertices[0].y-=5;
    geomSnout.vertices[0].z+=5;
    geomSnout.vertices[1].y-=5;
    geomSnout.vertices[1].z-=5;
    geomSnout.vertices[2].y+=5;
    geomSnout.vertices[2].z+=5;
    geomSnout.vertices[3].y+=5;
    geomSnout.vertices[3].z-=5;
    snout.castShadow = true;
    snout.receiveShadow = true;
    snout.position.set(30,0,0);
    this.head.add(snout);

    // Create the Nose
    var geomNose = new THREE.BoxGeometry(10,15,20,1,1,1);
    var matNose = new THREE.MeshPhongMaterial({
        color:Colors.brown,
        specular: 0x111111,
        shininess: 10,
        flatShading: true
    });
    var nose = new THREE.Mesh(geomNose, matNose);
    nose.position.set(55,0,0);
    this.head.add(nose);

    // Create the Ears
    var geomEar = new THREE.BoxGeometry(10,40,30,1,1,1);
    var earL = new THREE.Mesh(geomEar, redFurMat);
    earL.position.set(-10,40,-18);
    this.head.add(earL);
    earL.rotation.x=-Math.PI/10;
    geomEar.vertices[1].z+=5;
    geomEar.vertices[4].z+=5;
    geomEar.vertices[0].z-=5;
    geomEar.vertices[5].z-=5;

    // Create the Ear Tips
    var geomEarTipL = new THREE.BoxGeometry(10,10,20,1,1,1);
    var matEarTip = new THREE.MeshPhongMaterial({
        color:Colors.white,
        specular: 0x222222,
        shininess: 30,
        flatShading: true
    });
    var earTipL = new THREE.Mesh(geomEarTipL, matEarTip);
    earTipL.position.set(0,25,0);
    earL.add(earTipL);

    var earR = earL.clone();
    earR.position.z = -earL.position.z;
    earR.rotation.x = -    earL.rotation.x;
    this.head.add(earR);

    this.mesh.add(this.head);


    // Create the tail
    var geomTail = new THREE.BoxGeometry(80,40,40,2,1,1);
    geomTail.vertices[4].y-=10;
    geomTail.vertices[4].z+=10;
    geomTail.vertices[5].y-=10;
    geomTail.vertices[5].z-=10;
    geomTail.vertices[6].y+=10;
    geomTail.vertices[6].z+=10;
    geomTail.vertices[7].y+=10;
    geomTail.vertices[7].z-=10;
    this.tail = new THREE.Mesh(geomTail, redFurMat);
    this.tail.castShadow = true;
    this.tail.receiveShadow = true;

    // Create the tail Tip
    var geomTailTip = new THREE.BoxGeometry(20,40,40,1,1,1);
    var matTailTip = new THREE.MeshPhongMaterial({
        color:Colors.white,
        specular: 0x222222,
        shininess: 30,
        flatShading: true
    });
    var tailTip = new THREE.Mesh(geomTailTip, matTailTip);
    tailTip.position.set(80,0,0);
    tailTip.castShadow = true;
    tailTip.receiveShadow = true;
    this.tail.add(tailTip);
    this.tail.position.set(-40,10,0);
    geomTail.translate(40,0,0);
    geomTailTip.translate(10,0,0);
    this.tail.rotation.z = Math.PI/1.5;
    this.mesh.add(this.tail);

    // Create the Legs
    var geomLeg = new THREE.BoxGeometry(20,60,20,1,1,1);
    this.legFR = new THREE.Mesh(geomLeg, redFurMat);
    this.legFR.castShadow = true;
    this.legFR.receiveShadow = true;

    // Create the feet
    var geomFeet = new THREE.BoxGeometry(20,20,20,1,1,1);
    var matFeet = new THREE.MeshPhongMaterial({
        color:Colors.white,
        specular: 0x222222,
        shininess: 30,
        flatShading: true
    });
    var feet = new THREE.Mesh(geomFeet, matFeet);
    feet.position.set(0,0,0);
    feet.castShadow = true;
    feet.receiveShadow = true;
    this.legFR.add(feet);
    this.legFR.position.set(70,-12,25);
    geomLeg.translate(0,40,0);
    geomFeet.translate(0,80,0);
    this.legFR.rotation.z = 16;
    this.mesh.add(this.legFR);

    this.legFL = this.legFR.clone();
    this.legFL.position.z = -this.legFR.position.z;
    this.legFL.rotation.z = -this.legFR.rotation.z;
    this.mesh.add(this.legFL);

    this.legBR = this.legFR.clone();
    this.legBR.position.x = -(this.legFR.position.x)+50;
    this.legBR.rotation.z = -this.legFR.rotation.z;
    this.mesh.add(this.legBR);

    this.legBL = this.legFL.clone();
    this.legBL.position.x = -(this.legFL.position.x)+50;
    this.legBL.rotation.z = -this.legFL.rotation.z;
    this.mesh.add(this.legBL);
};

// 新增：狐狸重逢动画
Fox.prototype.reunite = function() {
    if (this.isReunited) return;
    this.isReunited = true;

    // 1. 摇尾巴动画（循环）
    setInterval(() => {
        TweenLite.to(this, 0.3, {
            tailRotation: Math.PI/8,
            onUpdate: () => this.tail.rotation.z = Math.PI/1.5 + this.tailRotation
        }).then(() => {
            TweenLite.to(this, 0.3, {
                tailRotation: -Math.PI/8,
                onUpdate: () => this.tail.rotation.z = Math.PI/1.5 + this.tailRotation
            });
        });
    }, 600);
    // 2. 抬头动画
    TweenLite.to(this, 1, {
        headRotation: -Math.PI/10,
        onUpdate: () => this.head.rotation.x = this.headRotation
    });

    // 3. 激活暖光
    TweenLite.to(warmLight, 1, { intensity: 1.5 });
    scene.fog.color.setHex(0xfff0d1); // 雾色变暖

    // 4. 生成大量爱心粒子
    for (let i = 0; i < 20; i++) {
        setTimeout(() => {
            spawnLoveParticles(this.mesh.position,10, true);
        }, i * 100);
    }
};

var sky;
var forest;
var land;
var orbit;
var airplane;
var sun;
var fox;

var mousePos={x:0, y:0};
var offSet = -600;

function createSky(){
  sky = new Sky();
  sky.mesh.position.y = offSet;
  scene.add(sky.mesh);
}

function createLand(){
  land = new Land();
  land.mesh.position.y = offSet;
  scene.add(land.mesh);
}

function createOrbit(){
  orbit = new Orbit();
  orbit.mesh.position.y = offSet;
  orbit.mesh.rotation.z = -Math.PI/6;
  scene.add(orbit.mesh);
}

function createForest(){
  forest = new Forest();
  forest.mesh.position.y = offSet;
  scene.add(forest.mesh);
}

function createSun(){
    sun = new Sun();
    sun.mesh.scale.set(1,1,.3);
    sun.mesh.position.set(0,-30,-850);
    scene.add(sun.mesh);
}

function createPlane(){
    airplane = new AirPlane();
    airplane.mesh.scale.set(.35,.35,.35);
    airplane.mesh.position.set(-40,110,-250);
    // airplane.mesh.rotation.z = Math.PI/15;
    scene.add(airplane.mesh);
}

function createFox(){
    fox = new Fox();
    fox.mesh.scale.set(.35,.35,.35);
    fox.mesh.position.set(0,650,-300);
    forest.mesh.add(fox.mesh);
}

function createRose() {
  rose = new Rose();
  rose.mesh.scale.set(0.4, 0.4, 0.4); // 适配场景大小
  rose.mesh.position.set(-350, 500, -300); // 东侧位置，避免重叠
  forest.mesh.add(rose.mesh);
}

function createLighthouse() {
  lighthouse = new Lighthouse();
  lighthouse.mesh.scale.set(0.6, 0.6, 0.6);
  lighthouse.mesh.position.set(200, 500, -300); // 北侧高处，符合指引属性
  forest.mesh.add(lighthouse.mesh);
}

function updatePlane() {
    var targetY = normalize(mousePos.y,-.75,.75, 50, 190);
    var targetX = normalize(mousePos.x,-.75,.75,-100, -20);

    // Move the plane at each frame by adding a fraction of the remaining distance
    airplane.mesh.position.y += (targetY-airplane.mesh.position.y)*0.1;
    airplane.mesh.position.x += (targetX-airplane.mesh.position.x)*0.1;

    // Rotate the plane proportionally to the remaining distance
    airplane.mesh.rotation.z = (targetY-airplane.mesh.position.y)*0.0128;
    airplane.mesh.rotation.x = (airplane.mesh.position.y-targetY)*0.0064;
    airplane.mesh.rotation.y = (airplane.mesh.position.x-targetX)*0.0064;

    airplane.propeller.rotation.x += 0.3;

    //new
    // 新增：检测飞机与花朵的碰撞
    checkFlowerCollision();

    // 新增：检测飞机与狐狸的重逢
    checkFoxReunion();

    //new:rose
    checkRoseCollision();

    //new:lighthouse
    checkLighthouseActivation();
}

// 新增：花朵碰撞检测
function checkFlowerCollision() {
    const planePos = airplane.mesh.position;
    const flowerWorldPos = new THREE.Vector3(); // 存储花朵世界坐标
    forest.flowers.forEach(flower => {
        if (flower.isTouched) return;
        flower.mesh.getWorldPosition(flowerWorldPos);
        // 计算距离（简化碰撞：只判断XZ平面距离）
        const distance = planePos.distanceTo(flowerWorldPos);
        if (distance < 30) { // 碰撞阈值
            flower.bloom();
        }
    });
}

// 新增：狐狸重逢检测
function checkFoxReunion() {
    if (fox.isReunited) return;
    const planePos = airplane.mesh.position;
    const foxWorldPos = new THREE.Vector3(); // 存储狐狸世界坐标
    fox.mesh.getWorldPosition(foxWorldPos);
    // 计算3D距离
    const distance = Math.sqrt(
        Math.pow(planePos.x - foxWorldPos.x, 2) +
        Math.pow(planePos.y - foxWorldPos.y, 2) +
        Math.pow(planePos.z - foxWorldPos.z, 2)
    );
    if (distance < 80) { // 重逢阈值
        fox.reunite();
    }
}

// 检测玫瑰花碰撞（爱情触发）
function checkRoseCollision() {
  if (!rose || rose.isBloomed) return;
  const planePos = airplane.mesh.position;
  const roseWorldPos = new THREE.Vector3();
  rose.mesh.getWorldPosition(roseWorldPos);
  const distance = planePos.distanceTo(roseWorldPos);
  if (distance < 120) { // 玫瑰花体积小，触发距离稍近
    rose.bloom();
  }
}

// 检测灯塔碰撞（亲情触发）
function checkLighthouseActivation() {
  if (!lighthouse || lighthouse.isActivated) return;
  const planePos = airplane.mesh.position;
  const lighthouseWorldPos = new THREE.Vector3();
  lighthouse.mesh.getWorldPosition(lighthouseWorldPos);
  const distance = planePos.distanceTo(lighthouseWorldPos);
  if (distance < 150) { // 灯塔体积大+守护属性，触发距离稍远
    lighthouse.activate(lighthouseWorldPos);
  }
}

//new conflict
function resetOtherEffects() {
  // 1. 彻底关闭玫瑰花光源（不仅强度0，还要清空动画）
  if (loveLight) {
    loveLight.intensity = 0;
    TweenLite.to(loveLight, 0.1, { intensity: 0 }); // 强制停止动画
  }
  // 2. 彻底关闭狐狸暖光
  if (warmLight) {
    warmLight.intensity = 0;
    TweenLite.to(warmLight, 0.1, { intensity: 0 });
  }
  // 3. 清除所有未消失的粒子（避免残留粒子叠加）
  loveParticles.forEach(particle => {
    particle.material.opacity = 0;
  });
}

function normalize(v,vmin,vmax,tmin, tmax){
    var nv = Math.max(Math.min(v,vmax), vmin);
    var dv = vmax-vmin;
    var pc = (nv-vmin)/dv;
    var dt = tmax-tmin;
    var tv = tmin + (pc*dt);
    return tv;
}

// 新增：粒子对象池初始化
function initParticlePool() {
    const geom = new THREE.BoxGeometry(8,8,8); // 爱心简化为立方体（也可替换为爱心几何体）
    const mat = new THREE.MeshBasicMaterial({
        color: Colors.lovePink,
        transparent: true,
        blending: THREE.NormalBlending
    });
    for (let i = 0; i < maxParticles; i++) {
        const particle = new THREE.Mesh(geom, mat.clone());
        particle.visible = false;
        particlePool.push(particle);
    }
}

// 新增：全局爱心粒子生成函数
function spawnLoveParticles(position, count = 8, isLarge = false, customColor = Colors.lovePink, isPetal = false) {
    count = Math.min(count, 6);
    for (let i = 0; i < count; i++) {
    const particle = getParticleFromPool();
    if (particle) {
      const offsetX = (Math.random() - 0.5) * 20;
      const offsetY = Math.random() * 10;
      const offsetZ = (Math.random() - 0.5) * 20;
      particle.position.set(
        position.x + offsetX,
        position.y + offsetY + (isLarge ? 30 : 15),
        position.z + offsetZ
      );
      // 玫瑰花瓣粒子：窄长形状；暖光粒子：圆形
      particle.material.blending = THREE.NormalBlending;
      const scaleX = isPetal ? 0.1 + Math.random() * 0.1 : 0.3 + Math.random() * 0.2;
      const scaleY = isPetal ? 0.8 + Math.random() * 0.3 : scaleX;
      const scaleZ = isPetal ? 0.1 + Math.random() * 0.1 : scaleX;
      particle.scale.set(scaleX, scaleY, scaleZ);
      particle.material.color.setHex(customColor);
      particle.material.opacity = 0.7;
      // 玫瑰花瓣粒子：飘落速度更慢；暖光粒子：扩散速度稍快
      particle.velocity = new THREE.Vector3(
        (Math.random() - 0.5) * (isPetal ? 0.3 : 0.6),
        isPetal ? 0.1 + Math.random() * 0.1 : 0.3 + Math.random() * 0.2,
        (Math.random() - 0.5) * (isPetal ? 0.3 : 0.6)
      );
      loveParticles.push(particle);
      scene.add(particle);
    }
  }
}

// 新增：从对象池获取粒子
function getParticleFromPool() {
    for (let i = 0; i < particlePool.length; i++) {
        if (!particlePool[i].visible) {
            particlePool[i].visible = true;
            return particlePool[i];
        }
    }
    return null;
}

// 新增：更新粒子状态
function updateParticles() {
    for (let i = loveParticles.length - 1; i >= 0; i--) {
        const particle = loveParticles[i];
        // 移动粒子
        particle.position.add(particle.velocity);
        // 衰减透明度
        particle.material.opacity -= 0.01;
        // 粒子落地或透明度过低时回收
        if (particle.material.opacity <= 0 || particle.position.y < offSet + 50) {
            particle.visible = false;
            scene.remove(particle);
            loveParticles.splice(i, 1);
        }
    }
}

function loop(){
  // 旋转速度 = 原速度 × 控制倍数
  land.mesh.rotation.z += .005 * controlParams.rotationSpeed;
  orbit.mesh.rotation.z += .001 * controlParams.rotationSpeed;
  sky.mesh.rotation.z += .003 * controlParams.rotationSpeed;
  forest.mesh.rotation.z += .002 * controlParams.rotationSpeed;

  updatePlane();
  updateParticles();

  // 更新光线追踪材质的反射效果
  if (lightingParams.model === 'raytrace') {
      raytraceMaterials.forEach(material => {
          if (material.envMap) {
              material.needsUpdate = true;
          }
      });
  }

  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}

function handleMouseMove (event) {
    var tx = -1 + (event.clientX / WIDTH)*2;
    var ty = 1 - (event.clientY / HEIGHT)*2;
    mousePos = {x:tx, y:ty};
}

// 新增：颜色插值函数（用于花朵渐变）
function lerpColor(color1, color2, t) {
    t = Math.max(0, Math.min(1, t));
    const r1 = (color1 >> 16) & 0xff;
    const g1 = (color1 >> 8) & 0xff;
    const b1 = color1 & 0xff;
    const r2 = (color2 >> 16) & 0xff;
    const g2 = (color2 >> 8) & 0xff;
    const b2 = color2 & 0xff;
    const r = Math.round(r1 + t * (r2 - r1));
    const g = Math.round(g1 + t * (g2 - g1));
    const b = Math.round(b1 + t * (b2 - b1));
    return (r << 16) | (g << 8) | b;
}

function bindControlEvents() {
     // 1. 旋转速度控制
    const rotationSpeedEl = document.getElementById('rotation-speed');
    const speedValueEl = document.getElementById('speed-value');
    rotationSpeedEl.addEventListener('input', function() {
    controlParams.rotationSpeed = parseFloat(this.value);
    speedValueEl.textContent = controlParams.rotationSpeed.toFixed(1) + 'x';
    });

    // 2. 光照模型控制
    const lightingModelEl = document.getElementById('lighting-model');
    lightingModelEl.addEventListener('change', function() {
        lightingParams.model = this.value;
        updateLightingModel();
    });

    // 3. 主光源位置控制
    const mainLightX = document.getElementById('main-light-x');
    const mainLightY = document.getElementById('main-light-y');
    const mainLightZ = document.getElementById('main-light-z');
    const mainLightIntensity = document.getElementById('main-light-intensity');

    mainLightX.addEventListener('input', function() {
        lightingParams.mainLightPosition.x = parseFloat(this.value);
        shadowLight.position.x = lightingParams.mainLightPosition.x;
        document.getElementById('main-light-x-value').textContent = this.value;
    });

    mainLightY.addEventListener('input', function() {
        lightingParams.mainLightPosition.y = parseFloat(this.value);
        shadowLight.position.y = lightingParams.mainLightPosition.y;
        document.getElementById('main-light-y-value').textContent = this.value;
    });

    mainLightZ.addEventListener('input', function() {
        lightingParams.mainLightPosition.z = parseFloat(this.value);
        shadowLight.position.z = lightingParams.mainLightPosition.z;
        document.getElementById('main-light-z-value').textContent = this.value;
    });

    mainLightIntensity.addEventListener('input', function() {
        lightingParams.mainLightIntensity = parseFloat(this.value);
        shadowLight.intensity = lightingParams.mainLightIntensity;
        document.getElementById('main-light-intensity-value').textContent = this.value;
    });

    // 4. 环境光强度控制
    const ambientIntensity = document.getElementById('ambient-intensity');
    ambientIntensity.addEventListener('input', function() {
        lightingParams.ambientIntensity = parseFloat(this.value);
        hemisphereLight.intensity = lightingParams.ambientIntensity;
        document.getElementById('ambient-intensity-value').textContent = this.value;
    });

    // 5. 点光源强度控制
    const pointLightIntensity = document.getElementById('point-light-intensity');
    pointLightIntensity.addEventListener('input', function() {
        lightingParams.pointLightIntensity = parseFloat(this.value);
        pointLights.forEach(light => {
            light.intensity = lightingParams.pointLightIntensity;
        });
        document.getElementById('point-light-intensity-value').textContent = this.value;
    });

    // 6. 阴影质量控制
    const shadowQuality = document.getElementById('shadow-quality');
    shadowQuality.addEventListener('change', function() {
        lightingParams.shadowQuality = this.value;
        updateShadowQuality();
    });
    // 7.场景控制
    document.getElementById('scene-preset').addEventListener('change', function () {
        const preset = this.value;

        switch (preset) {
            case 'sunset':
                // 日落预设
                document.getElementById('rotation-speed').value = 0.5;
                document.getElementById('speed-value').textContent = '0.5x';
                controlParams.rotationSpeed = 0.5;

                document.getElementById('main-light-intensity').value = 0.5;
                document.getElementById('main-light-intensity-value').textContent = '0.5';
                shadowLight.intensity = 0.5;

                document.getElementById('ambient-intensity').value = 0.7;
                document.getElementById('ambient-intensity-value').textContent = '0.7';
                hemisphereLight.intensity = 0.7;

                // 更改雾色为日落色调
                scene.fog.color.setHex(0xffa07a);
                break;

            case 'night':
                // 夜晚预设
                document.getElementById('rotation-speed').value = 0.2;
                document.getElementById('speed-value').textContent = '0.2x';
                controlParams.rotationSpeed = 0.2;

                document.getElementById('main-light-intensity').value = 0.2;
                document.getElementById('main-light-intensity-value').textContent = '0.2';
                shadowLight.intensity = 0.2;

                document.getElementById('ambient-intensity').value = 0.3;
                document.getElementById('ambient-intensity-value').textContent = '0.3';
                hemisphereLight.intensity = 0.3;

                // 更改雾色为夜晚色调
                scene.fog.color.setHex(0x2c3e50);
                break;
            default:
                // 默认预设 - 重置为初始值
                document.getElementById('rotation-speed').value = 1;
                document.getElementById('speed-value').textContent = '1.0x';
                controlParams.rotationSpeed = 1;

                document.getElementById('main-light-intensity').value = 0.9;
                document.getElementById('main-light-intensity-value').textContent = '0.9';
                shadowLight.intensity = 0.9;

                document.getElementById('ambient-intensity').value = 0.9;
                document.getElementById('ambient-intensity-value').textContent = '0.9';
                hemisphereLight.intensity = 0.9;

                // 恢复默认雾色
                scene.fog.color.setHex(0xf7d9aa);
                break;
        }
    });
}

// 天空盒切换功能
function toggleSkybox() {
    textureParams.skyboxEnabled = !textureParams.skyboxEnabled;

    if (textureParams.skyboxEnabled) {
        createSkybox();
    } else {
        removeSkybox();
    }
}

// 创建天空盒
function createSkybox() {
    if (skybox) {
        scene.remove(skybox);
    }

    // 天空盒尺寸
    const skyboxSize = 2000;

    // 创建天空盒材质
    const skyboxMaterials = [];

    // 根据当前天空盒类型选择不同的颜色
    let topColor, bottomColor, sideColors;

    switch(currentSkyboxType) {
        case 'space':
            topColor = 0x000033;    // 深蓝
            bottomColor = 0x000011; // 更深蓝
            sideColors = [
                0x001122, // 右
                0x001122, // 左
                0x001122, // 前
                0x001122  // 后
            ];
            break;
        case 'sunset':
            topColor = 0xFF4500;    // 橙红
            bottomColor = 0x8B0000; // 深红
            sideColors = [
                0xFF6347, // 右
                0xFF6347, // 左
                0xFF6347, // 前
                0xFF6347  // 后
            ];
            break;
        default:
            topColor = 0x87CEEB;    // 天蓝
            bottomColor = 0xE0F7FF; // 浅蓝
            sideColors = [
                0x87CEEB, // 右
                0x87CEEB, // 左
                0x87CEEB, // 前
                0x87CEEB  // 后
            ];
    }

    // 创建六个面的材质
    for (let i = 0; i < 6; i++) {
        let color;
        if (i === 4) color = topColor;      // 上
        else if (i === 5) color = bottomColor; // 下
        else color = sideColors[i];         // 四个侧面

        skyboxMaterials.push(new THREE.MeshBasicMaterial({
            color: color,
            side: THREE.BackSide
        }));
    }

    // 创建立方体几何体
    const skyboxGeometry = new THREE.BoxGeometry(skyboxSize, skyboxSize, skyboxSize);
    skybox = new THREE.Mesh(skyboxGeometry, skyboxMaterials);

    scene.add(skybox);

    // 切换天空盒类型（为下次切换准备）
    currentSkyboxType = currentSkyboxType === 'space' ? 'sunset' : 'space';
}

// 移除天空盒
function removeSkybox() {
    if (skybox) {
        scene.remove(skybox);
        skybox = null;
    }
}

// 截图功能（在HTML中已定义，这里添加说明）
function takeScreenshot() {
    renderer.render(scene, camera);
    const canvas = renderer.domElement;
    const link = document.createElement('a');
    link.download = 'earth-emotion-screenshot.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
}

// 引入TweenLite（用于平滑动画）
window.TweenLite = {
    to: function(target, duration, options) {
        const start = {};
        const end = {};
        // 从 options 中过滤出要动画的属性
        const keys = Object.keys(options).filter(key => key !== 'onUpdate' && key !== 'then');

        keys.forEach(key => {
            start[key] = target[key];
            end[key] = options[key];
        });

        const startTime = Date.now();

        // 创建一个 tween 对象，用于传递给 onUpdate
        const tweenObject = {
            target: target, // 动画的目标对象
            progress: 0     // 动画进度 (0 to 1)
        };

        function update() {
            const elapsed = (Date.now() - startTime) / (duration * 1000);
            tweenObject.progress = Math.min(1, elapsed); // 更新进度

            keys.forEach(key => {
                // 使用 tweenObject.progress 来计算当前值
                target[key] = start[key] + (end[key] - start[key]) * tweenObject.progress;
            });

            // 将 tweenObject 作为参数传递给 onUpdate
            options.onUpdate && options.onUpdate(tweenObject);

            if (tweenObject.progress < 1) {
                requestAnimationFrame(update);
            } else {
                options.then && options.then();
            }
        }
        requestAnimationFrame(update);

        return {
            then: cb => {
                options.then = cb;
                return this;
            }
        };
    }
};

window.addEventListener('load', init, false);

function init(event) {
    createScene();
    createLights();
    createPlane();
    createOrbit();
    createSun();
    createLand();
    createForest();
    createSky();
    createFox();
    createRose();
    createLighthouse();

    document.addEventListener('mousemove', handleMouseMove, false);

    bindControlEvents();
    createCameraControls(); // 新增：初始化相机控制功能
    loop();
}

// 新增：初始化相机控制
function createCameraControls() {
    // 键盘控制（WASD + 空格键重置）
    window.addEventListener('keydown', function(event) {
        switch (event.key.toLowerCase()) { // 支持大小写
            case 'w': // W - 向前移动（拉近场景）
                camera.position.z = Math.max(50, camera.position.z - cameraMoveSpeed);
                break;
            case 's': // S - 向后移动（拉远场景）
                camera.position.z = Math.min(1000, camera.position.z + cameraMoveSpeed);
                break;
            case 'd': // A - 向左移动
                camera.position.x = Math.min(500, camera.position.x + cameraMoveSpeed);
                break;
            case 'a': // D - 向右移动
                camera.position.x = Math.max(-500, camera.position.x - cameraMoveSpeed);
                break;
            case ' ': // 空格键 - 重置相机位置
                resetCameraPosition();
                break;
        }
    });
}

// 新增：重置相机位置
function resetCameraPosition() {
    camera.position.x = 0;
    camera.position.y = 150;
    camera.position.z = 100;
}