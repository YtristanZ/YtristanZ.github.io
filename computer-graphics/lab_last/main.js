
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



var scene, camera, fieldOfView, aspectRatio, nearPlane, farPlane, HEIGHT, WIDTH, renderer, container;
var lighthouse;
var rose;
//new
var loveParticles = [];
var particlePool = []; // 粒子对象池（优化性能）
var maxParticles = 200;


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

	// Add the Renderer to the DOM, in the world div.
	container = document.getElementById('world');
	container.appendChild (renderer.domElement);

	//RESPONSIVE LISTENER
	window.addEventListener('resize', handleWindowResize, false);

	//new
	// 初始化粒子对象池
	initParticlePool();
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

var controlParams = {
	rotationSpeed:1.0 ,
	warmLightIntensity: 1.5, // 新增：暖光强度（给玫瑰花/灯塔用）
    particleCount: 15,

	fogDensity: 950,
    ambientLightIntensity: 0.9,
    directionalLightIntensity: 0.9,
    cameraFOV: 60,
    shadowsEnabled: true,
    softShadows: true,
    shadowQuality: 'medium',
    particleColor: Colors.lovePink

};

// 相机预设位置
var cameraPresets = {
    default: { x: 0, y: 150, z: 100 },
    top: { x: 0, y: 400, z: 0 },
    side: { x: 300, y: 150, z: 0 },
    close: { x: 0, y: 100, z: 50 },
    fox: { x: 100, y: 120, z: -200 },
    rose: { x: -300, y: 120, z: -200 }
};

