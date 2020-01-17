/* @license ISC
 * @see LICENSE
 */
// NOTE(cdata): This is an adapted subset of the original pixelmatch library.
// The top-level API of the original library has been omitted, as we only make
// use of the lower-level features that aren't actually exported by the upstream
// module.

// calculate color difference according to the paper "Measuring perceived color
// difference using YIQ NTSC transmission color space in mobile applications" by
// Y. Kotsarenko and F. Ramos
export function colorDelta(
    img1: {[index: number]: number},
    img2: {[index: number]: number},
    k: number,
    m: number,
    yOnly: boolean = false): number {
  var a1 = img1[k + 3] / 255, a2 = img2[m + 3] / 255,

      r1 = blend(img1[k + 0], a1), g1 = blend(img1[k + 1], a1),
      b1 = blend(img1[k + 2], a1),

      r2 = blend(img2[m + 0], a2), g2 = blend(img2[m + 1], a2),
      b2 = blend(img2[m + 2], a2),

      y = rgb2y(r1, g1, b1) - rgb2y(r2, g2, b2);

  if (yOnly)
    return y;  // brightness difference only

  var i = rgb2i(r1, g1, b1) - rgb2i(r2, g2, b2),
      q = rgb2q(r1, g1, b1) - rgb2q(r2, g2, b2);

  return 0.5053 * y * y + 0.299 * i * i + 0.1957 * q * q;
}

function rgb2y(r: number, g: number, b: number): number {
  return r * 0.29889531 + g * 0.58662247 + b * 0.11448223;
}
function rgb2i(r: number, g: number, b: number): number {
  return r * 0.59597799 - g * 0.27417610 - b * 0.32180189;
}
function rgb2q(r: number, g: number, b: number): number {
  return r * 0.21147017 - g * 0.52261711 + b * 0.31114694;
}

// blend semi-transparent color with white
function blend(c: number, a: number): number {
  return 255 + (c - 255) * a;
}

export function drawPixel(
    output: Uint8Array, pos: number, r: number, g: number, b: number) {
  output[pos + 0] = r;
  output[pos + 1] = g;
  output[pos + 2] = b;
  output[pos + 3] = 255;
}
