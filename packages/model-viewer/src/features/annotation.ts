
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

import {Vector3} from 'three';
import {CSS2DObject, CSS2DRenderer} from 'three/examples/jsm/renderers/CSS2DRenderer.js';

import ModelViewerElementBase, {$onResize, $scene, $tick} from '../model-viewer-base.js';
import {normalizeUnit} from '../styles/conversions.js';
import {NumberNode, parseExpressions} from '../styles/parsers.js';
import {Constructor} from '../utilities.js';

const $annotationRenderer = Symbol('annotationRenderer');
const $updateHotspots = Symbol('updateHotspots');
const $hotspotMap = Symbol('hotspotMap');
const $mutationCallback = Symbol('mutationCallback');
const $observer = Symbol('observer');
const $addHotspot = Symbol('addHotspot');
const $removeHotspot = Symbol('removeHotspot');

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
    const slot = document.createElement('slot');
    slot.name = config.name;
    wrapper.appendChild(slot);
    super(wrapper);
    this.normal = new Vector3(0, 1, 0);
    this.updatePosition(config.position);
    this.updateNormal(config.normal);
    this.referenceCount = 1;
  }

  increment() {
    ++this.referenceCount;
  }

  decrement(): boolean {
    return --this.referenceCount <= 0;
  }

  updatePosition(position?: string) {
    if (position == null)
      return;
    const positionNodes = parseExpressions(position)[0].terms;
    for (let i = 0; i < 3; ++i) {
      this.position.setComponent(
          i, normalizeUnit(positionNodes[i] as NumberNode<'m'>).number);
    }
  }

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
    private[$hotspotMap] = new Map();
    private[$mutationCallback] = (mutations: Array<MutationRecord>) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            this[$addHotspot](node);
          });
          mutation.removedNodes.forEach((node) => {
            this[$removeHotspot](node);
          });
        }
      });
    };
    private[$observer] = new MutationObserver(this[$mutationCallback]);

    connectedCallback() {
      super.connectedCallback();
      const {domElement} = this[$annotationRenderer];
      const {style} = domElement;
      style.pointerEvents = 'none';
      style.position = 'absolute';
      style.top = '0';
      this.shadowRoot!.querySelector('.container')!.appendChild(domElement);

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
      if (hotspot == null)
        return;
      hotspot.updatePosition(config.position);
      hotspot.updateNormal(config.normal);
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
        const object = children[i];
        if (object instanceof Hotspot) {
          const view = this[$scene].activeCamera.position.clone();
          view.sub(object.position);
          if (view.dot(object.normal) < 0) {
            object.element.classList.add('hide');
          } else {
            object.element.classList.remove('hide');
          }
        }
      }
    }

    [$addHotspot](node: Node) {
      if (!(node instanceof HTMLElement && node.slot.indexOf('hotspot') === 0))
        return;
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
      if (!(node instanceof HTMLElement))
        return;
      const hotspot = this[$hotspotMap].get(node.slot);
      if (!hotspot)
        return;
      if (hotspot.decrement()) {
        this[$scene].pivot.remove(hotspot);
        this[$hotspotMap].delete(node.slot);
      }
    }
  }

  return AnnotationModelViewerElement;
};
