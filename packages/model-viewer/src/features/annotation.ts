
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
const $observer = Symbol('observer');
const $addHotspot = Symbol('addHotspot');
const $removeHotspot = Symbol('removeHotspot');

interface HotspotConfiguration {
  name: string;
  position?: string;
  normal?: string;
}
class Hotspot extends CSS2DObject {
  public normal: Vector3;

  constructor(config: HotspotConfiguration) {
    const wrapper = document.createElement('div');
    const slot = document.createElement('slot');
    slot.name = config.name;
    wrapper.appendChild(slot);
    super(wrapper);
    this.normal = new Vector3(0, 1, 0);
    this.updatePosition(config.position);
    this.updateNormal(config.normal);
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

export const AnnotationMixin = <T extends Constructor<ModelViewerElementBase>>(
    ModelViewerElement: T): Constructor<AnnotationInterface>&T => {
  class AnnotationModelViewerElement extends ModelViewerElement {
    private[$annotationRenderer] = new CSS2DRenderer();
    private[$hotspotMap] = new Map();
    private[$observer] = new MutationObserver((mutations) => {
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
    });

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

      this[$observer].observe(this, {childList: true});
    }

    disconnectedCallback() {
      super.disconnectedCallback();
      this[$observer].disconnect();
    }

    updated(changedProperties: Map<string, any>) {
      super.updated(changedProperties);
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
      if (!(node instanceof HTMLElement && node.slot.includes('hotspot')))
        return;
      const hotspot = new Hotspot({
        name: node.slot,
        position: node.dataset.position,
        normal: node.dataset.normal
      });
      this[$hotspotMap].set(node, hotspot);
      this[$scene].pivot.add(hotspot);
    }

    [$removeHotspot](node: Node) {
      const hotspot = this[$hotspotMap].get(node);
      if (!hotspot)
        return;
      this[$scene].pivot.remove(hotspot);
      this[$hotspotMap].delete(node);
    }

    updateHotspot(config: HotspotConfiguration) {
      const element = this.querySelector(`[slot="${config.name}"]`);
      if (element == null)
        return;
      const hotspot = this[$hotspotMap].get(element);
      hotspot.updatePosition(config.position);
      hotspot.updateNormal(config.normal);
    }
  }

  return AnnotationModelViewerElement;
};
