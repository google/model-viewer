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

export const DOMAIN = 'https://piping.nwtgck.repl.co/';

export interface URLs {
  gltf: string|undefined;
  usdz: string|undefined;
  env: string|undefined;
}

export interface MobileSession {
  id: number;
  isStale: boolean;
  os: string;
  isPing: boolean;
}

export interface EditorUpdates {
  gltfChanged: boolean;
  gltfId: number;
  iosChanged: boolean;
  usdzId: number;
  stateChanged: boolean;
  envChanged: boolean;
  envIsHdr: boolean;
}

export interface MobilePacket {
  updatedContent: EditorUpdates;
  snippet?: any;
  environmentImage?: Blob;
}

export function getRandomInt(max: number): number {
  return Math.floor(Math.random() * Math.floor(max));
}

// ex: 'https://piping.nwtgck.repl.co/123-456'
export function getSessionUrl(
    pipeId: number|string, sessionId: number): string {
  return `${DOMAIN}${pipeId}-${sessionId}`;
}

// ex: 'https://piping.nwtgck.repl.co/123-456-789'
export function gltfToSession(
    pipeId: number|string, sessionID: number, modelId: number): string {
  return `${DOMAIN}${pipeId}-${sessionID}-${modelId}`;
}

// ex: 'https://piping.nwtgck.repl.co/123-456-789'
export function usdzToSession(
    pipeId: number|string, sessionID: number, modelId: number): string {
  return `${DOMAIN}${pipeId}-${sessionID}-${modelId}`;
}