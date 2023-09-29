import numpy as np
import math
import vray

#returns rotational axis* rotational angle vec3 to rotate the camera to a specific point
#takes vray.Vector
def camera_look_at(from_vec,to_vec,camera_facing_dir = vray.Vector(0.0,0.0,-1.0)):
	dist_vec = from_vec - to_vec

	directionA = camera_facing_dir.normalize()
	directionB = dist_vec.normalize()

	rotAngle = math.acos(directionA*directionB)

	rotAxis = (directionA^directionB).normalize()

	return rotAxis*rotAngle

def make_transform(rotX=0, rotY=0, rotZ=0, scale=1, offset=vray.Vector(0.0,0.0,0.0)):
	"""Creates a transform with the specified rotation and scale.
	"""
	mS = vray.Matrix(scale)
	mX = vray.Matrix.makeRotationMatrixX(rotX)
	mY = vray.Matrix.makeRotationMatrixY(rotY)
	mZ = vray.Matrix.makeRotationMatrixZ(rotZ)
	transform = vray.Transform(mS * mZ * mY * mX, offset)
	return transform
#the biggest distance from 0.0 be it x,y or z
#angle around the 0.0 as in rotating the camera around 0.0
# view - one of 'front', 'top', 'right', 'back', 'bottom', 'left'
def set_up_default_camera(renderer, minSceneBound, maxSceneBound, look_at = vray.Vector(0,0,0), rot_angles = (0.0,0.0,0.0), 
							fov = math.pi/2, cam_moffset = (-0.5,0.1,0.0),default_cam_pos = None,zoom = 1.0, view='front'):
	renderView = renderer.classes.RenderView()
	renderView.fov = fov

	diag=maxSceneBound-minSceneBound
	diagLen=diag.length()
	max_pos_val=diagLen
	print("Default Camera looking at : " + str(look_at))
	if default_cam_pos != None:
		camPos = vray.Vector(default_cam_pos[0], default_cam_pos[1], default_cam_pos[2])
		camUp=vray.Vector(0,1,0)
	else:
		if view=='auto':
			if diag.y<diag.x and diag.y<diag.z:
				view='top'
			elif diag.z>diag.x*1.2:
				view='right'
			else:
				view='front'

		if view=='front':
			camPos=vray.Vector(minSceneBound.x+diag.x*0.5, minSceneBound.y+diag.y*0.5, maxSceneBound.z)
			upVec=vray.Vector(0,1,0)
		elif view=='top':
			camPos=vray.Vector(minSceneBound.x+diag.x*0.5, maxSceneBound.y, minSceneBound.z+diag.z*0.5)
			upVec=vray.Vector(0,0,-1)
		elif view=='right':
			camPos=vray.Vector(maxSceneBound.x, minSceneBound.y+diag.y*0.5, minSceneBound.z+diag.z*0.5)
			upVec=vray.Vector(0,1,0)
		elif view=='back':
			camPos=vray.Vector(minSceneBound.x+diag.x*0.5, minSceneBound.y+diag.y*0.5, minSceneBound.z)
			upVec=vray.Vector(0,1,0)
		elif view=='bottom':
			camPos=vray.Vector(minSceneBound.x+diag.x*0.5, minSceneBound.y, minSceneBound.z+diag.z*0.5)
			upVec=vray.Vector(0,0,1)
		elif view=='left':
			camPos=vray.Vector(minSceneBound.x, minSceneBound.y+diag.y*0.5, minSceneBound.z+diag.z*0.5)
			upVec=vray.Vector(0,1,0)
		else:
			upVec=vray.Vector(0,1,0)
			if (diag.x>diag.z):
				camPos=vray.Vector(minSceneBound.x+diag.x*0.5, minSceneBound.y+diag.y*0.5, maxSceneBound.z)
			else:
				camPos=vray.Vector(maxSceneBound.x, minSceneBound.y+diag.y*0.5, minSceneBound.z+diag.z*0.5)

		camDist=diagLen*0.5/math.sin(fov*0.5)
		camDiff=camPos-look_at
		camPos=look_at+camDiff*camDist*(1.0+cam_moffset[2])/camDiff.length()
		camRight=(upVec^camDiff).normalize()
		camUp=(camDiff^camRight).normalize()
		camPos+=camDist*camRight*cam_moffset[0]
		camPos+=camDist*camUp*cam_moffset[1]

	mX = vray.Matrix.makeRotationMatrixX(math.radians(rot_angles[0]))
	mY = vray.Matrix.makeRotationMatrixY(math.radians(rot_angles[1]))
	mZ = vray.Matrix.makeRotationMatrixZ(math.radians(rot_angles[2]))
	camPos=camPos*mX*mY*mZ

	camZ=(camPos-look_at).normalize()
	camX=(camUp^camZ).normalize()
	camY=(camZ^camX).normalize()
	camTransform=vray.Transform(vray.Matrix(camX, camY, camZ), camPos)

	renderView.transform = camTransform
	return camTransform