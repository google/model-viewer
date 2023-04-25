/* @license
 * Copyright 2023 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Effect, EffectAttribute, EffectPass, Pass } from 'postprocessing';
import { ColorRepresentation } from 'three';

export type Constructor<T = object, U = object> = {
  new (...args: any[]): T;
  prototype: T;
} & U;

/**
 * Get symbol of given key if exists on object.
 * @param object Object to retrieve symbol from
 * @param key Key to search for (case sensitive)
 * @returns `Symbol(key)`
 */
export function getOwnPropertySymbol(object: any, key: string): symbol | undefined {
  while (object) {
    const symbol = Object.getOwnPropertySymbols(object).find((symbol) => symbol.description === key);
    if (symbol) return symbol;
    // Search further up in prototype chain
    object = Object.getPrototypeOf(object);
  }
  return;
}

/**
 * Determines whether an object has a Symbol property with the specified key.
 * @param object Object to retrieve symbol from
 * @param key Key to search for (case sensitive)
 */
export function hasOwnPropertySymbol(object: any, key: string): boolean {
  return getOwnPropertySymbol(object, key) !== undefined;
}

/**
 * Get value of symbol of given key if exists on object.
 * @param object Object to retrieve key value from
 * @param key Key to search for (case sensitive)
 * @returns `object[Symbol(key)]`
 */
export function getOwnPropertySymbolValue<T = unknown>(object: any, key: string): T | undefined {
  const symbol = getOwnPropertySymbol(object, key);
  return symbol && object[symbol];
}

/**
 * @param {Number} value
 * @param {Number} lowerLimit
 * @param {Number} upperLimit
 * @return {Number} value clamped within `lowerLimit - upperLimit`
 */
export function clamp(value: number, lowerLimit: number, upperLimit: number): number {
  return Math.max(lowerLimit, Math.min(upperLimit, value));
}

/**
 * @param {Number} value
 * @returns value clamped between `0 - 1`
 */
export function clampNormal(value: number): number {
  return clamp(value, 0, 1);
}

/**
 * @param {Number} value
 * @param {Number} lowerLimit
 * @param {Number} upperLimit
 * @return {Number} wraps value between `lowerLimit - upperLimit`
 */
export function wrapClamp(value: number, lowerLimit: number, upperLimit: number): number {
  if (value > upperLimit) return lowerLimit;
  if (value < lowerLimit) return upperLimit;
  return value;
}

/**
 * Searches through hierarchy of HTMLElement until an element with a non-transparent background is found
 * @param elem The element background to get
 * @returns The backgroundColor
 */
export function getBackgroundColor(elem: HTMLElement): ColorRepresentation | undefined {
  let currElem: HTMLElement | null = elem;
  while (currElem && isTransparent(getComputedStyle(currElem))) {
    currElem = currElem.parentElement;
  }
  if (!currElem) return;
  return getComputedStyle(currElem).backgroundColor as ColorRepresentation;
}

/**
 * Determines whether an Element's backgroundColor is transparent
 * @param style The CSS properties of an Element
 */
function isTransparent(style: CSSStyleDeclaration): boolean {
  return style.backgroundColor === 'transparent' || style.backgroundColor === 'rgba(0, 0, 0, 0)' || !style.backgroundColor;
}

/**
 * Determines whether the given Effect uses Convolution.
 * @param effect The effect to check.
 */
export function isConvolution(effect: Effect): boolean {
  return (effect.getAttributes() & EffectAttribute.CONVOLUTION) != 0;
}

/**
 * Disposes of Pass properties without disposing of the Effects.
 * @param pass Pass to dispose of
 */
export function disposeEffectPass(pass: EffectPass): void {
  Pass.prototype.dispose.call(pass);

  if (!(pass as any).listener) return;
  for (const effect of (pass as any).effects) {
    effect.removeEventListener('change', (pass as any).listener);
  }
}

export function getValueOfEnum<T extends Object>(Enum: T, key: string): T {
  const index = Object.keys(Enum)
    .filter((v) => !isNaN(Number(v)))
    .indexOf(key);
  return (Enum as any)[index];
}

/**
 * Helper function to validate whether a value is in-fact a valid option of a literal type.
 * 
 * Requires the type to be defined as follows:
 * @code
 * `const TOptions = [...] as const;`
 * 
 * `type T = typeof TOptions[number];` 
 * @param options `TOptions`
 * @param value `value: T`
 * @throws TypeError
 */
export function validateLiteralType<TOptions extends readonly unknown[]>(options: TOptions, value: typeof options[number]): void {
  if (!options.includes(value)) throw new TypeError(`Validation Error: ${value} is not a valid value. Expected ${options.join(' | ')}`);
}