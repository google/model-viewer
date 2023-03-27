import { Effect, EffectAttribute, EffectPass, Pass } from 'postprocessing';

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
export function getBackgroundColor(elem: HTMLElement): string {
  let currElem: HTMLElement | null = elem;
  while (currElem && isTransparent(getComputedStyle(currElem))) {
    currElem = currElem.parentElement;
  }
  if (!currElem) return '';
  return getComputedStyle(currElem).backgroundColor;
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
