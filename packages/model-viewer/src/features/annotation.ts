
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

import {property} from 'lit-element';
import {Vector3} from 'three';
import {CSS2DObject, CSS2DRenderer} from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import {_Math as ThreeMath} from 'three/src/math/Math.js';

import {style} from '../decorators.js';
import ModelViewerElementBase, {$onResize, $scene, $tick} from '../model-viewer-base.js';
import {normalizeUnit} from '../styles/conversions.js';
import {EvaluatedStyle, Intrinsics} from '../styles/evaluators.js';
import {numberNode, NumberNode, parseExpressions} from '../styles/parsers.js';
import {Constructor} from '../utilities.js';

const DEFAULT_HIDDEN_OPACITY = 0.25;
const DEFAULT_HIDDEN_ANGLE = Math.PI / 2;
const TRANSITION_ANGLE = Math.PI / 8;

const $annotationRenderer = Symbol('annotationRenderer');
const $updateHotspots = Symbol('updateHotspots');
const $hiddenAngle = Symbol('hiddenAngle');
const $syncHiddenAngle = Symbol('syncHiddenAngle');
const $nextHotspotIndex = Symbol('nextHotspotIndex');
const $hotspotMap = Symbol('hotspotMap');
const $observer = Symbol('observer');

class Hotspot extends CSS2DObject {
  public normal: Vector3;

  constructor(element: HTMLElement) {
    const wrapper = document.createElement('div');
    const slot = document.createElement('slot');
    slot.name = element.slot;
    wrapper.appendChild(slot);
    super(wrapper);
    this.normal = new Vector3();
    this.updatePosition(element);
    this.updateNormal(element);
  }

  updatePosition(element: HTMLElement) {
    const positionNodes = parseExpressions(element.dataset.position!)[0].terms;
    for (let i = 0; i < 3; ++i) {
      this.position.setComponent(
          i, normalizeUnit(positionNodes[i] as NumberNode<'m'>).number);
    }
  }

  updateNormal(element: HTMLElement) {
    const normalNodes = parseExpressions(element.dataset.normal!)[0].terms;
    for (let i = 0; i < 3; ++i) {
      this.normal.setComponent(
          i, normalizeUnit(normalNodes[i] as NumberNode<'m'>).number);
    }
  }
}

export declare interface AnnotationInterface {
  hiddenOpacity: number;
  hiddenAngle: string;
  addHotspot(element: HTMLElement): void;
}

export const AnnotationMixin = <T extends Constructor<ModelViewerElementBase>>(
    ModelViewerElement: T): Constructor<AnnotationInterface>&T => {
  class AnnotationModelViewerElement extends ModelViewerElement {
    @property({type: Number, attribute: 'hidden-opacity'})
    hiddenOpacity: number = DEFAULT_HIDDEN_OPACITY;

    @style({
      intrinsics: {
        basis: [numberNode(DEFAULT_HIDDEN_ANGLE, 'rad')],
        keywords: {auto: [null]}
      },
      updateHandler: $syncHiddenAngle
    })
    @property({type: String, attribute: 'hidden-angle'})
    hiddenAngle: string = 'auto';

    private[$annotationRenderer] = new CSS2DRenderer();
    private[$hiddenAngle] = DEFAULT_HIDDEN_ANGLE;
    private[$nextHotspotIndex] = 0;
    private[$hotspotMap] = new Map();
    private[$observer] = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        switch (mutation.type) {
          case 'childList':
            mutation.addedNodes.forEach((node) => {
              this.addHotspot(node);
            });
            mutation.removedNodes.forEach((node) => {
              this.removeHotspot(node);
            });
            break;
          case 'attributes':
            const {target} = mutation;
            const hotspot = this[$hotspotMap].get(target);
            if (!hotspot) {
              this.addHotspot(target);
              break;
            }
            switch (mutation.attributeName) {
              case 'data-position':
                hotspot.updatePosition(target);
                break;
              case 'data-normal':
                hotspot.updateNormal(target);
                break;
            }
            break;
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
        this.addHotspot(this.children[i]);
      }

      this[$observer].observe(
          this, {childList: true, attributes: true, subtree: true});
    }

    disconnectedCallback() {
      super.disconnectedCallback();
      this[$observer].disconnect();
    }

    updated(changedProperties: Map<string, any>) {
      super.updated(changedProperties);
    }

    [$syncHiddenAngle](style: EvaluatedStyle<Intrinsics<['rad']>>) {
      this[$hiddenAngle] = style[0];
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
          const opacity = 1 -
              (1 - DEFAULT_HIDDEN_OPACITY) *
                  ThreeMath.smoothstep(
                      view.angleTo(object.normal),
                      this[$hiddenAngle] - TRANSITION_ANGLE,
                      this[$hiddenAngle]);
          object.element.style.opacity = `${opacity}`;
        }
      }
    }

    addHotspot(element: Node) {
      if (!(element instanceof HTMLElement) || element.parentNode != this ||
          !element.dataset.position || !element.dataset.normal)
        return;
      element.slot = `hotspot-${this[$nextHotspotIndex]++}`;
      const hotspot = new Hotspot(element);
      this[$hotspotMap].set(element, hotspot);
      this[$scene].pivot.add(hotspot);
    }

    removeHotspot(element: Node) {
      const hotspot = this[$hotspotMap].get(element);
      if (!hotspot)
        return;
      this[$scene].pivot.remove(hotspot);
      this[$hotspotMap].delete(element);
    }
  }

  return AnnotationModelViewerElement;
};
