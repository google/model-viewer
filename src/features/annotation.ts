
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

import {style} from '../decorators.js';
import ModelViewerElementBase, {$onResize, $scene, $tick} from '../model-viewer-base.js';
import {EvaluatedStyle, Intrinsics} from '../styles/evaluators.js';
import {numberNode} from '../styles/parsers.js';
import {Constructor} from '../utilities.js';

const DEFAULT_HIDDEN_OPACITY = 0.5;
const DEFAULT_HIDDEN_ANGLE = Math.PI / 2;

const $annotationRenderer = Symbol('annotationRenderer');
const $updateHotspots = Symbol('updateHotspots');
const $hiddenAngle = Symbol('hiddenAngle');
const $syncHiddenAngle = Symbol('syncHiddenAngle');

class Hotspot extends CSS2DObject {
  public normal: Vector3;

  constructor(element: HTMLElement, position: Vector3, normal: Vector3) {
    super(element);
    this.position = position;
    this.normal = normal;
  }
}

export declare interface AnnotationInterface {
  hiddenOpacity: number;
  hiddenAngle: string;
  addHotspot(position: Vector3, normal: Vector3): void;
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

    connectedCallback() {
      super.connectedCallback();
    }

    disconnectedCallback() {
      super.disconnectedCallback();
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
          object.element.style.opacity =
              view.angleTo(object.normal) < this[$hiddenAngle] ?
              '1' :
              `${this.hiddenOpacity}`;
        }
      }
    }

    addHotspot(position: Vector3, normal: Vector3) {
      const element = document.createElement('div');
      element.className = 'hotspot';
      element.style.width = '10px';
      element.style.height = '10px';
      element.style.borderRadius = '5px';
      element.style.webkitBorderRadius = '5px';
      element.style.background = 'blue';

      const hotspot = new Hotspot(element, position, normal);
      this[$scene].pivot.add(hotspot);
    }
  }

  return AnnotationModelViewerElement;
};
