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
