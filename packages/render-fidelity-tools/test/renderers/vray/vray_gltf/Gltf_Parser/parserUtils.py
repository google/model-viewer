import builtins
import vray
import numpy as np
import math
import pyquaternion as pyq

from numba import jit


def none_to_zero(value = None):
	if value == None:
		return 0
	else:
		return value

def none_to_val(value = None, r_value = 0):
	if value == None:
		return r_value
	else:
		return value

def quaternion_to_euler_angle_vectorized1(w, x, y, z):
	ysqr = y * y

	t0 = +2.0 * (w * x + y * z)
	t1 = +1.0 - 2.0 * (x * x + ysqr)
	X = np.degrees(np.arctan2(t0, t1))

	t2 = +2.0 * (w * y - z * x)

	t2 = np.clip(t2, a_min=-1.0, a_max=1.0)
	Y = np.degrees(np.arcsin(t2))

	t3 = +2.0 * (w * z + x * y)
	t4 = +1.0 - 2.0 * (ysqr + z * z)
	Z = np.degrees(np.arctan2(t3, t4))

	return X, Y, Z

def make_transform(rotX=0, rotY=0, rotZ=0, scale=1, offset=vray.Vector()):
	"""Creates a transform with the specified rotation and scale.
	"""
	mS = vray.Matrix(scale)
	mX = vray.Matrix.makeRotationMatrixX(rotX)
	mY = vray.Matrix.makeRotationMatrixY(rotY)
	mZ = vray.Matrix.makeRotationMatrixZ(rotZ)
	transform = vray.Transform(mS * mZ * mY * mX, offset)
	return transform

def _get_str_path(file_path):
	return file_path[:file_path.rfind('\\')+1]


def get_frame_from_time(fps = 30.0, time = 0.0):
	return math.floor(fps*time)

#t = [0;1]
@jit(nopython=True)
def lerp(x,y,t):

	return (x* (1.0 - t)) + (y * t)

	
def vray_rot_mat(renderer,_list):
	x,y,z = quaternion_to_euler_angle_vectorized1(_list[3],_list[0],_list[1],_list[2])
	mX = vray.Matrix.makeRotationMatrixX(math.radians(x))
	mY = vray.Matrix.makeRotationMatrixY(math.radians(y))
	mZ = vray.Matrix.makeRotationMatrixZ(math.radians(z))
	return (mZ*mY*mX)

def __quat_dot(left,right):
	return left[1] * right[1] + left[2] * right[2] + left[3] * right[3] + left[0] * right[0]
	
def _norm_quat(quat):
	pass

def quat_slerp(quat1,quat2,t):
	quat1 = quat1.unit
	quat2 = quat2.unit

	quat_dot = __quat_dot(quat1,quat2)

	if quat_dot < 0.0:
		quat2 = -quat2
		quat_dot = -quat_dot
	
	if quat_dot > 0.9995:
		res = pyq.Quaternion()
		res = res.unit
		return res
	
	theta_0 = math.acos(quat_dot)
	theta = theta_0 * t
	sin_theta = math.sin(theta)
	sin_theta_0 = math.sin(theta_0)

	s1 = math.cos(theta) - quat_dot*sin_theta/sin_theta_0
	s2 = sin_theta / sin_theta_0

	return (s1 * quat1) + (s2 * quat2)

def get_lerp_time(c_time,t1,t2):
	return np.clip((c_time - t1) / (t2 - t1),0.0,1.0)

# Cubic Hermite spline 
# t is [0;1]
# delta_time is the time between 2 keyframes, used to scale the tangents
def _spline(previousPoint,previousTangent, nextPoint, nextTangent, t = 0, delta_time = 0):
	previousTangent = previousTangent * delta_time
	nextTangent = nextTangent * delta_time

	t2 = t*t
	t3 = t2*t

	return (2 * t3 - 3 * t2 + 1) * previousPoint + (t3 - 2 * t2 + t) * previousTangent + (-2 * t3 + 3 * t2) * nextPoint + (t3 - t2) * nextTangent;

