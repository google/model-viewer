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

import {IdentNode, parseExpressions} from './parsers.js';


/**
 * For our purposes, an enumeration is a fixed set of CSS-expression-compatible
 * names. When serialized, a selected subset of the members may be specified as
 * whitespace-separated strings. An enumeration deserializer is a function that
 * parses a serialized subset of an enumeration and returns any members that are
 * found as a Set.
 *
 * The following example will produce a deserializer for the days of the
 * week:
 *
 * const deserializeDaysOfTheWeek = enumerationDeserializer([
 *   'Monday',
 *   'Tuesday',
 *   'Wednesday',
 *   'Thursday',
 *   'Friday',
 *   'Saturday',
 *   'Sunday'
 * ]);
 */
export const enumerationDeserializer = <T extends string>(allowedNames: T[]) =>
    (valueString: string): Set<T> => {
      try {
        const expressions = parseExpressions(valueString);
        const names = (expressions.length ? expressions[0].terms : [])
                          .filter<IdentNode>(
                              (valueNode): valueNode is IdentNode =>
                                  valueNode && valueNode.type === 'ident')
                          .map(valueNode => valueNode.value as T)
                          .filter(name => allowedNames.indexOf(name) > -1);

        return new Set<T>(names);
      } catch (_error) {
      }
      return new Set();
    };