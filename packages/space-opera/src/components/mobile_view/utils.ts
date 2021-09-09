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

export const DOMAIN = 'https://piping.glitch.me/';

export function getRandomInt(max: number): number {
  return Math.floor(Math.random() * Math.floor(max));
}

// ex: 'https://piping.nwtgck.repl.co/123-456'
export function getSessionUrl(
    pipeId: number|string, sessionId: number): string {
  return `${DOMAIN}${pipeId}-${sessionId}`;
}

// ex: 'https://piping.nwtgck.repl.co/ping-123'
export function getPingUrl(pipeId: number|string) {
  return `${DOMAIN}ping-${pipeId}`;
}

// ex: 'https://piping.nwtgck.repl.co/123-456-789-poster'
export function posterToSession(
    pipeId: number|string, sessionID: number, modelId: number): string {
  return `${DOMAIN}${pipeId}-${sessionID}-${modelId}-poster`;
}

// ex: 'https://piping.nwtgck.repl.co/123-456-789'
export function gltfToSession(
    pipeId: number|string, sessionID: number, modelId: number): string {
  return `${DOMAIN}${pipeId}-${sessionID}-${modelId}`;
}

// ex: 'https://piping.nwtgck.repl.co/123-456-env'
export function envToSession(
    pipeId: number|string, sessionID: number, envIsHdr: boolean): string {
  const addOn = envIsHdr ? '#.hdr' : '';
  return `${DOMAIN}${pipeId}-${sessionID}-env${addOn}`;
}

export async function post(content: Blob|string, url: string) {
  const response = await fetch(url, {
    method: 'POST',
    body: content,
  });
  if (response.ok) {
    console.log('Success:', response);
  } else {
    throw new Error(`Failed to post: ${url}`);
  }
}

// Aborting the get request as opposed to failing will keep the site pipe
// running smoother.
// https://dmitripavlutin.com/timeout-fetch-request/#2-timeout-a-fetch-request
export async function getWithTimeout(url: string) {
  const timeout = 30000;

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  const response = await fetch(url, {method: 'GET', signal: controller.signal});
  clearTimeout(id);

  return response;
}

/**
 * Determine the mobile operating system.
 * This function returns one of 'iOS', 'Android', 'Windows Phone', or
 * 'unknown'.
 * https://stackoverflow.com/questions/21741841/detecting-ios-android-operating-system
 */
export function getMobileOperatingSystem(): 'iOS'|'Android'|'Windows Phone'|
    'unknown' {
  const userAgent =
      navigator.userAgent || navigator.vendor || (window as any).opera;

  // Windows Phone must come first because its UA also contains "Android"
  if (/windows phone/i.test(userAgent)) {
    return 'Windows Phone';
  }

  if (/android/i.test(userAgent)) {
    return 'Android';
  }

  // iOS detection from: http://stackoverflow.com/a/9039885/177710
  if (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream) {
    return 'iOS';
  }

  return 'unknown';
}
