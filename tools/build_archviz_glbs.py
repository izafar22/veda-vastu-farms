import os, math
import numpy as np
import trimesh
from trimesh.visual.material import PBRMaterial, SimpleMaterial
from trimesh.visual.texture import TextureVisuals
from PIL import Image, ImageDraw, ImageFont

OUT='/mnt/data/veda-farms-react-threejs-integration-v5-premium-glb/public/masterplan3d/models'
os.makedirs(OUT, exist_ok=True)

def pbr(name, rgba, rough=.7, metal=.0, emissive=None, alpha_mode=None, double_sided=False):
    kw=dict(name=name, baseColorFactor=np.array(rgba, dtype=np.uint8), roughnessFactor=rough, metallicFactor=metal, doubleSided=double_sided)
    if emissive is not None:
        kw['emissiveFactor']=np.array(emissive, dtype=float)
    if alpha_mode:
        kw['alphaMode']=alpha_mode
    return PBRMaterial(**kw)

MAT={
 'lawn':pbr('Landscape lawn',[93,135,80,255],.98,0),
 'deck':pbr('Warm limestone deck',[214,202,176,255],.86,0),
 'stucco':pbr('Warm ivory stucco',[229,220,201,255],.66,.01),
 'stucco2':pbr('Sand stucco',[204,188,160,255],.72,.01),
 'stone':pbr('Natural stone',[145,130,107,255],.9,0),
 'timber':pbr('Dark timber',[92,66,46,255],.6,.03),
 'charcoal':pbr('Charcoal metal',[47,49,46,255],.42,.26),
 'bronze':pbr('Bronze accent',[119,91,52,255],.43,.46),
 'glass':pbr('Architectural glazing',[95,165,177,150],.12,.02,alpha_mode='BLEND',double_sided=True),
 'water':pbr('Pool water',[57,174,193,210],.08,.02,alpha_mode='BLEND',double_sided=True),
 'light':pbr('Warm light',[255,216,142,255],.35,.02,emissive=[1.0,.48,.12]),
 'green':pbr('Plant foliage',[51,102,61,255],.92,0),
 'green2':pbr('Palm foliage',[39,87,52,255],.9,0),
 'trunk':pbr('Palm trunk',[104,78,54,255],.88,0),
 'black':pbr('Sign face',[37,39,35,255],.55,.05),
}

def add_box(scene, name, size, pos, mat, rot_y=0):
    m=trimesh.creation.box(extents=size)
    if rot_y:
        m.apply_transform(trimesh.transformations.rotation_matrix(rot_y,[0,1,0]))
    m.apply_translation(pos)
    m.visual.material=mat
    scene.add_geometry(m, node_name=name, geom_name=name)
    return m

def add_cylinder(scene, name, radius, height, pos, mat, sections=12):
    m=trimesh.creation.cylinder(radius=radius,height=height,sections=sections)
    # trimesh cylinder axis is z; rotate to y-up
    m.apply_transform(trimesh.transformations.rotation_matrix(math.pi/2,[1,0,0]))
    m.apply_translation(pos)
    m.visual.material=mat
    scene.add_geometry(m,node_name=name,geom_name=name)
    return m

def add_sphere(scene,name,radius,pos,mat,count=None):
    m=trimesh.creation.icosphere(subdivisions=1,radius=radius)
    m.apply_translation(pos); m.visual.material=mat
    scene.add_geometry(m,node_name=name,geom_name=name)
    return m

def add_palm(scene, prefix, x,z,scale=1.0):
    add_cylinder(scene,prefix+'_trunk',.045*scale,.72*scale,(x,.36*scale,z),MAT['trunk'],10)
    # low-poly crown: overlapping flattened icospheres for readable silhouette
    for i,a in enumerate(np.linspace(0,2*math.pi,6,endpoint=False)):
        leaf=trimesh.creation.icosphere(subdivisions=1,radius=.18*scale)
        leaf.apply_scale([1.65,.38,.50])
        leaf.apply_transform(trimesh.transformations.rotation_matrix(a,[0,1,0]))
        leaf.apply_translation((x,.78*scale,z))
        leaf.visual.material=MAT['green2']
        scene.add_geometry(leaf,node_name=f'{prefix}_leaf_{i}',geom_name=f'{prefix}_leaf_{i}')