function createLights(){
	// Gradient coloured light - Sky, Ground, Intensity
	hemisphereLight = new THREE.HemisphereLight(0xaaaaaa,0x000000, .9)
	// Parallel rays
	shadowLight = new THREE.DirectionalLight(0xffffff, .9);



	shadowLight.position.set(0,600,350);
	shadowLight.castShadow = true;

	// define the visible area of the projected shadow
	shadowLight.shadow.camera.left = -650;
	shadowLight.shadow.camera.right = 650;
	shadowLight.shadow.camera.top = 650;
	shadowLight.shadow.camera.bottom = -650;
	shadowLight.shadow.camera.near = 1;
	shadowLight.shadow.camera.far = 1000;

	// Shadow map size
	shadowLight.shadow.mapSize.width = 2048;
	shadowLight.shadow.mapSize.height = 2048;

	//new
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


Land = function(){
	var geom = new THREE.CylinderGeometry(600,600,1700,40,10);
	//rotate on the x axis
	geom.applyMatrix(new THREE.Matrix4().makeRotationX(-Math.PI/2));
	//create a material
	var mat = new THREE.MeshPhongMaterial({
		color: Colors.lightgreen,
		shading:THREE.FlatShading,
	});

	//create a mesh of the object
	this.mesh = new THREE.Mesh(geom, mat);
	//receive shadows
	this.mesh.receiveShadow = true;
}

Orbit = function(){

	var geom =new THREE.Object3D();

	this.mesh = geom;
	//this.mesh.add(sun);
}

Sun = function(){

	this.mesh = new THREE.Object3D();

	var sunGeom = new THREE.SphereGeometry( 400, 20, 10 );
	var sunMat = new THREE.MeshPhongMaterial({
		color: Colors.yellow,
		shading:THREE.FlatShading,
	});
	var sun = new THREE.Mesh(sunGeom, sunMat);
	//sun.applyMatrix(new THREE.Matrix4().makeRotationX(-Math.PI/2));
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
	});

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

	var matTreeLeaves = new THREE.MeshPhongMaterial( { color:Colors.green, shading:THREE.FlatShading});

	var geonTreeBase = new THREE.BoxGeometry( 10,20,10 );
	var matTreeBase = new THREE.MeshBasicMaterial( { color:Colors.brown});
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
	var matStem = new THREE.MeshPhongMaterial( { color:Colors.green, shading:THREE.FlatShading});
	var stem = new THREE.Mesh(geomStem,matStem);
	stem.castShadow = false;
	stem.receiveShadow = true;
	this.mesh.add(stem);


	var geomPetalCore = new THREE.BoxGeometry(10,10,10,1,1,1);
	var matPetalCore = new THREE.MeshPhongMaterial({color:Colors.yellow, shading:THREE.FlatShading});
	petalCore = new THREE.Mesh(geomPetalCore, matPetalCore);
	petalCore.castShadow = false;
	petalCore.receiveShadow = true;

	var petalColor = petalColors [Math.floor(Math.random()*3)];
	//new
	this.originalColor = petalColor; // 保存原始颜色
	this.bloomColor = Colors.lovePink; // 绽放后颜色

	var geomPetal = new THREE.BoxGeometry( 15,20,5,1,1,1 );
	var matPetal = new THREE.MeshBasicMaterial( { color:petalColor});
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
//new
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
	var matCockpit = new THREE.MeshPhongMaterial({color:Colors.red, shading:THREE.FlatShading});
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
	var matEngine = new THREE.MeshPhongMaterial({color:Colors.white, shading:THREE.FlatShading});
	var engine = new THREE.Mesh(geomEngine, matEngine);
	engine.position.x = 40;
	engine.castShadow = true;
	engine.receiveShadow = true;
	this.mesh.add(engine);
	
	// Create the tail
	var geomTailPlane = new THREE.BoxGeometry(15,20,5,1,1,1);
	var matTailPlane = new THREE.MeshPhongMaterial({color:Colors.red, shading:THREE.FlatShading});
	var tailPlane = new THREE.Mesh(geomTailPlane, matTailPlane);
	tailPlane.position.set(-35,25,0);
	tailPlane.castShadow = true;
	tailPlane.receiveShadow = true;
	this.mesh.add(tailPlane);
	
	// Create the wing
	var geomSideWing = new THREE.BoxGeometry(40,4,150,1,1,1);
	var matSideWing = new THREE.MeshPhongMaterial({color:Colors.red, shading:THREE.FlatShading});

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
	var matWindshield = new THREE.MeshPhongMaterial({color:Colors.white,transparent:true, opacity:.3, shading:THREE.FlatShading});;
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
	var matPropeller = new THREE.MeshPhongMaterial({color:Colors.brown, shading:THREE.FlatShading});
	this.propeller = new THREE.Mesh(geomPropeller, matPropeller);
	this.propeller.castShadow = true;
	this.propeller.receiveShadow = true;


	var geomBlade1 = new THREE.BoxGeometry(1,100,10,1,1,1);
	var geomBlade2 = new THREE.BoxGeometry(1,10,100,1,1,1);
	var matBlade = new THREE.MeshPhongMaterial({color:Colors.brownDark, shading:THREE.FlatShading});
	
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
	var wheelProtecMat = new THREE.MeshPhongMaterial({color:Colors.white, shading:THREE.FlatShading});
	var wheelProtecR = new THREE.Mesh(wheelProtecGeom,wheelProtecMat);
	wheelProtecR.position.set(25,-20,25);
	this.mesh.add(wheelProtecR);

	var wheelTireGeom = new THREE.BoxGeometry(24,24,4);
	var wheelTireMat = new THREE.MeshPhongMaterial({color:Colors.brownDark, shading:THREE.FlatShading});
	var wheelTireR = new THREE.Mesh(wheelTireGeom,wheelTireMat);
	wheelTireR.position.set(25,-28,25);

	var wheelAxisGeom = new THREE.BoxGeometry(10,10,6);
	var wheelAxisMat = new THREE.MeshPhongMaterial({color:Colors.brown, shading:THREE.FlatShading});
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
	var suspensionMat = new THREE.MeshPhongMaterial({color:Colors.red, shading:THREE.FlatShading});
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
	
	var redFurMat = new THREE.MeshPhongMaterial({color:Colors.red, shading:THREE.FlatShading});

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
	var matNose = new THREE.MeshPhongMaterial({color:Colors.brown, shading:THREE.FlatShading});
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
	var matEarTip = new THREE.MeshPhongMaterial({color:Colors.white, shading:THREE.FlatShading});
	var earTipL = new THREE.Mesh(geomEarTipL, matEarTip);
	earTipL.position.set(0,25,0);
	earL.add(earTipL);

	var earR = earL.clone();
	earR.position.z = -earL.position.z;
	earR.rotation.x = -	earL.rotation.x;
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
	var matTailTip = new THREE.MeshPhongMaterial({color:Colors.white, shading:THREE.FlatShading});
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
	var matFeet = new THREE.MeshPhongMaterial({color:Colors.white, shading:THREE.FlatShading});
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
//new
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
//new
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
//new
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
function spawnLoveParticles(position, count = controlParams.particleCount, isLarge = false, customColor = controlParams.particleColor, isPetal = false) {
	count = Math.min(count, maxParticles - loveParticles.length);
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

// 调用时给玫瑰花粒子加isPetal=true：


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
		// 更新粒子颜色
        if (particle.material.color.getHex() !== controlParams.particleColor) {
            particle.material.color.setHex(controlParams.particleColor);
        }
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
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}

