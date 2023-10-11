
from __future__ import print_function

import os
import sys
import json

import vray

from . import parserUtils
from . import cameraUtils

import numpy as np
from tempfile import mkstemp
import math
import pyquaternion as pyq

#decoding data uris
import base64

#debug
from .. import testUtils

#gltf textures need to be flipped around the Y axis for opengl to vray coords
TEXTURE_FLIP_TRANSFORM = vray.Transform(vray.Matrix(vray.Vector(1.0, 0.0, 0.0),
										vray.Vector(0.0, -1.0, 0.0),
										vray.Vector(0.0, 0.0, 1.0)),
										vray.Vector(0.0, 1.0, 0.0))

def computeNormalMatrix(nrm):
	nxSq=nrm.x*nrm.x
	nySq=nrm.y*nrm.y
	nzSq=nrm.z*nrm.z
	lenSq1=nxSq+nzSq
	lenSq2=nxSq+nySq
	if lenSq1>lenSq2:
		lenInv=1.0/math.sqrt(lenSq1)
		uVec=vray.Vector(-nrm.z*lenInv, 0.0, nrm.x*lenInv)
	else:
		lenInv=1.0/math.sqrt(lenSq2)
		uVec=vray.Vector(nrm.y*lenInv, -nrm.x*lenInv, 0.0)
	vVec=nrm^uVec;
	return vray.Matrix(uVec, vVec, nrm)

def minVec(a, b):
	return vray.Vector(min(a.x, b.x), min(a.y, b.y), min(a.z, b.z))

def maxVec(a, b):
	return vray.Vector(max(a.x, b.x), max(a.y, b.y), max(a.z, b.z))

## Apply vertex color to the diffuse color of the given brdf. This is done by multiplying the texture by a vertex color texture.
#  @param renderer A VRayRenderer object.
#  @param brdf The BRDF for which to adjust the diffuse color; typicall BRDFVRayMtl.
#  @param channel_names A string list with the mapping channels for the mesh that the material is applied to.
def applyVertexColor(renderer, brdf, channel_names):
	if 'COLOR_0' in channel_names:
		vertexColor_idx=channel_names.index('COLOR_0')
		vertexColor_uvwGen=renderer.classes.UVWGenChannel()
		vertexColor_uvwGen.uvw_channel=vertexColor_idx

		vertexColor_tex=renderer.classes.TexUVW()
		vertexColor_tex.uvwgen=vertexColor_uvwGen

		diffuseVertexColor_tex=renderer.classes.TexAColorOp()
		diffuseVertexColor_tex.color_a=brdf.diffuse
		diffuseVertexColor_tex.color_b=vertexColor_tex

		brdf.diffuse=diffuseVertexColor_tex.product

