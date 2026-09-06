const $ = id => document.getElementById(id);
const loading = $('loading'), loadText = $('loadText'), fallback = $('fallback');
function loadingMsg(text){ loadText.textContent = text; }
function fail(text){ loading.classList.add('error'); loadText.textContent = text; fallback.classList.remove('hide'); }

let THREE;
try {
  THREE = await import('https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js');
} catch (primary) {
  try { THREE = await import('https://unpkg.com/three@0.180.0/build/three.module.js'); }
  catch (secondary) { console.error(primary, secondary); fail('Three.js could not load — exact PDF fallback is shown.'); throw secondary; }
}

// Optional Blender/glTF asset pipeline. The approved PDF-derived geometry never depends on
// these files: if a GLB is absent, the polished procedural fallback remains visible.
let GLTFLoader = null;
try {
  ({ GLTFLoader } = await import('https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js/+esm'));
} catch (err) {
  console.info('Optional GLTFLoader unavailable; using procedural ArchViz fallbacks.', err);
}

try {
  loadingMsg('Loading PDF-derived geometry…');
  const data = await fetch('./assets/masterplan.json').then(r => { if(!r.ok) throw new Error('masterplan.json ' + r.status); return r.json(); });
  $('plotCount').textContent = data.plotCount;
  $('plotAreaCount').textContent = data.plotAreaCount ?? '—';

  const probe = document.createElement('canvas');
  if (!(probe.getContext('webgl2') || probe.getContext('webgl'))) throw new Error('WebGL is disabled in this browser');

  const host = $('canvasHost');
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x101c15);
  scene.fog = new THREE.FogExp2(0x162319, 0.0046);

  const camera = new THREE.PerspectiveCamera(38, 1, .03, 5000);
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', alpha: false });
  const perfDpr = (navigator.deviceMemory && navigator.deviceMemory <= 4) ? 1 : 1.5;
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, perfDpr));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.98;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  host.appendChild(renderer.domElement);

  // ---- Lighting / atmosphere ----
  const hemi = new THREE.HemisphereLight(0xfff0d0, 0x23442d, 1.35); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffdca0, 2.25);
  sun.position.set(-34, 52, 30); sun.castShadow = true;
  const shadowSize=(navigator.deviceMemory && navigator.deviceMemory<=4)?1024:2048; sun.shadow.mapSize.set(shadowSize, shadowSize); sun.shadow.camera.left=-45; sun.shadow.camera.right=45; sun.shadow.camera.top=55; sun.shadow.camera.bottom=-55;
  sun.shadow.bias = -0.00035; scene.add(sun);
  const fill = new THREE.DirectionalLight(0xa7cab1, .48); fill.position.set(30, 18, -30); scene.add(fill);
  const warm = new THREE.PointLight(0xf5bd63, 22, 46, 2); warm.position.set(-13, 7, 25); scene.add(warm);
  const moon = new THREE.DirectionalLight(0x9bb8d1,.12); moon.position.set(28,36,-22); scene.add(moon);

  const planW = 42, planH = planW * (2384/1684), topY = .05;
  const root = new THREE.Group(); scene.add(root);
  const world = new THREE.Group(); root.add(world);

  // ---- Premium architectural atmosphere ----
  // A lightweight gradient sky dome gives the model an architectural-visualization horizon
  // without changing any source-derived horizontal geometry.
  const skyGeo = new THREE.SphereGeometry(180, 32, 16);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite:false,
    uniforms:{
      topColor:{value:new THREE.Color(0x263f32)},
      horizonColor:{value:new THREE.Color(0x776f55)},
      bottomColor:{value:new THREE.Color(0x0b1510)},
      offset:{value:7.0},
      exponent:{value:0.72}
    },
    vertexShader:`varying vec3 vWorldPosition; void main(){ vec4 wp=modelMatrix*vec4(position,1.0); vWorldPosition=wp.xyz; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader:`uniform vec3 topColor; uniform vec3 horizonColor; uniform vec3 bottomColor; uniform float offset; uniform float exponent; varying vec3 vWorldPosition; void main(){ float h=normalize(vWorldPosition+vec3(0.0,offset,0.0)).y; float up=pow(max(h,0.0),exponent); float dn=pow(max(-h,0.0),0.55); vec3 c=mix(horizonColor,topColor,up); c=mix(c,bottomColor,dn); gl_FragColor=vec4(c,1.0); }`
  });
  const sky = new THREE.Mesh(skyGeo,skyMat); scene.add(sky);

  // Blender-ready asset layer. Drop optimized GLB files into ./models/ and the loader will
  // replace the matching procedural fallback while leaving interaction/source geometry intact.
  const premiumAssetLayer = new THREE.Group(); premiumAssetLayer.name='PremiumArchVizAssets'; world.add(premiumAssetLayer);
  const archvizAssetStatus = new Map();
  async function tryLoadGLB({name,url,parent=premiumAssetLayer,position,rotationY=0,scale=1,fallbackGroup=null,onLoaded=null}){
    archvizAssetStatus.set(name,'procedural fallback');
    if(!GLTFLoader) return null;
    try{
      const gltf = await new Promise((resolve,reject)=>new GLTFLoader().load(url,resolve,undefined,reject));
      const model=gltf.scene; model.name=name;
      if(position) model.position.copy(position);
      model.rotation.y=rotationY; model.scale.setScalar(scale);
      model.traverse(o=>{ if(o.isMesh){ o.castShadow=true; o.receiveShadow=true; if(o.material?.map) o.material.map.colorSpace=THREE.SRGBColorSpace; } });
      parent.add(model);
      if(fallbackGroup) fallbackGroup.visible=false;
      archvizAssetStatus.set(name,'GLB');
      onLoaded?.(model);
      requestRender();
      return model;
    }catch(err){
      console.info(`Optional ${name} GLB not found; keeping procedural fallback.`,err);
      return null;
    }
  }

  // ---- Base / surrounding land ----
  const surrounding = new THREE.Mesh(
    new THREE.PlaneGeometry(120, 140),
    new THREE.MeshStandardMaterial({color:0x274933, roughness:.98, metalness:0})
  );
  surrounding.rotation.x = -Math.PI/2; surrounding.position.y = -0.61; surrounding.receiveShadow = true; scene.add(surrounding);

  // V8 M10 + M12: conceptual landscape context OUTSIDE the source plan boundary.
  // This is presentation-only terrain/tree belt and never changes the PDF-derived site geometry.
  const contextGroup=new THREE.Group(); scene.add(contextGroup);
  const contextPatchMatA=new THREE.MeshStandardMaterial({color:0x31543a,roughness:1});
  const contextPatchMatB=new THREE.MeshStandardMaterial({color:0x3a5d3b,roughness:1});
  const contextPatchGeo=new THREE.CircleGeometry(6.2,24);
  const contextRng=(seed=>()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296})(481516);
  for(let i=0;i<34;i++){
    const ang=contextRng()*Math.PI*2, rad=35+contextRng()*24;
    const patch=new THREE.Mesh(contextPatchGeo,i%2?contextPatchMatA:contextPatchMatB);
    patch.rotation.x=-Math.PI/2; patch.rotation.z=contextRng()*Math.PI;
    patch.scale.set(.65+contextRng()*1.35,.65+contextRng()*1.35,1);
    patch.position.set(Math.cos(ang)*rad,-.595,Math.sin(ang)*rad*1.12);
    patch.receiveShadow=true; contextGroup.add(patch);
  }
  const contextTrunkGeo=new THREE.CylinderGeometry(.10,.15,1.15,7);
  const contextCrownGeo=new THREE.IcosahedronGeometry(.55,1);
  const contextTrunkMat=new THREE.MeshStandardMaterial({color:0x5a3c25,roughness:1});
  const contextCrownMat=new THREE.MeshStandardMaterial({color:0x1f4c2c,roughness:1});
  const contextCrownMat2=new THREE.MeshStandardMaterial({color:0x365f35,roughness:1});
  const contextTrees=[];
  for(let i=0;i<150;i++){
    let x,z;
    if(i%2===0){x=(contextRng()-.5)*82; z=(contextRng()<.5?-1:1)*(planH*.5+4+contextRng()*17);}
    else {x=(contextRng()<.5?-1:1)*(planW*.5+4+contextRng()*19); z=(contextRng()-.5)*92;}
    contextTrees.push([x,z,.75+contextRng()*1.15]);
  }
  const ctxTrunks=new THREE.InstancedMesh(contextTrunkGeo,contextTrunkMat,contextTrees.length);
  const ctxCrowns=new THREE.InstancedMesh(contextCrownGeo,contextCrownMat,contextTrees.length);
  const ctxCrowns2=new THREE.InstancedMesh(contextCrownGeo,contextCrownMat2,contextTrees.length);
  const ctxDummy=new THREE.Object3D();
  for(let i=0;i<contextTrees.length;i++){const [x,z,sc]=contextTrees[i];ctxDummy.position.set(x,-.04+sc*.48,z);ctxDummy.scale.set(sc,sc,sc);ctxDummy.rotation.y=contextRng()*6.28;ctxDummy.updateMatrix();ctxTrunks.setMatrixAt(i,ctxDummy.matrix);ctxDummy.position.set(x,.60+sc*.78,z);ctxDummy.scale.set(sc,sc*.84,sc);ctxDummy.updateMatrix();ctxCrowns.setMatrixAt(i,ctxDummy.matrix);ctxDummy.position.set(x+.15*sc,.83+sc*.83,z-.10*sc);ctxDummy.scale.set(.72*sc,.62*sc,.72*sc);ctxDummy.updateMatrix();ctxCrowns2.setMatrixAt(i,ctxDummy.matrix);}
  contextGroup.add(ctxTrunks,ctxCrowns,ctxCrowns2);

  const slabMat = new THREE.MeshStandardMaterial({color:0x5a7054, roughness:.96, metalness:0});
  const slab = new THREE.Mesh(new THREE.BoxGeometry(planW+1.4,.9,planH+1.4),slabMat);
  slab.position.y=-.47; slab.receiveShadow=true; world.add(slab);
  const lipMat = new THREE.MeshStandardMaterial({color:0xc9bea0, roughness:.86, metalness:.01});
  const lip = new THREE.Mesh(new THREE.BoxGeometry(planW+.38,.12,planH+.38),lipMat);
  lip.position.y=-.03; lip.receiveShadow=true; world.add(lip);

  // V6 architectural presentation edge. This sits OUTSIDE the mapped masterplan on the model
  // plinth and is deliberately not presented as a surveyed township boundary.
  const presentationEdgeGroup=new THREE.Group(); world.add(presentationEdgeGroup);
  const edgeStoneMat=new THREE.MeshStandardMaterial({color:0x8e846f,roughness:.88,metalness:.01});
  const edgeMetalMat=new THREE.MeshStandardMaterial({color:0x5b5142,roughness:.46,metalness:.38});
  const perimeterGlowMat=new THREE.MeshStandardMaterial({color:0xe9c985,emissive:0xc99442,emissiveIntensity:.62,roughness:.52});
  const perimeterGlowGroup=new THREE.Group(); presentationEdgeGroup.add(perimeterGlowGroup);
  const edgeX=planW*.5+.57, edgeZ=planH*.5+.57;
  const edgeWallH=.20, edgeWallT=.08;
  for(const cfg of [
    [planW+1.08,edgeWallH,edgeWallT,0,edgeZ],[planW+1.08,edgeWallH,edgeWallT,0,-edgeZ],
    [edgeWallT,edgeWallH,planH+1.08,edgeX,0],[edgeWallT,edgeWallH,planH+1.08,-edgeX,0]
  ]){
    const [w,h,d,x,z]=cfg; const wall=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),edgeStoneMat); wall.position.set(x,.08,z); wall.castShadow=true; wall.receiveShadow=true; presentationEdgeGroup.add(wall);
  }
  const edgePostGeo=new THREE.BoxGeometry(.10,.42,.10);
  const edgePosts=[];
  for(let x=-planW*.5;x<=planW*.5+.001;x+=4.4){ edgePosts.push([x,edgeZ],[x,-edgeZ]); }
  for(let z=-planH*.5+2.2;z<=planH*.5-2.2;z+=4.4){ edgePosts.push([edgeX,z],[-edgeX,z]); }
  const postMesh=new THREE.InstancedMesh(edgePostGeo,edgeMetalMat,edgePosts.length);
  const edgeDummy=new THREE.Object3D();
  for(let i=0;i<edgePosts.length;i++){ const [x,z]=edgePosts[i]; edgeDummy.position.set(x,.30,z); edgeDummy.rotation.set(0,0,0); edgeDummy.scale.set(1,1,1); edgeDummy.updateMatrix(); postMesh.setMatrixAt(i,edgeDummy.matrix); }
  presentationEdgeGroup.add(postMesh);
  // Thin warm reveals make the model read like a premium sales-gallery masterplan at night.
  for(const cfg of [[planW+.80,.018,.025,0,edgeZ-.055],[planW+.80,.018,.025,0,-edgeZ+.055],[.025,.018,planH+.80,edgeX-.055,0],[.025,.018,planH+.80,-edgeX+.055,0]]){
    const [w,h,d,x,z]=cfg; const strip=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),perimeterGlowMat); strip.position.set(x,.205,z); perimeterGlowGroup.add(strip);
  }

  loadingMsg('Loading exact vector masterplan…');
  const texture = await new Promise((resolve,reject)=>{
    new THREE.TextureLoader().load('./assets/masterplan.svg',resolve,undefined,()=>{
      new THREE.TextureLoader().load('./assets/masterplan-fallback.png',resolve,undefined,reject);
    });
  });
  texture.colorSpace=THREE.SRGBColorSpace; texture.anisotropy=Math.min(12,renderer.capabilities.getMaxAnisotropy());
  const CLEAN_PLAN_OPACITY=.055, EXACT_PLAN_OPACITY=.015;
  const planMat = new THREE.MeshStandardMaterial({map:texture, transparent:true, opacity:CLEAN_PLAN_OPACITY, roughness:.98, metalness:0, side:THREE.DoubleSide});
  const plan = new THREE.Mesh(new THREE.PlaneGeometry(planW,planH),planMat);
  plan.rotation.x=-Math.PI/2; plan.position.y=topY; plan.receiveShadow=true; world.add(plan);

  // ---- Exact PDF annotation overlay ----
  // Preserves source text values and their source positions: plot IDs/areas, linear dimensions,
  // road-width labels and named features. This sits above 3D plot slabs so the source data is not hidden.
  loadingMsg('Loading exact PDF annotations…');
  const annotationTexture = await new Promise((resolve,reject)=>{
    new THREE.TextureLoader().load('./assets/exact-annotations.svg',resolve,undefined,reject);
  });
  annotationTexture.colorSpace=THREE.SRGBColorSpace;
  annotationTexture.anisotropy=Math.min(12,renderer.capabilities.getMaxAnisotropy());
  const annotationMat=new THREE.MeshBasicMaterial({map:annotationTexture,transparent:true,opacity:.96,depthWrite:false,side:THREE.DoubleSide});
  const annotationPlane=new THREE.Mesh(new THREE.PlaneGeometry(planW,planH),annotationMat);
  annotationPlane.rotation.x=-Math.PI/2; annotationPlane.position.y=.515; annotationPlane.renderOrder=50; annotationPlane.visible=false; world.add(annotationPlane);

  // ---- Exact 3D road network extracted from the PDF ----
  // The road surfaces are segmented from the exact gray road geometry in the supplied
  // AutoCAD-derived PDF render. They are extruded as one continuous network, preserving
  // internal roads, entry roads and the expressway alignment visible in the source.
  loadingMsg('Building exact 3D roads…');
  const roadData = await fetch('./assets/roads.json').then(r => { if(!r.ok) throw new Error('roads.json ' + r.status); return r.json(); });
  const roadGroup = new THREE.Group(); roadGroup.position.y=.055; world.add(roadGroup);

  // V6 road finish: procedural asphalt grain adds material richness without changing a single
  // road vertex from roads.json. The texture is intentionally subtle so PDF labels stay legible.
  const asphaltCanvas=document.createElement('canvas'); asphaltCanvas.width=128; asphaltCanvas.height=128;
  const actx=asphaltCanvas.getContext('2d');
  const aimg=actx.createImageData(128,128);
  const asphaltRng=(seed=>()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296})(92841);
  for(let i=0;i<aimg.data.length;i+=4){
    const n=Math.floor(112+(asphaltRng()-.5)*28);
    aimg.data[i]=n; aimg.data[i+1]=n+2; aimg.data[i+2]=n+1; aimg.data[i+3]=255;
  }
  actx.putImageData(aimg,0,0);
  const asphaltTex=new THREE.CanvasTexture(asphaltCanvas); asphaltTex.wrapS=asphaltTex.wrapT=THREE.RepeatWrapping;
  asphaltTex.repeat.set(10,14); asphaltTex.colorSpace=THREE.SRGBColorSpace; asphaltTex.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
  const roadRoughTex=asphaltTex.clone(); roadRoughTex.needsUpdate=true;
  const roadTopMat = new THREE.MeshStandardMaterial({color:0x3f4542,map:asphaltTex,roughness:.94,roughnessMap:roadRoughTex,bumpMap:asphaltTex,bumpScale:.018,metalness:.012});
  const roadSideMat = new THREE.MeshStandardMaterial({color:0xb9b19d,roughness:.91,metalness:0});
  function roadShape(component){
    const s=new THREE.Shape();
    component.polygon.forEach(([u,v],i)=>{ const x=(u-.5)*planW, y=(.5-v)*planH; if(i===0)s.moveTo(x,y); else s.lineTo(x,y); });
    s.closePath();
    for(const holePoly of (component.holes||[])){
      const h=new THREE.Path();
      holePoly.forEach(([u,v],i)=>{ const x=(u-.5)*planW, y=(.5-v)*planH; if(i===0)h.moveTo(x,y); else h.lineTo(x,y); });
      h.closePath(); s.holes.push(h);
    }
    return s;
  }
  for(const comp of roadData.components){
    const g=new THREE.ExtrudeGeometry(roadShape(comp),{depth:.13,bevelEnabled:false,curveSegments:1});
    g.rotateX(-Math.PI/2);
    const m=new THREE.Mesh(g,[roadTopMat,roadSideMat]);
    m.castShadow=true; m.receiveShadow=true; roadGroup.add(m);
  }

  // V8 M4: premium road-edge delineation sampled from exact road boundaries.
  // Thin, flush segments enhance legibility without asserting lane count or changing road polygons.
  const roadEdgeGroup=new THREE.Group(); world.add(roadEdgeGroup);
  const edgeLineMat=new THREE.MeshStandardMaterial({color:0xd9d2bd,roughness:.74,metalness:.01,transparent:true,opacity:.66});
  function addEdgeDashes(ring,spacing=1.55,dash=.38){
    const pts=worldRing(ring);
    for(let i=0;i<pts.length;i++){const a=pts[i],b=pts[(i+1)%pts.length],seg=b.clone().sub(a),len=seg.length();if(len<.35)continue;const dir=seg.clone().normalize();for(let d=.45;d<len-.15;d+=spacing){const p0=a.clone().addScaledVector(dir,d),l=Math.min(dash,len-d);const m=new THREE.Mesh(new THREE.BoxGeometry(l,.008,.022),edgeLineMat);m.position.set(p0.x,.213,p0.z);m.rotation.y=-Math.atan2(dir.z,dir.x);m.renderOrder=3;roadEdgeGroup.add(m);}}
  }
  for(const comp of roadData.components.slice(0,18)){if(ringLength(worldRing(comp.polygon))>12)addEdgeDashes(comp.polygon);}

  // V7 Milestone 1: refill only PDF label knockouts in named external roads.
  const sourceAnnotations = await fetch('./assets/source-annotations.json').then(r=>r.json());
  const namedRoadLabels=(sourceAnnotations.annotations||[]).filter(a=>/YAMUNA\s+EXPRESSWAY|PROPOSED 6 LANE ROAD/i.test(a.text||''));
  function polyCentroid(poly){let x=0,y=0;for(const q of poly){x+=q[0];y+=q[1];}return[x/poly.length,y/poly.length];}
  function dist2(a,b){const dx=a[0]-b[0],dy=a[1]-b[1];return dx*dx+dy*dy;}
  const roadLabelPatchGroup=new THREE.Group(); roadLabelPatchGroup.position.y=.188; world.add(roadLabelPatchGroup);
  for(const comp of roadData.components){for(const hole of (comp.holes||[])){
    const c=polyCentroid(hole); if(!namedRoadLabels.some(a=>dist2(c,a.position)<0.00055))continue;
    const shape=new THREE.Shape(); hole.forEach(([u,v],i)=>{const x=(u-.5)*planW,z=(.5-v)*planH;if(i===0)shape.moveTo(x,z);else shape.lineTo(x,z);});shape.closePath();
    const g=new THREE.ShapeGeometry(shape);g.rotateX(-Math.PI/2);const patch=new THREE.Mesh(g,roadTopMat);patch.receiveShadow=true;patch.renderOrder=2;roadLabelPatchGroup.add(patch);
  }}


  // ---- VISUAL ENHANCEMENT: realistic street lighting derived from exact road boundaries ----
  // Decorative curb blocks were intentionally removed in the final cleanup. They created
  // white wall-like strips beside internal roads at close zoom. The PDF-derived road mesh
  // itself now provides the clean road-to-plot transition; only lighting is added here.
  loadingMsg('Adding realistic street lights…');
  const roadDecorGroup = new THREE.Group(); world.add(roadDecorGroup);
  const streetLightGroup = new THREE.Group(); roadDecorGroup.add(streetLightGroup);

  function worldRing(ring){ return ring.map(([u,v])=>new THREE.Vector3((u-.5)*planW,0,(v-.5)*planH)); }
  function ringLength(points){
    let total=0; for(let i=0;i<points.length;i++) total+=points[i].distanceTo(points[(i+1)%points.length]); return total;
  }
  function sampleClosedRing(ring, spacing){
    const pts=worldRing(ring), out=[];
    if(pts.length<2) return out;
    let carry=0;
    for(let i=0;i<pts.length;i++){
      const a=pts[i], b=pts[(i+1)%pts.length], seg=b.clone().sub(a), len=seg.length();
      if(len<1e-5) continue;
      const dir=seg.clone().multiplyScalar(1/len);
      let d=carry===0?0:spacing-carry;
      while(d<len){ out.push({p:a.clone().addScaledVector(dir,d),dir:dir.clone()}); d+=spacing; }
      carry=(carry+len)%spacing;
    }
    return out;
  }
  const roadRings=[];
  for(const comp of roadData.components){ roadRings.push(comp.polygon,...(comp.holes||[])); }

  // Realistic street-light density: candidates follow the actual road boundaries and are
  // spatially thinned so parallel plot edges do not receive duplicate lamp posts.
  const lampCandidates=[];
  for(const ring of roadRings){
    if(ringLength(worldRing(ring))<6.0) continue;
    lampCandidates.push(...sampleClosedRing(ring,5.80));
  }
  const lampSamples=[];
  const minLampDistance=2.9;
  const minLampDistanceSq=minLampDistance*minLampDistance;
  for(const sample of lampCandidates){
    if(lampSamples.every(existing=>existing.p.distanceToSquared(sample.p)>=minLampDistanceSq)) lampSamples.push(sample);
    if(lampSamples.length>=72) break;
  }
  const poleGeo=new THREE.CylinderGeometry(.025,.038,.82,7);
  const poleMat=new THREE.MeshStandardMaterial({color:0x252a26,roughness:.66,metalness:.26});
  const bulbGeo=new THREE.SphereGeometry(.055,8,6);
  const bulbMat=new THREE.MeshStandardMaterial({color:0xffe0a0,emissive:0xff9f31,emissiveIntensity:2.1,roughness:.34});
  const capGeo=new THREE.CylinderGeometry(.085,.058,.035,8);
  const capMat=new THREE.MeshStandardMaterial({color:0x303631,roughness:.62,metalness:.24});
  const lampCount=lampSamples.length;
  const poles=new THREE.InstancedMesh(poleGeo,poleMat,lampCount);
  const bulbs=new THREE.InstancedMesh(bulbGeo,bulbMat,lampCount);
  const caps=new THREE.InstancedMesh(capGeo,capMat,lampCount);
  poles.castShadow=false; caps.castShadow=false;
  const decorDummy=new THREE.Object3D();
  for(let i=0;i<lampCount;i++){
    const {p}=lampSamples[i];
    decorDummy.position.set(p.x,.56,p.z); decorDummy.rotation.set(0,0,0); decorDummy.scale.set(1,1,1); decorDummy.updateMatrix(); poles.setMatrixAt(i,decorDummy.matrix);
    decorDummy.position.set(p.x,.985,p.z); decorDummy.scale.set(1,1,1); decorDummy.updateMatrix(); caps.setMatrixAt(i,decorDummy.matrix);
    decorDummy.position.set(p.x,.955,p.z); decorDummy.scale.set(1,1,1); decorDummy.updateMatrix(); bulbs.setMatrixAt(i,decorDummy.matrix);
  }
  streetLightGroup.add(poles,caps,bulbs);

  // V6: low-profile reflective road studs sampled from the SAME road boundary geometry.
  // These are presentation lighting details only; they do not claim lane counts or centre lines.
  const roadReflectorMat=new THREE.MeshStandardMaterial({color:0xffe5a6,emissive:0xffb23f,emissiveIntensity:1.25,roughness:.34,metalness:.10});
  const roadReflectorGeo=new THREE.CylinderGeometry(.035,.042,.018,8);
  const reflectorCandidates=[];
  for(const ring of roadRings){ if(ringLength(worldRing(ring))>8) reflectorCandidates.push(...sampleClosedRing(ring,2.45)); }
  const reflectorSamples=[];
  const reflectorMinSq=1.45*1.45;
  for(const sample of reflectorCandidates){
    if(reflectorSamples.every(e=>e.p.distanceToSquared(sample.p)>=reflectorMinSq)) reflectorSamples.push(sample);
    if(reflectorSamples.length>=220) break;
  }
  const roadReflectors=new THREE.InstancedMesh(roadReflectorGeo,roadReflectorMat,reflectorSamples.length);
  roadReflectors.castShadow=false; roadReflectors.receiveShadow=false;
  for(let i=0;i<reflectorSamples.length;i++){
    const p=reflectorSamples[i].p; decorDummy.position.set(p.x,.214,p.z); decorDummy.rotation.set(0,0,0); decorDummy.scale.set(1,1,1); decorDummy.updateMatrix(); roadReflectors.setMatrixAt(i,decorDummy.matrix);
  }
  streetLightGroup.add(roadReflectors);

  const streetPointLights=[];
  for(let i=0;i<lampCount;i+=24){
    const p=lampSamples[i].p;
    const pl=new THREE.PointLight(0xffa846,0,3.2,2.15);
    pl.position.set(p.x,.96,p.z); streetLightGroup.add(pl); streetPointLights.push(pl);
  }

  // ---- Accurate PDF plot meshes ----
  const sectorColors={A:0xd9bc6b,B:0xd3b15f,C:0xe1c574,D:0xcfa957,E:0xd8b763,G:0xc9a452};
  const plotGroup=new THREE.Group(); plotGroup.position.y=topY+.015; world.add(plotGroup);
  const plots=[]; const byId=new Map();
  // V8 M8/M12: subtle natural plot-surface texture. It is purely material treatment; polygon
  // boundaries and PDF area/dimension associations remain unchanged.
  const plotCanvas=document.createElement('canvas');plotCanvas.width=128;plotCanvas.height=128;const pctx=plotCanvas.getContext('2d');
  pctx.fillStyle='#d6bf80';pctx.fillRect(0,0,128,128);const prng=(seed=>()=>{seed=(seed*1103515245+12345)>>>0;return seed/4294967296})(8128);
  for(let i=0;i<900;i++){const a=.025+prng()*.055;pctx.fillStyle=`rgba(74,61,38,${a})`;pctx.fillRect(prng()*128,prng()*128,.5+prng()*1.5,.5+prng()*1.5);}
  const plotSurfaceTex=new THREE.CanvasTexture(plotCanvas);plotSurfaceTex.wrapS=plotSurfaceTex.wrapT=THREE.RepeatWrapping;plotSurfaceTex.repeat.set(2.4,2.4);plotSurfaceTex.colorSpace=THREE.SRGBColorSpace;
  function toShape(poly){
    const s=new THREE.Shape();
    poly.forEach(([u,v],i)=>{ const x=(u-.5)*planW, y=(.5-v)*planH; if(i===0)s.moveTo(x,y); else s.lineTo(x,y); });
    s.closePath(); return s;
  }
  for(const item of data.plots){
    if(!item.polygon || item.polygon.length<3) continue;
    const geom=new THREE.ExtrudeGeometry(toShape(item.polygon),{depth:.14,bevelEnabled:true,bevelSize:.018,bevelThickness:.018,bevelSegments:1,curveSegments:1});
    geom.rotateX(-Math.PI/2);
    const baseColor=sectorColors[item.sector]||0xd4af57;
    const topMat=new THREE.MeshStandardMaterial({color:baseColor,map:plotSurfaceTex,roughness:.92,bumpMap:plotSurfaceTex,bumpScale:.008,metalness:.008,polygonOffset:true,polygonOffsetFactor:-1});
    const sideMat=new THREE.MeshStandardMaterial({color:0x765f35,roughness:.97});
    const mesh=new THREE.Mesh(geom,[topMat,sideMat]);
    mesh.userData={...item,normalMaterials:[topMat,sideMat]}; mesh.castShadow=false; mesh.receiveShadow=true;
    plotGroup.add(mesh); plots.push(mesh);
    const key=item.id.toUpperCase(); if(!byId.has(key))byId.set(key,[]); byId.get(key).push(mesh);
  }

  // ---- Clean 3D plot annotations ----
  // The raw PDF plan contains dense text. In 3D that text can overlap with the exact-annotation
  // overlay and look like gibberish, so the default presentation uses one camera-facing label per
  // plot (ID + PDF area). The full exact PDF annotation plane remains available as a separate layer.
  const labelGroup = new THREE.Group(); world.add(labelGroup);
  // Final readability pass: larger plot IDs and slightly larger area text while keeping
  // the labels compact enough to avoid bringing back the dense-source-annotation clutter.
  const LABEL_BASE_W=1.50, LABEL_BASE_H=.64;
  function makeLabelSprite(item){
    const c=document.createElement('canvas'); c.width=320; c.height=144;
    const ctx=c.getContext('2d'); ctx.clearRect(0,0,c.width,c.height);
    ctx.fillStyle='rgba(20,25,19,.86)'; ctx.roundRect(40,15,240,114,18); ctx.fill();
    ctx.strokeStyle='rgba(238,207,123,.68)'; ctx.lineWidth=2.4; ctx.stroke();
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.shadowColor='rgba(0,0,0,.65)'; ctx.shadowBlur=4; ctx.shadowOffsetY=1;
    ctx.fillStyle='#fff9e8'; ctx.font='800 44px Inter, Arial, sans-serif'; ctx.fillText(item.id,160,item.areaDisplay?55:72);
    if(item.areaDisplay){
      ctx.shadowBlur=3;
      ctx.fillStyle='#f2dfaa'; ctx.font='700 20px Inter, Arial, sans-serif'; ctx.fillText(item.areaDisplay,160,96);
    }
    const tex=new THREE.CanvasTexture(c); tex.colorSpace=THREE.SRGBColorSpace; tex.minFilter=THREE.LinearFilter;
    const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,depthWrite:false,depthTest:true}));
    sp.scale.set(LABEL_BASE_W,LABEL_BASE_H,1); return sp;
  }
  for(const item of data.plots){
    if(!item.label) continue; const [u,v]=item.label; const sp=makeLabelSprite(item);
    sp.position.set((u-.5)*planW,.50,(v-.5)*planH); sp.userData.plotId=item.id; labelGroup.add(sp);
  }

  // ---- Landscaping: lightweight instanced trees (conceptual treatment, plan geometry untouched) ----
  const landscapeGroup = new THREE.Group(); world.add(landscapeGroup);
  const trunkGeo = new THREE.CylinderGeometry(.055,.08,.55,7);
  const crownGeo = new THREE.ConeGeometry(.28,.72,10);
  const trunkMat = new THREE.MeshStandardMaterial({color:0x5b4028,roughness:1});
  const crownMat = new THREE.MeshStandardMaterial({color:0x2f6841,roughness:.98});
  const crownMat2 = new THREE.MeshStandardMaterial({color:0x4a7b4e,roughness:.98});
  const treePoints=[];
  const rng=(seed=>()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296})(7351);
  function uv(u,v){ return new THREE.Vector3((u-.5)*planW,0,(v-.5)*planH); }
  function addPolyline(points, spacing=.018){
    for(let i=0;i<points.length-1;i++){
      const [a,b]=[points[i],points[i+1]], dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy),n=Math.max(1,Math.floor(len/spacing));
      for(let j=0;j<=n;j++){ const t=j/n; treePoints.push([a[0]+dx*t+(rng()-.5)*.0035,a[1]+dy*t+(rng()-.5)*.0035]); }
    }
  }
  // Perimeter lines traced approximately from the supplied PDF. They decorate only; they do not define plot geometry.
  addPolyline([[.20,.08],[.31,.07],[.40,.06],[.55,.055],[.63,.07],[.68,.16],[.70,.34],[.72,.47],[.70,.53]]);
  addPolyline([[.70,.53],[.69,.67],[.66,.78],[.62,.89],[.56,.96],[.48,.98],[.40,.94],[.34,.88],[.29,.80]]);
  addPolyline([[.29,.80],[.25,.73],[.22,.66],[.19,.59],[.16,.53],[.13,.48],[.10,.42],[.12,.34],[.15,.27],[.17,.18],[.20,.08]]);
  // Lower section east/west boundaries
  addPolyline([[.34,.58],[.31,.66],[.28,.76],[.26,.85],[.29,.94],[.42,.99]]);
  addPolyline([[.69,.54],[.69,.64],[.67,.75],[.64,.86],[.60,.96]]);
  // Selected internal avenues / amenity edges, positioned only as landscaping accents.
  addPolyline([[.34,.21],[.52,.22],[.62,.25]],.030);
  addPolyline([[.33,.39],[.53,.40],[.66,.43]],.030);
  addPolyline([[.37,.59],[.50,.61],[.62,.63]],.032);
  addPolyline([[.39,.76],[.50,.78],[.61,.80]],.032);

  const treeCount=Math.min(340,treePoints.length);
  const trunks=new THREE.InstancedMesh(trunkGeo,trunkMat,treeCount);
  const crowns=new THREE.InstancedMesh(crownGeo,crownMat,treeCount);
  const crowns2=new THREE.InstancedMesh(crownGeo,crownMat2,treeCount);
  trunks.castShadow=false; crowns.castShadow=false; crowns2.castShadow=false;
  const dummy=new THREE.Object3D();
  for(let i=0;i<treeCount;i++){
    const [u0,v0]=treePoints[i], p=uv(u0,v0), s=.72+rng()*.50;
    dummy.position.set(p.x,.31*s,p.z); dummy.scale.set(s,s,s); dummy.rotation.y=rng()*Math.PI*2; dummy.updateMatrix(); trunks.setMatrixAt(i,dummy.matrix);
    dummy.position.set(p.x,.84*s,p.z); dummy.scale.set(s,s,s); dummy.rotation.y=rng()*Math.PI*2; dummy.updateMatrix(); crowns.setMatrixAt(i,dummy.matrix);
    dummy.position.set(p.x+.03,.99*s,p.z-.02); dummy.scale.set(.72*s,.72*s,.72*s); dummy.rotation.y=rng()*Math.PI*2; dummy.updateMatrix(); crowns2.setMatrixAt(i,dummy.matrix);
  }
  landscapeGroup.add(trunks,crowns,crowns2);

  // ---- Full source-derived 3D GREEN AREA surfaces ----
  // These polygons are extracted from the actual mint/green filled regions in the supplied PDF
  // around the exact GREEN AREA annotations. Unlike the earlier circular markers, the complete
  // source region is now filled with a raised grass surface and distributed vegetation.
  loadingMsg('Building full 3D green areas…');
  const greenData = await fetch('./assets/greenareas.json').then(r => { if(!r.ok) throw new Error('greenareas.json ' + r.status); return r.json(); });
  const greenAreaGroup = new THREE.Group(); landscapeGroup.add(greenAreaGroup);
  const grassTopMat = new THREE.MeshStandardMaterial({color:0x5f9256,roughness:1,metalness:0});
  const grassSideMat = new THREE.MeshStandardMaterial({color:0x3f673d,roughness:1,metalness:0});
  const greenEdgeMat = new THREE.LineBasicMaterial({color:0xb8d79d,transparent:true,opacity:.42});
  function greenShape(component){
    const s=new THREE.Shape();
    component.polygon.forEach(([u,v],i)=>{ const x=(u-.5)*planW, y=(.5-v)*planH; if(i===0)s.moveTo(x,y); else s.lineTo(x,y); });
    s.closePath();
    for(const holePoly of (component.holes||[])){
      const h=new THREE.Path();
      holePoly.forEach(([u,v],i)=>{ const x=(u-.5)*planW, y=(.5-v)*planH; if(i===0)h.moveTo(x,y); else h.lineTo(x,y); });
      h.closePath(); s.holes.push(h);
    }
    return s;
  }
  for(const comp of greenData.components){
    const geom=new THREE.ExtrudeGeometry(greenShape(comp),{depth:.065,bevelEnabled:true,bevelSize:.012,bevelThickness:.012,bevelSegments:1,curveSegments:1});
    geom.rotateX(-Math.PI/2);
    const lawnMesh=new THREE.Mesh(geom,[grassTopMat,grassSideMat]);
    lawnMesh.position.y=.062; lawnMesh.castShadow=true; lawnMesh.receiveShadow=true; greenAreaGroup.add(lawnMesh);
    const edge=new THREE.LineSegments(new THREE.EdgesGeometry(geom,28),greenEdgeMat); edge.position.y=.065; greenAreaGroup.add(edge);
  }

  // Vegetation is distributed across the complete PDF-derived green surfaces, not around label points.
  const greenVegPoints=greenData.vegetationPoints||[];
  const shrubGeoFull=new THREE.IcosahedronGeometry(.095,1);
  const shrubMatFull=new THREE.MeshStandardMaterial({color:0x356d3c,roughness:1});
  const shrubMatFull2=new THREE.MeshStandardMaterial({color:0x73965a,roughness:1});
  const grassTuftGeo=new THREE.ConeGeometry(.055,.22,5);
  const grassTuftMat=new THREE.MeshStandardMaterial({color:0x477d45,roughness:1});
  const shrubCount=Math.min(520,greenVegPoints.length);
  const tuftCount=Math.min(663,greenVegPoints.length);
  const shrubsFull=new THREE.InstancedMesh(shrubGeoFull,shrubMatFull,shrubCount);
  const shrubsFull2=new THREE.InstancedMesh(shrubGeoFull,shrubMatFull2,shrubCount);
  const grassTufts=new THREE.InstancedMesh(grassTuftGeo,grassTuftMat,tuftCount);
  shrubsFull.castShadow=false; shrubsFull2.castShadow=false; grassTufts.castShadow=false;
  const vegDummy=new THREE.Object3D();
  for(let i=0;i<tuftCount;i++){
    const [u0,v0,ss]=greenVegPoints[i], p=uv(u0,v0);
    const s0=.55+ss*.34;
    vegDummy.position.set(p.x,.175,p.z); vegDummy.scale.set(s0,s0,s0); vegDummy.rotation.y=(i*.754)%6.283; vegDummy.updateMatrix(); grassTufts.setMatrixAt(i,vegDummy.matrix);
    if(i<shrubCount){
      const shrubScale=.46+ss*.30;
      vegDummy.position.set(p.x+.035*Math.sin(i),.17,p.z+.035*Math.cos(i)); vegDummy.scale.set(shrubScale,shrubScale*.72,shrubScale); vegDummy.rotation.y=(i*.381)%6.283; vegDummy.updateMatrix();
      (i%4===0?shrubsFull2:shrubsFull).setMatrixAt(i,vegDummy.matrix);
      // Ensure the unused instance in the alternate mesh is harmlessly scaled to zero.
      vegDummy.scale.set(0,0,0); vegDummy.updateMatrix();
      (i%4===0?shrubsFull:shrubsFull2).setMatrixAt(i,vegDummy.matrix);
    }
  }
  greenAreaGroup.add(grassTufts,shrubsFull,shrubsFull2);

  // A sparse set of small trees across the broader designated green zones adds real depth while
  // keeping the PDF dimensions and annotations legible.
  const fullTreePts=greenVegPoints.filter((_,i)=>i%23===0).slice(0,32);
  for(let i=0;i<fullTreePts.length;i++){
    const [u0,v0,ss]=fullTreePts[i], p=uv(u0,v0), sc=.62+ss*.18;
    const tr=new THREE.Mesh(trunkGeo,trunkMat); tr.scale.set(sc,sc,sc); tr.position.set(p.x,.30*sc,p.z); tr.castShadow=true; greenAreaGroup.add(tr);
    const cr=new THREE.Mesh(crownGeo,i%2?crownMat:crownMat2); cr.scale.set(sc*.92,sc*.92,sc*.92); cr.position.set(p.x,.82*sc,p.z); cr.castShadow=true; greenAreaGroup.add(cr);
  }


  // Premium planting mix inspired by the approved visual reference. Positions are sourced only from
  // vegetationPoints that already lie inside corrected PDF-derived green polygons.
  const featureTreePts=greenVegPoints.filter((_,i)=>i%8===0).slice(0,88);
  const palmTrunkGeo=new THREE.CylinderGeometry(.035,.075,.88,7);
  const palmTrunkMat=new THREE.MeshStandardMaterial({color:0x7a5431,roughness:.9});
  const palmCrownGeo=new THREE.IcosahedronGeometry(.31,1);
  const palmCrownMat=new THREE.MeshStandardMaterial({color:0x3d7e42,roughness:.96});
  const flowerCrownGeo=new THREE.IcosahedronGeometry(.29,1);
  const flowerMats=[
    new THREE.MeshStandardMaterial({color:0x8d6a87,roughness:.98}),
    new THREE.MeshStandardMaterial({color:0xb88188,roughness:.98}),
    new THREE.MeshStandardMaterial({color:0x668f53,roughness:.98})
  ];
  const ftCount=featureTreePts.length;
  const palmTrunks=new THREE.InstancedMesh(palmTrunkGeo,palmTrunkMat,ftCount);
  const palmCrowns=new THREE.InstancedMesh(palmCrownGeo,palmCrownMat,ftCount);
  const flowerCrowns=flowerMats.map(m=>new THREE.InstancedMesh(flowerCrownGeo,m,ftCount));
  palmTrunks.castShadow=false; palmCrowns.castShadow=false; flowerCrowns.forEach(x=>x.castShadow=false);
  for(let i=0;i<ftCount;i++){
    const [u0,v0,ss]=featureTreePts[i],p=uv(u0,v0),sc=.82+ss*.28;
    const isPalm=i%3!==0;
    if(isPalm){
      decorDummy.position.set(p.x,.48*sc,p.z); decorDummy.scale.set(sc,sc,sc); decorDummy.rotation.set(0,(i*.71)%6.28,0); decorDummy.updateMatrix(); palmTrunks.setMatrixAt(i,decorDummy.matrix);
      decorDummy.position.set(p.x,.97*sc,p.z); decorDummy.scale.set(1.12*sc,.48*sc,1.12*sc); decorDummy.updateMatrix(); palmCrowns.setMatrixAt(i,decorDummy.matrix);
      flowerCrowns.forEach(mesh=>{decorDummy.scale.set(0,0,0);decorDummy.updateMatrix();mesh.setMatrixAt(i,decorDummy.matrix)});
    }else{
      decorDummy.scale.set(0,0,0); decorDummy.updateMatrix(); palmTrunks.setMatrixAt(i,decorDummy.matrix); palmCrowns.setMatrixAt(i,decorDummy.matrix);
      const idx=i%flowerCrowns.length;
      flowerCrowns.forEach((mesh,j)=>{
        if(j===idx){decorDummy.position.set(p.x,.73*sc,p.z);decorDummy.scale.set(1.15*sc,.92*sc,1.15*sc);decorDummy.rotation.set(0,(i*.4)%6.28,0);decorDummy.updateMatrix();}
        else {decorDummy.scale.set(0,0,0);decorDummy.updateMatrix();}
        mesh.setMatrixAt(i,decorDummy.matrix);
      });
    }
  }
  greenAreaGroup.add(palmTrunks,palmCrowns,...flowerCrowns);

  // V6 garden-light layer: bollards are sampled from source-derived GREEN AREA polygon edges.
  // They enhance depth at dusk/night without altering the extracted green polygons.
  const gardenLightGroup=new THREE.Group(); landscapeGroup.add(gardenLightGroup);
  const bollardBodyMat=new THREE.MeshStandardMaterial({color:0x30352f,roughness:.62,metalness:.28});
  const gardenLightMat=new THREE.MeshStandardMaterial({color:0xffdf9a,emissive:0xffa73c,emissiveIntensity:1.35,roughness:.38});
  const bollardBodyGeo=new THREE.CylinderGeometry(.035,.045,.24,7);
  const bollardGlowGeo=new THREE.CylinderGeometry(.046,.046,.055,8);
  const gardenCandidates=[];
  for(const comp of greenData.components){ gardenCandidates.push(...sampleClosedRing(comp.polygon,2.9)); }
  const gardenSamples=[]; const gardenMinSq=2.25*2.25;
  for(const sample of gardenCandidates){
    if(gardenSamples.every(e=>e.p.distanceToSquared(sample.p)>=gardenMinSq)) gardenSamples.push(sample);
    if(gardenSamples.length>=74) break;
  }
  const bollardBodies=new THREE.InstancedMesh(bollardBodyGeo,bollardBodyMat,gardenSamples.length);
  const bollardGlows=new THREE.InstancedMesh(bollardGlowGeo,gardenLightMat,gardenSamples.length);
  for(let i=0;i<gardenSamples.length;i++){
    const p=gardenSamples[i].p;
    decorDummy.position.set(p.x,.245,p.z); decorDummy.rotation.set(0,0,0); decorDummy.scale.set(1,1,1); decorDummy.updateMatrix(); bollardBodies.setMatrixAt(i,decorDummy.matrix);
    decorDummy.position.set(p.x,.385,p.z); decorDummy.updateMatrix(); bollardGlows.setMatrixAt(i,decorDummy.matrix);
  }
  gardenLightGroup.add(bollardBodies,bollardGlows);

  // Layered ornamental understory along existing conceptual landscape traces.
  const ornamentalGeo=new THREE.IcosahedronGeometry(.075,1);
  const ornamentalMat=new THREE.MeshStandardMaterial({color:0x7f9959,roughness:.98});
  const ornamentalAccentMat=new THREE.MeshStandardMaterial({color:0xa77f82,roughness:.97});
  const ornamentalCount=Math.min(210,treePoints.length);
  const ornamentals=new THREE.InstancedMesh(ornamentalGeo,ornamentalMat,ornamentalCount);
  const ornamentalAccents=new THREE.InstancedMesh(ornamentalGeo,ornamentalAccentMat,ornamentalCount);
  for(let i=0;i<ornamentalCount;i++){
    const [u0,v0]=treePoints[(i*3)%treePoints.length],p=uv(u0,v0),sc=.70+rng()*.65;
    decorDummy.position.set(p.x+.13*Math.sin(i*1.7),.18,p.z+.13*Math.cos(i*1.3)); decorDummy.scale.set(1.5*sc,.72*sc,1.05*sc); decorDummy.rotation.set(0,(i*.63)%6.28,0); decorDummy.updateMatrix();
    (i%7===0?ornamentalAccents:ornamentals).setMatrixAt(i,decorDummy.matrix);
    decorDummy.scale.set(0,0,0); decorDummy.updateMatrix(); (i%7===0?ornamentals:ornamentalAccents).setMatrixAt(i,decorDummy.matrix);
  }
  landscapeGroup.add(ornamentals,ornamentalAccents);

  // V8 M5: development-wide flowering accents using existing conceptual landscape anchors.
  const flowerGeo=new THREE.IcosahedronGeometry(.105,1);
  const flowerMatA=new THREE.MeshStandardMaterial({color:0xb87582,roughness:.96});
  const flowerMatB=new THREE.MeshStandardMaterial({color:0xd8a45e,roughness:.96});
  const flowerCount=Math.min(110,treePoints.length);
  const flowersA=new THREE.InstancedMesh(flowerGeo,flowerMatA,flowerCount);const flowersB=new THREE.InstancedMesh(flowerGeo,flowerMatB,flowerCount);
  for(let i=0;i<flowerCount;i++){const [u0,v0]=treePoints[(i*5+7)%treePoints.length],pp=uv(u0,v0),sc=.55+rng()*.55;decorDummy.position.set(pp.x+.22*Math.sin(i),.20,pp.z+.18*Math.cos(i*.8));decorDummy.scale.set(1.5*sc,.75*sc,1.2*sc);decorDummy.rotation.y=i*.71;decorDummy.updateMatrix();(i%2?flowersA:flowersB).setMatrixAt(i,decorDummy.matrix);decorDummy.scale.set(0,0,0);decorDummy.updateMatrix();(i%2?flowersB:flowersA).setMatrixAt(i,decorDummy.matrix);}
  landscapeGroup.add(flowersA,flowersB);

  // ---- V7 Milestone 2: Central Park premium 3D asset ----
  const centralParkGroup=new THREE.Group(); world.add(centralParkGroup);
  const centralParkAnnotation=(sourceAnnotations.annotations||[]).find(a=>/CENTRAL PARK/i.test(a.text||''));
  const centralParkPos=centralParkAnnotation?uv(centralParkAnnotation.position[0],centralParkAnnotation.position[1]):uv(.34988,.717317);
  const centralParkFallback=new THREE.Group(); centralParkGroup.add(centralParkFallback);
  const parkLawnMat=new THREE.MeshStandardMaterial({color:0x4f7f3d,roughness:.98}),parkPathMat=new THREE.MeshStandardMaterial({color:0xd7c7a4,roughness:.92});
  const parkLawn=new THREE.Mesh(new THREE.BoxGeometry(3.35,.055,2.25),parkLawnMat);parkLawn.position.set(centralParkPos.x,.10,centralParkPos.z);parkLawn.rotation.y=-.11;parkLawn.receiveShadow=true;centralParkFallback.add(parkLawn);
  for(const [w,d] of [[2.85,.20],[.20,1.72]]){const path=new THREE.Mesh(new THREE.BoxGeometry(w,.025,d),parkPathMat);path.position.set(centralParkPos.x,.145,centralParkPos.z);path.rotation.y=-.11;centralParkFallback.add(path);}
  for(let i=0;i<10;i++){const a=i/10*Math.PI*2,r=i%2?1.18:.78;const tr=new THREE.Mesh(new THREE.CylinderGeometry(.045,.06,.38,8),trunkMat);tr.position.set(centralParkPos.x+Math.cos(a)*r,.34,centralParkPos.z+Math.sin(a)*r*.70);tr.castShadow=true;centralParkFallback.add(tr);const cr=new THREE.Mesh(new THREE.IcosahedronGeometry(.23,1),i%2?crownMat:crownMat2);cr.position.set(tr.position.x,.68,tr.position.z);cr.scale.set(1.15,.85,1.15);cr.castShadow=true;centralParkFallback.add(cr);}
  tryLoadGLB({name:'central-park',url:'./models/central-park.glb',parent:centralParkGroup,position:new THREE.Vector3(centralParkPos.x,.12,centralParkPos.z),rotationY:-.11,scale:1,fallbackGroup:centralParkFallback});
  // V8 M6: focal plaza, seating and warm path-light halo, all kept within the same source-anchored park block.
  const parkDetailGroup=new THREE.Group();centralParkGroup.add(parkDetailGroup);
  const plazaMat=new THREE.MeshStandardMaterial({color:0xd7c8aa,roughness:.86});
  const plaza=new THREE.Mesh(new THREE.CylinderGeometry(.39,.39,.035,32),plazaMat);plaza.position.set(centralParkPos.x,.18,centralParkPos.z);plaza.receiveShadow=true;parkDetailGroup.add(plaza);
  const fountainStone=new THREE.MeshStandardMaterial({color:0xa99d87,roughness:.82});const fountainWater=new THREE.MeshPhysicalMaterial({color:0x62b8c1,roughness:.08,transparent:true,opacity:.82,clearcoat:.8});
  const basin=new THREE.Mesh(new THREE.CylinderGeometry(.21,.24,.07,32),fountainStone);basin.position.set(centralParkPos.x,.225,centralParkPos.z);parkDetailGroup.add(basin);const parkWater=new THREE.Mesh(new THREE.CylinderGeometry(.17,.17,.018,32),fountainWater);parkWater.position.set(centralParkPos.x,.27,centralParkPos.z);parkDetailGroup.add(parkWater);
  const benchMat=new THREE.MeshStandardMaterial({color:0x68482f,roughness:.68});for(const a of [0,Math.PI/2,Math.PI,Math.PI*1.5]){const b=new THREE.Mesh(new THREE.BoxGeometry(.42,.08,.11),benchMat);b.position.set(centralParkPos.x+Math.cos(a)*.66,.26,centralParkPos.z+Math.sin(a)*.52);b.rotation.y=-a;parkDetailGroup.add(b);}
  const parkAccentLights=[];for(let i=0;i<8;i++){const a=i/8*Math.PI*2;const l=new THREE.PointLight(0xffb75c,0,2.4,2);l.position.set(centralParkPos.x+Math.cos(a)*1.08,.34,centralParkPos.z+Math.sin(a)*.72);parkDetailGroup.add(l);parkAccentLights.push(l);}

  // ---- Conceptual clubhouse + pool on the clubhouse area shown in the PDF ----
  const amenityGroup = new THREE.Group(); world.add(amenityGroup);
  const clubhouseFallback = new THREE.Group(); amenityGroup.add(clubhouseFallback);
  const amenityHitTargets=[];
  const clubAmenityInfo={
    kind:'amenity',
    id:'CLUB HOUSE',
    title:'Club House',
    areaDisplay:'Not stated in PDF',
    sourceFeatures:['CLUB','Club House','Pool'],
    description:'The Club House and Pool are explicitly labeled in the supplied PDF at this amenity zone. The 3D building form, deck, glazing, pergola, materials and architectural lighting are conceptual presentation treatments; the PDF does not provide building elevations or architectural dimensions.'
  };
  function tagAmenity(mesh,info=clubAmenityInfo){ mesh.userData.amenityInfo=info; amenityHitTargets.push(mesh); return mesh; }
  function box(w,h,d,color,x,y,z,rough=.75,parent=clubhouseFallback){ const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color,roughness:rough,metalness:.015}));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m; }
  const clubPos=uv(.463,.846);
  const lawn=box(4.9,.035,3.8,0x648e58,clubPos.x,.07,clubPos.z-.03,.98); lawn.rotation.y=-.10;
  const deck=box(2.65,.045,1.82,0xd9cfb7,clubPos.x-.05,.095,clubPos.z-.24,.84); deck.rotation.y=-.10;
  const club=box(2.10,.68,1.12,0xe8dfcd,clubPos.x,.40,clubPos.z+.42,.64); club.rotation.y=-.10;
  const wing=box(1.00,.46,.76,0xd8c9ae,clubPos.x+1.12,.30,clubPos.z+.12,.70); wing.rotation.y=-.10;
  const roof=box(2.38,.10,1.34,0x5a4d3c,clubPos.x,.80,clubPos.z+.42,.76); roof.rotation.y=-.10;
  const wingRoof=box(1.14,.08,.88,0x65523c,clubPos.x+1.12,.57,clubPos.z+.12,.78); wingRoof.rotation.y=-.10;
  const glassMat=new THREE.MeshPhysicalMaterial({color:0x78b8bf,roughness:.10,metalness:.02,transparent:true,opacity:.72,transmission:.16,thickness:.08,ior:1.45,emissive:0x163f42,emissiveIntensity:.25});
  const glazing=new THREE.Mesh(new THREE.BoxGeometry(1.76,.34,.04),glassMat); glazing.position.set(clubPos.x,.41,clubPos.z-.153); glazing.rotation.y=-.10; clubhouseFallback.add(glazing);
  const poolEdge=box(1.74,.055,1.06,0xeee4d1,clubPos.x-.28,.115,clubPos.z-.96,.70); poolEdge.rotation.y=-.10;
  const waterMat=new THREE.MeshPhysicalMaterial({color:0x49b7c8,roughness:.06,metalness:.02,transparent:true,opacity:.88,transmission:.10,clearcoat:.82,clearcoatRoughness:.08,emissive:0x0c4650,emissiveIntensity:.32});
  const pool=new THREE.Mesh(new THREE.BoxGeometry(1.48,.025,.82),waterMat); pool.position.set(clubPos.x-.28,.155,clubPos.z-.96); pool.rotation.y=-.10; pool.receiveShadow=true; clubhouseFallback.add(pool);
  // Warm architectural strips make the clubhouse read clearly in dusk/night modes.
  const clubGlowMat=new THREE.MeshStandardMaterial({color:0xffd88a,emissive:0xffa53c,emissiveIntensity:1.7,roughness:.45});
  for(const dx of [-.72,0,.72]){ const g=box(.42,.035,.035,0xffd88a,clubPos.x+dx,.58,clubPos.z-.19,.45); g.material=clubGlowMat; }
  // Minimal pergola for a premium presentation without redefining the source amenity footprint.
  for(const dx of [-.52,-.17,.17,.52]) box(.035,.50,.035,0x765b3c,clubPos.x+dx,.33,clubPos.z-1.56,.72);
  for(const dz of [-1.73,-1.50,-1.27]) box(1.20,.035,.035,0x765b3c,clubPos.x,.59,clubPos.z+dz,.72);
  // Make the complete clubhouse/pool visual cluster clickable without changing its source-faithful footprint.
  // Architectural-detail pass: stone feature wall, floating canopy, shaded terrace and soft uplighting.
  const stoneMat=new THREE.MeshStandardMaterial({color:0x9e8d73,roughness:.87,metalness:.01});
  const timberMat=new THREE.MeshStandardMaterial({color:0x5f4632,roughness:.62,metalness:.025});
  const canopyMat=new THREE.MeshStandardMaterial({color:0x312f2a,roughness:.52,metalness:.16});
  const featureWall=new THREE.Mesh(new THREE.BoxGeometry(.24,.82,.94),stoneMat); featureWall.position.set(clubPos.x-.96,.43,clubPos.z+.28); featureWall.rotation.y=-.10; featureWall.castShadow=true; clubhouseFallback.add(featureWall);
  const canopy=new THREE.Mesh(new THREE.BoxGeometry(2.72,.075,1.02),canopyMat); canopy.position.set(clubPos.x+.18,.91,clubPos.z+.06); canopy.rotation.y=-.10; canopy.castShadow=true; clubhouseFallback.add(canopy);
  for(const dx of [-.92,.92]){ const col=new THREE.Mesh(new THREE.BoxGeometry(.055,.64,.055),timberMat); col.position.set(clubPos.x+dx,.39,clubPos.z-.53); col.rotation.y=-.10; col.castShadow=true; clubhouseFallback.add(col); }
  const terrace=new THREE.Mesh(new THREE.BoxGeometry(2.35,.028,.56),new THREE.MeshStandardMaterial({color:0xbda985,roughness:.82})); terrace.position.set(clubPos.x+.12,.13,clubPos.z-.78); terrace.rotation.y=-.10; terrace.receiveShadow=true; clubhouseFallback.add(terrace);
  for(const dx of [-.72,0,.72]){ const uplight=new THREE.PointLight(0xffb75d,.26,1.7,2.2); uplight.position.set(clubPos.x+dx,.24,clubPos.z-.22); clubhouseFallback.add(uplight); }
  clubhouseFallback.traverse(obj=>{ if(obj.isMesh) tagAmenity(obj); });

  // If a web-optimized Blender model is later dropped at this path, it replaces only the
  // conceptual vertical clubhouse treatment; the source amenity anchor and interactions remain.
  tryLoadGLB({name:'clubhouse',url:'./models/clubhouse.glb',parent:amenityGroup,position:new THREE.Vector3(clubPos.x,.07,clubPos.z),rotationY:-.10,scale:1,fallbackGroup:clubhouseFallback,onLoaded:model=>model.traverse(o=>{if(o.isMesh)tagAmenity(o);})});

  // ---- Main township entry gate ----
  // IMPORTANT: this is anchored to the actual ENTRY annotation on the supplied PDF,
  // at the east-side access connecting the township to the proposed 6-lane road.
  // The previous prototype incorrectly placed the gate at the southern tip of the site.
  const entranceGroup=new THREE.Group(); world.add(entranceGroup);
  const entranceFallback=new THREE.Group(); entranceGroup.add(entranceFallback);
  const MAIN_ENTRY_UV=[0.655329,0.540730]; // exact normalized position from PDF text geometry
  const gatePos=uv(MAIN_ENTRY_UV[0],MAIN_ENTRY_UV[1]);
  const gateMat=new THREE.MeshStandardMaterial({color:0xc9b892,roughness:.78,metalness:.01});
  // The entry road runs roughly west-east here, so the gate spans it north-south.
  for(const dz of [-.55,.55]){
    const p=new THREE.Mesh(new THREE.BoxGeometry(.13,1.05,.16),gateMat);
    p.position.set(gatePos.x,.48,gatePos.z+dz); p.castShadow=true; entranceFallback.add(p);
  }
  const beam=new THREE.Mesh(new THREE.BoxGeometry(1.28,.16,.18),gateMat);
  beam.position.set(gatePos.x,1.0,gatePos.z); beam.rotation.y=Math.PI/2; beam.castShadow=true; entranceFallback.add(beam);

  // Premium gate fins, landscaped plinths and brand sign; still anchored to exact PDF ENTRY point.
  const darkGateMat=new THREE.MeshStandardMaterial({color:0x343634,roughness:.48,metalness:.24});
  for(const dz of [-.55,.55]){
    const fin=new THREE.Mesh(new THREE.BoxGeometry(.08,.82,.34),darkGateMat); fin.position.set(gatePos.x-.11,.52,gatePos.z+dz); fin.castShadow=true; entranceFallback.add(fin);
    const planter=new THREE.Mesh(new THREE.BoxGeometry(.52,.16,.42),new THREE.MeshStandardMaterial({color:0xb8ab89,roughness:.90})); planter.position.set(gatePos.x-.28,.12,gatePos.z+dz); planter.castShadow=true; entranceFallback.add(planter);
  }
  const signCanvas=document.createElement('canvas'); signCanvas.width=512; signCanvas.height=128;
  const sctx=signCanvas.getContext('2d'); sctx.fillStyle='#292b25'; sctx.fillRect(0,0,512,128); sctx.strokeStyle='#d7ba66'; sctx.lineWidth=5; sctx.strokeRect(7,7,498,114);
  sctx.fillStyle='#f5e7b6'; sctx.textAlign='center'; sctx.textBaseline='middle'; sctx.font='700 54px Georgia, serif'; sctx.fillText('VEDA VASTU',256,65);
  const signTex=new THREE.CanvasTexture(signCanvas); signTex.colorSpace=THREE.SRGBColorSpace;
  const sign=new THREE.Mesh(new THREE.PlaneGeometry(.86,.22),new THREE.MeshBasicMaterial({map:signTex,transparent:false,side:THREE.DoubleSide}));
  sign.position.set(gatePos.x-.10,1.0,gatePos.z); sign.rotation.y=Math.PI/2; entranceFallback.add(sign);
  const lampMat=new THREE.MeshStandardMaterial({color:0xf4d88d,emissive:0xd7a43c,emissiveIntensity:1.15,roughness:.45});
  const lampGeo=new THREE.SphereGeometry(.055,8,6);
  // Warm guide lights follow the actual approach road immediately west of the source ENTRY marker.
  for(let i=0;i<8;i++){
    const t=i/7;
    const p=uv(MAIN_ENTRY_UV[0]-.010-.070*t, MAIN_ENTRY_UV[1]+.002*Math.sin(t*Math.PI));
    for(const side of [-1,1]){
      const l=new THREE.Mesh(lampGeo,lampMat);
      l.position.set(p.x,.26,p.z+side*.34); entranceFallback.add(l);
    }
  }

  for(const [du,dv] of [[-.012,-.016],[-.012,.016],[-.035,-.021],[-.035,.021]]){
    const p=uv(MAIN_ENTRY_UV[0]+du,MAIN_ENTRY_UV[1]+dv);
    const tr=new THREE.Mesh(palmTrunkGeo,palmTrunkMat); tr.position.set(p.x,.44,p.z); tr.castShadow=true; entranceFallback.add(tr);
    const cr=new THREE.Mesh(palmCrownGeo,palmCrownMat); cr.scale.set(1.18,.5,1.18); cr.position.set(p.x,.94,p.z); cr.castShadow=true; entranceFallback.add(cr);
  }


  // Architectural entry upgrade: low stone wings, bronze fins, warm ground washers and a
  // slender arrival canopy. All are conceptual and anchored to the exact PDF ENTRY point.
  const entryStoneMat=new THREE.MeshStandardMaterial({color:0x8d816d,roughness:.90,metalness:0});
  const bronzeMat=new THREE.MeshStandardMaterial({color:0x765d39,roughness:.45,metalness:.42});
  for(const side of [-1,1]){
    const wall=new THREE.Mesh(new THREE.BoxGeometry(.42,.34,1.12),entryStoneMat); wall.position.set(gatePos.x-.22,.18,gatePos.z+side*.94); wall.castShadow=true; entranceFallback.add(wall);
    for(let j=-2;j<=2;j++){ const fin=new THREE.Mesh(new THREE.BoxGeometry(.035,.72,.06),bronzeMat); fin.position.set(gatePos.x-.04,.47,gatePos.z+side*(.70+j*.12)); fin.castShadow=true; entranceFallback.add(fin); }
    const washer=new THREE.PointLight(0xffae54,.42,2.2,2); washer.position.set(gatePos.x-.38,.19,gatePos.z+side*.78); entranceFallback.add(washer);
  }
  const arrivalCanopy=new THREE.Mesh(new THREE.BoxGeometry(.78,.055,1.82),new THREE.MeshStandardMaterial({color:0x292c2a,roughness:.40,metalness:.30}));
  arrivalCanopy.position.set(gatePos.x-.02,.90,gatePos.z); arrivalCanopy.castShadow=true; entranceFallback.add(arrivalCanopy);

  // V8 M3A + M7: continuous asphalt arrival apron connects the source-derived internal road to the gate.
  const entryRoadGroup=new THREE.Group();world.add(entryRoadGroup);
  const entryAsphalt=new THREE.Mesh(new THREE.BoxGeometry(4.15,.055,1.34),roadTopMat);entryAsphalt.position.set(gatePos.x-1.48,.205,gatePos.z);entryAsphalt.receiveShadow=true;entryRoadGroup.add(entryAsphalt);
  const entryEdgeMat=new THREE.MeshStandardMaterial({color:0xd8d0bb,roughness:.82});for(const side of [-1,1]){const e=new THREE.Mesh(new THREE.BoxGeometry(4.15,.025,.055),entryEdgeMat);e.position.set(gatePos.x-1.48,.238,gatePos.z+side*.665);entryRoadGroup.add(e);}
  // landscaped shoulders stay outside the travel path.
  const entryPlantMat=new THREE.MeshStandardMaterial({color:0x48743f,roughness:1});for(const side of [-1,1]){for(let i=0;i<6;i++){const sh=new THREE.Mesh(new THREE.IcosahedronGeometry(.15+(i%2)*.03,1),entryPlantMat);sh.scale.set(1.4,.72,1);sh.position.set(gatePos.x-2.9+i*.48,.28,gatePos.z+side*.92);entryRoadGroup.add(sh);}}
  const entryAccentLights=[];for(const side of [-1,1]){for(let i=0;i<4;i++){const l=new THREE.PointLight(0xffb35a,0,2.8,2.1);l.position.set(gatePos.x-2.55+i*.75,.35,gatePos.z+side*.88);entryRoadGroup.add(l);entryAccentLights.push(l);}}
  tryLoadGLB({name:'entrance-gate',url:'./models/entrance-gate.glb',parent:entranceGroup,position:new THREE.Vector3(gatePos.x,.05,gatePos.z),rotationY:Math.PI/2,scale:1,fallbackGroup:entranceFallback});

  // V8 M13: amenity information targets for the premium viewer. These proxies are invisible;
  // they only make the source-anchored park and entrance easy to select in 3D.
  const parkAmenityInfo={kind:'amenity',id:'CENTRAL PARK',title:'Central Park',areaDisplay:'Source block C28',sourceFeatures:['CENTRAL PARK','C28'],focus:[centralParkPos.x,centralParkPos.z],description:'Central Park is explicitly identified in the supplied masterplan. The lawn, paths, plaza, seating, planting and lighting are premium conceptual visualization contained within that source-anchored park block.'};
  const entryAmenityInfo={kind:'amenity',id:'ENTRY',title:'Main Entrance',areaDisplay:'Source ENTRY anchor',sourceFeatures:['ENTRY'],focus:[gatePos.x,gatePos.z],description:'The entrance is anchored to the exact ENTRY notation from the supplied masterplan. Gate architecture, security elements, landscaping, connected arrival apron and architectural lighting are conceptual premium visualization treatments.'};
  const hitMat=new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false});
  const parkHit=new THREE.Mesh(new THREE.BoxGeometry(3.35,.8,2.25),hitMat);parkHit.position.set(centralParkPos.x,.46,centralParkPos.z);parkHit.rotation.y=-.11;parkHit.userData.amenityInfo=parkAmenityInfo;amenityGroup.add(parkHit);amenityHitTargets.push(parkHit);
  const entryHit=new THREE.Mesh(new THREE.BoxGeometry(2.8,1.5,2.8),hitMat);entryHit.position.set(gatePos.x,.7,gatePos.z);entryHit.userData.amenityInfo=entryAmenityInfo;amenityGroup.add(entryHit);amenityHitTargets.push(entryHit);

  // ---- Selection / interaction ----
  const selectedTop=new THREE.MeshStandardMaterial({color:0xffd56a,transparent:true,opacity:.72,roughness:.5,emissive:0x594300,emissiveIntensity:.28});
  const selectedSide=new THREE.MeshStandardMaterial({color:0xa77b22,transparent:true,opacity:.96,roughness:.72});
  const hoverTop=new THREE.MeshStandardMaterial({color:0xf2cf75,transparent:true,opacity:.34,roughness:.62});
  const hoverSide=new THREE.MeshStandardMaterial({color:0x80662f,transparent:true,opacity:.72,roughness:.85});
  let selected=null,hovered=null,selectedAmenity=null;
  function resetSelectionPanel(){
    $('selectionEyebrow').textContent='Selected plot';
    $('plotId').textContent='—'; $('plotArea').textContent='—';
    $('plotDimensions').innerHTML='Select a plot to inspect exact nearby dimension annotations.';
    $('plotRoadWidths').textContent='—'; $('plotFeatures').textContent='—';
    $('plotDesc').textContent='Click a plot or amenity in the 3D plan, or search by plot ID.';
    $('plotDimensionNote').textContent='Dimensions appear after selecting a plot.';
  }
  function setSelectedAmenity(info,focus=true){
    if(selected){selected.material=selected.userData.normalMaterials;selected.position.y=0;selected=null;}
    selectedAmenity=info;
    $('selectionEyebrow').textContent='Selected amenity';
    $('plotId').textContent=info.title || info.id;
    $('plotArea').textContent=info.areaDisplay || 'Not stated in PDF';
    $('plotDimensions').innerHTML='<span class="muted">No architectural elevation/dimension is inferred beyond what is explicitly stated in the source PDF.</span>';
    $('plotRoadWidths').textContent='Not individually stated for the amenity.';
    $('plotFeatures').innerHTML=(info.sourceFeatures||[]).map(t=>`<span class="source-chip">${t}</span>`).join('');
    $('plotDesc').textContent=info.description;
    $('plotDimensionNote').textContent='Source-faithful amenity location; 3D architecture and lighting are conceptual visual enhancements.';
    $('plotSearch').value='';
    if(focus){ const fp=info.focus||[clubPos.x,clubPos.z]; targetGoal.set(fp[0],0,fp[1]); radiusGoal=Math.min(radiusGoal,info.id==='ENTRY'?18:20); phiGoal=.72; }
    requestRender();
  }
  function setSelected(mesh,focus=true){
    if(selected){selected.material=selected.userData.normalMaterials;selected.position.y=0}
    selected=mesh; selectedAmenity=null;
    if(!mesh){ resetSelectionPanel(); return; }
    $('selectionEyebrow').textContent='Selected plot';
    $('plotDimensionNote').textContent='Dimensions below are exact PDF annotations spatially associated with the selected plot.';
    if(hovered===mesh)hovered=null;
    mesh.material=[selectedTop,selectedSide];mesh.position.y=.22;
    $('plotId').textContent=mesh.userData.id;
    $('plotArea').textContent=mesh.userData.areaDisplay || 'Not individually stated';
    const dims=mesh.userData.pdfDimensionsNearby||[];
    $('plotDimensions').innerHTML=dims.length ? dims.map((d,i)=>`<span class="source-chip">Side ${i+1}: ${d.text}</span>`).join('') : '<span class="muted">No exact side annotation could be confidently associated with this polygon.</span>';
    const roads=mesh.userData.pdfRoadWidthsNearby||[];
    $('plotRoadWidths').innerHTML=roads.length ? roads.map(d=>`<span class="source-chip">${d.text}</span>`).join('') : 'No nearby road-width label matched.';
    const feats=mesh.userData.pdfFeaturesNearby||[];
    $('plotFeatures').innerHTML=feats.length ? feats.map(d=>`<span class="source-chip">${d.text}</span>`).join('') : '—';
    $('plotDesc').textContent=`Sector ${mesh.userData.sector} · exact plot polygon extracted from the supplied PDF.${mesh.userData.areaDisplay ? ' Area is read from the PDF text layer.' : ' This plot does not have a confidently matched individual area annotation in the source.'} Side values shown below are exact PDF text annotations spatially associated with the clicked polygon; no aspect-ratio dimensions are generated.`;
    $('plotSearch').value=mesh.userData.id;
    if(focus){ const [u,v]=mesh.userData.label; targetGoal.set((u-.5)*planW,0,(v-.5)*planH); radiusGoal=Math.min(radiusGoal,28); phiGoal=.70; }
    requestRender();
  }
  function setHover(mesh){
    if(mesh===hovered) return;
    if(hovered&&hovered!==selected){hovered.material=hovered.userData.normalMaterials;hovered.position.y=0}
    hovered=mesh;
    if(mesh&&mesh!==selected){mesh.material=[hoverTop,hoverSide];mesh.position.y=.075;renderer.domElement.style.cursor='pointer'}
    else renderer.domElement.style.cursor=mesh?'pointer':'grab';
    requestRender();
  }

  // ---- Camera controller ----
  const target=new THREE.Vector3(0,0,0),targetGoal=new THREE.Vector3(0,0,0);
  let theta=.77,phi=.88,radius=69,thetaGoal=theta,phiGoal=phi,radiusGoal=radius;
  function applyCamera(){
    theta+=(thetaGoal-theta)*.13; phi+=(phiGoal-phi)*.13; radius+=(radiusGoal-radius)*.13; target.lerp(targetGoal,.13);
    const sp=Math.sin(phi); camera.position.set(target.x+radius*sp*Math.sin(theta),target.y+radius*Math.cos(phi),target.z+radius*sp*Math.cos(theta)); camera.lookAt(target);
    labelGroup.visible=!annotationPlane.visible && radius<115;
    // Distance-aware label scaling keeps text comfortably readable at overview distance,
    // yet prevents labels from becoming huge when zooming close or far away.
    const ls=THREE.MathUtils.clamp(radius/69,.20,1.14);
    if(Math.abs((labelGroup.userData.lastScale||0)-ls)>.015){
      labelGroup.userData.lastScale=ls;
      labelGroup.children.forEach(sp=>sp.scale.set(LABEL_BASE_W*ls,LABEL_BASE_H*ls,1));
    }
  }
  const viewIds=['view3d','viewTop','viewHero','viewEntrance','viewPark'];
  function setActiveView(id){viewIds.forEach(v=>$(v)?.classList.toggle('active',v===id));}
  function set3D(){thetaGoal=.77;phiGoal=.88;radiusGoal=69;targetGoal.set(0,0,0);setActiveView('view3d');requestRender()}
  function setTop(){thetaGoal=0;phiGoal=.025;radiusGoal=76;targetGoal.set(0,0,0);setActiveView('viewTop');requestRender()}
  function setHero(){thetaGoal=.74;phiGoal=.73;radiusGoal=58;targetGoal.set(0,0,3.2);setActiveView('viewHero');requestRender()}
  function setEntranceView(){thetaGoal=-1.47;phiGoal=.84;radiusGoal=13.8;targetGoal.set(gatePos.x-.55,.18,gatePos.z);setActiveView('viewEntrance');requestRender()}
  function setParkView(){thetaGoal=.82;phiGoal=.69;radiusGoal=13.5;targetGoal.set(centralParkPos.x,.12,centralParkPos.z);setActiveView('viewPark');requestRender()}
  $('view3d').addEventListener('click',set3D); $('viewTop').addEventListener('click',setTop); $('viewHero').addEventListener('click',setHero); $('viewEntrance').addEventListener('click',setEntranceView); $('viewPark').addEventListener('click',setParkView); $('reset').addEventListener('click',()=>{setSelected(null,false);set3D()});

  // ---- Orbit + pan controller ----
  // Default: left-drag pans the masterplan like a map. Turn Move off, or use right/Alt-drag, to orbit.
  // Touch: one finger pans; two fingers pan + pinch zoom.
  let moveMode=true;
  const moveBtn=$('moveMode');
  function syncMoveMode(){
    moveBtn.classList.toggle('active',moveMode);
    moveBtn.textContent=moveMode?'Move: ON':'Move';
    renderer.domElement.style.cursor=moveMode?'move':(hovered?'pointer':'grab');
  }
  moveBtn.addEventListener('click',()=>{moveMode=!moveMode;syncMoveMode()});
  renderer.domElement.addEventListener('contextmenu',e=>e.preventDefault());

  function panCamera(dx,dy){
    // Convert screen-space drag to movement on the masterplan X/Z plane.
    const h=Math.max(1,renderer.domElement.clientHeight);
    const worldPerPixel=(2*radiusGoal*Math.tan(THREE.MathUtils.degToRad(camera.fov*.5)))/h;
    const forward=new THREE.Vector3(); camera.getWorldDirection(forward); forward.y=0;
    if(forward.lengthSq()<1e-8)forward.set(0,0,-1); else forward.normalize();
    const right=new THREE.Vector3().crossVectors(forward,camera.up).normalize();
    // Dragging the pointer moves the plan with the pointer, like a map.
    targetGoal.addScaledVector(right,-dx*worldPerPixel);
    targetGoal.addScaledVector(forward,dy*worldPerPixel);
    const margin=6;
    targetGoal.x=THREE.MathUtils.clamp(targetGoal.x,-planW*.5-margin,planW*.5+margin);
    targetGoal.z=THREE.MathUtils.clamp(targetGoal.z,-planH*.5-margin,planH*.5+margin);
    requestRender();
  }

  let pointerDown=false,moved=false,lastX=0,lastY=0,dragAction='orbit';
  const activePointers=new Map();
  let pinchDist=0,pinchMid=null;
  renderer.domElement.addEventListener('pointerdown',e=>{
    renderer.domElement.setPointerCapture(e.pointerId);
    activePointers.set(e.pointerId,[e.clientX,e.clientY]);
    pointerDown=true;moved=false;lastX=e.clientX;lastY=e.clientY;
    dragAction=(e.button===2||e.altKey||(!moveMode&&e.button===0))?'orbit':'pan';
    renderer.domElement.style.cursor=dragAction==='pan'?'move':'grabbing';
  });
  renderer.domElement.addEventListener('pointermove',e=>{
    if(activePointers.has(e.pointerId))activePointers.set(e.pointerId,[e.clientX,e.clientY]);
    if(activePointers.size===2){
      const a=[...activePointers.values()];
      const d=Math.hypot(a[0][0]-a[1][0],a[0][1]-a[1][1]);
      const mid=[(a[0][0]+a[1][0])*.5,(a[0][1]+a[1][1])*.5];
      if(pinchDist)radiusGoal=Math.max(1.15,radiusGoal*(pinchDist/d));
      if(pinchMid)panCamera(mid[0]-pinchMid[0],mid[1]-pinchMid[1]);
      pinchDist=d;pinchMid=mid;moved=true;return;
    }
    if(pointerDown){
      const dx=e.clientX-lastX,dy=e.clientY-lastY;
      if(Math.abs(dx)+Math.abs(dy)>2)moved=true;
      if(dragAction==='pan')panCamera(dx,dy);
      else {thetaGoal-=dx*.006;phiGoal=Math.max(.04,Math.min(1.49,phiGoal+dy*.006));requestRender();}
      lastX=e.clientX;lastY=e.clientY;return;
    }
    pickHover(e);
  });
  renderer.domElement.addEventListener('pointerup',e=>{
    activePointers.delete(e.pointerId);
    if(activePointers.size<2){pinchDist=0;pinchMid=null}
    pointerDown=activePointers.size>0;
    if(!moved&&e.button===0)pickClick(e);
    renderer.domElement.style.cursor=moveMode?'move':(hovered?'pointer':'grab');
  });
  renderer.domElement.addEventListener('pointercancel',e=>{activePointers.delete(e.pointerId);pointerDown=false;pinchDist=0;pinchMid=null});
  renderer.domElement.addEventListener('wheel',e=>{e.preventDefault();radiusGoal=Math.max(1.15,radiusGoal*Math.exp(e.deltaY*.0012));requestRender()},{passive:false});
  syncMoveMode();

  const raycaster=new THREE.Raycaster(),mouse=new THREE.Vector2();
  function rayFromEvent(e){const r=renderer.domElement.getBoundingClientRect();mouse.x=((e.clientX-r.left)/r.width)*2-1;mouse.y=-((e.clientY-r.top)/r.height)*2+1;raycaster.setFromCamera(mouse,camera)}
  let hoverRAF=0,lastHoverEvent=null;
  function pickHover(e){
    lastHoverEvent=e;
    if(hoverRAF) return;
    hoverRAF=requestAnimationFrame(()=>{
      hoverRAF=0;
      if(pointerDown||!lastHoverEvent) return;
      rayFromEvent(lastHoverEvent);
      const amenityHit=amenityGroup.visible ? raycaster.intersectObjects(amenityHitTargets,false)[0] : null;
      if(amenityHit){ setHover(null); renderer.domElement.style.cursor='pointer'; return; }
      const hit=raycaster.intersectObjects(plots,false)[0];
      setHover(hit?hit.object:null);
    });
  }
  function pickClick(e){
    rayFromEvent(e);
    if(amenityGroup.visible){
      const amenityHit=raycaster.intersectObjects(amenityHitTargets,false)[0];
      if(amenityHit && amenityHit.object.userData.amenityInfo){ setSelectedAmenity(amenityHit.object.userData.amenityInfo,true); return; }
    }
    const hit=raycaster.intersectObjects(plots,false)[0];
    if(hit)setSelected(hit.object,true);
  }

  function findPlot(){const q=$('plotSearch').value.trim().toUpperCase();if(!q)return;const found=byId.get(q);if(found&&found.length){setSelected(found[found.length-1],true);$('plotSearch').setCustomValidity('')}else{$('plotSearch').setCustomValidity('Plot ID not found in extracted PDF geometry');$('plotSearch').reportValidity()}}
  $('findPlot').addEventListener('click',findPlot); $('plotSearch').addEventListener('keydown',e=>{if(e.key==='Enter')findPlot()}); $('plotSearch').addEventListener('input',e=>e.currentTarget.setCustomValidity(''));
  function toggle(btn,obj){obj.visible=!obj.visible;btn.classList.toggle('active',obj.visible);requestRender()}
  $('togglePlan').addEventListener('click',()=>toggle($('togglePlan'),plan));
  $('toggleAnnotations').addEventListener('click',()=>{
    annotationPlane.visible=!annotationPlane.visible;
    $('toggleAnnotations').classList.toggle('active',annotationPlane.visible);
    // Avoid duplicate text: exact PDF overlay and clean 3D plot labels are mutually exclusive.
    planMat.opacity=annotationPlane.visible?EXACT_PLAN_OPACITY:CLEAN_PLAN_OPACITY;
    labelGroup.visible=!annotationPlane.visible && radius<115;
    requestRender();
  });
  $('toggleRoads').addEventListener('click',()=>{const next=!roadGroup.visible;roadGroup.visible=next;roadEdgeGroup.visible=next;roadLabelPatchGroup.visible=next;entryRoadGroup.visible=next;$('toggleRoads').classList.toggle('active',next);requestRender()});
  $('togglePlots').addEventListener('click',()=>toggle($('togglePlots'),plotGroup));
  $('toggleBase').addEventListener('click',()=>{slab.visible=!slab.visible;lip.visible=slab.visible;$('toggleBase').classList.toggle('active',slab.visible);requestRender()});
  $('toggleTrees').addEventListener('click',()=>toggle($('toggleTrees'),landscapeGroup));
  $('toggleLights').addEventListener('click',()=>{
    const next=!streetLightGroup.visible;
    streetLightGroup.visible=next; gardenLightGroup.visible=next; perimeterGlowGroup.visible=next; parkAccentLights.forEach(l=>l.visible=next); entryAccentLights.forEach(l=>l.visible=next);
    $('toggleLights').classList.toggle('active',next); requestRender();
  });
  $('toggleAmenities').addEventListener('click',()=>{amenityGroup.visible=!amenityGroup.visible;entranceGroup.visible=amenityGroup.visible;centralParkGroup.visible=amenityGroup.visible;$('toggleAmenities').classList.toggle('active',amenityGroup.visible);requestRender()});

  // Day / dusk / night visual modes. Geometry remains unchanged; only atmosphere and emissive lighting change.
  let visualMode='dusk';
  function setVisualMode(mode){
    visualMode=mode;
    const isDay=mode==='day', isNight=mode==='night';
    scene.background.set(isDay?0x5b765f:isNight?0x050b09:0x111b15);
    skyMat.uniforms.topColor.value.set(isDay?0x7690a1:isNight?0x07101a:0x263f32);
    skyMat.uniforms.horizonColor.value.set(isDay?0xd9cfae:isNight?0x17231c:0x776f55);
    skyMat.uniforms.bottomColor.value.set(isDay?0x637360:isNight?0x030706:0x0b1510);
    scene.fog.color.set(isDay?0x617764:isNight?0x07100d:0x17231a);
    scene.fog.density=isDay?.0032:isNight?.0061:.0046;
    renderer.toneMappingExposure=isDay?1.22:isNight?.64:.98;
    sun.intensity=isDay?3.6:isNight?.18:2.25;
    hemi.intensity=isDay?2.05:isNight?.34:1.35;
    fill.intensity=isDay?.62:isNight?.16:.48;
    warm.intensity=isDay?4:isNight?32:22;
    moon.intensity=isDay?.02:isNight?.72:.22;
    bulbMat.emissiveIntensity=isDay?.35:isNight?4.5:2.1;
    roadReflectorMat.emissiveIntensity=isDay?.06:isNight?3.4:1.25;
    gardenLightMat.emissiveIntensity=isDay?.08:isNight?4.0:1.35;
    perimeterGlowMat.emissiveIntensity=isDay?.05:isNight?2.2:.62;
    clubGlowMat.emissiveIntensity=isDay?.18:isNight?3.2:1.7;
    glassMat.emissiveIntensity=isDay?.05:isNight?.52:.25;
    waterMat.emissiveIntensity=isDay?.08:isNight?.55:.32;
    streetPointLights.forEach(l=>l.intensity=isDay?0:isNight?2.2:.68);
    parkAccentLights.forEach(l=>l.intensity=isDay?0:isNight?1.7:.46);
    entryAccentLights.forEach(l=>l.intensity=isDay?0:isNight?2.0:.58);
    for(const id of ['modeDay','modeDusk','modeNight']) $(id).classList.remove('active');
    $('mode'+mode[0].toUpperCase()+mode.slice(1)).classList.add('active');
    requestRender();
  }
  $('modeDay').addEventListener('click',()=>setVisualMode('day'));
  $('modeDusk').addEventListener('click',()=>setVisualMode('dusk'));
  $('modeNight').addEventListener('click',()=>setVisualMode('night'));
  setVisualMode('dusk');

  function resize(){const w=Math.max(1,host.clientWidth),h=Math.max(1,host.clientHeight);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();requestRender()}
  new ResizeObserver(resize).observe(host); resize(); applyCamera(); renderer.render(scene,camera);
  fallback.classList.add('hide'); loading.style.display='none';
  var renderQueued=false;
  function cameraStillMoving(){
    return Math.abs(thetaGoal-theta)>.0003 || Math.abs(phiGoal-phi)>.0003 || Math.abs(radiusGoal-radius)>.003 || target.distanceToSquared(targetGoal)>.000003;
  }
  function requestRender(){
    if(renderQueued) return;
    renderQueued=true;
    requestAnimationFrame(function frame(){
      renderQueued=false;
      applyCamera();
      renderer.render(scene,camera);
      if(cameraStillMoving()) requestRender();
    });
  }
  requestRender();
} catch(err){ console.error(err); fail(err.message||String(err)); }