function handleMouseMove (event) {
	var tx = -1 + (event.clientX / WIDTH)*2;
	var ty = 1 - (event.clientY / HEIGHT)*2;
	mousePos = {x:tx, y:ty};	
}
//new
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

    // 2. 雾效密度控制
    const fogDensityEl = document.getElementById('fog-density');
    const fogValueEl = document.getElementById('fog-value');
    fogDensityEl.addEventListener('input', function() {
        controlParams.fogDensity = parseFloat(this.value);
        scene.fog.far = controlParams.fogDensity;
        fogValueEl.textContent = controlParams.fogDensity;
    });

    // 3. 光照控制
    const ambientLightEl = document.getElementById('ambient-light');
    const ambientValueEl = document.getElementById('ambient-value');
    ambientLightEl.addEventListener('input', function() {
        controlParams.ambientLightIntensity = parseFloat(this.value);
        hemisphereLight.intensity = controlParams.ambientLightIntensity;
        ambientValueEl.textContent = controlParams.ambientLightIntensity.toFixed(1);
    });

    const directionalLightEl = document.getElementById('directional-light');
    const directionalValueEl = document.getElementById('directional-value');
    directionalLightEl.addEventListener('input', function() {
        controlParams.directionalLightIntensity = parseFloat(this.value);
        shadowLight.intensity = controlParams.directionalLightIntensity;
        directionalValueEl.textContent = controlParams.directionalLightIntensity.toFixed(1);
    });

    const warmLightEl = document.getElementById('warm-light');
    const warmValueEl = document.getElementById('warm-value');
    warmLightEl.addEventListener('input', function() {
        controlParams.warmLightIntensity = parseFloat(this.value);
        warmValueEl.textContent = controlParams.warmLightIntensity.toFixed(1);
    });

    // 4. 粒子控制
    const particleCountEl = document.getElementById('particle-count');
    const particleValueEl = document.getElementById('particle-value');
    particleCountEl.addEventListener('input', function() {
        controlParams.particleCount = parseInt(this.value);
        particleValueEl.textContent = controlParams.particleCount + '个';
    });

    const particleColorEl = document.getElementById('particle-color');
    particleColorEl.addEventListener('input', function() {
        const hexColor = this.value.replace('#', '0x');
        controlParams.particleColor = parseInt(hexColor);
    });

    // 5. 相机控制
    const cameraPresetEl = document.getElementById('camera-preset');
    cameraPresetEl.addEventListener('change', function() {
        const preset = cameraPresets[this.value];
        if (preset) {
            gsap.to(camera.position, {
                duration: 1.5,
                x: preset.x,
                y: preset.y,
                z: preset.z,
                ease: "power2.inOut"
            });
        }
    });

    const cameraFovEl = document.getElementById('camera-fov');
    const fovValueEl = document.getElementById('fov-value');
    cameraFovEl.addEventListener('input', function() {
        controlParams.cameraFOV = parseInt(this.value);
        camera.fov = controlParams.cameraFOV;
        camera.updateProjectionMatrix();
        fovValueEl.textContent = controlParams.cameraFOV + '°';
    });

    // 6. 投影设置
    const shadowEnabledEl = document.getElementById('shadow-enabled');
    shadowEnabledEl.addEventListener('change', function() {
        controlParams.shadowsEnabled = this.checked;
        renderer.shadowMap.enabled = controlParams.shadowsEnabled;
        shadowLight.castShadow = controlParams.shadowsEnabled;
        warmLight.castShadow = controlParams.shadowsEnabled;
        loveLight.castShadow = controlParams.shadowsEnabled;
    });

    const shadowSoftEl = document.getElementById('shadow-soft');
    shadowSoftEl.addEventListener('change', function() {
        controlParams.softShadows = this.checked;
        renderer.shadowMap.type = controlParams.softShadows ?
            THREE.PCFSoftShadowMap : THREE.BasicShadowMap;
    });

    const shadowQualityEl = document.getElementById('shadow-quality');
    shadowQualityEl.addEventListener('change', function() {
        controlParams.shadowQuality = this.value;
        let mapSize;
        switch (controlParams.shadowQuality) {
            case 'low': mapSize = 512; break;
            case 'medium': mapSize = 1024; break;
            case 'high': mapSize = 2048; break;
            case 'ultra': mapSize = 4096; break;
            default: mapSize = 1024;
        }
        shadowLight.shadow.mapSize.width = mapSize;
        shadowLight.shadow.mapSize.height = mapSize;
        shadowLight.shadow.map.dispose();
        shadowLight.shadow.map = null;
    });

    // 7. 特效按钮
    document.getElementById('trigger-love').addEventListener('click', function() {
        if (rose && !rose.isBloomed) {
            rose.bloom();
        }
    });

    document.getElementById('trigger-family').addEventListener('click', function() {
        if (lighthouse && !lighthouse.isActivated) {
            const lighthouseWorldPos = new THREE.Vector3();
            lighthouse.mesh.getWorldPosition(lighthouseWorldPos);
            lighthouse.activate(lighthouseWorldPos);
        }
    });

    document.getElementById('trigger-reunion').addEventListener('click', function() {
        if (fox && !fox.isReunited) {
            fox.reunite();
        }
    });

    // 8. 重置按钮
    document.getElementById('reset-all').addEventListener('click', function() {
        resetAllSettings();
    });

}

