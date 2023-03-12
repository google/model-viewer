/* @license
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
 */

import {Matrix3, Mesh, Quaternion, Triangle, Vector3} from 'three';
import {CSS2DObject} from 'three/examples/jsm/renderers/CSS2DRenderer.js';

import {normalizeUnit} from '../styles/conversions.js';
import {NumberNode, parseExpressions} from '../styles/parsers.js';

import {ModelScene} from './ModelScene.js';

export interface HotspotVisibilityDetails {
  visible: boolean;
}

/**
 * Hotspots are configured by slot name, and this name must begin with "hotspot"
 * to be recognized. The position and normal strings are in the form of the
 * camera-target attribute and default to "0m 0m 0m" and "0m 1m 0m",
 * respectively.
 */
export interface HotspotConfiguration {
  name: string;
  position?: string;
  normal?: string;
  surface?: string;
}

const a = new Vector3();
const b = new Vector3();
const c = new Vector3();
const mat = new Matrix3();
const triangle = new Triangle();
const quat = new Quaternion();

/**
 * The Hotspot object is a reference-counted slot. If decrement() returns true,
 * it should be removed from the tree so it can be garbage-collected.
 */
export class Hotspot extends CSS2DObject {
  public normal: Vector3 = new Vector3(0, 1, 0);
  public surface?: string;
  public mesh?: Mesh;
  public tri?: Vector3;
  public bary?: Vector3;
  private initialized = false;
  private referenceCount = 1;
  private pivot = document.createElement('div');
  private slot: HTMLSlotElement = document.createElement('slot');

  constructor(config: HotspotConfiguration) {
    super(document.createElement('div'));

    this.element.classList.add('annotation-wrapper');

    this.slot.name = config.name;

    this.element.appendChild(this.pivot);
    this.pivot.appendChild(this.slot);

    this.updatePosition(config.position);
    this.updateNormal(config.normal);
    this.surface = config.surface;
  }

  get facingCamera(): boolean {
    return !this.element.classList.contains('hide');
  }

  /**
   * Sets the hotspot to be in the highly visible foreground state.
   */
  show() {
    if (!this.facingCamera || !this.initialized) {
      this.updateVisibility(true);
    }
  }

  /**
   * Sets the hotspot to be in the diminished background state.
   */
  hide() {
    if (this.facingCamera || !this.initialized) {
      this.updateVisibility(false);
    }
  }

  /**
   * Call this when adding elements to the same slot to keep track.
   */
  increment() {
    this.referenceCount++;
  }

  /**
   * Call this when removing elements from the slot; returns true when the slot
   * is unused.
   */
  decrement(): boolean {
    if (this.referenceCount > 0) {
      --this.referenceCount;
    }
    return this.referenceCount === 0;
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
    this.updateMatrixWorld();
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
      this.normal.setComponent(i, (normalNodes[i] as NumberNode).number);
    }
  }

  updateSurface(forceUpdate: boolean) {
    if (!forceUpdate && this.initialized) {
      return;
    }
    const {mesh, tri, bary} = this;
    if (mesh == null || tri == null || bary == null) {
      return;
    }

    (mesh as any).getVertexPosition(tri.x, a);
    (mesh as any).getVertexPosition(tri.y, b);
    (mesh as any).getVertexPosition(tri.z, c);

    a.toArray(mat.elements, 0);
    b.toArray(mat.elements, 3);
    c.toArray(mat.elements, 6);
    this.position.copy(bary).applyMatrix3(mat);
    const target = this.parent!;
    target.worldToLocal(mesh.localToWorld(this.position));

    triangle.set(a, b, c);
    triangle.getNormal(this.normal).transformDirection(mesh.matrixWorld);
    const scene = target.parent as ModelScene;
    quat.setFromAxisAngle(a.set(0, 1, 0), -scene.yaw);
    this.normal.applyQuaternion(quat);
  }

  orient(radians: number) {
    this.pivot.style.transform = `rotate(${radians}rad)`;
  }

  updateVisibility(show: boolean) {
    // NOTE: IE11 doesn't support a second arg for classList.toggle
    if (show) {
      this.element.classList.remove('hide');
    } else {
      this.element.classList.add('hide');
    }

    // NOTE: ShadyDOM doesn't support slot.assignedElements, otherwise we could
    // use that here.
    this.slot.assignedNodes().forEach((node) => {
      if (node.nodeType !== Node.ELEMENT_NODE) {
        return;
      }

      const element = node as HTMLElement;
      // Visibility attribute can be configured per-node in the hotspot:
      const visibilityAttribute = element.dataset.visibilityAttribute;

      if (visibilityAttribute != null) {
        const attributeName = `data-${visibilityAttribute}`;

        // NOTE: IE11 doesn't support toggleAttribute
        if (show) {
          element.setAttribute(attributeName, '');
        } else {
          element.removeAttribute(attributeName);
        }
      }

      element.dispatchEvent(new CustomEvent('hotspot-visibility', {
        detail: {
          visible: show,
        },
      }));
    });

    this.initialized = true;
  }
}