class Accessor:
		
	def __init__(self, bufferViewID, byteOffset = None, dataType = None, compType = None, count = None, dataMin = None, dataMax = None, sparse_dict = None):
		self.bufferViewID = bufferViewID
		self.byteOffset = byteOffset
		self.type = dataType
		self.compType = compType
		self.count = count
		self.min = dataMin
		self.max = dataMax
		self.sparse = sparse_dict
		
		#data set throgh parsing to not repeat the same checks twice
		#data filled from the apropriate bin file
		self.data = []


	@classmethod
	def fromDict(cls,dict):
		return cls(dict.get('bufferView'),
			dict.get('byteOffset'),
			dict.get('type'),
			dict.get('componentType'),
			dict.get('count'),
			dict.get('min'),
			dict.get('max'),
			dict.get('sparse'))

	#ONLY FOR DEBUGGING PURPOSES, STR() IS SLOW
	def __str__(self):
		return ("bufferView : " + str(self.bufferViewID) + "\n" +
				"byteOffset : " + str(self.byteOffset) + "\n" +
				"type : " + str(self.type) + "\n" +
				"componentType : " + str(self.compType) + "\n" +
				"count : " + str(self.count) + "\n" +
				"min : " + str(self.min) + "\n" +
				"max : " + str(self.max) + "\n")


class SparseAccessor:

	def __init__(self,type,componentType,count,sparseDataCount,valuesBufferView,indicesBufferView,indicesComponentType):
		pass

class BufferView:

	def __init__(self,bufferID,byteOffset,byteLength,byteStride,target):
		self.bufferID = bufferID
		self.byteOffset = byteOffset
		self.byteLength = byteLength
		self.byteStride = byteStride
		self.target = target


	@classmethod
	def fromDict(cls,dict):
		return cls(dict.get('buffer'),
		dict.get('byteOffset'),
		dict.get('byteLength'),
		dict.get('byteStride'),
		dict.get('target'))

	def __str__(self):
		return ("buffer : " + str(self.bufferID) + "\n" +
		"byteOffset : " + str(self.byteOffset) + "\n" +
		"byteLength : " + str(self.byteLength) + "\n" +
		"byteStride : " + str(self.byteStride) + "\n" +
		"target : " + str(self.target) + "\n")

class Buffer:

	def __init__(self,byteLength,uri):
		self.byteLength = byteLength
		self.uri = uri

	@classmethod
	def fromDict(cls,dict):
		return cls(dict.get('byteLength'),dict.get('uri'))

	def __str__(self):
		return ("byteLength : " + str(self.byteLength) + "\n" +
		"uri : " + str(self.uri) + "\n")

class Scene:

	def __init__(self,sceneName,nodes = None):
		self.sceneName = sceneName
		self.nodes = nodes
	
	@classmethod
	def fromDict(cls,dict):
		return cls(dict.get('name'),dict.get('nodes'))
	
	def __str__(self):
		return ('name : ' + str(self.sceneName) + '\n'+ 'nodes : ' + str(self.nodes) + '\n')
		
