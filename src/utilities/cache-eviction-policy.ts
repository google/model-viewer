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

/**
 * A mutable cache is any object that has that allows cache
 * items to be deleted imperatively given their key
 */
export interface MutableCache<T> {
  delete(key: T): void;
}

const $retainerCount = Symbol('retainerCount');
const $recentlyUsed = Symbol('recentlyUsed');
const $evict = Symbol('evict');
const $evictionThreshold = Symbol('evictionThreshold');
const $cache = Symbol('cache');

/**
 * The CacheEvictionPolicy manages the lifecycle for items in a cache,
 * evicting any items outside some threshold bounds in "recently used" order,
 * if they are evictable.
 *
 * Items are considered cached as they are retained. When all retainers
 * of an item release it, that item is considered evictable.
 */
export class CacheEvictionPolicy<T = string> {
  private[$retainerCount] = new Map<T, number>();
  private[$recentlyUsed]: Array<T> = [];
  private[$evictionThreshold]: number;
  private[$cache]: MutableCache<T>;

  constructor(cache: MutableCache<T>, evictionThreshold: number = 5) {
    this[$cache] = cache;
    this[$evictionThreshold] = evictionThreshold;
  }

  /**
   * The eviction threshold is the maximum number of items to hold
   * in cache indefinitely. Items within the threshold (in recently
   * used order) will continue to be cached even if they have zero
   * retainers.
   */
  set evictionThreshold(value: number) {
    this[$evictionThreshold] = value;
    this[$evict]();
  }

  get evictionThreshold(): number {
    return this[$evictionThreshold];
  }

  /**
   * A reference to the cache that operates under this policy
   */
  get cache(): MutableCache<T> {
    return this[$cache];
  }

  /**
   * Given an item key, returns the number of retainers of that item
   */
  retainerCount(key: T): number {
    return this[$retainerCount].get(key) || 0;
  }

  /**
   * Resets the internal tracking of cache item retainers. Use only in cases
   * where it is certain that all retained cache items have been accounted for!
   */
  reset() {
    this[$retainerCount].clear();
    this[$recentlyUsed] = [];
  }

  /**
   * Mark a given cache item as retained, where the item is represented
   * by its key. An item can have any number of retainers.
   */
  retain(key: T) {
    if (!this[$retainerCount].has(key)) {
      this[$retainerCount].set(key, 0);
    }
    this[$retainerCount].set(key, this[$retainerCount].get(key)! + 1);

    const recentlyUsedIndex = this[$recentlyUsed].indexOf(key);

    if (recentlyUsedIndex !== -1) {
      this[$recentlyUsed].splice(recentlyUsedIndex, 1);
    }

    this[$recentlyUsed].unshift(key);
    // Evict, in case retaining a new item pushed an evictable item beyond the
    // eviction threshold
    this[$evict]();
  }

  /**
   * Mark a given cache item as released by one of its retainers, where the item
   * is represented by its key. When all retainers of an item have released it,
   * the item is considered evictable.
   */
  release(key: T) {
    if (this[$retainerCount].has(key)) {
      this[$retainerCount].set(
          key, Math.max(this[$retainerCount].get(key)! - 1, 0));
    }

    this[$evict]();
  }

  [$evict]() {
    if (this[$recentlyUsed].length < this[$evictionThreshold]) {
      return;
    }

    for (let i = this[$recentlyUsed].length - 1; i >= this[$evictionThreshold];
         --i) {
      const key = this[$recentlyUsed][i];
      const retainerCount = this[$retainerCount].get(key);

      if (retainerCount === 0) {
        this[$cache].delete(key);
        this[$recentlyUsed].splice(i, 1);
      }
    }
  }
}
