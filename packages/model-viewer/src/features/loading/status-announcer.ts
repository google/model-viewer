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

import {EventDispatcher} from 'three';

import ModelViewerElementBase from '../../model-viewer-base.js';
import {debounce, getFirstMapKey} from '../../utilities.js';

export const INITIAL_STATUS_ANNOUNCEMENT =
    'This page includes one or more 3D models that are loading';
export const FINISHED_LOADING_ANNOUNCEMENT =
    'All 3D models in the page have loaded';
const UPDATE_STATUS_DEBOUNCE_MS = 100;


const $modelViewerStatusInstance = Symbol('modelViewerStatusInstance');
const $updateStatus = Symbol('updateStatus');

interface InstanceLoadingStatus {
  onUnregistered: () => void;
}

/**
 * The LoadingStatusAnnouncer manages announcements of loading status across
 * all <model-viewer> elements in the document at any given time. As new
 * <model-viewer> elements are connected to the document, they are registered
 * with a LoadingStatusAnnouncer singleton. As they are disconnected, the are
 * also unregistered. Announcements are made to indicate the following
 * conditions:
 *
 *  1. There are <model-viewer> elements that have yet to finish loading
 *  2. All <model-viewer> elements in the page have finished attempting to load
 */
export class LoadingStatusAnnouncer extends EventDispatcher {
  /**
   * The "status" instance is the <model-viewer> instance currently designated
   * to announce the loading status of all <model-viewer> elements in the
   * document at any given time. It might change as <model-viewer> elements are
   * attached or detached over time.
   */
  protected[$modelViewerStatusInstance]: ModelViewerElementBase|null = null;

  protected registeredInstanceStatuses:
      Map<ModelViewerElementBase, InstanceLoadingStatus> =
          new Map<ModelViewerElementBase, InstanceLoadingStatus>();

  protected loadingPromises: Array<Promise<any>> = [];

  /**
   * This element is a node that floats around the document as the status
   * instance changes (see above). It is a singleton that represents the loading
   * status for all <model-viewer> elements currently in the page. It has its
   * role attribute set to "status", which causes screen readers to announce
   * any changes to its text content.
   *
   * @see https://www.w3.org/TR/wai-aria-1.1/#status
   */
  readonly statusElement: HTMLParagraphElement = document.createElement('p');
  protected statusUpdateInProgress: boolean = false;

  protected[$updateStatus]: () => void =
      debounce(() => this.updateStatus(), UPDATE_STATUS_DEBOUNCE_MS);

  constructor() {
    super();
    const {statusElement} = this;
    const {style} = statusElement;

    statusElement.setAttribute('role', 'status');
    statusElement.classList.add('screen-reader-only');

    style.top = style.left = '0';
    style.pointerEvents = 'none';
  }

  /**
   * Register a <model-viewer> element with the announcer. If it is not yet
   * loaded, its loading status will be tracked by the announcer.
   */
  registerInstance(modelViewer: ModelViewerElementBase) {
    if (this.registeredInstanceStatuses.has(modelViewer)) {
      return;
    }

    let onUnregistered = () => {};
    const loadShouldBeMeasured =
        modelViewer.loaded === false && !!(modelViewer as any).src;
    const loadAttemptCompletes = new Promise<void>((resolve) => {
      if (!loadShouldBeMeasured) {
        resolve();
        return;
      }

      const resolveHandler = () => {
        resolve();

        modelViewer.removeEventListener('load', resolveHandler);
        modelViewer.removeEventListener('error', resolveHandler);
      };

      modelViewer.addEventListener('load', resolveHandler);
      modelViewer.addEventListener('error', resolveHandler);

      onUnregistered = resolveHandler;
    });

    this.registeredInstanceStatuses.set(modelViewer, {onUnregistered});
    this.loadingPromises.push(loadAttemptCompletes);

    if (this.modelViewerStatusInstance == null) {
      this.modelViewerStatusInstance = modelViewer;
    }
  }

  /**
   * Unregister a <model-viewer> element with the announcer. Its loading status
   * will no longer be tracked by the announcer.
   */
  unregisterInstance(modelViewer: ModelViewerElementBase) {
    if (!this.registeredInstanceStatuses.has(modelViewer)) {
      return;
    }

    const statuses = this.registeredInstanceStatuses;
    const instanceStatus = statuses.get(modelViewer)!;
    statuses.delete(modelViewer);
    instanceStatus.onUnregistered();

    if (this.modelViewerStatusInstance === modelViewer) {
      this.modelViewerStatusInstance = statuses.size > 0 ?
          getFirstMapKey<ModelViewerElementBase, InstanceLoadingStatus>(
              statuses) :
          null;
    }
  }

  protected get modelViewerStatusInstance(): ModelViewerElementBase|null {
    return this[$modelViewerStatusInstance];
  }

  protected set modelViewerStatusInstance(value: ModelViewerElementBase|null) {
    const currentInstance = this[$modelViewerStatusInstance];
    if (currentInstance === value) {
      return;
    }

    const {statusElement} = this;

    if (value != null && value.shadowRoot != null) {
      value.shadowRoot.appendChild(statusElement);
    } else if (statusElement.parentNode != null) {
      statusElement.parentNode.removeChild(statusElement);
    }

    this[$modelViewerStatusInstance] = value;
    this[$updateStatus]();
  }

  protected async updateStatus() {
    if (this.statusUpdateInProgress || this.loadingPromises.length === 0) {
      return;
    }

    this.statusElement.textContent = INITIAL_STATUS_ANNOUNCEMENT;
    this.statusUpdateInProgress = true;
    this.dispatchEvent({type: 'initial-status-announced'});

    while (this.loadingPromises.length) {
      const {loadingPromises} = this;
      this.loadingPromises = [];
      await Promise.all(loadingPromises);
    }

    this.statusElement.textContent = FINISHED_LOADING_ANNOUNCEMENT;
    this.statusUpdateInProgress = false;
    this.dispatchEvent({type: 'finished-loading-announced'});
  }
}