class Node:

	def __init__(self,children = None, matrixTransform = None,translation = vray.Vector(0.0,0.0,0.0), rotation = vray.Vector(0.0,0.0,0.0), scale = vray.Vector(0.0,0.0,0.0),
				 					mesh = None, camera = None , name = None, skin = None,extensions = None):
		self.children = children
		self.matrixTransform = matrixTransform
		self.translation = translation
		self.rotation = rotation
		self.scale = scale
		self.mesh = mesh
		self.camera = camera
		self.name = name
		self.skin = skin
		self.extensions = extensions

		self.vray_node_created = False

		# Needed for accumulating Transforms through node tree as APPSDK has no nodeTree
		# data set throgh parsing to not repeat the same checks twice
		self.parentNode_idx = None
		self.transform = vray.Transform(vray.Matrix.identity,vray.Vector(0,0,0))
		self.local_transform = vray.Transform(vray.Matrix.identity,vray.Vector(0,0,0))

		#Should be a tuple of (rot,scale,offset) /// Still testing if multiple animations of the same type can target the same Node
		self.transform_change = [None,None,None]

	@classmethod
	def fromDict(cls,dict):
		return cls(dict.get('children'),
				dict.get('matrix'),
				dict.get('translation'),
				dict.get('rotation'),
				dict.get('scale'),
				dict.get('mesh'),
				dict.get('camera'),
				dict.get('name'),
				dict.get('skin'),
				dict.get('extensions'))

	def __str__(self):
		return ("children : " + str(self.children) + "\n" +
				"matrix : " + str(self.matrixTransform) + "\n" +
				"translation : " + str(self.translation) + "\n" +
				"rotation : " + str(self.rotation) + "\n" +
				"scale : " + str(self.scale) + "\n" +
				"mesh : " + str(self.mesh) + "\n" +
				"camera : " + str(self.camera) + "\n" +
				"name : " + str(self.name) + "\n" +
				"extensions : " + str(self.extensions) + "\n" +
				"skin : " + str(self.skin) + "\n")

class Primitive:
	##Attributes is a dict with POSITION and NORMAL
	def __init__(self, node = None, indices = None, attributes = None, material = None, targets = None):
		self.node = node
		self.indices = indices
		self.attributes = attributes
		self.material = material
		self.targets = targets

		self.vray_node_ref = None

	@classmethod
	def fromDict(cls,dict):
		return cls(dict.get('node'),
				dict.get('indices'),
				dict.get('attributes'),
				dict.get('material'),
				dict.get('targets'))

	def __str__(self):
		return ("node : " + str(self.node) + "\n" +
				"indices : " + str(self.indices) + "\n" +
				"attributes : " + str(self.attributes) + "\n" +
				"material : " + str(self.material) + "\n" +
				"targets : " + str(self.targets) + "\n")	

class Mesh:

	ID = 0

	def __init__(self,primitives = None, weights = None):
		self.primitives = []
		self.ID = Mesh.ID
		self.weights = weights


		Mesh.ID += 1
		for pr in primitives:
			self.primitives.append(Primitive.fromDict(pr))

	@classmethod
	def fromDict(cls,dict):
		return cls(dict.get('primitives'),dict.get('weights'))

	def __str__(self):
		print("**** MESH "+str(self.ID) + " ****")
		for pr in self.primitives:
			print(pr)
		return("**************")	


class PbrMetallicRoughness:

	def __init__(self,baseColorTexture,baseColorFactor,metallicFactor,roughnessFactor,metallicRoughnessTexture):
		self.baseColorTexture = baseColorTexture
		self.baseColorFactor = baseColorFactor
		self.metallicFactor = metallicFactor
		self.roughnessFactor = roughnessFactor
		self.metallicRoughnessTexture = metallicRoughnessTexture

	@classmethod
	def fromDict(cls,dict):
		return cls(dict.get('baseColorTexture'),
			dict.get('baseColorFactor'),
			dict.get('metallicFactor'),
			dict.get('roughnessFactor'),
			dict.get('metallicRoughnessTexture'))

	def __str__(self):
		return ("baseColorTexture : " + str(self.baseColorTexture) + "\n" +
			"baseColorFactor : " + str(self.baseColorFactor) + "\n" +
			"metallicFactor : " + str(self.metallicFactor) + "\n" +
			"roughnessFactor : " + str(self.roughnessFactor) + "\n" +
			"metallicRoughnessTexture : " + str(self.metallicRoughnessTexture) + "\n")
			

