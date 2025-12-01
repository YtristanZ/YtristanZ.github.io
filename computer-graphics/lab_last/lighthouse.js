// 亲情：灯塔类（Lighthouse）
var Lighthouse = function() {
  this.mesh = new THREE.Object3D();
  this.isActivated = false; // 标记是否激活（对应狐狸的isReunited）
  this.lightProgress = 0; // 灯光激活进度

  // 材质定义
  const towerBottomMat = new THREE.MeshPhongMaterial({ color: Colors.lighthouseBrown, shading: THREE.FlatShading });
  const towerTopMat = new THREE.MeshPhongMaterial({ color: 0xa0522d, shading: THREE.FlatShading });
  const roofMat = new THREE.MeshPhongMaterial({ color: Colors.white, shading: THREE.FlatShading });
  const lightGlowMat = new THREE.MeshBasicMaterial({ color: Colors.lighthouseYellow, transparent: true, opacity: 0.3 });

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

  // ⑤ 内置光源（初始微弱）
  this.coreLight = new THREE.PointLight(Colors.lighthouseYellow, 0.5, 200);
  this.coreLight.position.y = 335;
  this.mesh.add(this.coreLight);
};

// 灯塔激活动画（对应狐狸的reunite）
// lighthouse.js 中 Lighthouse.prototype.activate 方法
Lighthouse.prototype.activate = function(lighthouseWorldPos) {
  if (this.isActivated) return;
  this.isActivated = true;

  resetOtherEffects();

  // 1. 灯光增强+塔顶旋转+光晕放大（大幅降低强度）
  TweenLite.to(this, 2, {
    lightProgress: 1,
    onUpdate: () => {
      // 内置核心灯光：最大强度1.2（原2.25），闪烁幅度0.1（原0.5）
      const targetIntensity = 0.5 + (controlParams.warmLightIntensity * 0.7 - 0.5) * this.lightProgress;
      this.coreLight.intensity = targetIntensity + Math.sin(Date.now()/500) * 0.1 * this.lightProgress;
      this.coreLight.distance = 150 + 100 * this.lightProgress; // 缩小光照范围

      // 光晕：最大透明度0.3（原0.7），放大倍数1.8（原3.5）
      const glowScale = 1.2 + 0.6 * this.lightProgress;
      this.lightGlow.scale.set(glowScale, glowScale, glowScale);
      this.lightGlow.material.opacity = 0.1 + 0.2 * this.lightProgress;
      this.lightGlow.material.needsUpdate = true;

      // 塔顶旋转：速度降低
      this.mesh.children[2].rotation.y += this.lightProgress * 0.008;
    }
  });

  // 2. 全局灯塔光源：最大强度1.0（原2.25）
  lighthouseGlobalLight.position.copy(lighthouseWorldPos);
  lighthouseGlobalLight.position.y += 200;
  TweenLite.to(lighthouseGlobalLight, 2, { intensity: controlParams.warmLightIntensity * 1.0 });

  // 3. 雾色渐变（用上面修复后的代码）
  const targetFogColor = new THREE.Color(Colors.lighthouseFog);
  const startFogColor = new THREE.Color(scene.fog.color);
  TweenLite.to({ progress: 0 }, 2, {
    progress: 1,
    onUpdate: (tween) => {
      scene.fog.color.lerpColors(startFogColor, targetFogColor, tween.target.progress);
      scene.fog.color.needsUpdate = true;
    }
  });

  // 4. 粒子：每批6个（原10个)
  for (let i = 0; i < 15; i++) {
    setTimeout(() => {
      spawnLoveParticles(
        new THREE.Vector3(lighthouseWorldPos.x, lighthouseWorldPos.y + 200, lighthouseWorldPos.z),
        6, // 每批6个
        true,
        Colors.lighthouseYellow
      );
    }, i * 100);
  }
};

window.Lighthouse = Lighthouse;