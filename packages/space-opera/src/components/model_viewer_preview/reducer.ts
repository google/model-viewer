import {GltfModel} from '@google/model-viewer-editing-adapter/lib/main.js'
import {ModelViewerElement} from '@google/model-viewer/lib/model-viewer';

import {registerStateMutator} from '../../space_opera_base.js';
import {State} from '../../space_opera_base.js';
import {getGltfEdits, GltfEdits, INITIAL_GLTF_EDITS} from '../model_viewer_preview/gltf_edits.js';

/** The user has requested a new GLTF/GLB for editing. */
export const dispatchGltfUrl =
    registerStateMutator('SET_GLTF_URL', (state: State, gltfUrl?: string) => {
      state.gltfUrl = gltfUrl;
    });

class DispatchGltfArgs {
  constructor(
      readonly gltf: GltfModel|undefined, readonly edits: GltfEdits,
      readonly animationNames: string[], readonly jsonString: string) {
  }
}

const dispatchGltf = registerStateMutator(
    'SET_GLTF', (state: State, args?: DispatchGltfArgs) => {
      if (!args) {
        throw new Error(`No args given!`);
      }
      const gltf = args.gltf;
      if (gltf !== undefined && state.gltf === gltf) {
        throw new Error(
            `Same gltf was given! Only call this upon actual change`);
      }
      state.gltf = gltf;

      const edits = args.edits;
      if (!edits) {
        throw new Error(`Must give valid edits!`);
      }
      if (state.edits === edits) {
        throw new Error(
            `Same edits was given! Only call this upon actual change`);
      }
      state.edits = edits;
      state.origEdits = edits;
      state.animationNames = args.animationNames;
      state.gltfJsonString = args.jsonString;
    });

/**
 * Helper async function
 */
export function dispatchGltfAndEdits(gltf: GltfModel|undefined) {
  // NOTE: This encodes a design decision: Whether or not we reset edits
  // upon loading a new GLTF. It may be sensible to not reset edits and just
  // apply previous edits to the same, but updated, GLTF. That could be
  // later exposed as an option, and in that case we would simply apply the
  // existing edits (with null previousEdits) to this new model and not
  // dispatch new edits.
  const edits = gltf ? getGltfEdits(gltf) : {...INITIAL_GLTF_EDITS};
  dispatchGltf(new DispatchGltfArgs(
      gltf, edits, (gltf?.animationNames) ?? [], (gltf?.jsonString) ?? ''));
}

/** Only use in intialization. */
export const dispatchModelViewer = registerStateMutator(
    'MODEL_VIEWER', (state: State, modelViewer?: ModelViewerElement) => {
      state.modelViewer = modelViewer;
    })