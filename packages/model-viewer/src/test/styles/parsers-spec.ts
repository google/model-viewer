/* @license
 * Copyright 2018 Google LLC. All Rights Reserved.
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

import {ASTWalker, IdentNode, NumberNode, numberNode, parseExpressions} from '../../styles/parsers.js';
import {expressionNode, functionNode, hexNode, identNode, operatorNode} from '../helpers.js';

const expect = chai.expect;

suite('parsers', () => {
  suite('parseExpressions', () => {
    test('parses single numbers', () => {
      expect(parseExpressions('123rad')).to.be.eql([expressionNode(
          [numberNode(123, 'rad')])]);
    });

    test('parses number tuples', () => {
      expect(parseExpressions('123rad 3.14deg -1m 2cm')).to.be.eql([
        expressionNode([
          numberNode(123, 'rad'),
          numberNode(3.14, 'deg'),
          numberNode(-1, 'm'),
          numberNode(2, 'cm')
        ])
      ]);
    });

    test('parses exponential numbers', () => {
      expect(parseExpressions('123e10mm 123E10 123e-3 4e+3')).to.be.eql([
        expressionNode([
          numberNode(123e10, 'mm'),
          numberNode(123e10, null),
          numberNode(123e-3, null),
          numberNode(4e3, null)
        ])
      ]);
    });

    test('parses hex colors', () => {
      expect(parseExpressions('#fff')).to.be.eql([expressionNode(
          [hexNode('fff')])]);
      expect(parseExpressions('#abc123')).to.be.eql([expressionNode(
          [hexNode('abc123')])]);
      expect(parseExpressions('#daf012ee')).to.be.eql([expressionNode(
          [hexNode('daf012ee')])]);
    });

    test('parses functions', () => {
      expect(parseExpressions('rgba(255, 123, 0, 0.25)'))
          .to.be.eql([expressionNode([functionNode('rgba', [
            expressionNode([numberNode(255, null)]),
            expressionNode([numberNode(123, null)]),
            expressionNode([numberNode(0, null)]),
            expressionNode([numberNode(0.25, null)]),
          ])])]);
    });

    test('parses nested functions', () => {
      expect(parseExpressions('rgba(255, calc(100 + var(--blue)), 0, 0.25)'))
          .to.be.eql([expressionNode([functionNode('rgba', [
            expressionNode([numberNode(255, null)]),
            expressionNode([functionNode(
                'calc', [expressionNode([
                  numberNode(100, null),
                  operatorNode('+'),
                  functionNode('var', [expressionNode([identNode('--blue')])])
                ])])]),
            expressionNode([numberNode(0, null)]),
            expressionNode([numberNode(0.25, null)]),
          ])])]);
    });

    test('parses calc algebra', () => {
      expect(parseExpressions('1m - -2rad / 3 + 4deg * -10.5')).to.be.eql([
        expressionNode([
          numberNode(1, 'm'),
          operatorNode('-'),
          numberNode(-2, 'rad'),
          operatorNode('/'),
          numberNode(3, null),
          operatorNode('+'),
          numberNode(4, 'deg'),
          operatorNode('*'),
          numberNode(-10.5, null)
        ])
      ]);
    });

    suite('failure cases', () => {
      suite('mismatched parens', () => {
        test('trailing paren is gracefully dropped', () => {
          expect(parseExpressions('calc(calc(123)))')).to.be.eql([
            expressionNode([functionNode(
                'calc',
                [expressionNode([functionNode(
                    'calc', [expressionNode([numberNode(123, null)])])])])])
          ]);
        });
      });
    });
  });

  suite('ASTWalker', () => {
    test('only walks configured node types', () => {
      const astWalker =
          new ASTWalker<NumberNode|IdentNode>(['number', 'ident']);
      const ast = parseExpressions('calc(123 + var(--size))')
      let visitedNodes = 0;

      astWalker.walk(ast, (node: NumberNode|IdentNode) => {
        expect(node.type === 'number' || node.type === 'ident').to.be.true;
        visitedNodes++;
      });

      expect(visitedNodes).to.be.equal(4);
    });
  });
});