var Rose = function() {
  this.mesh = new THREE.Object3D();
  this.isBloomed = false; // 标记是否绽放（对应狐狸的isReunited）
  this.bloomProgress = 0; // 绽放动画进度

  // 材质定义
  const stemMat = new THREE.MeshPhongMaterial({ color: Colors.green, shading: THREE.FlatShading });
  const calyxMat = new THREE.MeshPhongMaterial({ color: Colors.lightgreen, shading: THREE.FlatShading });
  const petalMat = new THREE.MeshPhongMaterial({ color: Colors.roseRed, shading: THREE.FlatShading });
  const stamenMat = new THREE.MeshPhongMaterial({ color: Colors.yellow, shading: THREE.FlatShading });

  // ① 花茎（细长圆柱）
  const stemGeom = new THREE.CylinderGeometry(5, 5, 200, 8); // 8边=低多边形感
  const stem = new THREE.Mesh(stemGeom, stemMat);
  stem.position.y = 100; 
  stem.castShadow = true;
  this.mesh.add(stem);

  // ② 花萼（6个小圆柱，围绕花茎顶部）
  const calyxGeom = new THREE.CylinderGeometry(8, 6, 15, 6);
  for (let i = 0; i < 6; i++) {
    const calyx = new THREE.Mesh(calyxGeom, calyxMat);
    const angle = (i / 6) * Math.PI * 2;
    calyx.position.set(Math.cos(angle)*10, 200, Math.sin(angle)*10);
    calyx.rotation.z = angle;
    this.mesh.add(calyx);
  }
  this.calyx = this.mesh.children.filter(child => child.material === calyxMat); // 保存花萼引用

  // ③ 花瓣（3层，每层6片，初始合拢）
  this.petals = [];
  const petalLayers = [
    { radius: 25, height: 30, y: 205 }, // 外层花瓣（最大）
    { radius: 18, height: 25, y: 215 }, // 中层
    { radius: 12, height: 20, y: 225 }  // 内层
  ];
  petalLayers.forEach(layer => {
    const petalGeom = new THREE.CylinderGeometry(1, layer.radius, layer.height, 6);
    for (let i = 0; i < 6; i++) {
      const petal = new THREE.Mesh(petalGeom, petalMat.clone());
      const angle = (i / 6) * Math.PI * 2;
      petal.position.set(Math.cos(angle)*5, layer.y, Math.sin(angle)*5);
      petal.rotation.z = angle;
      petal.rotation.x = Math.PI/2; // 初始竖直（合拢状态）
      this.mesh.add(petal);
      this.petals.push(petal);
    }
  });

  // ④ 花蕊（球体）
  const stamenGeom = new THREE.SphereGeometry(10, 8, 6);
  this.stamen = new THREE.Mesh(stamenGeom, stamenMat);
  this.stamen.position.y = 230;
  this.mesh.add(this.stamen);
};

// 玫瑰花绽放动画（对应狐狸的reunite）
Rose.prototype.bloom = function() {
  // 修复1：加日志，确认函数是否执行（最开头）
  console.log('玫瑰花bloom函数触发！');
  if (this.isBloomed) return;
  this.isBloomed = true;

  // 1. 花瓣展开+花萼张开动画
  TweenLite.to(this, 1.8, {
    bloomProgress: 1,
    onUpdate: () => {
      // 花瓣从竖直（PI/2）展开到倾斜（PI/3）
      this.petals.forEach((petal, index) => {
        const maxAngle = Math.PI/3;
        const minAngle = Math.PI/2;
        petal.rotation.x = minAngle - (minAngle - maxAngle) * this.bloomProgress;
        // 花瓣颜色渐变（玫瑰红→浅粉）
        petal.material.color.setHex(
          lerpColor(Colors.roseRed, Colors.rosePink, this.bloomProgress)
        );
      });
      // 花萼向外张开
      this.calyx.forEach(calyx => {
        calyx.rotation.x = this.bloomProgress * Math.PI/6;
      });
      // 花蕊上升+旋转
      this.stamen.position.y = 230 + this.bloomProgress * 10;
      this.stamen.rotation.y += this.bloomProgress * 0.01;
    }
  });
  // 2. 激活粉红光效
  //const loveLight = new THREE.PointLight(Colors.rosePink, controlParams.warmLightIntensity * 3, 250); // 强度×3，确保够亮
  loveLight.position.set(this.mesh.position.x, this.mesh.position.y + 150, this.mesh.position.z);
  TweenLite.to(loveLight, 1.8, { intensity: controlParams.warmLightIntensity * 3 }); // 渐变增强
  console.log('✅ 玫瑰花光源激活，位置：', loveLight.position);

  // 3. 雾色渐变粉色（修复3：用固定RGB值，避免十六进制转换错误）
  TweenLite.to(scene.fog.color, 1.8, {
    r: 0.95,    // 红色通道（最大）
    g: 0.8,   // 绿色通道（接近最大，淡粉）
    b: 0.8,   // 蓝色通道（接近最大，淡粉）
    onUpdate: () => {
      scene.fog.color.needsUpdate = true;
      // 修复4：日志保留，且格式化输出，方便查看
      console.log('🌫️ 当前雾色：R=', scene.fog.color.r.toFixed(2), 'G=', scene.fog.color.g.toFixed(2), 'B=', scene.fog.color.b.toFixed(2));
    }
  });

  // 4. 生成玫瑰花瓣粒子（修复5：恢复循环生成，粒子效果更明显）
  for (let i = 0; i < 15; i++) {
    setTimeout(() => {
      spawnLoveParticles(this.mesh.position, controlParams.particleCount || 15, false, Colors.rosePink, true);
    }, i * 80);
  }
};

// 暴露Rose类到全局
window.Rose = Rose;