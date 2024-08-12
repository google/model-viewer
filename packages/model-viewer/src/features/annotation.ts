
/* @license
 * Copyright 2019 Google LLC. All Rights Reserved.
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
 */

import {Matrix4, Vector3} from 'three';

import ModelViewerElementBase, {$needsRender, $onModelLoad, $scene, $tick, toVector2D, toVector3D, Vector2D, Vector3D} from '../model-viewer-base.js';
import {Hotspot, HotspotConfiguration} from '../three-components/Hotspot.js';
import {Constructor} from '../utilities.js';

const $hotspotMap = Symbol('hotspotMap');
const $mutationCallback = Symbol('mutationCallback');
const $observer = Symbol('observer');
const $addHotspot = Symbol('addHotspot');
const $removeHotspot = Symbol('removeHotspot');

const worldToModel = new Matrix4();

export declare type HotspotData = {
  position: Vector3D,
  normal: Vector3D,
  canvasPosition: Vector3D,
  facingCamera: boolean,
}

export declare interface AnnotationInterface {
  updateHotspot(config: HotspotConfiguration): void;
  queryHotspot(name: string): HotspotData|null;
  positionAndNormalFromPoint(pixelX: number, pixelY: number):
      {position: Vector3D, normal: Vector3D, uv: Vector2D|null}|null;
  surfaceFromPoint(pixelX: number, pixelY: number): string|null;
}

/**
 * AnnotationMixin implements a declarative API to add hotspots and annotations.
 * Child elements of the <model-viewer> element that have a slot name that
 * begins with "hotspot" and data-position and data-normal attributes in
 * the format of the camera-target attribute will be added to the scene and
 * track the specified model coordinates.
 */
