import { Effect, EffectAttribute, EffectPass, Pass } from 'postprocessing';
import { Color } from 'three';

export type Constructor<T = object, U = object> = {
  new (...args: any[]): T,
  prototype: T
}&U;

/**
 * Determines whether an object has a Symbol property with the specified key.
 * @param object Object to retrieve symbol from
 * @param key Key to search for (case sensitive)
 */
export function hasOwnPropertySymbol(object: any, key: string): boolean {
  for (const symbol of Object.getOwnPropertySymbols(object)) {
    if (symbol.toString() === `Symbol(${key})`) {
      return true;
    }
  }
  return false;
}

/**
 * Get symbol of given key if exists on object.
 * @param object Object to retrieve symbol from
 * @param key Key to search for (case sensitive)
 * @returns `Symbol(key)`
 */
export function getOwnPropertySymbol(object: any, key: string): symbol | undefined {
  for (const symbol of Object.getOwnPropertySymbols(object)) {
    if (symbol.toString() === `Symbol(${key})`) {
      return symbol;
    }
  }
  return;
}

/**
 * Get value of symbol of given key if exists on object.
 * @param object Object to retrieve key value from
 * @param key Key to search for (case sensitive)
 * @returns `object[Symbol(key)]`
 */
export function getOwnPropertySymbolValue<T = unknown>(object: any, key: string): T | undefined {
  for (const symbol of Object.getOwnPropertySymbols(object)) {
    if (symbol.toString() === `Symbol(${key})`) {
      return object[symbol];
    }
  }
  return;
}

/**
 * @param {Number} value
 * @param {Number} lowerLimit
 * @param {Number} upperLimit
 * @return {Number} value clamped within lowerLimit..upperLimit
 */
export function clamp(value: number, lowerLimit: number, upperLimit: number): number {
  return Math.max(lowerLimit, Math.min(upperLimit, value));
}

export function clampNormal(value: number): number {
  return clamp(value, 0, 1);
}

/**
 * Searches through hierarchy of HTMLElement until an element with a non-transparent background is found
 * @param elem The element background to get
 * @returns A {@link Color} instance
 */
export function getBackgroundColor(elem: HTMLElement): Color {
  let currElem: HTMLElement | null = elem;
  while (currElem && isTransparent(getComputedStyle(currElem))) {
    currElem = currElem.parentElement;
  }
  if (!currElem) return new Color(0xffffff);
  return new Color(getComputedStyle(currElem).backgroundColor);
}

/**
 * Determines whether an Element's backgroundColor is transparent
 * @param style The CSS properties of an Element
 */
function isTransparent(style: CSSStyleDeclaration): boolean {
  return style.backgroundColor == 'transparent' || style.backgroundColor == 'rgba(0, 0, 0, 0)' || !style.backgroundColor;
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
  for(const effect of (pass as any).effects) {
    effect.removeEventListener("change", (pass as any).listener);
  }
}

export function getValueOfEnum<T extends Object>(Enum: T, key: string): T {
  const index = Object.keys(Enum).filter((v) => !isNaN(Number(v))).indexOf(key);
  return (Enum as any)[index];
}
