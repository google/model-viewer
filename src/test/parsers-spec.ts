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

import {parseValues, ValueNode} from '../parsers.js';

const expect = chai.expect;

const valueNode = (value: string, unit: string|null = null): ValueNode =>
    ({type: 'value', value, unit});

suite('parsers', () => {
  suite('parseValues', () => {
    test('parses single CSS color strings', () => {
      expect(parseValues('red')).to.be.eql([valueNode('red')]);
    });

    test('parses multiple CSS color strings', () => {
      expect(parseValues('red #00f #00ff00'))
          .to.be.eql(
              [valueNode('red'), valueNode('#00f'), valueNode('#00ff00')]);
    });

    test('parses single CSS length values', () => {
      expect(parseValues('123deg')).to.be.eql([valueNode('123', 'deg')]);
    });

    test('parses multiple CSS length values', () => {
      expect(parseValues('10% 123deg 2rad 1mm')).to.be.eql([
        valueNode('10', '%'),
        valueNode('123', 'deg'),
        valueNode('2', 'rad'),
        valueNode('1', 'mm')
      ]);
    });

    test('parses mixed value types', () => {
      expect(parseValues('3.14cm red'))
          .to.be.eql([valueNode('3.14', 'cm'), valueNode('red')]);
    });

    test('is resilient to awkward whitespace', () => {
      expect(parseValues('   4')).to.be.eql([valueNode('4')]);
      expect(parseValues('red ')).to.be.eql([valueNode('red')]);
      expect(parseValues(' 1px     \n2px #f00'))
          .to.be.eql(
              [valueNode('1', 'px'), valueNode('2', 'px'), valueNode('#f00')]);
    });
  });
});