# ---------------- CLUBHOUSE ----------------
club=trimesh.Scene()
# source-anchored conceptual footprint equivalent to V4 fallback envelope
add_box(club,'landscape_plinth',(4.75,.035,3.55),(0,.017,-.03),MAT['lawn'])
add_box(club,'limestone_deck',(2.75,.055,1.78),(-.05,.065,-.25),MAT['deck'])
# main mass + wing
add_box(club,'main_volume',(2.12,.70,1.14),(0,.42,.42),MAT['stucco'])
add_box(club,'east_wing',(1.02,.48,.78),(1.12,.31,.12),MAT['stucco2'])
# charcoal floating roof composition
add_box(club,'main_roof',(2.52,.095,1.39),(.06,.815,.41),MAT['charcoal'])
add_box(club,'wing_roof',(1.18,.075,.91),(1.14,.59,.10),MAT['timber'])
# front glass broken into bays
for i,x in enumerate([-.66,-.22,.22,.66]):
    add_box(club,f'glass_bay_{i}',(.39,.36,.025),(x,.42,-.158),MAT['glass'])
# feature stone wall and timber fins
add_box(club,'stone_feature_wall',(.26,.84,.95),(-.96,.44,.28),MAT['stone'])
for i,z in enumerate([-.02,.16,.34,.52]):
    add_box(club,f'timber_fin_{i}',(.045,.64,.055),(-.81,.38,z),MAT['timber'])
# floating arrival canopy + columns
add_box(club,'arrival_canopy',(2.75,.075,1.03),(.18,.92,.06),MAT['charcoal'])
for i,x in enumerate([-.92,.92]):
    add_box(club,f'canopy_column_{i}',(.06,.65,.06),(x,.405,-.53),MAT['timber'])
# shaded terrace
add_box(club,'terrace',(2.38,.03,.58),(.12,.115,-.79),MAT['stone'])
# pool surround / water (local z negative, same as V4)
add_box(club,'pool_surround',(1.78,.06,1.08),(-.28,.10,-1.02),MAT['deck'])
add_box(club,'pool_water',(1.52,.025,.84),(-.28,.145,-1.02),MAT['water'])
# stepping slabs toward pool
for i,x in enumerate([-.92,-.55,-.18,.19,.56]):
    add_box(club,f'step_{i}',(.25,.025,.30),(x,.085,-1.52),MAT['stone'])
# pergola
for i,x in enumerate([-.52,-.17,.17,.52]):
    add_box(club,f'pergola_post_{i}',(.04,.52,.04),(x,.34,-1.59),MAT['timber'])
for i,z in enumerate([-1.77,-1.59,-1.41]):
    add_box(club,f'pergola_beam_{i}',(1.22,.04,.045),(0,.61,z),MAT['timber'])
# warm façade linear lights
for i,x in enumerate([-.70,0,.70]):
    add_box(club,f'warm_strip_{i}',(.43,.032,.035),(x,.58,-.185),MAT['light'])
# planters / shrubs
for i,(x,z) in enumerate([(-1.65,.84),(1.75,.62),(-1.68,-.72),(1.66,-1.00)]):
    add_box(club,f'planter_{i}',(.46,.18,.46),(x,.11,z),MAT['stone'])
    shrub=trimesh.creation.icosphere(subdivisions=1,radius=.20)
    shrub.apply_scale([1.0,.78,1.0]); shrub.apply_translation((x,.31,z)); shrub.visual.material=MAT['green']
    club.add_geometry(shrub,node_name=f'shrub_{i}',geom_name=f'shrub_{i}')
# palms at edge, lightweight
add_palm(club,'club_palm_w',-1.88,.28,.78)
add_palm(club,'club_palm_e',1.88,-.30,.72)
club_path=os.path.join(OUT,'clubhouse.glb')
club.export(club_path)

