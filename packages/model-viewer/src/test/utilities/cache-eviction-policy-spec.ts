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

import {expect} from 'chai';

import {CacheEvictionPolicy} from '../../utilities/cache-eviction-policy.js';

suite('CacheEvictionPolicy', () => {
  let cache: Set<string>;
  let policy: CacheEvictionPolicy<string>;

  setup(() => {
    cache = new Set();
    policy = new CacheEvictionPolicy(cache);
  });

  test('reports zero retainers for uncached items', () => {
    policy.retain('foo');

    expect(policy.retainerCount('bar')).to.be.equal(0);
  });

  test('accounts for total retainers of cached items', () => {
    policy.retain('foo');
    policy.retain('foo');
    policy.release('foo');
    policy.retain('foo');
    policy.release('foo');

    expect(policy.retainerCount('foo')).to.be.equal(1);
  });

  test('ignores non-retained cached items within the threshold', () => {
    cache.add('foo');
    policy.retain('foo');
    policy.release('foo');

    expect(policy.retainerCount('foo')).to.be.equal(0);
    expect(cache.has('foo')).to.be.true;
  });

  test('deletes non-retained cached items outside the threshold', () => {
    cache.add('foo');
    policy.retain('foo');

    policy.evictionThreshold = 0;
    policy.release('foo');

    expect(policy.retainerCount('foo')).to.be.equal(0);
    expect(cache.has('foo')).to.be.false;
  });

  test('deletes non-retained cached items least-recently-used first', () => {
    cache.add('foo');
    cache.add('bar');

    policy.retain('foo');
    policy.retain('bar');

    policy.evictionThreshold = 1;

    policy.release('foo');
    policy.release('bar');

    expect(policy.retainerCount('foo')).to.be.equal(0);
    expect(policy.retainerCount('bar')).to.be.equal(0);
    expect(cache.has('foo')).to.be.false;
    expect(cache.has('bar')).to.be.true;
  });
});