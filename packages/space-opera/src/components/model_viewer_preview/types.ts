import {GltfModel} from '@google/model-viewer-editing-adapter/lib/main';
import {ModelViewerElement} from '@google/model-viewer/lib/model-viewer';

import {Material, Texture, TexturesById} from '../materials_panel/material_state.js';

/**
 * All the state that the user can edit. It's important to capture all that in a
 * single object so components can easily subscribe to changes on a single
 * object.
 */
export interface GltfEdits {
  texturesById: TexturesById;
  materials: Material[];
}

/**
 * Use this to initialize references in components.
 */
export const INITIAL_GLTF_EDITS: GltfEdits = {
  texturesById: new Map<string, Texture>(),
  materials: [],
};

export interface GltfInfo {
  gltfUrl?: string;
  gltf?: GltfModel;
  gltfJsonString: string;
}

export interface ModelViewerInfo {
  modelViewer?: ModelViewerElement
}