# ---------------- ENTRANCE GATE ----------------
gate=trimesh.Scene()
# local X is gate span; app rotates full asset +90 deg around Y to align with source entry road
# stone wing walls
for side in (-1,1):
    x=side*1.04
    add_box(gate,f'stone_wing_{side}',(.92,.34,.42),(x,.18,0),MAT['stone'])
    # bronze fins rising above wing wall
    for j in range(5):
        fx=side*(.70+j*.13)
        add_box(gate,f'bronze_fin_{side}_{j}',(.055,.72,.055),(fx,.47,-.05),MAT['bronze'])
# primary piers
for side in (-1,1):
    x=side*.58
    add_box(gate,f'primary_pier_{side}',(.18,1.10,.20),(x,.55,0),MAT['stone'])
    add_box(gate,f'dark_fin_{side}',(.32,.86,.09),(x,.56,-.12),MAT['charcoal'])
    add_box(gate,f'planter_{side}',(.44,.16,.50),(x,.10,.31),MAT['deck'])
# overhead beam and floating canopy
add_box(gate,'entry_beam',(1.34,.17,.20),(0,1.04,0),MAT['stone'])
add_box(gate,'floating_canopy',(1.86,.06,.82),(0,.93,-.02),MAT['charcoal'])
# central sign housing oriented vertical plane toward approach
add_box(gate,'sign_housing',(.92,.28,.075),(0,1.03,-.135),MAT['black'])
add_box(gate,'sign_border_top',(.92,.025,.082),(0,1.165,-.138),MAT['bronze'])
add_box(gate,'sign_border_bottom',(.92,.025,.082),(0,.895,-.138),MAT['bronze'])
add_box(gate,'sign_border_l',(.025,.28,.082),(-.447,1.03,-.138),MAT['bronze'])
add_box(gate,'sign_border_r',(.025,.28,.082),(.447,1.03,-.138),MAT['bronze'])
# Abstract V monogram so GLB has identifiable branding without font dependencies
for side in (-1,1):
    bar=trimesh.creation.box(extents=(.035,.16,.025))
    bar.apply_transform(trimesh.transformations.rotation_matrix(side*math.radians(24),[0,0,1]))
    bar.apply_translation((side*.035,1.035,-.181)); bar.visual.material=MAT['light']
    gate.add_geometry(bar,node_name=f'v_monogram_{side}',geom_name=f'v_monogram_{side}')
# bollard guide lights extending along local Z (becomes approach after app rotation)
for row_z in [.52,.82,1.12,1.42]:
    for side in (-1,1):
        x=side*.47
        add_cylinder(gate,f'bollard_{row_z}_{side}',.026,.18,(x,.09,row_z),MAT['charcoal'],8)
        add_sphere(gate,f'bollard_light_{row_z}_{side}',.036,(x,.19,row_z),MAT['light'])
# integrated landscape palms
for prefix,x,z,s in [('palm_l1',-1.35,.30,.72),('palm_l2',-1.62,.72,.62),('palm_r1',1.35,.30,.72),('palm_r2',1.62,.72,.62)]:
    add_palm(gate,prefix,x,z,s)
# low shrubs near plinths
for i,(x,z) in enumerate([(-.92,.35),(.92,.35),(-1.30,-.30),(1.30,-.30)]):
    sh=trimesh.creation.icosphere(subdivisions=1,radius=.16); sh.apply_scale([1.25,.68,1.0]); sh.apply_translation((x,.16,z)); sh.visual.material=MAT['green']; gate.add_geometry(sh,node_name=f'gate_shrub_{i}',geom_name=f'gate_shrub_{i}')

gate_path=os.path.join(OUT,'entrance-gate.glb')
gate.export(gate_path)

# verification
for p in [club_path,gate_path]:
    s=trimesh.load(p,force='scene')
    print(os.path.basename(p), 'geometries=',len(s.geometry),'bounds=',np.round(s.bounds,3).tolist(),'bytes=',os.path.getsize(p))
