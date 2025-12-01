// 亲情：灯塔类（Lighthouse）
var Lighthouse = function() {
  this.mesh = new THREE.Object3D();
  this.isActivated = false; // 标记是否激活（对应狐狸的isReunited）
  this.lightProgress = 0; // 灯光激活进度

  // 加载木纹纹理
  const textureLoader = new THREE.TextureLoader();
  const woodTexture = textureLoader.load('wood.jpg', 
    // 加载成功回调
    (texture) => {
      console.log('木纹纹理加载成功');
      // 设置纹理重复和环绕方式（适配圆柱体）
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      //texture.repeat.set(3, 6); // 水平重复3次，垂直重复6次（根据塔身比例调整）
      texture.anisotropy = renderer.capabilities.getMaxAnisotropy(); // 提升纹理清晰度
      texture.needsUpdate = true;
    },
    // 加载进度回调
    (xhr) => {
      console.log(`纹理加载进度: ${(xhr.loaded / xhr.total * 100)}%`);
    },
    // 加载错误回调
    (err) => {
      console.error('木纹纹理加载失败:', err);
    }
  );

  // 材质定义：使用带纹理的Phong材质
  const towerBottomMat = new THREE.MeshPhongMaterial({
    map: woodTexture, // 应用木纹纹理
    specular: 0x111111,
    shininess: 10,
    flatShading: true
  });
  const towerTopMat = new THREE.MeshPhongMaterial({
    map: woodTexture, // 应用木纹纹理
    specular: 0x111111,
    shininess: 10,
    flatShading: true
  });
  const roofMat = new THREE.MeshPhongMaterial({
    color: Colors.white,
    specular: 0x222222,
    shininess: 30,
    flatShading: true
  });
  const lightGlowMat = new THREE.MeshBasicMaterial({
    color: Colors.lighthouseYellow,
    transparent: true,
    opacity: 0.3
  });

  // ① 塔底（下粗上细的圆柱）
  const towerBottomGeom = new THREE.CylinderGeometry(40, 35, 200, 12);
  const towerBottom = new THREE.Mesh(towerBottomGeom, towerBottomMat);
  towerBottom.position.y = 100;
  towerBottom.castShadow = true;
  towerBottom.receiveShadow = true;
  this.mesh.add(towerBottom);

  // ② 塔身上部（更细的圆柱）
  const towerTopGeom = new THREE.CylinderGeometry(30, 25, 100, 12);
  const towerTop = new THREE.Mesh(towerTopGeom, towerTopMat);
  towerTop.position.y = 250;
  towerTop.castShadow = true;
  this.mesh.add(towerTop);

  // ③ 塔顶（方形屋顶+灯座）
  const roofGeom = new THREE.BoxGeometry(40, 20, 40);
  const roof = new THREE.Mesh(roofGeom, roofMat);
  roof.position.y = 320;
  this.mesh.add(roof);

  // 灯座（小圆柱）
  const lightBaseGeom = new THREE.CylinderGeometry(15, 15, 10, 8);
  const lightBase = new THREE.Mesh(lightBaseGeom, roofMat);
  lightBase.position.y = 335;
  this.mesh.add(lightBase);

  // ④ 灯光光晕（半透明球体，模拟灯光扩散）
  this.lightGlow = new THREE.Mesh(new THREE.SphereGeometry(30, 8, 6), lightGlowMat);
  this.lightGlow.position.y = 335;
  this.mesh.add(this.lightGlow);

  // ⑤ 内置光源（初始微弱）- 使用点光源
  this.coreLight = new THREE.PointLight(Colors.lighthouseYellow, 0.5, 200);
  this.coreLight.position.y = 335;
  this.coreLight.castShadow = true;
  this.coreLight.shadow.mapSize.width = 512;
  this.coreLight.shadow.mapSize.height = 512;
  this.mesh.add(this.coreLight);
};

// 灯塔激活动画（对应狐狸的reunite）
Lighthouse.prototype.activate = function(lighthouseWorldPos) {
  if (this.isActivated) return;
  this.isActivated = true;

  resetOtherEffects();

  // 1. 灯光增强+塔顶旋转+光晕放大
  TweenLite.to(this, 2, {
    lightProgress: 1,
    onUpdate: () => {
      // 内置核心灯光
      const targetIntensity = 0.5 + (controlParams.warmLightIntensity * 0.7 - 0.5) * this.lightProgress;
      this.coreLight.intensity = targetIntensity + Math.sin(Date.now()/500) * 0.1 * this.lightProgress;
      this.coreLight.distance = 150 + 100 * this.lightProgress;

      // 光晕
      const glowScale = 1.2 + 0.6 * this.lightProgress;
      this.lightGlow.scale.set(glowScale, glowScale, glowScale);
      this.lightGlow.material.opacity = 0.1 + 0.2 * this.lightProgress;
      this.lightGlow.material.needsUpdate = true;

      // 塔顶旋转
      this.mesh.children[2].rotation.y += this.lightProgress * 0.008;
    }
  });

  // 2. 全局灯塔光源
  lighthouseGlobalLight.position.copy(lighthouseWorldPos);
  lighthouseGlobalLight.position.y += 200;
  TweenLite.to(lighthouseGlobalLight, 2, { intensity: controlParams.warmLightIntensity * 1.0 });

  // 3. 雾色渐变
  const targetFogColor = new THREE.Color(Colors.lighthouseFog);
  TweenLite.to({ progress: 0 }, 2, {
    progress: 1,
    onUpdate: (tween) => {
      scene.fog.color.lerp(targetFogColor, tween.progress);
      scene.fog.color.needsUpdate = true;
    }
  });

  // 4. 粒子效果
  for (let i = 0; i < 15; i++) {
    setTimeout(() => {
      spawnLoveParticles(
        new THREE.Vector3(lighthouseWorldPos.x, lighthouseWorldPos.y + 200, lighthouseWorldPos.z),
        6,
        true,
        Colors.lighthouseYellow
      );
    }, i * 100);
  }
};

window.Lighthouse = Lighthouse;