// 重置所有设置函数
function resetAllSettings() {
    // 重置控制参数
    controlParams = {
        rotationSpeed: 1.0,
        warmLightIntensity: 1.5,
        particleCount: 15,
        fogDensity: 950,
        ambientLightIntensity: 0.9,
        directionalLightIntensity: 0.9,
        cameraFOV: 60,
        shadowsEnabled: true,
        softShadows: true,
        shadowQuality: 'medium',
        particleColor: Colors.lovePink
    };

    // 重置UI元素
    document.getElementById('rotation-speed').value = controlParams.rotationSpeed;
    document.getElementById('speed-value').textContent = controlParams.rotationSpeed.toFixed(1) + 'x';

    document.getElementById('fog-density').value = controlParams.fogDensity;
    document.getElementById('fog-value').textContent = controlParams.fogDensity;

    document.getElementById('ambient-light').value = controlParams.ambientLightIntensity;
    document.getElementById('ambient-value').textContent = controlParams.ambientLightIntensity.toFixed(1);

    document.getElementById('directional-light').value = controlParams.directionalLightIntensity;
    document.getElementById('directional-value').textContent = controlParams.directionalLightIntensity.toFixed(1);

    document.getElementById('warm-light').value = controlParams.warmLightIntensity;
    document.getElementById('warm-value').textContent = controlParams.warmLightIntensity.toFixed(1);

    document.getElementById('particle-count').value = controlParams.particleCount;
    document.getElementById('particle-value').textContent = controlParams.particleCount + '个';

    document.getElementById('particle-color').value = '#ff69b4';

    document.getElementById('camera-preset').value = 'default';
    document.getElementById('camera-fov').value = controlParams.cameraFOV;
    document.getElementById('fov-value').textContent = controlParams.cameraFOV + '°';

    document.getElementById('shadow-enabled').checked = controlParams.shadowsEnabled;
    document.getElementById('shadow-soft').checked = controlParams.softShadows;
    document.getElementById('shadow-quality').value = controlParams.shadowQuality;

    // 重置场景状态
    scene.fog.far = controlParams.fogDensity;
    hemisphereLight.intensity = controlParams.ambientLightIntensity;
    shadowLight.intensity = controlParams.directionalLightIntensity;
    camera.fov = controlParams.cameraFOV;
    camera.updateProjectionMatrix();

    // 重置相机位置
    gsap.to(camera.position, {
        duration: 1.5,
        x: cameraPresets.default.x,
        y: cameraPresets.default.y,
        z: cameraPresets.default.z,
        ease: "power2.inOut"
    });

    // 重置特效状态
    resetOtherEffects();

    console.log('所有设置已重置');
}

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
	loop();
}
//new
// 引入TweenLite（用于平滑动画）
window.TweenLite = {
	to: function(target, duration, options) {
		const start = {};
		const end = {};
		const keys = Object.keys(options).filter(key => key !== 'onUpdate' && key !== 'then');
		
		keys.forEach(key => {
			start[key] = target[key];
			end[key] = options[key];
		});

		const startTime = Date.now();
		function update() {
			const elapsed = (Date.now() - startTime) / (duration * 1000);
			const progress = Math.min(1, elapsed);
			
			keys.forEach(key => {
				target[key] = start[key] + (end[key] - start[key]) * progress;
			});
			options.onUpdate && options.onUpdate();
			if (progress < 1) requestAnimationFrame(update);
			else options.then && options.then();
		}
		requestAnimationFrame(update);
		return { then: cb => { options.then = cb; return this; } };
	}
};

window.addEventListener('load', init, false);