class Material:

	def __init__(self,name,alphaMode = None,alphaCutoff = None,doubleSided = False,emissiveFactor = None,
	normalTexture = None,occlusionTexture = None,emissiveTexture = None,pbrMetallicRoughness = None,extensions=None):

		self.name = name
		self.alphaMode = alphaMode
		self.alphaCutoff = alphaCutoff
		self.doubleSided = doubleSided
		self.emissiveFactor = emissiveFactor
		self.normalTexture = normalTexture
		self.occlusionTexture = occlusionTexture
		self.emissiveTexture = emissiveTexture
		if pbrMetallicRoughness!=None:
			self.pbrMetallicRoughness = PbrMetallicRoughness.fromDict(pbrMetallicRoughness)
		else:
			self.pbrMetallicRoughness=None
		self.extensions = extensions

	@classmethod
	def fromDict(cls,dict):
		return cls(dict.get('name'),
				dict.get('alphaMode'),
				dict.get('alphaCutoff'),
				dict.get('doubleSided'),
				dict.get('emissiveFactor'),
				dict.get('normalTexture'),
				dict.get('occlusionTexture'),
				dict.get('emissiveTexture'),
				dict.get('pbrMetallicRoughness'),
				dict.get('extensions'))

	def __str__(self):
		return ("name : " + str(self.name) + "\n" +
				"alphaMode : " + str(self.alphaMode) + "\n" +
				"alphaCutoff : " + str(self.alphaCutoff) + "\n" +
				"doubleSided : " + str(self.doubleSided) + "\n" +
				"emissiveFactor : " + str(self.emissiveFactor) + "\n" +
				"normalTexture : " + str(self.normalTexture) + "\n" +
				"occlusionTexture : " + str(self.occlusionTexture) + "\n" +
				"emissiveTexture : " + str(self.emissiveTexture) + "\n" +
				"extensions : " + str(self.extensions) + "\n" +
				"************\npbrMetallicRoughness : \n" + str(self.pbrMetallicRoughness) + "\n"+
				"************" + '\n')	


	
class Camera:
	# xxxx_dicts used differently for the 2 different camera types
	def __init__(self,cam_type=None,persp_dict=None,ortho_dict=None):

		
		self.camera_type = cam_type
		if cam_type == "perspective":
			self.aspectRatio = persp_dict.get('aspectRatio')
			self.yfov = persp_dict.get('yfov')
			self.zfar = persp_dict.get('zfar')
			self.znear = persp_dict.get('znear')			
		elif cam_type == 'orthographic':
			self.xmag = ortho_dict.get('xmag')
			self.ymag = ortho_dict.get('ymag')
			self.zfar = ortho_dict.get('zfar')
			self.znear = ortho_dict.get('znear')	
	
	@classmethod
	def fromDict(cls,dict):
		return cls(dict.get('type'),
				dict.get('perspective'),
				dict.get('orthographic'))		

class Texture:

	def __init__(self,source,sampler):
		self.source = source
		self.sampler = sampler

	@classmethod
	def fromDict(cls,dict):
		return cls(dict.get('source'),dict.get('sampler'))

class Image:

	def __init__(self, uri = None , bufferView = None, mimeType = None):
			self.uri = uri
			self.bufferView = bufferView
			self.mimeType = mimeType
			self.local = False

			#data set throgh parsing to not repeat the same checks twice
			self.data = []
			self.file_loc = ''

	@classmethod
	def fromDict(cls,dict):
		return cls(dict.get('uri'),dict.get('bufferView'),dict.get('mimeType'))

	def __str__(self):
		return ("uri : " + str(self.uri) + "\n" +
			"bufferView : " + str(self.bufferView) + "\n" +
			"mimeType : " + str(self.mimeType) + "\n")

class Sampler:

	def __init__(self,magFilter = None,minFilter = None,wrapS = None ,wrapT = None):
		
		self.magFilter = magFilter
		self.minFilter = minFilter
		self.wrapS = wrapS
		self.wrapT = wrapT
	
	@classmethod
	def fromDict(cls,dict):
		return cls(dict.get('magFilter'),dict.get('minFilter'),dict.get('wrapS'),dict.get('wrapT'))

class Skin:

	def __init__(self, inverseBindMatrices, joints):
		self.inverseBindMatrices = inverseBindMatrices
		self.joints = joints

