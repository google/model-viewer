/*
 * Copyright 2018 Google Inc. All Rights Reserved.
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

export interface ValueNode {
  type: 'value';
  value: string|number|null;
  unit: string|null;
}

/**
 * Parses input strings that are a series of whitespace-separated CSS-like value
 * expressions. Expressions in such strings include values such as:
 *
 *  - A color e.g., red or #8800ff
 *  - A named orientation e.g., center
 *  - A length e.g., 25px or 1m
 *
 * Some example value strings:
 *
 *  - 0 10px 100px
 *  - red green 100%
 *  - 180deg 3rad
 *  - 1em
 *
 * NOTE(cdata): CSS function values currently not supported, so no rgb(...) etc.
 */
export const parseValues = (valuesString: string): Array<ValueNode> => {
  return whitespaceSplit(valuesString.trim())
      .map(valueString => parseAtomicValue(valueString));
};

const parseAtomicValue = (() => {
  const VALUE_AND_UNIT_RE =
      /^((?:(?:#|[a-zA-Z])[a-zA-Z\d]*)|(?:-?[\d.]+))([a-zA-Z%]*)$/;

  return (valueString: string): ValueNode => {
    const match = valueString.match(VALUE_AND_UNIT_RE) || [];
    return {type: 'value', value: match[1], unit: match[2] || null};
  };
})();

const whitespaceSplit = (() => {
  const WHITESPACE_RE = /\s+/g;

  return (inputString: string) => {
    if (!inputString) {
      return [];
    }

    return inputString.split(WHITESPACE_RE);
  };
})();