class GltfParser:
	def __init__(self):

		self.nodes = []
		self.buffers = []
		self.bufferViews = []
		self.accessors = []
		self.meshes = []
		self.materials = []
		self.primitives = []
		self.textures = []
		self.images = []
		self.samplers = []
		self.skins = []
		self.scenes = []
		self.extensions = []
		self.cameras = []
		self.current_camera_id = 0

		self.animations = []
		self.animation_time = 0.0

		self.animation_fps = 60.0
		self.current_time = 0.0
		
		#SPECIAL: GLTF does not have lights, they are added as extensions to nodes
		self.lights = []

		#relative to the scene and the avarage node position set by command line arguments for now	
		self.defaultCameraTransform = vray.Transform(vray.Matrix.identity, vray.Vector(0.0,0.0,0.0))
		self.max_pos_object_val = 0.0
		self.minVertBound=vray.Vector(1e18, 1e18, 1e18)
		self.maxVertBound=vray.Vector(-1e18, -1e18, -1e18)
		self.average_scene_pos = vray.Vector(0,0,0)
		self.scene_verts = 0
		#overwritten look at from console
		self.average_scene_pos_or = None
		self.default_cam_rot = (0,0,0)
		self.default_cam_moffset = (0.0,0.0,0.0)
		self.default_cam_pos = None
		#fov is in degrees for user ease of use
		self.default_cam_fov = 45

		self.file_loc = None

		#options
		self.use_only_default_mat = False
		self.use_default_cam = False
		self.use_default_lights = False
		self.use_ground_plane = False
		self.thick_glass = False
		self.thin_glass = False
		self.trace_depth = 8
		self.environment_scene = None
		self.lighting = None
		self.render_skybox = False

	def set_options(self, args = None):
		self.animation_fps = args.animation_fps

		self.use_only_default_mat = args.test_material
		self.use_default_cam = args.default_camera
		self.default_cam_rot = args.default_cam_rot
		self.default_cam_moffset = args.default_cam_moffset
		self.default_cam_pos = args.default_cam_pos
		self.default_cam_zoom = args.default_cam_zoom
		self.default_cam_view = args.default_cam_view
		self.default_cam_fov = args.default_cam_fov
		self.use_default_lights = args.default_lights
		self.use_ground_plane = args.ground_plane
		self.thick_glass = args.thick_glass
		self.thin_glass = args.thin_glass
		self.trace_depth = args.trace_depth
		self.environment_scene=args.environment_scene
		self.lighting = args.lighting

		if args.default_cam_look_at != None:
			self.average_scene_pos_or = vray.Vector(args.default_cam_look_at[0],args.default_cam_look_at[1],args.default_cam_look_at[2])
		# add in more args

	#used for default adaptive camera
	def _get_camera_pos_data(self,vec):
		self.max_pos_object_val = max(self.max_pos_object_val,abs(vec.x),abs(vec.y),abs(vec.z))
		self.average_scene_pos = self.average_scene_pos + vec
		self.minVertBound=minVec(self.minVertBound, vec)
		self.maxVertBound=maxVec(self.maxVertBound, vec)

	def _get_accessor_offset(self,accessor):
		return parserUtils.none_to_zero(accessor.byteOffset) + parserUtils.none_to_zero(self.bufferViews[accessor.bufferViewID].byteOffset)	
	
	def _get_bufferview_offset(self,bufferViewID):
		return parserUtils.none_to_zero(self.bufferViews[bufferViewID].byteOffset)	

	def _get_accessor_stride(self,accessor):
		return parserUtils.none_to_zero(self.bufferViews[accessor.bufferViewID].byteStride)
	
	def _get_bufferview_stride(self,bufferViewID):
		return parserUtils.none_to_zero(self.bufferViews[bufferViewID].byteStride)

	def _get_accessor_byte_length(self,accessor):
		return parserUtils.none_to_zero(self.bufferViews[accessor.bufferViewID].byteLength)

	def _get_bufferview_byte_length(self,bufferViewID):
		return parserUtils.none_to_zero(self.bufferViews[bufferViewID].byteLength)

	def _get_accessor_buffer_uri(self,accessor):
		# if no URI aka .glb returns None, if there is URI it return URI or data URI
		return self.buffers[self.bufferViews[accessor.bufferViewID].bufferID].uri
	
	def _get_buffer_uri(self,bufferViewID):
		# if no URI aka .glb returns None, if there is URI it return URI or data URI
		return self.buffers[self.bufferViews[bufferViewID].bufferID].uri
	
	def _from_bin_w_stride(self,bufferData, bufferViewID, compType, count, countModifier, offset,base64str = False):

		b_stride = self._get_bufferview_stride(bufferViewID)
		b_length = self._get_bufferview_byte_length(bufferViewID)
		comp_size = compType.itemsize
		
		if base64str == True:		
			raw_data = np.fromstring(bufferData[offset:count*b_stride],dtype = 'B')
		else:
			raw_data = np.memmap(bufferData,dtype = 'B',mode ='r',shape=(count*b_stride),offset = offset)

		data = np.empty(shape = (count*countModifier,), dtype = compType)
		for idx in range(0,count):

			data_it = idx*countModifier
			raw_data_it = idx*b_stride

			data[data_it : data_it+countModifier] = (raw_data[raw_data_it : raw_data_it + countModifier*comp_size]).view(compType)

		data = data.reshape(count,countModifier)


		return data

	#Parses data for accessors using component Types and shapes it while considering the encoding methods
	def _get_data(self, buffer_uri, bufferViewID, sceneFile, compType, count, countModifier, offset):
		data = None

		if buffer_uri == None:
			if self.bufferViews[bufferViewID].byteStride == None:
				data = np.fromfile(sceneFile, dtype = compType, count = count*countModifier, offset = offset)
				data = data.reshape(count,countModifier)
			else:

				data = self._from_bin_w_stride(sceneFile, bufferViewID, np.dtype(compType), count, countModifier, offset)
			
		elif 'data:application/' in buffer_uri:
			# Reading here from a base64str encoded string data from the actual .gltf file
			base64_data = buffer_uri[buffer_uri.find(','):]
			decoded_data = base64.b64decode(base64_data)
			if self.bufferViews[bufferViewID].byteStride == None:
				data = np.fromstring(decoded_data[offset:], dtype = compType, count = count*countModifier)
				data = data.reshape(count, countModifier)
			else:
				data = self._from_bin_w_stride(decoded_data, bufferViewID, np.dtype(compType), count,countModifier, offset, base64str = True)			
			
		else:
			file_path = os.path.join(self.file_loc, buffer_uri)
			if self.bufferViews[bufferViewID].byteStride == None:
				data = np.fromfile(file_path,dtype = compType, count = count*countModifier, offset = offset)
				data = data.reshape(count,countModifier)
			else:
				data = self._from_bin_w_stride(file_path, bufferViewID, np.dtype(compType), count, countModifier, offset)

		return data

	#OPENGL type to numpy type str
	def _opengl_numpy_type(self,openGL_type):
		
		if openGL_type == 5123:
			return '<H' #unsigned short uint16
		if openGL_type == 5125:
			return '<I'
		if openGL_type == 5121:
			return '<B'

		return '<f4'
		
	def _parseSceneData(self,dataFileName = None):
		#Fill accessors with data
		for ascr in self.accessors:
			#get numpy component Type from OpenGL type
			compType = self._opengl_numpy_type(ascr.compType)
			#Default countModifier is if its Scalars
			countModifier = 1
			if ascr.type == 'VEC2':
				countModifier = 2
			if ascr.type == 'VEC3':
				countModifier = 3
			if ascr.type == 'VEC4':
				countModifier = 4

			### self.currentOffset is the offset from the json part if we are reading a GLB file, as the first chunk is going to be json
			### In the case where it is not GLB the self.currentOffset = 0
			if ascr.bufferViewID != None:
				buffer_uri = self._get_accessor_buffer_uri(ascr)
				ascr.data = self._get_data(buffer_uri=buffer_uri, bufferViewID= ascr.bufferViewID, sceneFile = dataFileName,
										 compType= compType, count = ascr.count, countModifier=countModifier,offset=self.currentOffset + self._get_accessor_offset(ascr))
			else:
				#if there is no BufferView then we assume the data array is only 0.0 (rare case)
				ascr.data = np.zeros(shape = (ascr.count,countModifier), dtype = compType)
			
			#Sparse Accessor part
			if ascr.sparse != None:
				#need to get the bufferView data from the ascr sparse dict
				sub_count = ascr.sparse.get('count')
				if sub_count > 0:
					
					idx_dict = ascr.sparse.get('indices')
					if idx_dict != None:
						
						idx_compType = idx_dict.get('componentType')
						if idx_compType != None:
							idx_data_type = self._opengl_numpy_type(idx_compType)
						else:
							idx_data_type = compType
						#get custom byteOffset if there is any
						idx_offset = parserUtils.none_to_zero(idx_dict.get('byteOffset'))
						idx_bufferViewID = idx_dict.get('bufferView')
						idx_buffer_uri = self._get_buffer_uri(idx_bufferViewID)
						#get the actual indices for the data substitution
						indices = self._get_data(buffer_uri=idx_buffer_uri, bufferViewID= idx_bufferViewID, sceneFile = dataFileName,
										 compType= idx_data_type, count = sub_count, countModifier = 1,offset=self.currentOffset + self._get_bufferview_offset(idx_bufferViewID) + idx_offset)
						indices = indices.flatten()
						
						#Sparse values
						sparse_values_dict = ascr.sparse.get('values')
						if sparse_values_dict != None:
							sparse_values_bufferViewID = sparse_values_dict.get('bufferView')
							sparse_values_offset = parserUtils.none_to_zero(sparse_values_dict.get('byteOffset'))

							if sparse_values_bufferViewID != None:
								sparse_values_buffer_uri = self._get_buffer_uri(sparse_values_bufferViewID)
								sparse_values = self._get_data(buffer_uri=sparse_values_buffer_uri, bufferViewID= sparse_values_bufferViewID, sceneFile = dataFileName,
										 compType= compType, count = sub_count, countModifier = countModifier, offset=self.currentOffset + self._get_bufferview_offset(sparse_values_bufferViewID) + sparse_values_offset)
							else:
								sparse_values = np.zeros(shape = (sub_count,countModifier), dtype = compType)

						#data substituion
						ascr.data[indices] = sparse_values

		#Textures/Images
		for image_idx in range(0, len(self.images)):

			image_uri = self.images[image_idx].uri
			if image_uri == None:
				self.images[image_idx].data = np.fromfile(dataFileName,dtype = 'B',count = self.bufferViews[self.images[image_idx].bufferView].byteLength,
														 offset =  self.currentOffset + parserUtils.none_to_zero(self.bufferViews[self.images[image_idx].bufferView].byteOffset))
				#self.images[image_idx].file_loc = 'temp/img_' + str(image_idx) + '.png'
				#create temp file
				if self.images[image_idx].mimeType == 'image/jpeg' or self.images[image_idx].mimeType == 'image/jpg':
					fd , self.images[image_idx].file_loc = mkstemp(suffix='.jpg')
				elif self.images[image_idx].mimeType == 'image/png':
					fd , self.images[image_idx].file_loc = mkstemp(suffix='.png')
				os.close(fd)
				self.images[image_idx].data.tofile(self.images[image_idx].file_loc)
				
			elif 'data:image/' in image_uri:
				f_ext = 'png'
				file_type_str = image_uri[:image_uri.find(';')]
				if 'image/jpeg' in file_type_str:
					f_ext = 'jpeg'

				elif 'image/bmp' in image_uri:
					f_ext = 'bmp'
				base64_data = image_uri[image_uri.find(','):]
				decoded_data = base64.b64decode(base64_data)
				self.images[image_idx].data = np.fromstring(decoded_data, dtype = 'B')
				#self.images[image_idx].file_loc = 'temp/img_' + str(image_idx) + f_ext
				#create temp file
				fd , self.images[image_idx].file_loc = mkstemp(suffix='.png')
				os.close(fd)
				self.images[image_idx].data.tofile(self.images[image_idx].file_loc)
				
			else:

				self.images[image_idx].file_loc = os.path.join(self.file_loc, image_uri)
				self.images[image_idx].local = True

	def _calculate_node_raw_transforms(self,gltf_node):
		_rot_mat=vray.Matrix.identity
		_offset=vray.Vector(0,0,0)
		_scale_mat=vray.Matrix(vray.Vector(1, 0, 0), vray.Vector(0, 1, 0), vray.Vector(0, 0, 1))

		updated_Transform = False
		if gltf_node.matrixTransform != None:
			matrix = vray.Matrix(
				vray.Vector(gltf_node.matrixTransform[0], gltf_node.matrixTransform[1], gltf_node.matrixTransform[2]),
				vray.Vector(gltf_node.matrixTransform[4], gltf_node.matrixTransform[5], gltf_node.matrixTransform[6]),
				vray.Vector(gltf_node.matrixTransform[8], gltf_node.matrixTransform[9], gltf_node.matrixTransform[10])
			)
			offset = vray.Vector(gltf_node.matrixTransform[12], gltf_node.matrixTransform[13], gltf_node.matrixTransform[14])
			
			_rot_mat = matrix
			_offset = offset
			updated_Transform = True
		else :
			if gltf_node.translation != None:
				trans_x  = np.clip(gltf_node.translation[0], - 1.0E+18, 1.0E+18)
				trans_y = np.clip(gltf_node.translation[1], - 1.0E+18, 1.0E+18)
				trans_z = np.clip(gltf_node.translation[2], - 1.0E+18, 1.0E+18)
				offset = vray.Vector(trans_x,trans_y,trans_z)

				_offset = offset

				updated_Transform = True

			if gltf_node.scale != None:
				scale_x = np.clip(gltf_node.scale[0], - 1.0E+18, 1.0E+18)
				scale_y = np.clip(gltf_node.scale[1], - 1.0E+18, 1.0E+18)
				scale_z = np.clip(gltf_node.scale[2], - 1.0E+18, 1.0E+18)
				scale = vray.Vector(scale_x,scale_y,scale_z)

				_scale_mat = vray.Matrix(vray.Vector(scale[0],0.0,0.0), vray.Vector(0.0,scale[1],0.0), vray.Vector(0.0,0.0,scale[2]))

				updated_Transform = True

			if gltf_node.rotation != None:
				qrot_x = np.clip(gltf_node.rotation[0], - 1.0E+18, 1.0E+18)
				qrot_y = np.clip(gltf_node.rotation[1], - 1.0E+18, 1.0E+18)
				qrot_z = np.clip(gltf_node.rotation[2], - 1.0E+18, 1.0E+18)
				qrot_w = np.clip(gltf_node.rotation[3], - 1.0E+18, 1.0E+18)

				quatRotation=pyq.Quaternion(qrot_w, qrot_x, qrot_y, qrot_z)
				matrixRotation=quatRotation.rotation_matrix

				_rot_mat=vray.Matrix(
					vray.Vector(matrixRotation[0][0], matrixRotation[1][0], matrixRotation[2][0]),
					vray.Vector(matrixRotation[0][1], matrixRotation[1][1], matrixRotation[2][1]),
					vray.Vector(matrixRotation[0][2], matrixRotation[1][2], matrixRotation[2][2])
				)

				updated_Transform = True
				
		if updated_Transform == True:
			return vray.Transform(_rot_mat * _scale_mat, _offset)

		return None
	##tex_coord_ow  tuple (tex_cord_accessor_idx, (scalex,scaley))
	#returns a set up TexBitMap() from BitmapBuffer from a gltf texture dictionary
	def _make_texture(self, renderer, prim, tex_dict, color_mult = vray.AColor(1,1,1,1),transfer_func = 1,gamma = 1):
		if tex_dict != None:
	
			tex_source_idx = tex_dict.get('index')
			if tex_source_idx != None:
				wrapU=1
				wrapV=1

				samplerIdx=self.textures[tex_source_idx].sampler
				if samplerIdx!=None:
					gltf_wrapS=self.samplers[samplerIdx].wrapS
					if gltf_wrapS==10497: # The texture repeats in U
						wrapU=1
					elif gltf_wrapS==33071: # Clamp to edge; V-Ray doesn't really have a matching mode, so just disable wrapping
						wrapU=0
					elif gltf_wrapS== 33648: # Mirrored repeat
						wrapU=2

					gltf_wrapT=self.samplers[samplerIdx].wrapT
					if gltf_wrapT==10497: # The texture repeats in V
						wrapV=1
					elif gltf_wrapT==33071: # Clamp to edge; V-Ray doesn't really have a matching mode, so just disable wrapping
						wrapV=0
					elif gltf_wrapT== 33648: # Mirrored repeat
						wrapV=2

				tex_idx = self.textures[tex_source_idx].source

				bmb = renderer.classes.BitmapBuffer()
				bmb.file = self.images[tex_idx].file_loc
				bmb.transfer_function = transfer_func
				#bmb.allow_negative_colors = True
				bmb.gamma = gamma
				bmb.filter_type=5 # Sharp mip-map filtering

				texture = renderer.classes.TexBitmap()
				texture.bitmap = bmb
				texture.color_mult = color_mult

				if wrapU!=0 or wrapV!=0:
					texture.tile=1
				else:
					texture.tile=0

				uvw_gen = renderer.classes.UVWGenChannel()
				uvw_gen.uvw_channel = -1
				uvw_gen.uvw_transform = TEXTURE_FLIP_TRANSFORM
				#uvw_gen.use_double_sided_mode = True
				uvw_gen.wrap_mode = 0
				uvw_gen.wrap_u=wrapU
				uvw_gen.wrap_v=wrapV

				tex_uv_channel_idx = tex_dict.get('texCoord')
				if tex_uv_channel_idx != None:
					uvw_gen.uvw_channel = tex_uv_channel_idx
				else:
					tex_uv_channel_idx = -1

				tex_source_ext = tex_dict.get('extensions')
				if tex_source_ext != None:
					for ext in tex_source_ext.keys():
						if ext == "KHR_texture_transform":
							tex_trans_ext = tex_source_ext.get("KHR_texture_transform")

							# Figure out the final UVW transformation
							tex_transform=vray.Transform(vray.Matrix.identity, vray.Vector(0, 0, 0))

							gltf_tex_offset=tex_trans_ext.get('offset')
							if gltf_tex_offset!=None:
								tex_transform=tex_transform.replaceOffset(vray.Vector(gltf_tex_offset[0], gltf_tex_offset[1], 0))

							gltf_tex_rotate=tex_trans_ext.get('rotation')
							if gltf_tex_rotate==None:
								gltf_tex_rotate=0.0

							gltf_tex_scale=tex_trans_ext.get('scale')
							if gltf_tex_scale==None:
								gltf_tex_scale=[1.0, 1.0]

							cs=math.cos(-gltf_tex_rotate)
							sn=math.sin(-gltf_tex_rotate)
							tex_transform=tex_transform.replaceMatrix(vray.Matrix(
								vray.Vector(cs, sn, 0)*gltf_tex_scale[0],
								vray.Vector(-sn, cs, 0)*gltf_tex_scale[1],
								vray.Vector(0, 0, 1)
							))

							# First apply the transfrom from the extension, and then flip the Y direction
							uvw_gen.uvw_transform=(uvw_gen.uvw_transform*tex_transform)

							new_tex_coord = tex_trans_ext.get('texCoord')
							if new_tex_coord != None:
								 
								meshUvs = vray.VectorList()
								
								# for uvVal in self.accessors[new_tex_coord].data:
								# 	meshUvs.append(vray.Vector(uvVal[0],uvVal[1],0.0))

								# if tex_uv_channel_idx != -1:
								# 	prim.vray_node_ref.geometry.map_channels[tex_uv_channel_idx] = meshUvs
								# else:
								# 	channels = []
								# 	channels.append(meshUvs)
								# 	prim.vray_node_ref.geometry.map_channels = channels

				texture.uvwgen = uvw_gen

				return texture
		
		return None

	def _pbr_metallic_roughness(self,renderer,prim,gltf_pbrmr_mat,brdf):

		gltf_diff_tex = gltf_pbrmr_mat.baseColorTexture
		c_mult = gltf_pbrmr_mat.baseColorFactor

		#some default vals
		brdf.option_use_roughness = 5 # Use roughness for reflections and refractions

		brdf.reflect = vray.AColor(1,1,1,1)
		brdf.reflect_glossiness = 1.0
		brdf.refract_glossiness = 1.0

		if gltf_diff_tex != None:
			if c_mult != None:
				brdf.diffuse  = self._make_texture(renderer,prim,gltf_diff_tex,vray.AColor(c_mult[0], c_mult[1], c_mult[2], c_mult[3]), transfer_func = 2)
			else:
				brdf.diffuse  = self._make_texture(renderer,prim,gltf_diff_tex, transfer_func = 2)
		else:
			if c_mult != None:
				dif = renderer.classes.TexAColor()
				dif.texture = vray.AColor(c_mult[0], c_mult[1], c_mult[2], c_mult[3])
				brdf.diffuse = dif
		
		metallic = gltf_pbrmr_mat.metallicFactor
		if metallic==None:
			metallic=1.0 # The default metallic factor is 1.0 according to the glTF specification

		brdf.metalness = metallic

		roughness = gltf_pbrmr_mat.roughnessFactor
		if roughness==None:
			roughness=1.0 # The default roughness factor is 1.0 according to the glTF specification

		brdf.reflect_glossiness = roughness
		brdf.refract_glossiness = roughness

		metallicRoughness_tex = gltf_pbrmr_mat.metallicRoughnessTexture
		if metallicRoughness_tex != None:
			metallicRoughness_texture = self._make_texture(renderer,prim,metallicRoughness_tex, transfer_func = 0)

			roughness = parserUtils.none_to_val(roughness,1.0)
			metallic = parserUtils.none_to_val(metallic,1.0)
			#mults
			mr_mult = vray.AColor(1,roughness,metallic,1) #mult metallic and roughness factors
			mult_maps = renderer.classes.TexAColorOp()
			mult_maps.color_a = metallicRoughness_texture
			mult_maps.color_b = mr_mult

			#split
			split_maps = renderer.classes.TexAColorOp()
			split_maps.color_a = mult_maps.product
			roughness_map = split_maps.green
			metalness_map = split_maps.blue
			
			if roughness > 1e-8:
				brdf.reflect_glossiness = roughness_map
				brdf.refract_glossiness = roughness_map
			else:
				brdf.refract_glossiness = 0.0
			
			if metallic > 1e-8:
				brdf.metalness = metalness_map
			else:
				brdf.metalness = 0.0


	# https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Khronos/KHR_materials_transmission
	# gltf_mat - the extension passed as dictionary (json) 
	def _create_KHR_materials_transmission(self,renderer,gltf_mat,brdf):
		brdf.refract_thin_walled = True
		gltf_transmission_texture = gltf_mat.get('transmissionTexture')
		if gltf_transmission_texture != None:
			gltf_transmission_texture = self._make_texture(renderer,None,gltf_transmission_texture, transfer_func = 0)
			
			split_tex = renderer.classes.TexAColorOp()
			split_tex.color_a = gltf_transmission_texture
			
			trans_tex = renderer.classes.TexAColorOp()
			trans_tex.color_a = brdf.diffuse
			trans_tex.mult_a = split_tex.red

			tex_mult = renderer.classes.TexAColorOp()
			tex_mult.color_a = trans_tex.result_a
			

			gltf_transmission_factor = gltf_mat.get('transmissionFactor')
			if gltf_transmission_factor != None:
				tex_mult.mult_a = gltf_transmission_factor
			else:
				tex_mult.mult_a = 1.0

			brdf.refract = tex_mult.result_a

		else:
			gltf_transmission_factor = gltf_mat.get('transmissionFactor')
			if gltf_transmission_factor != None:
				refract_map = renderer.classes.TexAColorOp()
				refract_map.color_a = brdf.diffuse
				refract_map.color_b = vray.AColor(gltf_transmission_factor,gltf_transmission_factor,gltf_transmission_factor,1)
				brdf.refract = refract_map.product

	# https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Khronos/KHR_materials_pbrSpecularGlossiness
	# gltf_mat - the extension passed as dictionary (json)
	def _create_KHR_materials_pbrSpecularGlossiness(self, renderer, prim, gltf_mat, brdf, channel_names):
		brdf.option_use_roughness = 0
		brdf.fresnel = False # Disable Fresnel as we will use a falloff texture for the reflections
		gltf_diff_tex= gltf_mat.get('diffuseTexture')
		if gltf_diff_tex != None:
			if brdf.diffuse == vray.AColor(0.5,0.5,0.5,1):
				brdf.diffuse = self._make_texture(renderer, prim, gltf_diff_tex, transfer_func = 2)

		gltf_diff_factor = gltf_mat.get('diffuseFactor')
		if gltf_diff_factor != None:
			brdf.diffuse.color_mult = vray.AColor(gltf_diff_factor[0],gltf_diff_factor[1],gltf_diff_factor[2],gltf_diff_factor[3])
			
			if gltf_diff_tex == None:
				brdf.diffuse = vray.AColor(gltf_diff_factor[0],gltf_diff_factor[1],gltf_diff_factor[2],gltf_diff_factor[3])

		gltf_specular_factor = gltf_mat.get('specularFactor')
		if gltf_specular_factor != None:
			brdf.reflect = vray.AColor(gltf_specular_factor[0], gltf_specular_factor[1], gltf_specular_factor[2], 1)

		gltf_gloss_factor = gltf_mat.get('glossinessFactor')
		if gltf_gloss_factor != None:
			brdf.reflect_glossiness = gltf_gloss_factor

		
		gltf_gloss_tex = gltf_mat.get('specularGlossinessTexture')
		if gltf_gloss_tex != None:	
			specgloss_tex = self._make_texture(renderer, prim, gltf_gloss_tex, transfer_func = 2)#, gamma = 2.2) #sRGB for the color

			# Create a falloff texture to compute the reflection color. In order to emulate glossy Fresnel,
			# the side color is a simple blend between the reflection color and white based on the glossiness.
			sidecolor_tex=renderer.classes.TexBlend()
			sidecolor_tex.color_a=specgloss_tex
			sidecolor_tex.color_b=vray.AColor(1,1,1,1)

			falloff_tex = renderer.classes.TexFresnel()
			falloff_tex.fresnel_ior=falloff_tex.refract_ior=brdf.refract_ior
			falloff_tex.white_color=specgloss_tex
			falloff_tex.black_color=sidecolor_tex
			brdf.reflect= falloff_tex

			reflgloss_tex = self._make_texture(renderer, prim, gltf_gloss_tex, transfer_func = 0) #sRGB for the color
			
			brdf.reflect_glossiness = reflgloss_tex.out_alpha
			sidecolor_tex.blend_amount=reflgloss_tex.out_alpha

	# https://github.com/KhronosGroup/glTF/blob/master/extensions/2.0/Khronos/KHR_materials_clearcoat
	# gltf_mat - the extension passed as dictionary (json)
	def _create_KHR_materials_clearcoat(self, renderer, prim, gltf_mat, brdf):
		brdf.coat_color=vray.AColor(1,1,1,1)
		brdf.coat_ior=1.5
		# Clear coat amount
		gltf_clearcoat_texture=gltf_mat.get('clearcoatTexture')
		if gltf_clearcoat_texture!=None:
			gltf_clearcoat_texture=self._make_texture(renderer, None, gltf_clearcoat_texture, transfer_func = 0)
			
			split_tex=renderer.classes.TexAColorOp()
			split_tex.color_a=gltf_clearcoat_texture
			
			gltf_clearcoat_factor=gltf_mat.get('clearcoatFactor')
			if gltf_clearcoat_factor!=None:
				split_tex.mult_a=gltf_clearcoat_factor
			else:
				split_tex.mult_a=1.0

			brdf.coat_amount=split_tex.red
		else:
			gltf_clearcoat_factor=gltf_mat.get('clearcoatFactor')
			if gltf_clearcoat_factor!=None:
				brdf.coat_amount=gltf_clearcoat_factor

		# Clear coat roughness
		gltf_clearcoat_roughness_texture=gltf_mat.get('clearcoatRoughnessTexture')
		if gltf_clearcoat_roughness_texture!=None:
			gltf_clearcoat_roughness_texture=self._make_texture(renderer, None, gltf_clearcoat_roughness_texture, transfer_func = 0)
			
			split_tex=renderer.classes.TexAColorOp()
			split_tex.color_a=gltf_clearcoat_roughness_texture
			
			gltf_clearcoat_roughness_factor=gltf_mat.get('clearcoatRoughnessFactor')
			if gltf_clearcoat_roughness_factor!=None:
				split_tex.mult_a=gltf_clearcoat_roughness_factor
			else:
				split_tex.mult_a=1.0

			brdf.coat_glossiness=split_tex.green
		else:
			gltf_clearcoat_roughness_factor=gltf_mat.get('clearcoatRoughnessFactor')
			if gltf_clearcoat_roughness_factor!=None:
				brdf.coat_glossiness=gltf_clearcoat_roughness_factor

		# Coat normals
		clearcoat_normal_tex=self._make_texture(renderer, prim, gltf_mat.get('clearcoatNormalTexture'), transfer_func=0)
		if clearcoat_normal_tex!=None:
			flipGreen_tex=renderer.classes.TexNormalMapFlip()
			flipGreen_tex.texmap=clearcoat_normal_tex
			flipGreen_tex.flip_green=True
			brdf.coat_bump_map=flipGreen_tex
			brdf.coat_bump_type=1

	# https://github.com/KhronosGroup/glTF/blob/master/extensions/2.0/Khronos/KHR_materials_sheen
	# gltf_mat - the extension passed as dictionary (json)
	def _create_KHR_materials_sheen(self, renderer, prim, gltf_mat, brdf):
		brdf.sheen_color=vray.AColor(0,0,0,1)
		brdf.sheen_glossiness=0.0
		
		# Sheen amount
		gltf_sheen_texture=gltf_mat.get('sheenColorTexture')
		if gltf_sheen_texture!=None:
			gltf_sheen_texture=self._make_texture(renderer, None, gltf_sheen_texture, transfer_func = 2)
			brdf.sheen_color=gltf_sheen_texture
			
			gltf_sheen_factor=gltf_mat.get('sheenColorFactor')
			if gltf_sheen_factor!=None:
				brdf.sheen_color.color_mult=vray.Color(gltf_sheen_factor[0], gltf_sheen_factor[1], gltf_sheen_factor[2])
		else:
			gltf_sheen_factor=gltf_mat.get('sheenColorFactor')
			if gltf_sheen_factor!=None:
				brdf.sheen_color=vray.Color(gltf_sheen_factor[0], gltf_sheen_factor[1], gltf_sheen_factor[2])

		# Sheen roughness
		gltf_sheen_roughness_texture=gltf_mat.get('sheenRoughnessTexture')
		if gltf_sheen_roughness_texture!=None:
			gltf_sheen_roughness_texture=self._make_texture(renderer, None, gltf_sheen_roughness_texture, transfer_func = 0)
			
			split_tex=renderer.classes.TexAColorOp()
			split_tex.color_a=gltf_sheen_roughness_texture
			
			gltf_sheen_roughness_factor=gltf_mat.get('sheenRoughnessFactor')
			if gltf_sheen_roughness_factor!=None:
				split_tex.mult_a=gltf_sheen_roughness_factor
			else:
				split_tex.mult_a=1.0

			brdf.sheen_glossiness=split_tex.alpha
		else:
			gltf_sheen_roughness_factor=gltf_mat.get('sheenRoughnessFactor')
			if gltf_sheen_roughness_factor!=None:
				brdf.sheen_glossiness=gltf_sheen_roughness_factor

	def _create_material(self, renderer, prim, channel_names):
		gltf_mat = self.materials[prim.material]

		material = renderer.classes.MtlSingleBRDF()
		#material.double_sided=True
		brdf = renderer.classes.BRDFVRayMtl()
		emissive_strength = 1.0

		# fresnel should be true at all times
		brdf.fresnel = True
		brdf.option_glossy_fresnel = True # Glossy Fresnel produces a better result for rough reflective surfaces
		brdf.refract_ior = 1.5 # glTF uses IOR 1.5 by default
		brdf.reflect_depth = self.trace_depth
		brdf.refract_depth = self.trace_depth
		
		def_uvw_gen = renderer.classes.UVWGenChannel()
		def_uvw_gen.uvw_channel = -1
		def_uvw_gen.uvw_transform = TEXTURE_FLIP_TRANSFORM

		#double sided
		if gltf_mat.doubleSided != None:
			material.double_sided = gltf_mat.doubleSided
			brdf.option_double_sided = gltf_mat.doubleSided

		#pbrMetallicRoughness
		if gltf_mat.pbrMetallicRoughness!=None:
			self._pbr_metallic_roughness(renderer,prim,gltf_mat.pbrMetallicRoughness,brdf)

		# Extensions should be handled early as they may contains the diffuse map which we need to opacity and occlusion
		if gltf_mat.extensions != None:
			for gltf_ext in gltf_mat.extensions.keys():
				if gltf_ext == 'KHR_materials_pbrSpecularGlossiness':
					self._create_KHR_materials_pbrSpecularGlossiness(renderer, prim, gltf_mat.extensions.get('KHR_materials_pbrSpecularGlossiness'), brdf, channel_names)
				if gltf_ext == 'KHR_materials_transmission':
					self._create_KHR_materials_transmission(renderer, gltf_mat.extensions.get('KHR_materials_transmission'), brdf)
				if gltf_ext=='KHR_materials_clearcoat':
					self._create_KHR_materials_clearcoat(renderer, prim, gltf_mat.extensions.get('KHR_materials_clearcoat'), brdf)
				if gltf_ext=='KHR_materials_sheen':
					self._create_KHR_materials_sheen(renderer, prim, gltf_mat.extensions.get('KHR_materials_sheen'), brdf)
				if gltf_ext=='KHR_materials_emissive_strength':
					emissive_strength = gltf_mat.extensions.get('KHR_materials_emissive_strength').get('emissiveStrength')

		# Apply vertex color to the diffuse texture
		applyVertexColor(renderer, brdf, channel_names)

		#normal texture
		norm_tex = self._make_texture(renderer, prim, gltf_mat.normalTexture, transfer_func=0)
		if norm_tex != None:
			norm_scale = gltf_mat.normalTexture.get('scale')
			if norm_scale != None:
				norm_tex.color_mult = vray.AColor(norm_scale,norm_scale,norm_scale,norm_scale)

			flipGreen_tex=renderer.classes.TexNormalMapFlip()
			flipGreen_tex.texmap=norm_tex
			flipGreen_tex.flip_green=True
			brdf.bump_map=flipGreen_tex
			brdf.bump_type=1

		#emissive tex
		emissive_tex = self._make_texture(renderer, prim, gltf_mat.emissiveTexture, transfer_func = 2)
		emissive_factor = gltf_mat.emissiveFactor
		if emissive_tex != None:
			if emissive_factor != None:
				emissive_tex.color_mult = vray.AColor(
					emissive_factor[0] * emissive_strength,
					emissive_factor[1] * emissive_strength,
					emissive_factor[2] * emissive_strength, 1)
			
			brdf.self_illumination = emissive_tex
		else:
			if emissive_factor != None:
				brdf.self_illumination = vray.AColor(
					emissive_factor[0] * emissive_strength,
					emissive_factor[1] * emissive_strength,
					emissive_factor[2] * emissive_strength, 1)

		#occlusion tex
		useOcclusion = False
		if useOcclusion:
			occl_tex = self._make_texture(renderer,prim,gltf_mat.occlusionTexture, transfer_func = 0)
			if occl_tex != None:

				occl_scale = gltf_mat.occlusionTexture.get('strength')
				if occl_scale != None:
					occl_tex.color_mult = vray.AColor(occl_scale, occl_scale, occl_scale, occl_scale)

				split_maps = renderer.classes.TexAColorOp()
				split_maps.color_a = occl_tex
				if brdf.diffuse.getType()=="TexBitmap":
					brdf.diffuse.color_mult = split_maps.red
		
		#alpha
		if gltf_mat.alphaMode == "BLEND":
			alpha_split = renderer.classes.TexAColorOp()
			alpha_split.color_a = brdf.diffuse
			if self.thick_glass:
				# Use the opacity as inverse refraction color
				refract_tex = renderer.classes.TexFloatToColor()
				refract_tex.input=alpha_split.alpha
				refract_tex.invert=True
				brdf.refract = refract_tex
				brdf.refract_affect_shadows = True
			elif self.thin_glass:
				# Use the opacity as inverse refraction color and thin-walled mode
				refract_tex = renderer.classes.TexFloatToColor()
				refract_tex.input=alpha_split.alpha
				refract_tex.invert=True
				brdf.refract = refract_tex
				brdf.refract_thin_walled = True
				brdf.refract_affect_shadows = True
			else:
				# Use opacity as is
				brdf.opacity = alpha_split.alpha

		if gltf_mat.alphaMode == "MASK":
			
			alpha_split = renderer.classes.TexAColorOp()
			alpha_split.color_a = brdf.diffuse
			
			cutoff_tex = renderer.classes.TexCondition()
			cutoff_tex.op_a = alpha_split.alpha

			if gltf_mat.alphaCutoff != None:
				cutoff_tex.op_b = gltf_mat.alphaCutoff
			else:
				cutoff_tex.op_b = 0.5

			cutoff_tex.result_true = vray.AColor(1,1,1,1)
			cutoff_tex.result_false = vray.AColor(0,0,0,0)

			cutoff_tex.operation = 2 #(greater than)

			alpha_cutoff_split = renderer.classes.TexAColorOp()
			alpha_cutoff_split.color_a = cutoff_tex.color
			brdf.opacity = alpha_cutoff_split.alpha
			
		material.brdf = brdf
		
		return material
		
	def _create_vray_node(self, renderer, gltf_node):
		#important so when traversting the nodes again in scene update for animations we do not duplicate nodes
		gltf_node.vray_node_created = True

		if gltf_node.mesh != None:
				mesh = self.meshes[gltf_node.mesh]

				for prim in mesh.primitives:
					
					#Do not create new node for geometry if its already created
					node = renderer.classes.Node()
					prim.vray_node_ref = node
					node.transform = gltf_node.transform
					
					#Attributes
					meshVerts = vray.VectorList()
					meshNormals = vray.VectorList()
					meshFaces = vray.IntList()
					mesh_uvw1 = vray.VectorList()
					mesh_uvw1_faces = vray.IntList()

					# Check for morph targets, so we can skip unnecessary iterations and checks

					#pos morph targets
					if prim.targets != None:
						morph_pos_vals = np.zeros((len(self.accessors[prim.attributes.get('POSITION')].data), 3),dtype = float)
						for t_idx in range(0,len(prim.targets)):

							pos_idx = prim.targets[t_idx].get('POSITION')
							if pos_idx != None:
								try:
									morph_pos_vals = self.accessors[pos_idx].data*mesh.weights[t_idx] + morph_pos_vals
								except:
									#no weights given for these morph targets assume 1.0
									morph_pos_vals = self.accessors[pos_idx].data + morph_pos_vals

						pos_vals = morph_pos_vals + self.accessors[prim.attributes.get('POSITION')].data
						for posVal in pos_vals:
							meshVerts.append(vray.Vector(posVal[0],posVal[1],posVal[2]))
							
							self._get_camera_pos_data(gltf_node.transform * vray.Vector(posVal[0],posVal[1],posVal[2]))

						#Need numbers of verts to avarage scene pos
						self.scene_verts = self.scene_verts + len(meshVerts)
					else:
						for posVal in self.accessors[prim.attributes.get('POSITION')].data:
							meshVerts.append(vray.Vector(posVal[0],posVal[1],posVal[2]))

							self._get_camera_pos_data(gltf_node.transform * vray.Vector(posVal[0],posVal[1],posVal[2]))

						self.scene_verts = self.scene_verts + len(meshVerts)
					#Doing normals morph targets away from pos targets so numpy ndarray for positions loses all references so we can free the memory through garbage collector
					if prim.attributes.get('NORMAL') != None:
						
						if prim.targets != None:
							morph_normal_vals = np.zeros((len(self.accessors[prim.attributes.get('NORMAL')].data), 3),dtype = float)
							for t_idx in range(0,len(prim.targets)):
	
								pos_idx = prim.targets[t_idx].get('NORMAL')
								if pos_idx != None:
									try:
										morph_normal_vals = self.accessors[pos_idx].data*mesh.weights[t_idx] + morph_normal_vals
									except IndexError:
										#no weights given for these morph targets assume 1.0
										morph_normal_vals = self.accessors[pos_idx].data + morph_normal_vals

							normal_vals = morph_normal_vals + self.accessors[prim.attributes.get('NORMAL')].data
							for normVal in normal_vals:
								meshNormals.append(vray.Vector(normVal[0],normVal[1],normVal[2]))
						else:
							for normVal in self.accessors[prim.attributes.get('NORMAL')].data:
								meshNormals.append(vray.Vector(normVal[0],normVal[1],normVal[2]))

					if prim.indices != None:
						for scalVal in self.accessors[prim.indices].data:
							meshFaces.append(int(scalVal))
							
					channels = []
					channel_names = []
					texC_idx = 0

					# Add UVW channels
					while True:
						key = 'TEXCOORD_' + str(texC_idx)
						if prim.attributes.get(key) == None:
							break

						meshUvs = vray.VectorList()
						for uvVal in self.accessors[prim.attributes[key]].data:
							meshUvs.append(vray.Vector(uvVal[0],uvVal[1],0.0))
						
						uvw_channel = []
						uvw_channel.append(texC_idx)
						uvw_channel.append(meshUvs)
						uvw_channel.append(meshFaces)
						channels.append(uvw_channel)
						channel_names.append(key)

						texC_idx += 1

					# Add vertex color channels
					vertexColor_idx=0
					while True:
						key='COLOR_'+str(vertexColor_idx)
						if prim.attributes.get(key)==None:
							break
						meshColors=vray.VectorList()
						for colVal in self.accessors[prim.attributes[key]].data:
							meshColors.append(vray.Vector(colVal[0], colVal[1], colVal[2]))

						color_channel = []
						color_channel.append(texC_idx+vertexColor_idx)
						color_channel.append(meshColors)
						color_channel.append(meshFaces)
						channels.append(color_channel)
						channel_names.append(key)

						vertexColor_idx += 1

					geometry = renderer.classes.GeomStaticMesh()
					geometry.vertices = meshVerts
					
					# Only export normals if they are specified; if we export a zero-length array, the mesh
					# will not render correctly.
					if len(meshNormals)>0:
						geometry.normals = meshNormals
					
					geometry.faces = meshFaces
					geometry.map_channels = channels
					geometry.map_channels_names = channel_names
					
					node.geometry = geometry

					if self.use_only_default_mat != True:
						if prim.material != None:
							node.material = self._create_material(renderer, prim, channel_names)
						else:
							mat = renderer.classes.MtlSingleBRDF()
							mat.brdf = renderer.classes.BRDFVRayMtl()
							mat.double_sided= True
							node.material = mat
					else:
						testUtils._set_testing_material(renderer, node)
				
		if gltf_node.camera != None:
			
			self.has_camera = True
			gltf_camera = self.cameras[gltf_node.camera]
			renderView = renderer.classes.RenderView()
			
			renderView.transform = gltf_node.transform

			self.camTransform = gltf_node.transform
			wind_size = renderer.size
			if gltf_camera.camera_type == 'perspective':
				#calculate horizontal FOV for vray
				renderView.fov = 2.0*math.atan((0.5*wind_size[0]) / ( 0.5*wind_size[1] / math.tan(parserUtils.none_to_val(gltf_camera.yfov,1.0))))

			elif gltf_camera.camera_type == 'orthographic':
				renderView.orthographic = True
				if gltf_camera.ymag != None:
					renderView.orthographicWidth = gltf_camera.ymag 

			if gltf_camera.zfar != None:
				# renderView.clipping = True
				renderView.clipping_far = gltf_camera.zfar
			if gltf_camera.znear != None:
				# renderView.clipping = True
				renderView.clipping_near = gltf_camera.znear

		if gltf_node.extensions != None:

			# Lights
			light_ext = gltf_node.extensions.get('KHR_lights_punctual')
			if light_ext != None:

				light_idx = light_ext.get('light')

				if light_idx != None:
					gltf_light = self.lights[light_idx]

					# Create the vray light node
					if gltf_light.mtype == 'spot':
						v_light = renderer.classes.LightSpot()
						v_light.units = 2 # Candela (cd=lm/sr) as units

						inner_c_a = gltf_light.spot_attr.get('innerConeAngle')
						outer_c_a = gltf_light.spot_attr.get('outerConeAngle')

						# Note that in V-Ray, the entire angle is measured (it's a diameter),
						# not just the half angle from the center of the hotspot, so we need to multiply by 2.0
						if outer_c_a != None:
							v_light.coneAngle = outer_c_a*2.0
						else:
							v_light.coneAngle = math.pi/4.0
						if inner_c_a != None:
							#negative to start inside the spot cone
							v_light.penumbraAngle = (inner_c_a - outer_c_a)*2.0
						else:
							v_light.penumbraAngle = 0

					elif gltf_light.mtype == 'point':
						v_light = renderer.classes.LightOmni()
						v_light.units = 2 # Candela (cd=lm/sr) as units

					elif gltf_light.mtype == 'directional':
						v_light = renderer.classes.MayaLightDirect()
						v_light.units = 2 # Lux (lx=lm/m/m as units)

					#Color
					if gltf_light.color != None:
						v_light.color = vray.AColor(gltf_light.color[0], gltf_light.color[1], gltf_light.color[2],1.0)
					else:
						v_light.color = vray.AColor(1.0, 1.0, 1.0,1.0)
					
					#Intensity
					if gltf_light.intensity != None:
						v_light.intensity = gltf_light.intensity
					else:
						v_light.intensity = 1.0

					#TODO: VRay light distance cutoff?

					#transforms
					v_light.transform = gltf_node.transform
	
	#Geom update for morph target update
	def _update_node_geom(self,renderer,gltf_node):
		if gltf_node.mesh != None:
			mesh = self.meshes[gltf_node.mesh]

			for prim in mesh.primitives:
				
				#POSITION MORPH TARGETS
				if prim.targets != None:
					if prim.attributes.get('POSITION') != None:

						meshVerts = vray.VectorList()
						morph_pos_vals = np.zeros((len(self.accessors[prim.attributes.get('POSITION')].data), 3),dtype = float)

						for t_idx in range(0,len(prim.targets)):
							pos_idx = prim.targets[t_idx].get('POSITION')
							if pos_idx != None:
								try:
									morph_pos_vals = self.accessors[pos_idx].data*mesh.weights[t_idx] + morph_pos_vals
								except IndexError:
									#no weights given for these morph targets assume 1.0
									morph_pos_vals = self.accessors[pos_idx].data + morph_pos_vals

						pos_vals = morph_pos_vals + self.accessors[prim.attributes.get('POSITION')].data
						for posVal in pos_vals:
							meshVerts.append(vray.Vector(posVal[0],posVal[1],posVal[2]))
						#update the actual vray node geometry
						prim.vray_node_ref.geometry.vertices = meshVerts

					#NORMAL MORPH TARGETS
					if prim.attributes.get('NORMAL') != None:

						meshNormals = vray.VectorList()
						morph_normal_vals = np.zeros((len(self.accessors[prim.attributes.get('NORMAL')].data), 3),dtype = float)

						for t_idx in range(0,len(prim.targets)):

							pos_idx = prim.targets[t_idx].get('NORMAL')
							if pos_idx != None:
								try:
									morph_normal_vals = self.accessors[pos_idx].data*mesh.weights[t_idx] + morph_normal_vals

								except IndexError:
									#no weights given for these morph targets assume 1.0
									morph_normal_vals = self.accessors[pos_idx].data + morph_normal_vals

						normal_vals = morph_normal_vals + self.accessors[prim.attributes.get('NORMAL')].data
						for normVal in normal_vals:
							meshNormals.append(vray.Vector(normVal[0],normVal[1],normVal[2]))
						#update the actual vray node geometry
						prim.vray_node_ref.geometry.normals = meshNormals

	#called for nodes with meshes, as we create vray node for every primitive Geometry
	def _update_nodes(self,renderer,gltf_node):
		if gltf_node.mesh != None:
			mesh = self.meshes[gltf_node.mesh]

			for prim in mesh.primitives:
				prim.vray_node_ref.transform = gltf_node.transform

	def _traverse_nodes(self, renderer, gltf_node):
		#calculate transform for current node
		gltf_node.local_transform = self._calculate_node_raw_transforms(gltf_node)
		
		#if there is no transform just inherit the previous one so it can be passed to children
		if gltf_node.local_transform != None:
			gltf_node.transform = vray.Transform(gltf_node.transform.matrix * gltf_node.local_transform.matrix,gltf_node.transform.matrix*gltf_node.local_transform.offset + gltf_node.transform.offset)
		
		#create and init the vray node, if it is already created updater all primitive geometry nodes under it
		if gltf_node.vray_node_created == True:
			self._update_nodes(renderer,gltf_node)
		else:
			self._create_vray_node(renderer,gltf_node)
		
		#traverse children recursively, children inherit root node transform as per gltf documentation
		if gltf_node.children != None:
			for child_idx in gltf_node.children:
				self.nodes[child_idx].transform = gltf_node.transform
				self._traverse_nodes(renderer, self.nodes[child_idx])

	#called once in the first init of the scene
	def _init_scene(self,renderer):
		for scene in self.scenes:
			for root_node in scene.nodes:
				self._traverse_nodes(renderer, self.nodes[root_node])
		for anim in self.animations:
			anim.init(self.accessors)

		
	def _update_scene(self,renderer):
		for node in self.nodes:
			#reset node transforms for full recalculations as in APPSDK node() does not have children
			node.transform = vray.Transform(vray.Matrix.identity, vray.Vector(0, 0, 0))
			self._update_node_geom(renderer,node)
		for scene in self.scenes:
			for root_node in scene.nodes:
				self._traverse_nodes(renderer, self.nodes[root_node])
		for node in self.nodes:
			for val in node.transform_change:
				val = None
		
	def _parse_json_data(self,fileData):
		parserUtils._parse_json_part(fileData,self.buffers,'buffers',parserUtils.Buffer.fromDict)
		parserUtils._parse_json_part(fileData,self.bufferViews,'bufferViews',parserUtils.BufferView.fromDict)
		parserUtils._parse_json_part(fileData,self.accessors,'accessors',parserUtils.Accessor.fromDict)
		parserUtils._parse_json_part(fileData,self.nodes,'nodes',parserUtils.Node.fromDict, errorwarn = False)
		parserUtils._parse_json_part(fileData,self.meshes,'meshes',parserUtils.Mesh.fromDict, errorwarn = False)
		parserUtils._parse_json_part(fileData,self.materials,'materials',parserUtils.Material.fromDict, errorwarn = False)
		parserUtils._parse_json_part(fileData,self.scenes,'scenes',parserUtils.Scene.fromDict)
		parserUtils._parse_json_part(fileData,self.images,'images',parserUtils.Image.fromDict, errorwarn = False)
		parserUtils._parse_json_part(fileData,self.textures,'textures',parserUtils.Texture.fromDict, errorwarn = False)
		parserUtils._parse_json_part(fileData,self.samplers,'samplers',parserUtils.Sampler.fromDict, errorwarn = False)
		parserUtils._parse_json_part(fileData,self.cameras,'cameras',parserUtils.Camera.fromDict, errorwarn = False)

		parserUtils._parse_json_part(fileData,self.animations,'animations',parserUtils.Animation.fromDict, errorwarn = True)
		# get longest animation by its input global time incase user does not define animation time or number of frames to render 
		for anim in self.animations:
			anim.calc_max_time(self.accessors)
			self.animation_time = max(anim.anim_time,self.animation_time)
			#important call to setup weight animation

		if len(self.cameras) < 1:
			self.has_camera = False 
		dicts = fileData.get('extensionsUsed')
		if dicts != None:
			for ext in dicts:
				self.extensions.append(ext)

		exts = fileData.get('extensions')
		if exts != None:
			light_ext = exts.get('KHR_lights_punctual')
			if light_ext != None:
				lights = light_ext.get('lights')
				if lights != None:
					for light in lights:
						self.lights.append(parserUtils.Light.fromDict(light))
	
	def parseScene(self,file_name = '', vrenderer = None, dumpToJson = False, jsonFileName = 'jsonDump.txt'):
		#get files location for external .bin files
		self.file_loc = os.path.dirname(os.path.abspath(file_name))

		self.currentOffset = 0

		if file_name.endswith('.gltf'):
					
			self.fileType = 'gltf'

			with open(file_name) as gltf_scene:

				fileData = json.load(gltf_scene)
				self._parse_json_data(fileData)
					
		elif file_name.endswith('glb'):
			self.fileType = 'glb'
			#GLB Header [0] ASCII string 'gltf',[1] version,[2] - length in bytes
			GLB_header = np.fromfile(file_name, dtype='<u4',count = 3, offset = 0)
			fileLength = GLB_header[2]
			self.currentOffset = 12 

			# Parsing Chunk 0 - should be ASCII representation of the JSON data
			JSON_info = np.fromfile(file_name, dtype='<u4',count = 2 , offset = self.currentOffset)
			self.currentOffset += 8

			# Parsing the Json contents from Chunk0 without numpy as it is not so optimal
			with open(file_name,'rb') as glb_file:
				glb_file.seek(self.currentOffset)
				json_contents = glb_file.read(JSON_info[0])
				
			fileData = json.loads(json_contents.decode("utf-8"))
			#CHUNK1 skipping 2 uint32 = chunkLengthInBytes , typeOfChunk 
			self.currentOffset+=JSON_info[0] + 8

			if dumpToJson == True:
				print("Dumping gltf to json")
				with open(jsonFileName, 'w') as outfile:
					json.dump(fileData,outfile)
						
			self._parse_json_data(fileData)
			
		self._parseSceneData(file_name)
			
		# Setup objects&plugins after json and raw data has been parsed
		self._init_scene(vrenderer)

		# Create a VRayScene node with the environment scene if one is specified
		if self.environment_scene!=None:
			vrayScene=vrenderer.classes.VRayScene()
			vrayScene.filepath=self.environment_scene
			vrayScene.flip_axis=1 # Automatically detect up direction based on SettingsUnitsInfo
			vrayScene.transform=vray.Matrix.identity

		# Create an infinite plane
		if self.use_ground_plane:
			planeGeom=vrenderer.classes.GeomPlane()
			planeBRDF=vrenderer.classes.BRDFVRayMtl()
			planeNode=vrenderer.classes.Node()
			planeNode.geometry=planeGeom;
			planeNode.material=planeBRDF;
			planePos=self.minVertBound
			planeNode.transform=vray.Transform(vray.Matrix(vray.Vector(1,0,0), vray.Vector(0,0,-1), vray.Vector(0,1,0)), planePos)
	
		cam_trans = vray.Transform(vray.Matrix.identity,vray.Vector())
		#calc avarage scene pos
		#self.average_scene_pos = self.average_scene_pos/self.scene_verts
		self.average_scene_pos=(self.maxVertBound+self.minVertBound)*0.5
		if self.use_default_cam or len(self.cameras)<1:
			camLookAt=self.average_scene_pos
			if self.average_scene_pos_or != None:
				camLookAt=self.average_scene_pos_or

			cam_trans = cameraUtils.set_up_default_camera(
				vrenderer,
				self.minVertBound,
				self.maxVertBound,
				camLookAt,
				rot_angles = self.default_cam_rot,
				cam_moffset = self.default_cam_moffset,
				fov = math.radians(self.default_cam_fov),
				default_cam_pos = self.default_cam_pos,
				zoom = self.default_cam_zoom,
				view = self.default_cam_view
			)

		if self.lighting:
			# load HDR file and use spherical mapping
			uvwgen = vrenderer.classes.UVWGenEnvironment()
			uvwgen.mapping_type = 'spherical'
			uvwgen.uvw_matrix = vray.Matrix(
					vray.Vector(-1, 0, 0),
					vray.Vector(0, 0, 1),
					vray.Vector(0, 1, 0))

			bitmap = vrenderer.classes.BitmapBuffer()
			bitmap.transfer_function = 0
			bitmap.file = self.lighting

			texture = vrenderer.classes.TexBitmap()
			texture.uvwgen = uvwgen
			texture.bitmap = bitmap

			light = vrenderer.classes.LightDome()
			light.dome_spherical = True
			light.intensity = 1
			light.invisible = not self.render_skybox

			light.dome_tex = texture
			light.use_dome_tex = True

		if len(self.lights) < 1 and self.lighting is None:
			# Default lights
			print("[parserInfo] Scene has no lights, creating default lights")

			upVector=vray.Vector(0,1,0)

			renderView = vrenderer.classes.RenderView.getInstanceOrCreate()

			# Create a dome (environment) light
			domeLight = vrenderer.classes.LightDome()
			domeLight.transform = vray.Transform(computeNormalMatrix(upVector), vray.Vector(0, 0, 0))
			domeLight.invisible = True
			domeLight.intensity = 0.2

			# Create a directional light; use SunLight (although MayaLightDirect is also possible)
			directionalLight = vrenderer.classes.SunLight()
			directionalLight.color_mode=1 # Override sun color and intensity

			isAutoTopView=False
			diag=self.maxVertBound-self.minVertBound
			if self.default_cam_pos==None and self.default_cam_view=='auto' and diag.y<diag.x and diag.y<diag.z:
				lightDir = vray.Vector(0.5, 1, -0.5).normalize()
			else:
				lightDir = vray.Vector(0.5, 1, 0.5).normalize()

			directionalLight.transform = vray.Transform(computeNormalMatrix(lightDir), vray.Vector(0,0,0))
			directionalLight.size_multiplier=4

	#update animations
	def _setup_frame(self,frame,vrenderer):
		
		self.current_time = frame/self.animation_fps

		for animation in self.animations:
			animation.update(self)		
			
		self._update_scene(vrenderer)

	def clean_up(self):
		for image in self.images:
			#unlink temp files
			if image.local != True:
				os.remove(image.file_loc)
