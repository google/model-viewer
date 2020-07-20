/**
 * @license
 * Copyright 2020 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the 'License');
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an 'AS IS' BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

/**
 * model-viewer config
 */
export interface ModelViewerConfig {
  animationName?: string;
  autoRotate?: boolean;
  autoplay?: boolean;
  bgColor?: string;
  cameraControls?: boolean;
  // Note user may set camera orbit from mouse drag or UI input.
  cameraOrbit?: string;
  cameraTarget?: string;
  fieldOfView?: string;
  environmentImage?: string;  // IBL/HDRI lighting
  exposure?: number;  // Environment for hdr environment, used as ibl intensity
  shadowIntensity?: number;
  shadowSoftness?: number;
  maxCameraOrbit?: string;
  maxFov?: string;  // Field of view
  minCameraOrbit?: string;
  minFov?: string;  // Field of view
  src?: string;
  // This doesn't correspond to a modelviewer attribute, but ultimately MVC is
  // app state - not MV state.
  useEnvAsSkybox?: boolean;
}