#GLTF 2.0 Experimental KHR_lights_punctual  : https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Khronos/KHR_lights_punctual
class Light:
	
	def __init__(self,name = None, color = None, intenstity = None, mtype = None,mrange = None, spot_attr = None):
		self.name = name
		self.color = color
		self.intensity = intenstity
		self.mtype = mtype
		self.mrange = mrange

		self.spot_attr = spot_attr

	@classmethod
	def fromDict(cls,dict):
		return cls(dict.get('name'), dict.get('color'), dict.get('intensity'), dict.get('type'), dict.get('range'),dict.get('spot'))

	def __str__(self):
		return ("name : " + str(self.name) + "\n" +
		"Color : " + str(self.color) + "\n" +
		"Intensity : " + str(self.intensity) + "\n" +
		"type : " + str(self.mtype) + "\n" +
		"range : " + str(self.mrange) + "\n")

class AnimSampler:

	def __init__(self,time_input = None, interpolation = None, output = None, idx_offset = 1):
		self.time_input = time_input #input accessor id
		self.interpolation = interpolation
		self.output = output #output accessor id
		self.current_sampl_idx = 0 

		#caching animation data so we dont calculate every frame if its not needed
		self.nextKeyTime_idx = 0
		self.prevKeyTime = 0.0
		self.nextKeyTime = 0.0
		self.prevKeyFrameData = None
		self.nextKeyFrameData = None

		self.data_idx_offset = idx_offset

	def __str__(self):
		return ("input : " + str(self.time_input) + "\n" +
		"interpolation : " + str(self.interpolation) + "\n" +
		"output : " + str(self.output) + "\n")
	
	@classmethod
	def fromDict(cls,dict):
		return cls(dict.get('input'), dict.get('interpolation'), dict.get('output'))
		
# Used in STEP and Linear interpolation animations
class AnimSamplerLinear(AnimSampler):
	
	def __init__(self, time_input = None, interpolation = None, output = None):
		super(AnimSamplerLinear,self).__init__(time_input,interpolation,output)

	def update(self,parser,anim_type,target_node):
		time_data = parser.accessors[self.time_input].data
		time_s = parser.current_time

		if time_s >= self.nextKeyTime:
			
			for current_keyframe_time_idx in range(self.nextKeyTime_idx,len(time_data)):
				if time_s >= time_data[current_keyframe_time_idx]:
					self.nextKeyTime_idx+=1
				else:
					break
			
			if self.nextKeyTime_idx < len(time_data):
				
				self.prevKeyTime = time_data[self.nextKeyTime_idx-1]
				self.nextKeyTime = time_data[self.nextKeyTime_idx]

				prev_data_idx = (self.nextKeyTime_idx-1)*self.data_idx_offset
				next_data_idx = self.nextKeyTime_idx*self.data_idx_offset
				self.prevKeyFrameData = parser.accessors[self.output].data[prev_data_idx : prev_data_idx + self.data_idx_offset]
				self.prevKeyFrameData = self.prevKeyFrameData.flatten()
				self.nextKeyFrameData = parser.accessors[self.output].data[next_data_idx : next_data_idx + self.data_idx_offset]		
				self.nextKeyFrameData = self.nextKeyFrameData.flatten()

		if time_s >= self.prevKeyTime:
			if self.interpolation == 'STEP':

				if anim_type == 'translation':
					parser.nodes[target_node].translation = [self.prevKeyFrameData[0],self.prevKeyFrameData[1],self.prevKeyFrameData[2]]
				if anim_type == 'rotation':
					parser.nodes[target_node].rotation = [self.prevKeyFrameData[0],self.prevKeyFrameData[1],self.prevKeyFrameData[2],self.prevKeyFrameData[3]]
				if anim_type == 'scale':
					parser.nodes[target_node].scale = [self.prevKeyFrameData[0],self.prevKeyFrameData[1],self.prevKeyFrameData[2]]
				if anim_type == 'weights':
					parser.meshes[parser.nodes[target_node].mesh].weights = self.prevKeyFrameData

			if self.interpolation == 'LINEAR':
				lerp_time = get_lerp_time(time_s,self.prevKeyTime,self.nextKeyTime)

				if anim_type == 'translation':

					trans_x = lerp(self.prevKeyFrameData[0],self.nextKeyFrameData[0],lerp_time)
					trans_y = lerp(self.prevKeyFrameData[1],self.nextKeyFrameData[1],lerp_time)
					trans_z = lerp(self.prevKeyFrameData[2],self.nextKeyFrameData[2],lerp_time)

					parser.nodes[target_node].translation = [trans_x,trans_y,trans_z]
				if anim_type == 'rotation':

					quat1 = pyq.Quaternion(self.prevKeyFrameData[3], self.prevKeyFrameData[0], self.prevKeyFrameData[1], self.prevKeyFrameData[2])
					quat2 =	pyq.Quaternion(self.nextKeyFrameData[3], self.nextKeyFrameData[0], self.nextKeyFrameData[1], self.nextKeyFrameData[2])
					slerp_quat = quat_slerp(quat1,quat2,lerp_time)

					parser.nodes[target_node].rotation = [slerp_quat.x,slerp_quat.y,slerp_quat.z,slerp_quat.w]
				if anim_type == 'scale':

					scale_x = lerp(self.prevKeyFrameData[0],self.nextKeyFrameData[0],lerp_time)
					scale_y = lerp(self.prevKeyFrameData[1],self.nextKeyFrameData[1],lerp_time)
					scale_z = lerp(self.prevKeyFrameData[2],self.nextKeyFrameData[2],lerp_time)

					parser.nodes[target_node].scale = [scale_x,scale_y,scale_z]
				
				if anim_type == 'weights':
					for i in range(0,len(parser.meshes[parser.nodes[target_node].mesh].weights)):
						parser.meshes[parser.nodes[target_node].mesh].weights[i] = float(lerp(self.prevKeyFrameData[i],self.nextKeyFrameData[i],lerp_time))

