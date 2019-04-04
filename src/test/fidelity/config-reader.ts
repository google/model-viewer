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

import {Dimensions, ImageComparisonConfig} from './common.js';

export class ConfigReader {
  constructor(public config: ImageComparisonConfig) {
  }

  dimensionsForSlug(slug: string): Dimensions {
    const {scenarios} = this.config;

    for (const scenario of scenarios) {
      if (scenario.slug === slug) {
        return scenario.dimensions;
      }
    }

    return {width: 0, height: 0};
  }
}