export const AnnotationMixin = <T extends Constructor<ModelViewerElementBase>>(
    ModelViewerElement: T): Constructor<AnnotationInterface>&T => {
  class AnnotationModelViewerElement extends ModelViewerElement {
    private[$hotspotMap] = new Map<string, Hotspot>();
    private[$mutationCallback] = (mutations: Array<unknown>) => {
      mutations.forEach((mutation) => {
        // NOTE: Be wary that in ShadyDOM cases, the MutationRecord
        // only has addedNodes and removedNodes (and no other details).
        if (!(mutation instanceof MutationRecord) ||
            mutation.type === 'childList') {
          (mutation as MutationRecord).addedNodes.forEach((node) => {
            this[$addHotspot](node);
          });
          (mutation as MutationRecord).removedNodes.forEach((node) => {
            this[$removeHotspot](node);
          });
          this[$needsRender]();
        }
      });
    };
    private[$observer] = new MutationObserver(this[$mutationCallback]);

    connectedCallback() {
      super.connectedCallback();

      for (let i = 0; i < this.children.length; ++i) {
        this[$addHotspot](this.children[i]);
      }

      const {ShadyDOM} = self as any;

      if (ShadyDOM == null) {
        this[$observer].observe(this, {childList: true});
      } else {
        this[$observer] =
            ShadyDOM.observeChildren(this, this[$mutationCallback]);
      }
    }

    disconnectedCallback() {
      super.disconnectedCallback();

      const {ShadyDOM} = self as any;

      if (ShadyDOM == null) {
        this[$observer].disconnect();
      } else {
        ShadyDOM.unobserveChildren(this[$observer]);
      }
    }

    [$onModelLoad]() {
      super[$onModelLoad]();

      const scene = this[$scene];
      scene.forHotspots((hotspot) => {
        scene.updateSurfaceHotspot(hotspot);
      });
    }

    [$tick](time: number, delta: number) {
      super[$tick](time, delta);
      const scene = this[$scene];
      const {annotationRenderer} = scene;
      const camera = scene.getCamera();

      if (scene.shouldRender()) {
        scene.animateSurfaceHotspots();
        scene.updateHotspotsVisibility(camera.position);
        annotationRenderer.domElement.style.display = '';
        annotationRenderer.render(scene, camera);
      }
    }

    /**
     * Since the data-position and data-normal attributes are not observed, use
     * this method to move a hotspot. Keep in mind that all hotspots with the
     * same slot name use a single location and the first definition takes
     * precedence, until updated with this method.
     */
    updateHotspot(config: HotspotConfiguration) {
      const hotspot = this[$hotspotMap].get(config.name);

      if (hotspot == null) {
        return;
      }

      hotspot.updatePosition(config.position);
      hotspot.updateNormal(config.normal);
      hotspot.surface = config.surface;
      this[$scene].updateSurfaceHotspot(hotspot);
      this[$needsRender]();
    }

    /**
     * This method returns in-scene data about a requested hotspot including
     * its position in screen (canvas) space and its current visibility.
     */
    queryHotspot(name: string): HotspotData|null {
      const hotspot = this[$hotspotMap].get(name);
      if (hotspot == null) {
        return null;
      }

      const position = toVector3D(hotspot.position);
      const normal = toVector3D(hotspot.normal);
      const facingCamera = hotspot.facingCamera;

      const scene = this[$scene];
      const camera = scene.getCamera();
      const vector = new Vector3();

      vector.setFromMatrixPosition(hotspot.matrixWorld);
      vector.project(camera);

      const widthHalf = scene.width / 2;
      const heightHalf = scene.height / 2;

      vector.x = (vector.x * widthHalf) + widthHalf;
      vector.y = -(vector.y * heightHalf) + heightHalf;

      const canvasPosition =
          toVector3D(new Vector3(vector.x, vector.y, vector.z));

      if (!Number.isFinite(canvasPosition.x) ||
          !Number.isFinite(canvasPosition.y)) {
        return null;
      }

      return {position, normal, canvasPosition, facingCamera};
    }

    /**
     * This method returns the model position, normal and texture coordinate
     * of the point on the mesh corresponding to the input pixel coordinates
     * given relative to the model-viewer element. The position and normal
     * are returned as strings in the format suitable for putting in a
     * hotspot's data-position and data-normal attributes. If the mesh is
     * not hit, the result is null.
     */
    positionAndNormalFromPoint(pixelX: number, pixelY: number):
        {position: Vector3D, normal: Vector3D, uv: Vector2D|null}|null {
      const scene = this[$scene];
      const ndcPosition = scene.getNDC(pixelX, pixelY);

      const hit = scene.positionAndNormalFromPoint(ndcPosition);
      if (hit == null) {
        return null;
      }

      worldToModel.copy(scene.target.matrixWorld).invert();
      const position = toVector3D(hit.position.applyMatrix4(worldToModel));
      const normal = toVector3D(hit.normal.transformDirection(worldToModel));

      let uv = null;
      if (hit.uv != null) {
        uv = toVector2D(hit.uv);
      }

      return {position: position, normal: normal, uv: uv};
    }

    /**
     * This method returns a dynamic hotspot ID string of the point on the mesh
     * corresponding to the input pixel coordinates given relative to the
     * model-viewer element. The ID string can be used in the data-surface
     * attribute of the hotspot to make it follow this point on the surface even
     * as the model animates. If the mesh is not hit, the result is null.
     */
    surfaceFromPoint(pixelX: number, pixelY: number): string|null {
      const scene = this[$scene];
      const ndcPosition = scene.getNDC(pixelX, pixelY);

      return scene.surfaceFromPoint(ndcPosition);
    }

    private[$addHotspot](node: Node) {
      if (!(node instanceof HTMLElement &&
            node.slot.indexOf('hotspot') === 0)) {
        return;
      }

      let hotspot = this[$hotspotMap].get(node.slot);

      if (hotspot != null) {
        hotspot.increment();
      } else {
        hotspot = new Hotspot({
          name: node.slot,
          position: node.dataset.position,
          normal: node.dataset.normal,
          surface: node.dataset.surface,
        });
        this[$hotspotMap].set(node.slot, hotspot);
        this[$scene].addHotspot(hotspot);
      }
      this[$scene].queueRender();
    }

    private[$removeHotspot](node: Node) {
      if (!(node instanceof HTMLElement)) {
        return;
      }

      const hotspot = this[$hotspotMap].get(node.slot);

      if (!hotspot) {
        return;
      }

      if (hotspot.decrement()) {
        this[$scene].removeHotspot(hotspot);
        this[$hotspotMap].delete(node.slot);
      }
      this[$scene].queueRender();
    }
  }

  return AnnotationModelViewerElement;
};
