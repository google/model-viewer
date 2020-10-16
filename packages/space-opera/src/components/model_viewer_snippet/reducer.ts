import {ModelViewerConfig} from '@google/model-viewer-editing-adapter/lib/main.js';

import {registerStateMutator} from '../../space_opera_base.js';
import {State} from '../../space_opera_base.js';
import {INITIAL_CAMERA} from '../camera_settings/camera_state.js';

/** Use when the user wants to load a new config (probably from a snippet). */
export const dispatchConfig = registerStateMutator(
    'MODEL_VIEWER_CONFIG', (state: State, config?: ModelViewerConfig) => {
      if (!config) {
        throw new Error('No config given!');
      }
      if (config === state.config) {
        throw new Error(`Do not modify state.config in place!`);
      }
      state.config = config;

      // Clear camera settings. This is optional!
      state.camera = INITIAL_CAMERA;

      // Clear initialCamera too, as ModelViewerPreview will update this.
      state.initialCamera = INITIAL_CAMERA;
      delete state.currentCamera;
    });
