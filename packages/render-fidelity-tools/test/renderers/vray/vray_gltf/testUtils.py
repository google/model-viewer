import vray
import math
from .Gltf_Parser import cameraUtils as camUtils


def _set_testing_material(renderer,node):
	#make default material for testing
	testTexture = renderer.classes.TexEdges()
	testTexture.edges_tex = vray.AColor(1,0.0,0.0,1)
	testTexture.bg_tex = vray.AColor(0.3481481, 0.8, 0.3481481, 1)
	testTexture.width_type = 1
	testTexture.pixel_width = 1

	testBRDF = renderer.classes.BRDFVRayMtl()
	testBRDF.diffuse = testTexture	
	#testBRDF.reflect = vray.AColor(0.5,0.8,0.4, 0.01)
	#testBRDF.refract = vray.AColor(0.5,0.8,0.4, 0.01)
	#print(testBRDF.option_use_roughness)
	testBRDF.fresnel = True
	material = renderer.classes.MtlSingleBRDF()
	material.brdf = testBRDF
	material.double_sided = True
	node.material = material

def rotateCamera(renderView,x,y,z,s=1):

	mS = vray.Matrix(s)
	mX = vray.Matrix.makeRotationMatrixX(x)
	mY = vray.Matrix.makeRotationMatrixY(y)
	mZ = vray.Matrix.makeRotationMatrixZ(z)
	transform = vray.Transform(mS * mZ * mY * mX, renderView.transform.offset)
	renderView.transform = transform


def moveCamera(renderView,x = 0,y = 0,z = 0):
	# By changing RenderView's transform we move the camera.

	# Obtain a copy of the renderView transform.
	updatedTransform = renderView.transform

	# Modify the copy of the renderView transform.
	# The changes do not affect the scene directly since
	# updatedTransform is a copy of the actual transform.
	updatedTransform = updatedTransform.replaceOffset(vray.Vector(
		updatedTransform.offset.x + x,
		updatedTransform.offset.y + y,
		updatedTransform.offset.z - z
	))

	# Update the transform value in renderView (applying the changes above).
	renderView.transform = updatedTransform
def make_transform(rotX=0, rotY=0, rotZ=0, scale=1, offset=vray.Vector(0.0,0.0,0.0)):
	"""Creates a transform with the specified rotation and scale.
	"""
	mS = vray.Matrix(scale)
	mX = vray.Matrix.makeRotationMatrixX(rotX)
	mY = vray.Matrix.makeRotationMatrixY(rotY)
	mZ = vray.Matrix.makeRotationMatrixZ(rotZ)
	transform = vray.Transform(mS * mZ * mY * mX, offset)
	return transform

#testing for default camera
def camera_look_at(pos,offset_camera = vray.Vector(0.03, 0.015, 0.01)):
	dist_vec = pos
	dir_default = vray.Vector(0.0, 0.0, -1.0)
	dir_point = dist_vec.normalize()

	rot_angl = math.acos(dir_default * dir_point)

	rot_axis = (dir_default ^ dir_point)
	#offset_camera = (dir_point*-1) * ( 2*dist_vec.length())
	camTrans = make_transform(math.radians(rot_angl*rot_axis.x)+math.pi/2,math.radians(rot_angl*rot_axis.z), math.radians(rot_angl*rot_axis.y)+math.pi/1.5 ,1,offset_camera)
	print(offset_camera)
	print(rot_axis)
	print(rot_angl)
	#exit()
	return camTrans
	
def setup_scene(renderer, obj_diameter, lookat = None,camTransform = None,has_camera = False):
	"""Sets up a scene with camera and light.
	"""
	#if has_camera == False:
		# renderView = renderer.classes.RenderView()
		# renderView.fov = math.pi/2
		# #x right
		# #y up
		# # -z forward
		

		# cam_z = 0.8/2/math.tan(renderView.fov/2)
		# #cam_z = abs(0.8*math.tan(renderView.fov/2))
		# camPos = vray.Vector(0.0,0.5, cam_z)
		# camRot = camUtils.camera_look_at(camPos,vray.Vector(0,0,0),vray.Vector(0,0,1))
		# #print(camRot)
		# #exit()
		# camTransform = make_transform(camRot.x,camRot.y,0.0, 1, camPos)
		# #camTransform = make_transform(-math.pi/8,math.pi/8,0.0, 1, camPos)
		# renderView.transform = camTransform#camera_look_at(lookat/1000000)
		
	dome = renderer.classes.LightDome()
	dome.intensity = 0.5
	
	#place a light over and slightly behind the camera


	return None
