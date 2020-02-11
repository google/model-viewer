
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

import {Matrix4, Raycaster, Vector2, Vector3} from 'three';
import {CSS2DObject, CSS2DRenderer} from 'three/examples/jsm/renderers/CSS2DRenderer.js';

import ModelViewerElementBase, {$onResize, $scene, $tick, toVector3D, Vector3D} from '../model-viewer-base.js';
import {normalizeUnit} from '../styles/conversions.js';
import {NumberNode, parseExpressions} from '../styles/parsers.js';
import {Constructor} from '../utilities.js';

const $annotationRenderer = Symbol('annotationRenderer');
const $updateHotspots = Symbol('updateHotspots');
const $hotspotMap = Symbol('hotspotMap');
const $mutationCallback = Symbol('mutationCallback');
const $observer = Symbol('observer');
const $pixelPosition = Symbol('pixelPosition')
const $addHotspot = Symbol('addHotspot');
const $removeHotspot = Symbol('removeHotspot');

const raycaster = new Raycaster();

/**
 * Hotspots are configured by slot name, and this name must begin with "hotspot"
 * to be recognized. The position and normal strings are in the form of the
 * camera-target attribute and default to "0m 0m 0m" and "0m 1m 0m",
 * respectively.
 */
interface HotspotConfiguration {
  name: string;
  position?: string;
  normal?: string;
}

/**
 * The Hotspot object is a reference-counted slot. If decrement() returns true,
 * it should be removed from the tree so it can be garbage-collected.
 */
export class Hotspot extends CSS2DObject {
  public normal: Vector3;
  private referenceCount: number;

  constructor(config: HotspotConfiguration) {
    const wrapper = document.createElement('div');
    wrapper.classList.add('annotation-wrapper');
    const slot = document.createElement('slot');
    slot.name = config.name;
    wrapper.appendChild(slot);
    super(wrapper);
    this.normal = new Vector3(0, 1, 0);
    this.updatePosition(config.position);
    this.updateNormal(config.normal);
    this.referenceCount = 1;
  }

  /**
   * Call this when adding elements to the same slot to keep track.
   */
  increment() {
    ++this.referenceCount;
  }

  /**
   * Call this when removing elements from the slot; returns true when the slot
   * is unused.
   */
  decrement(): boolean {
    return --this.referenceCount <= 0;
  }

  /**
   * Change the position of the hotspot to the input string, in the same format
   * as the data-position attribute.
   */
  updatePosition(position?: string) {
    if (position == null)
      return;
    const positionNodes = parseExpressions(position)[0].terms;
    for (let i = 0; i < 3; ++i) {
      this.position.setComponent(
          i, normalizeUnit(positionNodes[i] as NumberNode<'m'>).number);
    }
  }

  /**
   * Change the hotspot's normal to the input string, in the same format as the
   * data-normal attribute.
   */
  updateNormal(normal?: string) {
    if (normal == null)
      return;
    const normalNodes = parseExpressions(normal)[0].terms;
    for (let i = 0; i < 3; ++i) {
      this.normal.setComponent(
          i, normalizeUnit(normalNodes[i] as NumberNode<'m'>).number);
    }
  }
}

export declare interface AnnotationInterface {
  updateHotspot(config: HotspotConfiguration): void;
  positionAndNormalFromPoint(pixelX: number, pixelY: number):
      {position: Vector3D, normal: Vector3D}|null
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
    private[$annotationRenderer] = new CSS2DRenderer();
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
        }
      });
    };
    private[$observer] = new MutationObserver(this[$mutationCallback]);

    private[$pixelPosition] = new Vector2();

    constructor(...args: Array<any>) {
      super(...args);

      const {domElement} = this[$annotationRenderer];
      domElement.classList.add('annotation-container');
      this.shadowRoot!.querySelector('.container')!.appendChild(domElement);
    }

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
    }

    /**
     * This method returns the world position and normal of the point on the
     * mesh corresponding to the input pixel coordinates given relative to the
     * model-viewer element. The position and normal are returned as strings in
     * the format suitable for putting in a hotspot's data-position and
     * data-normal attributes. If the mesh is not hit, position returns the
     * empty string.
     */
    positionAndNormalFromPoint(pixelX: number, pixelY: number):
        {position: Vector3D, normal: Vector3D}|null {
      const {width, height} = this[$scene];
      this[$pixelPosition]
          .set(pixelX / width, pixelY / height)
          .multiplyScalar(2)
          .subScalar(1);
      this[$pixelPosition].y *= -1;
      raycaster.setFromCamera(this[$pixelPosition], this[$scene].getCamera());
      const hits = raycaster.intersectObject(this[$scene], true);

      if (hits.length === 0) {
        return null;
      }

      const hit = hits[0];
      if (hit.face == null) {
        return null;
      }

      const worldToPivot =
          new Matrix4().getInverse(this[$scene].pivot.matrixWorld);
      const position = toVector3D(hit.point.applyMatrix4(worldToPivot));
      const normal =
          toVector3D(hit.face.normal.applyMatrix4(hit.object.matrixWorld)
                         .applyMatrix4(worldToPivot));
      return {position: position, normal: normal};
    }

    [$tick](time: number, delta: number) {
      super[$tick](time, delta);
      this[$updateHotspots]();
      this[$annotationRenderer].render(this[$scene], this[$scene].activeCamera);
    }

    [$onResize](e: {width: number, height: number}) {
      super[$onResize](e);
      this[$annotationRenderer].setSize(e.width, e.height);
    }

    [$updateHotspots]() {
      const {children} = this[$scene].pivot;
      for (let i = 0, l = children.length; i < l; i++) {
        const hotspot = children[i];
        if (hotspot instanceof Hotspot) {
          const view = this[$scene].activeCamera.position.clone();
          view.sub(hotspot.position);
          const normalWorld = hotspot.normal.clone().transformDirection(
              this[$scene].pivot.matrixWorld);
          if (view.dot(normalWorld) < 0) {
            hotspot.element.classList.add('hide');
          } else {
            hotspot.element.classList.remove('hide');
          }
        }
      }
    }

    [$addHotspot](node: Node) {
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
          normal: node.dataset.normal
        });
        this[$hotspotMap].set(node.slot, hotspot);
        this[$scene].pivot.add(hotspot);
      }
    }

    [$removeHotspot](node: Node) {
      if (!(node instanceof HTMLElement)) {
        return;
      }

      const hotspot = this[$hotspotMap].get(node.slot);

      if (!hotspot) {
        return;
      }

      if (hotspot.decrement()) {
        this[$scene].pivot.remove(hotspot);
        this[$hotspotMap].delete(node.slot);
      }
    }
  }

  return AnnotationModelViewerElement;
};