# Used in cubic spline Samplers
class AnimSamplerSpline(AnimSampler):

	def __init__(self, time_input = None, interpolation = None, output = None):
		super(AnimSamplerSpline,self).__init__(time_input,interpolation,output)
		#caching animation [input_tan , data , output tan] so we dont calculate every frame if its not needed
		self.prevOutputTangent = None
		self.nextInputTangent = None	

	def update(self,parser,anim_type,target_node):
		time_data = parser.accessors[self.time_input].data
		time_s = parser.current_time

		if time_s < time_data[0]:
			return None
		
		# see if the cached data needs updating and we are between the 2 next keyframes
		if time_s >= self.nextKeyTime:
			for current_keyframe_time_idx in range(self.nextKeyTime_idx,len(time_data)):
				if time_s >= time_data[current_keyframe_time_idx]:
					self.nextKeyTime_idx+=1		
				else:
					break
		
		if self.nextKeyTime_idx < len(time_data):
			self.prevKeyTime = time_data[self.nextKeyTime_idx-1]
			self.nextKeyTime = time_data[self.nextKeyTime_idx]
			
			#the data for Cubic Spline is contained in 3 sequential elements [inputTangent,data,outputTangent]
			prevKeyTime_data_idx = (self.nextKeyTime_idx-1)*3
			nextKeyTime_data_idx = self.nextKeyTime_idx*3
			self.prevKeyFrameData = parser.accessors[self.output].data[prevKeyTime_data_idx+1]
			self.nextKeyFrameData = parser.accessors[self.output].data[nextKeyTime_data_idx+1]

			self.prevOutputTangent = parser.accessors[self.output].data[prevKeyTime_data_idx+2]
			self.nextInputTangent = parser.accessors[self.output].data[nextKeyTime_data_idx]

		if time_s >= self.prevKeyTime:	
			lerp_time = get_lerp_time(time_s,self.prevKeyTime,self.nextKeyTime)
			delta_time = self.nextKeyTime - self.prevKeyTime
			if delta_time < 0.0:
				delta_time = 0.0

			if anim_type == 'translation':
				
				trans = _spline(self.prevKeyFrameData,self.prevOutputTangent,self.nextKeyFrameData,self.nextInputTangent,lerp_time,delta_time)

				parser.nodes[target_node].translation = [trans[0],trans[1],trans[2]]				

			if anim_type == 'rotation':
				spline_quat = _spline(self.prevKeyFrameData,self.prevOutputTangent,self.nextKeyFrameData,self.nextInputTangent,lerp_time,delta_time)

				parser.nodes[target_node].rotation = [spline_quat[0],spline_quat[1],spline_quat[2],spline_quat[3]]
			if anim_type == 'scale':

				scale = _spline(self.prevKeyFrameData,self.prevOutputTangent,self.nextKeyFrameData,self.nextInputTangent,lerp_time,delta_time)
				parser.nodes[target_node].scale = [scale[0],scale[1],scale[2]]

