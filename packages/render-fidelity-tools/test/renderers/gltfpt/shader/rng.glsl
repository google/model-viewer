/* @license
 * Copyright 2020  Dassault Systèmes - All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

uvec2 rng_state; 

uint george_marsaglia_rng() {
    rng_state.x = 36969u * (rng_state.x & 65535u) + (rng_state.x >> 16u);
    rng_state.y = 18000u * (rng_state.y & 65535u) + (rng_state.y >> 16u);
    return (rng_state.x << 16u) + rng_state.y;
}

float rng_NextFloat() {
    return float(george_marsaglia_rng()) / float(0xFFFFFFFFu);
}

void init_RNG(int seed) {
    vec2 offset = vec2(seed*17,0.0);

    //Initialize RNG
    rng_state = uvec2(397.6432*(gl_FragCoord.xy+offset));
    rng_state ^= uvec2(32.9875*(gl_FragCoord.yx+offset));
}
///////////////////////////////////////////////////////////////////////////////