class AnimChannel:

	def __init__(self, target = None,sampler_id = None,sampler_dict = None):
		self.target = target
		self.sampler_id = sampler_id
		self.sampler = None
		self.anim_type = target.get('path')
		self.target_node = target.get('node')

		interpolation_type = sampler_dict.get('interpolation')
		# we default to LINEAR
		if interpolation_type == None:
			interpolation_type = 'LINEAR'
			sampler_dict['interpolation'] = 'LINEAR'
		#creating sampler for the channel
		if interpolation_type ==  'LINEAR' or interpolation_type == 'STEP':
			
			self.sampler = AnimSamplerLinear.fromDict(sampler_dict)
		elif interpolation_type == 'CUBICSPLINE':
			self.sampler = AnimSamplerSpline.fromDict(sampler_dict)

		
	@classmethod
	def fromDict(cls,dict,sampler_dict):
		return cls(dict.get('target'), dict.get('sampler'),sampler_dict)
	
	def __str__(self):
		return ("target : " + str(self.target) + "	\n" +
		"sampler : " + str(self.sampler) + "\n")

	def update(self,parser):
		self.sampler.update(parser,self.anim_type,self.target_node)
	
class Animation:

	def __init__(self,channels):
		self.channels = channels
		self.anim_time = None

	@classmethod
	def fromDict(cls,dict):
		vchannels = []

		channels = dict.get('channels')
		samplers = dict.get('samplers')

		if channels != None:
			for channel,sampler in zip(channels,samplers):
				vchannels.append(AnimChannel.fromDict(channel,sampler))

		return cls(vchannels)
	
	def __str__(self):
		return str(self.channels) + str(self.samplers)

	# needs gltfParser ascr list to work
	# used to go through the full animation if frames or animation time is not set by user
	def calc_max_time(self, ascrs_list):
		self.anim_time = 0.0
		for channel in self.channels:

			acsr_idx = channel.sampler.time_input
			current_time = max(ascrs_list[acsr_idx].max)
			self.anim_time = max(current_time,self.anim_time)

	def init(self,ascrs_list):
		for channel in self.channels:
			acsr_idx_input = channel.sampler.time_input
			acsr_idx_output = channel.sampler.output
			channel.sampler.data_idx_offset = int(len(ascrs_list[acsr_idx_output].data) / len(ascrs_list[acsr_idx_input].data))

	def update(self,parser):
		for channel in self.channels:
			channel.update(parser)

# used to fill parser data, including checks
def _parse_json_part(fileData = None, parserList = None,dictName = None, constructor = None,errorwarn = True):
	dicts = fileData.get(dictName)
	if dicts != None:
		for val in dicts:
			parserList.append(constructor(val))
	else:
		if errorwarn == True:
			print("[ParserInfo]   ERROR : No " + dictName + " found in file")
		else:
			print("[ParserInfo]   Warning : No " + dictName + " found in file")

