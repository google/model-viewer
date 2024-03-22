/**
 * Common utilities
 * @module glMatrix
 */
// Configuration Constants
var EPSILON = 0.000001;
var ARRAY_TYPE = typeof Float32Array !== 'undefined' ? Float32Array : Array;
if (!Math.hypot) Math.hypot = function () {
  var y = 0,
      i = arguments.length;

  while (i--) {
    y += arguments[i] * arguments[i];
  }

  return Math.sqrt(y);
};

/**
 * 3x3 Matrix
 * @module mat3
 */

/**
 * Creates a new identity mat3
 *
 * @returns {mat3} a new 3x3 matrix
 */

function create$4() {
  var out = new ARRAY_TYPE(9);

  if (ARRAY_TYPE != Float32Array) {
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[5] = 0;
    out[6] = 0;
    out[7] = 0;
  }

  out[0] = 1;
  out[4] = 1;
  out[8] = 1;
  return out;
}
/**
 * Copies the upper-left 3x3 values into the given mat3.
 *
 * @param {mat3} out the receiving 3x3 matrix
 * @param {ReadonlyMat4} a   the source 4x4 matrix
 * @returns {mat3} out
 */

function fromMat4(out, a) {
  out[0] = a[0];
  out[1] = a[1];
  out[2] = a[2];
  out[3] = a[4];
  out[4] = a[5];
  out[5] = a[6];
  out[6] = a[8];
  out[7] = a[9];
  out[8] = a[10];
  return out;
}
/**
 * Multiplies two mat3's
 *
 * @param {mat3} out the receiving matrix
 * @param {ReadonlyMat3} a the first operand
 * @param {ReadonlyMat3} b the second operand
 * @returns {mat3} out
 */

function multiply$1(out, a, b) {
  var a00 = a[0],
      a01 = a[1],
      a02 = a[2];
  var a10 = a[3],
      a11 = a[4],
      a12 = a[5];
  var a20 = a[6],
      a21 = a[7],
      a22 = a[8];
  var b00 = b[0],
      b01 = b[1],
      b02 = b[2];
  var b10 = b[3],
      b11 = b[4],
      b12 = b[5];
  var b20 = b[6],
      b21 = b[7],
      b22 = b[8];
  out[0] = b00 * a00 + b01 * a10 + b02 * a20;
  out[1] = b00 * a01 + b01 * a11 + b02 * a21;
  out[2] = b00 * a02 + b01 * a12 + b02 * a22;
  out[3] = b10 * a00 + b11 * a10 + b12 * a20;
  out[4] = b10 * a01 + b11 * a11 + b12 * a21;
  out[5] = b10 * a02 + b11 * a12 + b12 * a22;
  out[6] = b20 * a00 + b21 * a10 + b22 * a20;
  out[7] = b20 * a01 + b21 * a11 + b22 * a21;
  out[8] = b20 * a02 + b21 * a12 + b22 * a22;
  return out;
}

/**
 * 4x4 Matrix<br>Format: column-major, when typed out it looks like row-major<br>The matrices are being post multiplied.
 * @module mat4
 */

/**
 * Creates a new identity mat4
 *
 * @returns {mat4} a new 4x4 matrix
 */

function create$3() {
  var out = new ARRAY_TYPE(16);

  if (ARRAY_TYPE != Float32Array) {
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
  }

  out[0] = 1;
  out[5] = 1;
  out[10] = 1;
  out[15] = 1;
  return out;
}
/**
 * Creates a new mat4 initialized with values from an existing matrix
 *
 * @param {ReadonlyMat4} a matrix to clone
 * @returns {mat4} a new 4x4 matrix
 */

function clone$1(a) {
  var out = new ARRAY_TYPE(16);
  out[0] = a[0];
  out[1] = a[1];
  out[2] = a[2];
  out[3] = a[3];
  out[4] = a[4];
  out[5] = a[5];
  out[6] = a[6];
  out[7] = a[7];
  out[8] = a[8];
  out[9] = a[9];
  out[10] = a[10];
  out[11] = a[11];
  out[12] = a[12];
  out[13] = a[13];
  out[14] = a[14];
  out[15] = a[15];
  return out;
}
/**
 * Set a mat4 to the identity matrix
 *
 * @param {mat4} out the receiving matrix
 * @returns {mat4} out
 */

function identity(out) {
  out[0] = 1;
  out[1] = 0;
  out[2] = 0;
  out[3] = 0;
  out[4] = 0;
  out[5] = 1;
  out[6] = 0;
  out[7] = 0;
  out[8] = 0;
  out[9] = 0;
  out[10] = 1;
  out[11] = 0;
  out[12] = 0;
  out[13] = 0;
  out[14] = 0;
  out[15] = 1;
  return out;
}
/**
 * Transpose the values of a mat4
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the source matrix
 * @returns {mat4} out
 */

function transpose(out, a) {
  // If we are transposing ourselves we can skip a few steps but have to cache some values
  if (out === a) {
    var a01 = a[1],
        a02 = a[2],
        a03 = a[3];
    var a12 = a[6],
        a13 = a[7];
    var a23 = a[11];
    out[1] = a[4];
    out[2] = a[8];
    out[3] = a[12];
    out[4] = a01;
    out[6] = a[9];
    out[7] = a[13];
    out[8] = a02;
    out[9] = a12;
    out[11] = a[14];
    out[12] = a03;
    out[13] = a13;
    out[14] = a23;
  } else {
    out[0] = a[0];
    out[1] = a[4];
    out[2] = a[8];
    out[3] = a[12];
    out[4] = a[1];
    out[5] = a[5];
    out[6] = a[9];
    out[7] = a[13];
    out[8] = a[2];
    out[9] = a[6];
    out[10] = a[10];
    out[11] = a[14];
    out[12] = a[3];
    out[13] = a[7];
    out[14] = a[11];
    out[15] = a[15];
  }

  return out;
}
/**
 * Inverts a mat4
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the source matrix
 * @returns {mat4} out
 */

function invert(out, a) {
  var a00 = a[0],
      a01 = a[1],
      a02 = a[2],
      a03 = a[3];
  var a10 = a[4],
      a11 = a[5],
      a12 = a[6],
      a13 = a[7];
  var a20 = a[8],
      a21 = a[9],
      a22 = a[10],
      a23 = a[11];
  var a30 = a[12],
      a31 = a[13],
      a32 = a[14],
      a33 = a[15];
  var b00 = a00 * a11 - a01 * a10;
  var b01 = a00 * a12 - a02 * a10;
  var b02 = a00 * a13 - a03 * a10;
  var b03 = a01 * a12 - a02 * a11;
  var b04 = a01 * a13 - a03 * a11;
  var b05 = a02 * a13 - a03 * a12;
  var b06 = a20 * a31 - a21 * a30;
  var b07 = a20 * a32 - a22 * a30;
  var b08 = a20 * a33 - a23 * a30;
  var b09 = a21 * a32 - a22 * a31;
  var b10 = a21 * a33 - a23 * a31;
  var b11 = a22 * a33 - a23 * a32; // Calculate the determinant

  var det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;

  if (!det) {
    return null;
  }

  det = 1.0 / det;
  out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
  out[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
  out[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
  out[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
  out[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
  out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
  out[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
  out[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
  out[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
  out[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
  out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
  out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
  out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
  out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
  out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
  out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;
  return out;
}
/**
 * Calculates the determinant of a mat4
 *
 * @param {ReadonlyMat4} a the source matrix
 * @returns {Number} determinant of a
 */

function determinant(a) {
  var a00 = a[0],
      a01 = a[1],
      a02 = a[2],
      a03 = a[3];
  var a10 = a[4],
      a11 = a[5],
      a12 = a[6],
      a13 = a[7];
  var a20 = a[8],
      a21 = a[9],
      a22 = a[10],
      a23 = a[11];
  var a30 = a[12],
      a31 = a[13],
      a32 = a[14],
      a33 = a[15];
  var b00 = a00 * a11 - a01 * a10;
  var b01 = a00 * a12 - a02 * a10;
  var b02 = a00 * a13 - a03 * a10;
  var b03 = a01 * a12 - a02 * a11;
  var b04 = a01 * a13 - a03 * a11;
  var b05 = a02 * a13 - a03 * a12;
  var b06 = a20 * a31 - a21 * a30;
  var b07 = a20 * a32 - a22 * a30;
  var b08 = a20 * a33 - a23 * a30;
  var b09 = a21 * a32 - a22 * a31;
  var b10 = a21 * a33 - a23 * a31;
  var b11 = a22 * a33 - a23 * a32; // Calculate the determinant

  return b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
}
/**
 * Multiplies two mat4s
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the first operand
 * @param {ReadonlyMat4} b the second operand
 * @returns {mat4} out
 */

function multiply(out, a, b) {
  var a00 = a[0],
      a01 = a[1],
      a02 = a[2],
      a03 = a[3];
  var a10 = a[4],
      a11 = a[5],
      a12 = a[6],
      a13 = a[7];
  var a20 = a[8],
      a21 = a[9],
      a22 = a[10],
      a23 = a[11];
  var a30 = a[12],
      a31 = a[13],
      a32 = a[14],
      a33 = a[15]; // Cache only the current line of the second matrix

  var b0 = b[0],
      b1 = b[1],
      b2 = b[2],
      b3 = b[3];
  out[0] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
  b0 = b[4];
  b1 = b[5];
  b2 = b[6];
  b3 = b[7];
  out[4] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[5] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[6] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[7] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
  b0 = b[8];
  b1 = b[9];
  b2 = b[10];
  b3 = b[11];
  out[8] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[9] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[10] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[11] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
  b0 = b[12];
  b1 = b[13];
  b2 = b[14];
  b3 = b[15];
  out[12] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[13] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[14] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[15] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
  return out;
}
/**
 * Rotates a matrix by the given angle around the Y axis
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat4} out
 */

function rotateY(out, a, rad) {
  var s = Math.sin(rad);
  var c = Math.cos(rad);
  var a00 = a[0];
  var a01 = a[1];
  var a02 = a[2];
  var a03 = a[3];
  var a20 = a[8];
  var a21 = a[9];
  var a22 = a[10];
  var a23 = a[11];

  if (a !== out) {
    // If the source and destination differ, copy the unchanged rows
    out[4] = a[4];
    out[5] = a[5];
    out[6] = a[6];
    out[7] = a[7];
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
  } // Perform axis-specific matrix multiplication


  out[0] = a00 * c - a20 * s;
  out[1] = a01 * c - a21 * s;
  out[2] = a02 * c - a22 * s;
  out[3] = a03 * c - a23 * s;
  out[8] = a00 * s + a20 * c;
  out[9] = a01 * s + a21 * c;
  out[10] = a02 * s + a22 * c;
  out[11] = a03 * s + a23 * c;
  return out;
}
/**
 * Creates a matrix from the given angle around the X axis
 * This is equivalent to (but much faster than):
 *
 *     mat4.identity(dest);
 *     mat4.rotateX(dest, dest, rad);
 *
 * @param {mat4} out mat4 receiving operation result
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat4} out
 */

function fromXRotation(out, rad) {
  var s = Math.sin(rad);
  var c = Math.cos(rad); // Perform axis-specific matrix multiplication

  out[0] = 1;
  out[1] = 0;
  out[2] = 0;
  out[3] = 0;
  out[4] = 0;
  out[5] = c;
  out[6] = s;
  out[7] = 0;
  out[8] = 0;
  out[9] = -s;
  out[10] = c;
  out[11] = 0;
  out[12] = 0;
  out[13] = 0;
  out[14] = 0;
  out[15] = 1;
  return out;
}
/**
 * Creates a matrix from the given angle around the Y axis
 * This is equivalent to (but much faster than):
 *
 *     mat4.identity(dest);
 *     mat4.rotateY(dest, dest, rad);
 *
 * @param {mat4} out mat4 receiving operation result
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat4} out
 */

function fromYRotation(out, rad) {
  var s = Math.sin(rad);
  var c = Math.cos(rad); // Perform axis-specific matrix multiplication

  out[0] = c;
  out[1] = 0;
  out[2] = -s;
  out[3] = 0;
  out[4] = 0;
  out[5] = 1;
  out[6] = 0;
  out[7] = 0;
  out[8] = s;
  out[9] = 0;
  out[10] = c;
  out[11] = 0;
  out[12] = 0;
  out[13] = 0;
  out[14] = 0;
  out[15] = 1;
  return out;
}
/**
 * Returns the translation vector component of a transformation
 *  matrix. If a matrix is built with fromRotationTranslation,
 *  the returned vector will be the same as the translation vector
 *  originally supplied.
 * @param  {vec3} out Vector to receive translation component
 * @param  {ReadonlyMat4} mat Matrix to be decomposed (input)
 * @return {vec3} out
 */

function getTranslation(out, mat) {
  out[0] = mat[12];
  out[1] = mat[13];
  out[2] = mat[14];
  return out;
}
/**
 * Returns the scaling factor component of a transformation
 *  matrix. If a matrix is built with fromRotationTranslationScale
 *  with a normalized Quaternion paramter, the returned vector will be
 *  the same as the scaling vector
 *  originally supplied.
 * @param  {vec3} out Vector to receive scaling factor component
 * @param  {ReadonlyMat4} mat Matrix to be decomposed (input)
 * @return {vec3} out
 */

function getScaling(out, mat) {
  var m11 = mat[0];
  var m12 = mat[1];
  var m13 = mat[2];
  var m21 = mat[4];
  var m22 = mat[5];
  var m23 = mat[6];
  var m31 = mat[8];
  var m32 = mat[9];
  var m33 = mat[10];
  out[0] = Math.hypot(m11, m12, m13);
  out[1] = Math.hypot(m21, m22, m23);
  out[2] = Math.hypot(m31, m32, m33);
  return out;
}
/**
 * Returns a quaternion representing the rotational component
 *  of a transformation matrix. If a matrix is built with
 *  fromRotationTranslation, the returned quaternion will be the
 *  same as the quaternion originally supplied.
 * @param {quat} out Quaternion to receive the rotation component
 * @param {ReadonlyMat4} mat Matrix to be decomposed (input)
 * @return {quat} out
 */

function getRotation(out, mat) {
  var scaling = new ARRAY_TYPE(3);
  getScaling(scaling, mat);
  var is1 = 1 / scaling[0];
  var is2 = 1 / scaling[1];
  var is3 = 1 / scaling[2];
  var sm11 = mat[0] * is1;
  var sm12 = mat[1] * is2;
  var sm13 = mat[2] * is3;
  var sm21 = mat[4] * is1;
  var sm22 = mat[5] * is2;
  var sm23 = mat[6] * is3;
  var sm31 = mat[8] * is1;
  var sm32 = mat[9] * is2;
  var sm33 = mat[10] * is3;
  var trace = sm11 + sm22 + sm33;
  var S = 0;

  if (trace > 0) {
    S = Math.sqrt(trace + 1.0) * 2;
    out[3] = 0.25 * S;
    out[0] = (sm23 - sm32) / S;
    out[1] = (sm31 - sm13) / S;
    out[2] = (sm12 - sm21) / S;
  } else if (sm11 > sm22 && sm11 > sm33) {
    S = Math.sqrt(1.0 + sm11 - sm22 - sm33) * 2;
    out[3] = (sm23 - sm32) / S;
    out[0] = 0.25 * S;
    out[1] = (sm12 + sm21) / S;
    out[2] = (sm31 + sm13) / S;
  } else if (sm22 > sm33) {
    S = Math.sqrt(1.0 + sm22 - sm11 - sm33) * 2;
    out[3] = (sm31 - sm13) / S;
    out[0] = (sm12 + sm21) / S;
    out[1] = 0.25 * S;
    out[2] = (sm23 + sm32) / S;
  } else {
    S = Math.sqrt(1.0 + sm33 - sm11 - sm22) * 2;
    out[3] = (sm12 - sm21) / S;
    out[0] = (sm31 + sm13) / S;
    out[1] = (sm23 + sm32) / S;
    out[2] = 0.25 * S;
  }

  return out;
}
/**
 * Creates a matrix from a quaternion rotation, vector translation and vector scale
 * This is equivalent to (but much faster than):
 *
 *     mat4.identity(dest);
 *     mat4.translate(dest, vec);
 *     let quatMat = mat4.create();
 *     quat4.toMat4(quat, quatMat);
 *     mat4.multiply(dest, quatMat);
 *     mat4.scale(dest, scale)
 *
 * @param {mat4} out mat4 receiving operation result
 * @param {quat4} q Rotation quaternion
 * @param {ReadonlyVec3} v Translation vector
 * @param {ReadonlyVec3} s Scaling vector
 * @returns {mat4} out
 */

function fromRotationTranslationScale(out, q, v, s) {
  // Quaternion math
  var x = q[0],
      y = q[1],
      z = q[2],
      w = q[3];
  var x2 = x + x;
  var y2 = y + y;
  var z2 = z + z;
  var xx = x * x2;
  var xy = x * y2;
  var xz = x * z2;
  var yy = y * y2;
  var yz = y * z2;
  var zz = z * z2;
  var wx = w * x2;
  var wy = w * y2;
  var wz = w * z2;
  var sx = s[0];
  var sy = s[1];
  var sz = s[2];
  out[0] = (1 - (yy + zz)) * sx;
  out[1] = (xy + wz) * sx;
  out[2] = (xz - wy) * sx;
  out[3] = 0;
  out[4] = (xy - wz) * sy;
  out[5] = (1 - (xx + zz)) * sy;
  out[6] = (yz + wx) * sy;
  out[7] = 0;
  out[8] = (xz + wy) * sz;
  out[9] = (yz - wx) * sz;
  out[10] = (1 - (xx + yy)) * sz;
  out[11] = 0;
  out[12] = v[0];
  out[13] = v[1];
  out[14] = v[2];
  out[15] = 1;
  return out;
}
/**
 * Generates a perspective projection matrix with the given bounds.
 * The near/far clip planes correspond to a normalized device coordinate Z range of [-1, 1],
 * which matches WebGL/OpenGL's clip volume.
 * Passing null/undefined/no value for far will generate infinite projection matrix.
 *
 * @param {mat4} out mat4 frustum matrix will be written into
 * @param {number} fovy Vertical field of view in radians
 * @param {number} aspect Aspect ratio. typically viewport width/height
 * @param {number} near Near bound of the frustum
 * @param {number} far Far bound of the frustum, can be null or Infinity
 * @returns {mat4} out
 */

function perspectiveNO(out, fovy, aspect, near, far) {
  var f = 1.0 / Math.tan(fovy / 2),
      nf;
  out[0] = f / aspect;
  out[1] = 0;
  out[2] = 0;
  out[3] = 0;
  out[4] = 0;
  out[5] = f;
  out[6] = 0;
  out[7] = 0;
  out[8] = 0;
  out[9] = 0;
  out[11] = -1;
  out[12] = 0;
  out[13] = 0;
  out[15] = 0;

  if (far != null && far !== Infinity) {
    nf = 1 / (near - far);
    out[10] = (far + near) * nf;
    out[14] = 2 * far * near * nf;
  } else {
    out[10] = -1;
    out[14] = -2 * near;
  }

  return out;
}
/**
 * Alias for {@link mat4.perspectiveNO}
 * @function
 */

var perspective = perspectiveNO;
/**
 * Generates a look-at matrix with the given eye position, focal point, and up axis.
 * If you want a matrix that actually makes an object look at another object, you should use targetTo instead.
 *
 * @param {mat4} out mat4 frustum matrix will be written into
 * @param {ReadonlyVec3} eye Position of the viewer
 * @param {ReadonlyVec3} center Point the viewer is looking at
 * @param {ReadonlyVec3} up vec3 pointing up
 * @returns {mat4} out
 */

function lookAt(out, eye, center, up) {
  var x0, x1, x2, y0, y1, y2, z0, z1, z2, len;
  var eyex = eye[0];
  var eyey = eye[1];
  var eyez = eye[2];
  var upx = up[0];
  var upy = up[1];
  var upz = up[2];
  var centerx = center[0];
  var centery = center[1];
  var centerz = center[2];

  if (Math.abs(eyex - centerx) < EPSILON && Math.abs(eyey - centery) < EPSILON && Math.abs(eyez - centerz) < EPSILON) {
    return identity(out);
  }

  z0 = eyex - centerx;
  z1 = eyey - centery;
  z2 = eyez - centerz;
  len = 1 / Math.hypot(z0, z1, z2);
  z0 *= len;
  z1 *= len;
  z2 *= len;
  x0 = upy * z2 - upz * z1;
  x1 = upz * z0 - upx * z2;
  x2 = upx * z1 - upy * z0;
  len = Math.hypot(x0, x1, x2);

  if (!len) {
    x0 = 0;
    x1 = 0;
    x2 = 0;
  } else {
    len = 1 / len;
    x0 *= len;
    x1 *= len;
    x2 *= len;
  }

  y0 = z1 * x2 - z2 * x1;
  y1 = z2 * x0 - z0 * x2;
  y2 = z0 * x1 - z1 * x0;
  len = Math.hypot(y0, y1, y2);

  if (!len) {
    y0 = 0;
    y1 = 0;
    y2 = 0;
  } else {
    len = 1 / len;
    y0 *= len;
    y1 *= len;
    y2 *= len;
  }

  out[0] = x0;
  out[1] = y0;
  out[2] = z0;
  out[3] = 0;
  out[4] = x1;
  out[5] = y1;
  out[6] = z1;
  out[7] = 0;
  out[8] = x2;
  out[9] = y2;
  out[10] = z2;
  out[11] = 0;
  out[12] = -(x0 * eyex + x1 * eyey + x2 * eyez);
  out[13] = -(y0 * eyex + y1 * eyey + y2 * eyez);
  out[14] = -(z0 * eyex + z1 * eyey + z2 * eyez);
  out[15] = 1;
  return out;
}
/**
 * Alias for {@link mat4.multiply}
 * @function
 */

var mul = multiply;

/**
 * 3 Dimensional Vector
 * @module vec3
 */

/**
 * Creates a new, empty vec3
 *
 * @returns {vec3} a new 3D vector
 */

function create$2() {
  var out = new ARRAY_TYPE(3);

  if (ARRAY_TYPE != Float32Array) {
    out[0] = 0;
    out[1] = 0;
    out[2] = 0;
  }

  return out;
}
/**
 * Creates a new vec3 initialized with values from an existing vector
 *
 * @param {ReadonlyVec3} a vector to clone
 * @returns {vec3} a new 3D vector
 */

function clone(a) {
  var out = new ARRAY_TYPE(3);
  out[0] = a[0];
  out[1] = a[1];
  out[2] = a[2];
  return out;
}
/**
 * Calculates the length of a vec3
 *
 * @param {ReadonlyVec3} a vector to calculate length of
 * @returns {Number} length of a
 */

function length(a) {
  var x = a[0];
  var y = a[1];
  var z = a[2];
  return Math.hypot(x, y, z);
}
/**
 * Creates a new vec3 initialized with the given values
 *
 * @param {Number} x X component
 * @param {Number} y Y component
 * @param {Number} z Z component
 * @returns {vec3} a new 3D vector
 */

function fromValues$2(x, y, z) {
  var out = new ARRAY_TYPE(3);
  out[0] = x;
  out[1] = y;
  out[2] = z;
  return out;
}
/**
 * Adds two vec3's
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a the first operand
 * @param {ReadonlyVec3} b the second operand
 * @returns {vec3} out
 */

function add(out, a, b) {
  out[0] = a[0] + b[0];
  out[1] = a[1] + b[1];
  out[2] = a[2] + b[2];
  return out;
}
/**
 * Subtracts vector b from vector a
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a the first operand
 * @param {ReadonlyVec3} b the second operand
 * @returns {vec3} out
 */

function subtract(out, a, b) {
  out[0] = a[0] - b[0];
  out[1] = a[1] - b[1];
  out[2] = a[2] - b[2];
  return out;
}
/**
 * Scales a vec3 by a scalar number
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a the vector to scale
 * @param {Number} b amount to scale the vector by
 * @returns {vec3} out
 */

function scale(out, a, b) {
  out[0] = a[0] * b;
  out[1] = a[1] * b;
  out[2] = a[2] * b;
  return out;
}
/**
 * Calculates the euclidian distance between two vec3's
 *
 * @param {ReadonlyVec3} a the first operand
 * @param {ReadonlyVec3} b the second operand
 * @returns {Number} distance between a and b
 */

function distance(a, b) {
  var x = b[0] - a[0];
  var y = b[1] - a[1];
  var z = b[2] - a[2];
  return Math.hypot(x, y, z);
}
/**
 * Normalize a vec3
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a vector to normalize
 * @returns {vec3} out
 */

function normalize$2(out, a) {
  var x = a[0];
  var y = a[1];
  var z = a[2];
  var len = x * x + y * y + z * z;

  if (len > 0) {
    //TODO: evaluate use of glm_invsqrt here?
    len = 1 / Math.sqrt(len);
  }

  out[0] = a[0] * len;
  out[1] = a[1] * len;
  out[2] = a[2] * len;
  return out;
}
/**
 * Calculates the dot product of two vec3's
 *
 * @param {ReadonlyVec3} a the first operand
 * @param {ReadonlyVec3} b the second operand
 * @returns {Number} dot product of a and b
 */

function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}
/**
 * Computes the cross product of two vec3's
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a the first operand
 * @param {ReadonlyVec3} b the second operand
 * @returns {vec3} out
 */

function cross(out, a, b) {
  var ax = a[0],
      ay = a[1],
      az = a[2];
  var bx = b[0],
      by = b[1],
      bz = b[2];
  out[0] = ay * bz - az * by;
  out[1] = az * bx - ax * bz;
  out[2] = ax * by - ay * bx;
  return out;
}
/**
 * Transforms the vec3 with a mat4.
 * 4th vector component is implicitly '1'
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a the vector to transform
 * @param {ReadonlyMat4} m matrix to transform with
 * @returns {vec3} out
 */

function transformMat4(out, a, m) {
  var x = a[0],
      y = a[1],
      z = a[2];
  var w = m[3] * x + m[7] * y + m[11] * z + m[15];
  w = w || 1.0;
  out[0] = (m[0] * x + m[4] * y + m[8] * z + m[12]) / w;
  out[1] = (m[1] * x + m[5] * y + m[9] * z + m[13]) / w;
  out[2] = (m[2] * x + m[6] * y + m[10] * z + m[14]) / w;
  return out;
}
/**
 * Transforms the vec3 with a quat
 * Can also be used for dual quaternions. (Multiply it with the real part)
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a the vector to transform
 * @param {ReadonlyQuat} q quaternion to transform with
 * @returns {vec3} out
 */

function transformQuat(out, a, q) {
  // benchmarks: https://jsperf.com/quaternion-transform-vec3-implementations-fixed
  var qx = q[0],
      qy = q[1],
      qz = q[2],
      qw = q[3];
  var x = a[0],
      y = a[1],
      z = a[2]; // var qvec = [qx, qy, qz];
  // var uv = vec3.cross([], qvec, a);

  var uvx = qy * z - qz * y,
      uvy = qz * x - qx * z,
      uvz = qx * y - qy * x; // var uuv = vec3.cross([], qvec, uv);

  var uuvx = qy * uvz - qz * uvy,
      uuvy = qz * uvx - qx * uvz,
      uuvz = qx * uvy - qy * uvx; // vec3.scale(uv, uv, 2 * w);

  var w2 = qw * 2;
  uvx *= w2;
  uvy *= w2;
  uvz *= w2; // vec3.scale(uuv, uuv, 2);

  uuvx *= 2;
  uuvy *= 2;
  uuvz *= 2; // return vec3.add(out, a, vec3.add(out, uv, uuv));

  out[0] = x + uvx + uuvx;
  out[1] = y + uvy + uuvy;
  out[2] = z + uvz + uuvz;
  return out;
}
/**
 * Alias for {@link vec3.subtract}
 * @function
 */

var sub = subtract;
/**
 * Alias for {@link vec3.length}
 * @function
 */

var len = length;
/**
 * Perform some operation over an array of vec3s.
 *
 * @param {Array} a the array of vectors to iterate over
 * @param {Number} stride Number of elements between the start of each vec3. If 0 assumes tightly packed
 * @param {Number} offset Number of elements to skip at the beginning of the array
 * @param {Number} count Number of vec3s to iterate over. If 0 iterates over entire array
 * @param {Function} fn Function to call for each vector in the array
 * @param {Object} [arg] additional argument to pass to fn
 * @returns {Array} a
 * @function
 */

(function () {
  var vec = create$2();
  return function (a, stride, offset, count, fn, arg) {
    var i, l;

    if (!stride) {
      stride = 3;
    }

    if (!offset) {
      offset = 0;
    }

    if (count) {
      l = Math.min(count * stride + offset, a.length);
    } else {
      l = a.length;
    }

    for (i = offset; i < l; i += stride) {
      vec[0] = a[i];
      vec[1] = a[i + 1];
      vec[2] = a[i + 2];
      fn(vec, vec, arg);
      a[i] = vec[0];
      a[i + 1] = vec[1];
      a[i + 2] = vec[2];
    }

    return a;
  };
})();

/**
 * 4 Dimensional Vector
 * @module vec4
 */

/**
 * Creates a new, empty vec4
 *
 * @returns {vec4} a new 4D vector
 */

function create$1() {
  var out = new ARRAY_TYPE(4);

  if (ARRAY_TYPE != Float32Array) {
    out[0] = 0;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
  }

  return out;
}
/**
 * Creates a new vec4 initialized with the given values
 *
 * @param {Number} x X component
 * @param {Number} y Y component
 * @param {Number} z Z component
 * @param {Number} w W component
 * @returns {vec4} a new 4D vector
 */

function fromValues$1(x, y, z, w) {
  var out = new ARRAY_TYPE(4);
  out[0] = x;
  out[1] = y;
  out[2] = z;
  out[3] = w;
  return out;
}
/**
 * Normalize a vec4
 *
 * @param {vec4} out the receiving vector
 * @param {ReadonlyVec4} a vector to normalize
 * @returns {vec4} out
 */

function normalize$1(out, a) {
  var x = a[0];
  var y = a[1];
  var z = a[2];
  var w = a[3];
  var len = x * x + y * y + z * z + w * w;

  if (len > 0) {
    len = 1 / Math.sqrt(len);
  }

  out[0] = x * len;
  out[1] = y * len;
  out[2] = z * len;
  out[3] = w * len;
  return out;
}
/**
 * Perform some operation over an array of vec4s.
 *
 * @param {Array} a the array of vectors to iterate over
 * @param {Number} stride Number of elements between the start of each vec4. If 0 assumes tightly packed
 * @param {Number} offset Number of elements to skip at the beginning of the array
 * @param {Number} count Number of vec4s to iterate over. If 0 iterates over entire array
 * @param {Function} fn Function to call for each vector in the array
 * @param {Object} [arg] additional argument to pass to fn
 * @returns {Array} a
 * @function
 */

(function () {
  var vec = create$1();
  return function (a, stride, offset, count, fn, arg) {
    var i, l;

    if (!stride) {
      stride = 4;
    }

    if (!offset) {
      offset = 0;
    }

    if (count) {
      l = Math.min(count * stride + offset, a.length);
    } else {
      l = a.length;
    }

    for (i = offset; i < l; i += stride) {
      vec[0] = a[i];
      vec[1] = a[i + 1];
      vec[2] = a[i + 2];
      vec[3] = a[i + 3];
      fn(vec, vec, arg);
      a[i] = vec[0];
      a[i + 1] = vec[1];
      a[i + 2] = vec[2];
      a[i + 3] = vec[3];
    }

    return a;
  };
})();

/**
 * Quaternion
 * @module quat
 */

/**
 * Creates a new identity quat
 *
 * @returns {quat} a new quaternion
 */

function create() {
  var out = new ARRAY_TYPE(4);

  if (ARRAY_TYPE != Float32Array) {
    out[0] = 0;
    out[1] = 0;
    out[2] = 0;
  }

  out[3] = 1;
  return out;
}
/**
 * Sets a quat from the given angle and rotation axis,
 * then returns it.
 *
 * @param {quat} out the receiving quaternion
 * @param {ReadonlyVec3} axis the axis around which to rotate
 * @param {Number} rad the angle in radians
 * @returns {quat} out
 **/

function setAxisAngle(out, axis, rad) {
  rad = rad * 0.5;
  var s = Math.sin(rad);
  out[0] = s * axis[0];
  out[1] = s * axis[1];
  out[2] = s * axis[2];
  out[3] = Math.cos(rad);
  return out;
}
/**
 * Performs a spherical linear interpolation between two quat
 *
 * @param {quat} out the receiving quaternion
 * @param {ReadonlyQuat} a the first operand
 * @param {ReadonlyQuat} b the second operand
 * @param {Number} t interpolation amount, in the range [0-1], between the two inputs
 * @returns {quat} out
 */

function slerp(out, a, b, t) {
  // benchmarks:
  //    http://jsperf.com/quaternion-slerp-implementations
  var ax = a[0],
      ay = a[1],
      az = a[2],
      aw = a[3];
  var bx = b[0],
      by = b[1],
      bz = b[2],
      bw = b[3];
  var omega, cosom, sinom, scale0, scale1; // calc cosine

  cosom = ax * bx + ay * by + az * bz + aw * bw; // adjust signs (if necessary)

  if (cosom < 0.0) {
    cosom = -cosom;
    bx = -bx;
    by = -by;
    bz = -bz;
    bw = -bw;
  } // calculate coefficients


  if (1.0 - cosom > EPSILON) {
    // standard case (slerp)
    omega = Math.acos(cosom);
    sinom = Math.sin(omega);
    scale0 = Math.sin((1.0 - t) * omega) / sinom;
    scale1 = Math.sin(t * omega) / sinom;
  } else {
    // "from" and "to" quaternions are very close
    //  ... so we can do a linear interpolation
    scale0 = 1.0 - t;
    scale1 = t;
  } // calculate final values


  out[0] = scale0 * ax + scale1 * bx;
  out[1] = scale0 * ay + scale1 * by;
  out[2] = scale0 * az + scale1 * bz;
  out[3] = scale0 * aw + scale1 * bw;
  return out;
}
/**
 * Creates a quaternion from the given 3x3 rotation matrix.
 *
 * NOTE: The resultant quaternion is not normalized, so you should be sure
 * to renormalize the quaternion yourself where necessary.
 *
 * @param {quat} out the receiving quaternion
 * @param {ReadonlyMat3} m rotation matrix
 * @returns {quat} out
 * @function
 */

function fromMat3(out, m) {
  // Algorithm in Ken Shoemake's article in 1987 SIGGRAPH course notes
  // article "Quaternion Calculus and Fast Animation".
  var fTrace = m[0] + m[4] + m[8];
  var fRoot;

  if (fTrace > 0.0) {
    // |w| > 1/2, may as well choose w > 1/2
    fRoot = Math.sqrt(fTrace + 1.0); // 2w

    out[3] = 0.5 * fRoot;
    fRoot = 0.5 / fRoot; // 1/(4w)

    out[0] = (m[5] - m[7]) * fRoot;
    out[1] = (m[6] - m[2]) * fRoot;
    out[2] = (m[1] - m[3]) * fRoot;
  } else {
    // |w| <= 1/2
    var i = 0;
    if (m[4] > m[0]) i = 1;
    if (m[8] > m[i * 3 + i]) i = 2;
    var j = (i + 1) % 3;
    var k = (i + 2) % 3;
    fRoot = Math.sqrt(m[i * 3 + i] - m[j * 3 + j] - m[k * 3 + k] + 1.0);
    out[i] = 0.5 * fRoot;
    fRoot = 0.5 / fRoot;
    out[3] = (m[j * 3 + k] - m[k * 3 + j]) * fRoot;
    out[j] = (m[j * 3 + i] + m[i * 3 + j]) * fRoot;
    out[k] = (m[k * 3 + i] + m[i * 3 + k]) * fRoot;
  }

  return out;
}
/**
 * Creates a new quat initialized with the given values
 *
 * @param {Number} x X component
 * @param {Number} y Y component
 * @param {Number} z Z component
 * @param {Number} w W component
 * @returns {quat} a new quaternion
 * @function
 */

var fromValues = fromValues$1;
/**
 * Normalize a quat
 *
 * @param {quat} out the receiving quaternion
 * @param {ReadonlyQuat} a quaternion to normalize
 * @returns {quat} out
 * @function
 */

var normalize = normalize$1;
/**
 * Sets a quaternion to represent the shortest rotation from one
 * vector to another.
 *
 * Both vectors are assumed to be unit length.
 *
 * @param {quat} out the receiving quaternion.
 * @param {ReadonlyVec3} a the initial vector
 * @param {ReadonlyVec3} b the destination vector
 * @returns {quat} out
 */

(function () {
  var tmpvec3 = create$2();
  var xUnitVec3 = fromValues$2(1, 0, 0);
  var yUnitVec3 = fromValues$2(0, 1, 0);
  return function (out, a, b) {
    var dot$1 = dot(a, b);

    if (dot$1 < -0.999999) {
      cross(tmpvec3, xUnitVec3, a);
      if (len(tmpvec3) < 0.000001) cross(tmpvec3, yUnitVec3, a);
      normalize$2(tmpvec3, tmpvec3);
      setAxisAngle(out, tmpvec3, Math.PI);
      return out;
    } else if (dot$1 > 0.999999) {
      out[0] = 0;
      out[1] = 0;
      out[2] = 0;
      out[3] = 1;
      return out;
    } else {
      cross(tmpvec3, a, b);
      out[0] = tmpvec3[0];
      out[1] = tmpvec3[1];
      out[2] = tmpvec3[2];
      out[3] = 1 + dot$1;
      return normalize(out, out);
    }
  };
})();
/**
 * Performs a spherical linear interpolation with two control points
 *
 * @param {quat} out the receiving quaternion
 * @param {ReadonlyQuat} a the first operand
 * @param {ReadonlyQuat} b the second operand
 * @param {ReadonlyQuat} c the third operand
 * @param {ReadonlyQuat} d the fourth operand
 * @param {Number} t interpolation amount, in the range [0-1], between the two inputs
 * @returns {quat} out
 */

(function () {
  var temp1 = create();
  var temp2 = create();
  return function (out, a, b, c, d, t) {
    slerp(temp1, a, d, t);
    slerp(temp2, b, c, t);
    slerp(out, temp1, temp2, 2 * t * (1 - t));
    return out;
  };
})();
/**
 * Sets the specified quaternion with values corresponding to the given
 * axes. Each axis is a vec3 and is expected to be unit length and
 * perpendicular to all other specified axes.
 *
 * @param {ReadonlyVec3} view  the vector representing the viewing direction
 * @param {ReadonlyVec3} right the vector representing the local "right" direction
 * @param {ReadonlyVec3} up    the vector representing the local "up" direction
 * @returns {quat} out
 */

(function () {
  var matr = create$4();
  return function (out, view, right, up) {
    matr[0] = right[0];
    matr[3] = right[1];
    matr[6] = right[2];
    matr[1] = up[0];
    matr[4] = up[1];
    matr[7] = up[2];
    matr[2] = -view[0];
    matr[5] = -view[1];
    matr[8] = -view[2];
    return normalize(out, fromMat3(out, matr));
  };
})();

function jsToGl(array) {
    let tensor = new ARRAY_TYPE(array.length);

    for (let i = 0; i < array.length; ++i) {
        tensor[i] = array[i];
    }

    return tensor;
}

function jsToGlSlice(array, offset, stride) {
    let tensor = new ARRAY_TYPE(stride);

    for (let i = 0; i < stride; ++i) {
        tensor[i] = array[offset + i];
    }

    return tensor;
}

function initGlForMembers(gltfObj, gltf, webGlContext) {
    for (const name of Object.keys(gltfObj)) {
        const member = gltfObj[name];

        if (member === undefined) {
            continue;
        }
        if (member.initGl !== undefined) {
            member.initGl(gltf, webGlContext);
        }
        if (Array.isArray(member)) {
            for (const element of member) {
                if (element !== null && element !== undefined && element.initGl !== undefined) {
                    element.initGl(gltf, webGlContext);
                }
            }
        }
    }
}

function objectsFromJsons(jsonObjects, GltfType) {
    if (jsonObjects === undefined) {
        return [];
    }

    const objects = [];
    for (const jsonObject of jsonObjects) {
        objects.push(objectFromJson(jsonObject, GltfType));
    }
    return objects;
}

function objectFromJson(jsonObject, GltfType) {
    const object = new GltfType();
    object.fromJson(jsonObject);
    return object;
}

function fromKeys(target, jsonObj, ignore = []) {
    for (let k of Object.keys(target)) {
        if (ignore && ignore.find(function (elem) { return elem == k; }) !== undefined) {
            continue; // skip
        }
        if (jsonObj[k] !== undefined) {
            let normalizedK = k.replace("^@", "");
            target[normalizedK] = jsonObj[k];
        }
    }
}

function stringHash(str, seed = 0) {
    let hash = seed;
    if (str.length === 0) return hash;
    for (let i = 0; i < str.length; i++) {
        let chr = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + chr;
        hash |= 0; // Convert to 32bit integer
    }
    return hash;
}

function clamp(number, min, max) {
    return Math.min(Math.max(number, min), max);
}

function getIsGlb(filename) {
    return getExtension(filename) == "glb";
}

function getExtension(filename) {
    const split = filename.toLowerCase().split(".");
    if (split.length == 1) {
        return undefined;
    }
    return split[split.length - 1];
}

function getContainingFolder(filePath) {
    return filePath.substring(0, filePath.lastIndexOf("/") + 1);
}

// marker interface used to for parsing the uniforms
class UniformStruct { }

class AnimationTimer {
    constructor() {
        this.startTime = 0;
        this.paused = true;
        this.fixedTime = null;
        this.pausedTime = 0;
    }

    elapsedSec() {
        if (this.paused) {
            return this.pausedTime / 1000;
        }
        else {
            return this.fixedTime || (new Date().getTime() - this.startTime) / 1000;
        }
    }

    toggle() {
        if (this.paused) {
            this.unpause();
        }
        else {
            this.pause();
        }
    }

    start() {
        this.startTime = new Date().getTime();
        this.paused = false;
    }

    pause() {
        this.pausedTime = new Date().getTime() - this.startTime;
        this.paused = true;
    }

    unpause() {
        this.startTime += new Date().getTime() - this.startTime - this.pausedTime;
        this.paused = false;
    }

    reset() {
        if (!this.paused) {
            // Animation is running.
            this.startTime = new Date().getTime();
        }
        else {
            this.startTime = 0;
        }
        this.pausedTime = 0;
    }

    setFixedTime(timeInSec) {
        this.paused = false;
        this.fixedTime = timeInSec;
    }
}

// base class for all gltf objects
class GltfObject
{
    constructor()
    {
        this.extensions = undefined;
        this.extras = undefined;
    }

    fromJson(json)
    {
        fromKeys(this, json);
    }

    initGl(gltf, webGlContext)
    {
        initGlForMembers(this, gltf, webGlContext);
    }
}

class gltfCamera extends GltfObject
{
    constructor(
        type = "perspective",
        znear = 0.01,
        zfar = Infinity,
        yfov = 45.0 * Math.PI / 180.0,
        aspectRatio = undefined,
        xmag = 1.0,
        ymag = 1.0,
        name = undefined,
        nodeIndex = undefined)
    {
        super();
        this.type = type;
        this.znear = znear;
        this.zfar = zfar;
        this.yfov = yfov; // radians
        this.xmag = xmag;
        this.ymag = ymag;
        this.aspectRatio = aspectRatio;
        this.name = name;
        this.node = nodeIndex;
    }

    initGl(gltf, webGlContext)
    {
        super.initGl(gltf, webGlContext);

        let cameraIndex = undefined;
        for (let i = 0; i < gltf.nodes.length; i++)
        {
            cameraIndex = gltf.nodes[i].camera;
            if (cameraIndex === undefined)
            {
                continue;
            }

            if (gltf.cameras[cameraIndex] === this)
            {
                this.node = i;
                break;
            }
        }

        // cameraIndex stays undefined if camera is not assigned to any node
        if(this.node === undefined && cameraIndex !== undefined)
        {
            console.error("Invalid node for camera " + cameraIndex);
        }
    }

    fromJson(jsonCamera)
    {
        this.name = name;
        if(jsonCamera.perspective !== undefined)
        {
            this.type = "perspective";
            fromKeys(this, jsonCamera.perspective);
        }
        else if(jsonCamera.orthographic !== undefined)
        {
            this.type = "orthographic";
            fromKeys(this, jsonCamera.orthographic);
        }
    }

    sortPrimitivesByDepth(gltf, drawables)
    {
        // Precompute the distances to avoid their computation during sorting.
        for (const drawable of drawables)
        {
            const modelView = create$3();
            multiply(modelView, this.getViewMatrix(gltf), drawable.node.worldTransform);

            // Transform primitive centroid to find the primitive's depth.
            const pos = transformMat4(create$2(), clone(drawable.primitive.centroid), modelView);

            drawable.depth = pos[2];
        }

        // 1. Remove primitives that are behind the camera.
        //    --> They will never be visible and it is cheap to discard them here.
        // 2. Sort primitives so that the furthest nodes are rendered first.
        //    This is required for correct transparency rendering.
        return drawables
            .sort((a, b) => a.depth - b.depth);
    }

    getProjectionMatrix()
    {
        const projection = create$3();

        if (this.type === "perspective")
        {
            perspective(projection, this.yfov, this.aspectRatio, this.znear, this.zfar);
        }
        else if (this.type === "orthographic")
        {
            projection[0]  = 1.0 / this.xmag;
            projection[5]  = 1.0 / this.ymag;
            projection[10] = 2.0 / (this.znear - this.zfar);
            projection[14] = (this.zfar + this.znear) / (this.znear - this.zfar);
        }

        return projection;
    }

    getViewMatrix(gltf)
    {
        let result = create$3();
        invert(result, this.getTransformMatrix(gltf));
        return result;
    }

    getTarget(gltf)
    {
        const target = create$2();
        const position = this.getPosition(gltf);
        const lookDirection = this.getLookDirection(gltf);
        add(target, lookDirection, position);
        return target;
    }

    getPosition(gltf)
    {
        const position = create$2();
        const node = this.getNode(gltf);
        getTranslation(position, node.worldTransform);
        return position;
    }

    getLookDirection(gltf)
    {
        const direction = create$2();
        const rotation = this.getRotation(gltf);
        transformQuat(direction, fromValues$2(0, 0, -1), rotation);
        return direction;
    }

    getRotation(gltf)
    {
        const rotation = create();
        const node = this.getNode(gltf);
        getRotation(rotation, node.worldTransform);
        return rotation;
    }

    clone()
    {
        return new gltfCamera(
            this.type,
            this.znear,
            this.zfar,
            this.yfov,
            this.aspectRatio,
            this.xmag,
            this.ymag,
            this.name,
            this.node);
    }

    getNode(gltf)
    {
        return gltf.nodes[this.node];
    }

    getTransformMatrix(gltf)
    {
        const node = this.getNode(gltf);
        if (node !== undefined && node.worldTransform !== undefined)
        {
            return node.worldTransform;
        }
        return create$3();

    }

    // Returns a JSON object describing the user camera's current values.
    getDescription(gltf)
    {
        const asset = {
            "generator": "gltf-sample-viewer",
            "version": "2.0"
        };

        const camera = {
            "type": this.type
        };

        if (this.name !== undefined)
        {
            camera["name"] = this.name;
        }

        if (this.type === "perspective")
        {
            camera["perspective"] = {};
            if (this.aspectRatio !== undefined)
            {
                camera["perspective"]["aspectRatio"] = this.aspectRatio;
            }
            camera["perspective"]["yfov"] = this.yfov;
            if (this.zfar != Infinity)
            {
                camera["perspective"]["zfar"] = this.zfar;
            }
            camera["perspective"]["znear"] = this.znear;
        }
        else if (this.type === "orthographic")
        {
            camera["orthographic"] = {};
            camera["orthographic"]["xmag"] = this.xmag;
            camera["orthographic"]["ymag"] = this.ymag;
            camera["orthographic"]["zfar"] = this.zfar;
            camera["orthographic"]["znear"] = this.znear;
        }

        const mat = this.getTransformMatrix(gltf);

        const node = {
            "camera": 0,
            "matrix": [mat[0], mat[1], mat[2], mat[3],
                       mat[4], mat[5], mat[6], mat[7],
                       mat[8], mat[9], mat[10], mat[11],
                       mat[12], mat[13], mat[14], mat[15]]
        };

        if (this.nodeIndex !== undefined && gltf.nodes[this.nodeIndex].name !== undefined)
        {
            node["name"] = gltf.nodes[this.nodeIndex].name;
        }

        return {
            "asset": asset,
            "cameras": [camera],
            "nodes": [node]
        };
    }
}

function getSceneExtents(gltf, sceneIndex, outMin, outMax)
{
    for (const i of [0, 1, 2])
    {
        outMin[i] = Number.POSITIVE_INFINITY;
        outMax[i] = Number.NEGATIVE_INFINITY;
    }

    const scene = gltf.scenes[sceneIndex];

    let nodeIndices = scene.nodes.slice();
    while(nodeIndices.length > 0)
    {
        const node = gltf.nodes[nodeIndices.pop()];
        nodeIndices = nodeIndices.concat(node.children);

        if (node.mesh === undefined)
        {
            continue;
        }

        const mesh = gltf.meshes[node.mesh];
        if (mesh.primitives === undefined)
        {
            continue;
        }

        for (const primitive of mesh.primitives)
        {
            const attribute = primitive.glAttributes.find(a => a.attribute == "POSITION");
            if (attribute === undefined)
            {
                continue;
            }

            const accessor = gltf.accessors[attribute.accessor];
            const assetMin = create$2();
            const assetMax = create$2();
            getExtentsFromAccessor(accessor, node.worldTransform, assetMin, assetMax);

            for (const i of [0, 1, 2])
            {
                outMin[i] = Math.min(outMin[i], assetMin[i]);
                outMax[i] = Math.max(outMax[i], assetMax[i]);
            }
        }
    }
}

function getExtentsFromAccessor(accessor, worldTransform, outMin, outMax)
{
    const boxMin = create$2();
    let min = jsToGl(accessor.min);
    if (accessor.normalized){
        normalize$2(min, min);
    }
    transformMat4(boxMin, min, worldTransform);

    const boxMax = create$2();
    let max = jsToGl(accessor.max);
    if (accessor.normalized){
        normalize$2(max, max);
    }
    transformMat4(boxMax, max, worldTransform);

    const center = create$2();
    add(center, boxMax, boxMin);
    scale(center, center, 0.5);

    const centerToSurface = create$2();
    sub(centerToSurface, boxMax, center);

    const radius = length(centerToSurface);

    for (const i of [0, 1, 2])
    {
        outMin[i] = center[i] - radius;
        outMax[i] = center[i] + radius;
    }
}

const PanSpeedDenominator = 3500;
const MaxNearFarRatio = 10000;

class UserCamera extends gltfCamera
{
    /**
     * Create a new user camera.
     */
    constructor()
    {
        super();

        this.transform = create$3();
        this.rotAroundY = 0;
        this.rotAroundX = 0;
        this.distance = 1;
        this.baseDistance = 1.0;
        this.zoomExponent = 5.0;
        this.zoomFactor = 0.01;
        this.orbitSpeed = 1 / 180;
        this.panSpeed = 1;
        this.sceneExtents = {
            min: create$2(),
            max: create$2()
        };
    }

    getTransformMatrix()
    {
        return this.transform;
    }

    /**
     * Sets the vertical FoV of the user camera.
     * @param {number} yfov 
     */
    setVerticalFoV(yfov)
    {
        this.yfov = yfov;
    }

    /**
     * Returns the current position of the user camera as a vec3.
     */
    getPosition()
    {
        let pos = create$2();
        getTranslation(pos, this.transform);
        return pos;
    }

    /**
     * Returns the current rotation of the user camera as quat.
     */
    getRotation()
    {
        let rot = create();
        getRotation(rot, this.transform);
        return rot;
    }

    /**
     * Returns the normalized direction the user camera looks at as vec3.
     */
    getLookDirection()
    {
        let dir = [-this.transform[8], -this.transform[9], -this.transform[10]];
        normalize$2(dir, dir);
        return dir;
    }

    /**
     * Returns the current target the camera looks at as vec3.
     * This multiplies the viewing direction with the distance.
     * For distance 0 the normalized viewing direction is used.
     */
    getTarget()
    {
        const target = create$2();
        const position = this.getPosition();
        let lookDirection = this.getLookDirection();
        if (this.distance != 0 && this.distance != 1)
        {
            lookDirection = lookDirection.map(x => x * this.distance);
        }
        add(target, lookDirection, position);
        return target;
    }

    /**
     * Look from user camera to target.
     * This changes the transformation of the user camera.
     * @param {vec3} from 
     * @param {vec3} to 
     */
    lookAt(from, to)
    {
        this.transform = create$3();
        lookAt(this.transform, from, to, fromValues$2(0, 1, 0));
    }

    /**
     * Sets the position of the user camera.
     * @param {vec3} position 
     */
    setPosition(position)
    {
        this.transform[12] = position[0];
        this.transform[13] = position[1];
        this.transform[14] = position[2];
    }

    /**
     * This rotates the user camera towards the target and sets the position of the user camera
     * according to the current distance.
     * @param {vec3} target 
     */
    setTarget(target)
    {
        let pos = create$2();
        getTranslation(pos, this.transform);
        this.transform = create$3();
        lookAt(this.transform, pos, target, fromValues$2(0, 1, 0));
        this.setDistanceFromTarget(this.distance, target);
    }

    /**
     * Sets the rotation of the camera.
     * Yaw and pitch in euler angles (degrees).
     * @param {number} yaw 
     * @param {number} pitch 
     */
    setRotation(yaw, pitch)
    {
        const tmpPos = this.getPosition();
        let mat4x = create$3();
        let mat4y = create$3();
        fromXRotation(mat4x, pitch);
        fromYRotation(mat4y, yaw);
        this.transform = mat4y;
        this.setPosition(tmpPos);
        multiply(this.transform, this.transform, mat4x);
    }

    /**
     * Transforms the user camera to look at a target from a specfic distance using the current rotation.
     * This will only change the position of the user camera, not the rotation.
     * Use this function to set the distance.
     * @param {number} distance 
     * @param {vec3} target 
     */
    setDistanceFromTarget(distance, target)
    {
        const lookDirection = this.getLookDirection();
        const distVec = lookDirection.map(x => x * -distance);
        let pos = create$2();
        add(pos, target, distVec);
        this.setPosition(pos);
        this.distance = distance;
    }

    /**
     * Zoom exponentially according to this.zoomFactor and this.zoomExponent.
     * The default zoomFactor provides good zoom speed for values from [-1,1].
     * @param {number} value 
     */
    zoomBy(value)
    {
        let target = this.getTarget();

        // zoom exponentially
        let zoomDistance = Math.pow(this.distance / this.baseDistance, 1.0 / this.zoomExponent);
        zoomDistance += this.zoomFactor * value;
        zoomDistance = Math.max(zoomDistance, 0.0001);
        this.distance = Math.pow(zoomDistance, this.zoomExponent) * this.baseDistance;

        this.setDistanceFromTarget(this.distance, target);
        this.fitCameraPlanesToExtents(this.sceneExtents.min, this.sceneExtents.max);
    }

    /**
     * Orbit around the target.
     * x and y should be in radient and are added to the current rotation.
     * The rotation around the x-axis is limited to 180 degree.
     * The axes are inverted: e.g. if y is positive the camera will look further down.
     * @param {number} x 
     * @param {number} y 
     */
    orbit(x, y)
    {
        const target = this.getTarget();
        const rotAroundXMax = Math.PI / 2 - 0.01;
        this.rotAroundY += (-x * this.orbitSpeed);
        this.rotAroundX += (-y * this.orbitSpeed);
        this.rotAroundX = clamp(this.rotAroundX, -rotAroundXMax, rotAroundXMax);
        this.setRotation(this.rotAroundY, this.rotAroundX);
        this.setDistanceFromTarget(this.distance, target);
    }

    /**
     * Pan the user camera.
     * The axes are inverted: e.g. if y is positive the camera will move down.
     * @param {number} x 
     * @param {number} y 
     */
    pan(x, y)
    {
        const right = fromValues$2(this.transform[0], this.transform[1], this.transform[2]);
        normalize$2(right, right);
        scale(right, right, -x * this.panSpeed * (this.distance / this.baseDistance));

        const up = fromValues$2(this.transform[4], this.transform[5], this.transform[6]);
        normalize$2(up, up);
        scale(up, up, -y * this.panSpeed * (this.distance / this.baseDistance));

        let pos = this.getPosition();

        add(pos, pos, up);
        add(pos, pos, right);

        this.setPosition(pos);
    }

    fitPanSpeedToScene(min, max)
    {
        const longestDistance = distance(min, max);
        this.panSpeed = longestDistance / PanSpeedDenominator;
    }

    reset()
    {
        this.transform = create$3();
        this.rotAroundX = 0;
        this.rotAroundY = 0;
        this.fitDistanceToExtents(this.sceneExtents.min, this.sceneExtents.max);
        this.fitCameraTargetToExtents(this.sceneExtents.min, this.sceneExtents.max);
    }

    /**
     * Calculates a camera position which looks at the center of the scene from an appropriate distance.
     * This calculates near and far plane as well.
     * @param {Gltf} gltf 
     * @param {number} sceneIndex 
     */
    fitViewToScene(gltf, sceneIndex)
    {
        this.transform = create$3();
        this.rotAroundX = 0;
        this.rotAroundY = 0;
        getSceneExtents(gltf, sceneIndex, this.sceneExtents.min, this.sceneExtents.max);
        this.fitDistanceToExtents(this.sceneExtents.min, this.sceneExtents.max);
        this.fitCameraTargetToExtents(this.sceneExtents.min, this.sceneExtents.max);

        this.fitPanSpeedToScene(this.sceneExtents.min, this.sceneExtents.max);
        this.fitCameraPlanesToExtents(this.sceneExtents.min, this.sceneExtents.max);

    }

    fitDistanceToExtents(min, max)
    {
        const maxAxisLength = Math.max(max[0] - min[0], max[1] - min[1]);
        const yfov = this.yfov;
        const xfov = this.yfov * this.aspectRatio;

        const yZoom = maxAxisLength / 2 / Math.tan(yfov / 2);
        const xZoom = maxAxisLength / 2 / Math.tan(xfov / 2);

        this.distance = Math.max(xZoom, yZoom);
        this.baseDistance = this.distance;
    }

    fitCameraTargetToExtents(min, max)
    {
        let target = [0,0,0];
        for (const i of [0, 1, 2])
        {
            target[i] = (max[i] + min[i]) / 2;
        }
        this.setRotation(this.rotAroundY, this.rotAroundX);
        this.setDistanceFromTarget(this.distance, target);
    }

    fitCameraPlanesToExtents(min, max)
    {
        // depends only on scene min/max and the camera distance

        // Manually increase scene extent just for the camera planes to avoid camera clipping in most situations.
        const longestDistance = 10 * distance(min, max);
        let zNear = this.distance - (longestDistance * 0.6);
        let zFar = this.distance + (longestDistance * 0.6);

        // minimum near plane value needs to depend on far plane value to avoid z fighting or too large near planes
        zNear = Math.max(zNear, zFar / MaxNearFarRatio);

        this.znear = zNear;
        this.zfar = zFar;
    }
}

/**
 * GltfState containing a state for visualization in GltfView
 */
class GltfState
{
    /**
     * GltfState represents all state that can be visualized in a view. You could have
     * multiple GltfStates configured and switch between them on demand.
     * @param {*} view GltfView to which this state belongs
     */
    constructor(view)
    {
        /** loaded gltf data @see ResourceLoader.loadGltf */
        this.gltf = undefined;
        /** loaded environment data @see ResourceLoader.loadEnvironment */
        this.environment = undefined;
        /** user camera @see UserCamera, convenient camera controls */
        this.userCamera = new UserCamera();
        /** gltf scene that is visible in the view */
        this.sceneIndex = 0;
        /**
         * index of the camera that is used to render the view. a
         * value of 'undefined' enables the user camera
         */
        this.cameraIndex = undefined;
        /** indices of active animations */
        this.animationIndices = [];
        /** animation timer allows to control the animation time */
        this.animationTimer = new AnimationTimer();
        /** KHR_materials_variants */
        this.variant = undefined;

        /** parameters used to configure the rendering */
        this.renderingParameters = {
            /** morphing between vertices */
            morphing: true,
            /** skin / skeleton */
            skinning: true,

            enabledExtensions: {
                /** KHR_materials_clearcoat */
                KHR_materials_clearcoat: true,
                /** KHR_materials_sheen */
                KHR_materials_sheen: true,
                /** KHR_materials_transmission */
                KHR_materials_transmission: true,
                /** KHR_materials_volume */
                KHR_materials_volume: true,
                /** KHR_materials_ior makes the index of refraction configurable */
                KHR_materials_ior: true,
                /** KHR_materials_specular allows configuring specular color (f0 color) and amount of specular reflection */
                KHR_materials_specular: true,
                /** KHR_materials_iridescence adds a thin-film iridescence effect */
                KHR_materials_iridescence: true,
                KHR_materials_emissive_strength: true,
            },
            /** clear color expressed as list of ints in the range [0, 255] */
            clearColor: [58, 64, 74, 255],
            /** exposure factor */
            exposure: 1.0,
            /** KHR_lights_punctual */
            usePunctual: true,
            /** image based lighting */
            useIBL: true,
            /** image based lighting intensity */
            iblIntensity: 1.0,
            /** render the environment map in the background */
            renderEnvironmentMap: true,
            /** apply blur to the background environment map */
            blurEnvironmentMap: true,
            /** which tonemap to use, use ACES for a filmic effect */
            toneMap: GltfState.ToneMaps.LINEAR,
            /** render some debug output channes, such as for example the normals */
            debugOutput: GltfState.DebugOutput.NONE,
            /**
             * By default the front face of the environment is +Z (90)
             * Front faces:
             * +X = 0 
             * +Z = 90 
             * -X = 180 
             * -Z = 270
             */
            environmentRotation: 90.0,
            /** If this is set to true, directional lights will be generated if IBL is disabled */
            useDirectionalLightsWithDisabledIBL: false,
            /** MSAA used for cases which are not handled by the browser (e.g. Transmission)*/
            internalMSAA: 4
        };

        // retain a reference to the view with which the state was created, so that it can be validated
        this._view = view;
    }
}

/** 
 * ToneMaps enum for the different tonemappings that are supported 
 * by gltf sample viewer
*/
GltfState.ToneMaps = {
    /** don't apply tone mapping */
    NONE: "None",
    /** ACES sRGB RRT+ODT implementation for 3D Commerce based on Stephen Hill's implementation with a exposure factor of 1.0 / 0.6 */
    ACES_HILL_EXPOSURE_BOOST: "ACES Filmic Tone Mapping (Hill - Exposure Boost)",
    /** fast implementation of the ACES sRGB RRT+ODT based on Krzysztof Narkowicz' implementation*/
    ACES_NARKOWICZ: "ACES Filmic Tone Mapping (Narkowicz)",
    /** more accurate implementation of the ACES sRGB RRT+ODT based on Stephen Hill's implementation*/
    ACES_HILL: "ACES Filmic Tone Mapping (Hill)",
};

/**
 * DebugOutput enum for selecting debug output channels
 * such as "NORMAL"
 */
GltfState.DebugOutput = {
    /** standard rendering - debug output is disabled */
    NONE: "None",

    /** generic debug outputs */
    generic: {
        /** output the texture coordinates 0 */
        UV_COORDS_0: "Texture Coordinates 0",
        /** output the texture coordinates 1 */
        UV_COORDS_1: "Texture Coordinates 1",
        /** output the world space normals (i.e. with TBN applied) */
        NORMAL: "Normal Texture",
        /** output the normal from the TBN*/
        GEOMETRYNORMAL: "Geometry Normal",
        /** output the tangent from the TBN*/
        TANGENT: "Geometry Tangent",
        /** output the bitangent from the TBN */
        BITANGENT: "Geometry Bitangent",
        /** output the world space normals (i.e. with TBN applied) */
        WORLDSPACENORMAL: "Shading Normal",
        /** output the alpha value */
        ALPHA: "Alpha",
        /** output the occlusion value */
        OCCLUSION: "Occlusion",
        /** output the emissive value */
        EMISSIVE: "Emissive",
    },

    /** output metallic roughness */
    mr: {
        /** output the combined metallic roughness */
        METALLIC_ROUGHNESS: "Metallic Roughness",
        /** output the base color value */
        BASECOLOR: "Base Color",
        /** output the metallic value from pbr metallic roughness */
        METALLIC: "Metallic",
        /** output the roughness value from pbr metallic roughness */
        ROUGHNESS: "Roughness",
    },

    /** output clearcoat lighting */
    clearcoat: {
        /** output the combined clear coat */
        CLEARCOAT: "ClearCoat",
        /** output the clear coat factor */
        CLEARCOAT_FACTOR: "ClearCoat Factor",
        /** output the clear coat roughness */
        CLEARCOAT_ROUGHNESS: "ClearCoat Roughness",
        /** output the clear coat normal */
        CLEARCOAT_NORMAL: "ClearCoat Normal",    
    },

    /** output sheen lighting */
    sheen: {
        /** output the combined sheen */
        SHEEN: "Sheen",
        /** output the sheen color*/
        SHEEN_COLOR: "Sheen Color",
        /** output the sheen roughness*/
        SHEEN_ROUGHNESS: "Sheen Roughness",
    },

    /** output specular lighting */
    specular: {
        /** output the combined specular */
        SPECULAR: "Specular",
        /** output the specular factor*/
        SPECULAR_FACTOR: "Specular Factor",
        /** output the specular color*/
        SPECULAR_COLOR: "Specular Color",
    },

    /** output tranmission lighting */
    transmission: {
        /** output the combined transmission/volume */
        TRANSMISSION_VOLUME: "Transmission/Volume",
        /** output the transmission factor*/
        TRANSMISSION_FACTOR: "Transmission Factor",
        /** output the volume thickness*/
        VOLUME_THICKNESS: "Volume Thickness",
    },

    /** output tranmission lighting */
    iridescence: {
        /** output the combined iridescence */
        IRIDESCENCE: "Iridescence",
        /** output the iridescence factor*/
        IRIDESCENCE_FACTOR: "Iridescence Factor",
        /** output the iridescence thickness*/
        IRIDESCENCE_THICKNESS: "Iridescence Thickness",
    },
};

const ImageMimeType = {JPEG: "image/jpeg", PNG: "image/png", HDR: "image/vnd.radiance", KTX2: "image/ktx2", GLTEXTURE: "image/texture"};

let GL = undefined;

class gltfWebGl
{
    constructor(context)
    {
        this.context = context;
        if(GL === undefined)
        {
            GL = context;
        }
    }

    loadWebGlExtensions()
    {
        let EXT_texture_filter_anisotropic = this.context.getExtension("EXT_texture_filter_anisotropic");
        if (EXT_texture_filter_anisotropic)
        {
            this.context.anisotropy = EXT_texture_filter_anisotropic.TEXTURE_MAX_ANISOTROPY_EXT;
            this.context.maxAnisotropy = this.context.getParameter(EXT_texture_filter_anisotropic.MAX_TEXTURE_MAX_ANISOTROPY_EXT);
            this.context.supports_EXT_texture_filter_anisotropic = true;
        }
        else
        {
            console.warn("Anisotropic filtering is not supported");
            this.context.supports_EXT_texture_filter_anisotropic = false;
        }
    }

    setTexture(loc, gltf, textureInfo, texSlot)
    {
        if (loc === -1)
        {
            return false;
        }

        let gltfTex = gltf.textures[textureInfo.index];

        if (gltfTex === undefined)
        {
            console.warn("Texture is undefined: " + textureInfo.index);
            return false;
        }

        const image = gltf.images[gltfTex.source];
        if (image === undefined)
        {
            console.warn("Image is undefined for texture: " + gltfTex.source);
            return false;
        }

        if (gltfTex.glTexture === undefined)
        {
            if (image.mimeType === ImageMimeType.KTX2 ||
                image.mimeType === ImageMimeType.GLTEXTURE)
            {
                // these image resources are directly loaded to a GPU resource by resource loader
                gltfTex.glTexture = image.image;
            }
            else
            {
                // other images will be uploaded in a later step
                gltfTex.glTexture = this.context.createTexture();
            }
        }

        this.context.activeTexture(GL.TEXTURE0 + texSlot);
        this.context.bindTexture(gltfTex.type, gltfTex.glTexture);

        this.context.uniform1i(loc, texSlot);

        if (!gltfTex.initialized)
        {
            const gltfSampler = gltf.samplers[gltfTex.sampler];

            if (gltfSampler === undefined)
            {
                console.warn("Sampler is undefined for texture: " + textureInfo.index);
                return false;
            }

            this.context.pixelStorei(GL.UNPACK_FLIP_Y_WEBGL, false);

            // upload images that are not directly loaded as GPU resource
            if (image.mimeType === ImageMimeType.PNG ||
                image.mimeType === ImageMimeType.JPEG ||
                image.mimeType === ImageMimeType.HDR)
            {
                // the check `GL.SRGB8_ALPHA8 === undefined` is needed as at the moment node-gles does not define the full format enum
                const internalformat = (textureInfo.linear || GL.SRGB8_ALPHA8 === undefined) ? GL.RGBA : GL.SRGB8_ALPHA8;
                this.context.texImage2D(image.type, image.miplevel, internalformat, GL.RGBA, GL.UNSIGNED_BYTE, image.image);
            }

            this.setSampler(gltfSampler, gltfTex.type, textureInfo.generateMips);

            if (textureInfo.generateMips)
            {
                switch (gltfSampler.minFilter)
                {
                case GL.NEAREST_MIPMAP_NEAREST:
                case GL.NEAREST_MIPMAP_LINEAR:
                case GL.LINEAR_MIPMAP_NEAREST:
                case GL.LINEAR_MIPMAP_LINEAR:
                    this.context.generateMipmap(gltfTex.type);
                    break;
                }
            }

            gltfTex.initialized = true;
        }

        return gltfTex.initialized;
    }

    setIndices(gltf, accessorIndex)
    {
        let gltfAccessor = gltf.accessors[accessorIndex];

        if (gltfAccessor.glBuffer === undefined)
        {
            gltfAccessor.glBuffer = this.context.createBuffer();

            let data = gltfAccessor.getTypedView(gltf);

            if (data === undefined)
            {
                return false;
            }

            this.context.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, gltfAccessor.glBuffer);
            this.context.bufferData(GL.ELEMENT_ARRAY_BUFFER, data, GL.STATIC_DRAW);
        }
        else
        {
            this.context.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, gltfAccessor.glBuffer);
        }

        return true;
    }

    enableAttribute(gltf, attributeLocation, gltfAccessor)
    {
        if (attributeLocation === -1)
        {
            console.warn("Tried to access unknown attribute");
            return false;
        }

        if (gltfAccessor.glBuffer === undefined)
        {
            gltfAccessor.glBuffer = this.context.createBuffer();

            let data = gltfAccessor.getTypedView(gltf);

            if (data === undefined)
            {
                return false;
            }

            this.context.bindBuffer(GL.ARRAY_BUFFER, gltfAccessor.glBuffer);
            this.context.bufferData(GL.ARRAY_BUFFER, data, GL.STATIC_DRAW);
        }
        else
        {
            this.context.bindBuffer(GL.ARRAY_BUFFER, gltfAccessor.glBuffer);
        }

        this.context.vertexAttribPointer(attributeLocation, gltfAccessor.getComponentCount(gltfAccessor.type), gltfAccessor.componentType, gltfAccessor.normalized, gltfAccessor.byteStride(gltf), 0);
        this.context.enableVertexAttribArray(attributeLocation);

        return true;
    }

    compileShader(shaderIdentifier, isVert, shaderSource)
    {
        const shader = this.context.createShader(isVert ? GL.VERTEX_SHADER : GL.FRAGMENT_SHADER);
        this.context.shaderSource(shader, shaderSource);
        this.context.compileShader(shader);
        const compiled = this.context.getShaderParameter(shader, GL.COMPILE_STATUS);

        if (!compiled)
        {
            // output surrounding source code
            let info = "";
            const messages = this.context.getShaderInfoLog(shader).split("\n");
            for(const message of messages)
            {
                
                const matches = message.match(/(WARNING|ERROR): ([0-9]*):([0-9]*):(.*)/i);
                if (matches && matches.length == 5)
                {
                    const lineNumber = parseInt(matches[3]) - 1;
                    const lines = shaderSource.split("\n");

                    info += `${matches[1]}: ${shaderIdentifier}+includes:${lineNumber}: ${matches[4]}`;

                    for(let i = Math.max(0, lineNumber - 2); i < Math.min(lines.length, lineNumber + 3); i++)
                    {
                        if (lineNumber === i)
                        {
                            info += "->";
                        }
                        info += "\t" + lines[i] + "\n";
                    }
                }
                else
                {
                    info += message + "\n";
                }
            }

            throw new Error("Could not compile WebGL program '" + shaderIdentifier + "': " + info);
        }

        return shader;
    }

    linkProgram(vertex, fragment)
    {
        let program = this.context.createProgram();
        this.context.attachShader(program, vertex);
        this.context.attachShader(program, fragment);
        this.context.linkProgram(program);

        if (!this.context.getProgramParameter(program, GL.LINK_STATUS))
        {
            var info = this.context.getProgramInfoLog(program);
            throw new Error('Could not link WebGL program. \n\n' + info);
        }

        return program;
    }

    //https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Constants
    setSampler(gltfSamplerObj, type, generateMipmaps) // TEXTURE_2D
    {
        if (generateMipmaps)
        {
            this.context.texParameteri(type, GL.TEXTURE_WRAP_S, gltfSamplerObj.wrapS);
            this.context.texParameteri(type, GL.TEXTURE_WRAP_T, gltfSamplerObj.wrapT);
        }
        else
        {
            this.context.texParameteri(type, GL.TEXTURE_WRAP_S, GL.CLAMP_TO_EDGE);
            this.context.texParameteri(type, GL.TEXTURE_WRAP_T, GL.CLAMP_TO_EDGE);
        }

        // If not mip-mapped, force to non-mip-mapped sampler.
        if (!generateMipmaps && (gltfSamplerObj.minFilter != GL.NEAREST) && (gltfSamplerObj.minFilter != GL.LINEAR))
        {
            if ((gltfSamplerObj.minFilter == GL.NEAREST_MIPMAP_NEAREST) || (gltfSamplerObj.minFilter == GL.NEAREST_MIPMAP_LINEAR))
            {
                this.context.texParameteri(type, GL.TEXTURE_MIN_FILTER, GL.NEAREST);
            }
            else
            {
                this.context.texParameteri(type, GL.TEXTURE_MIN_FILTER, GL.LINEAR);
            }
        }
        else
        {
            this.context.texParameteri(type, GL.TEXTURE_MIN_FILTER, gltfSamplerObj.minFilter);
        }
        this.context.texParameteri(type, GL.TEXTURE_MAG_FILTER, gltfSamplerObj.magFilter);

        if (this.context.supports_EXT_texture_filter_anisotropic)
        {
            if ((gltfSamplerObj.magFilter !==  GL.NEAREST) 
                && (gltfSamplerObj.minFilter ===  GL.NEAREST_MIPMAP_LINEAR || gltfSamplerObj.minFilter ===  GL.LINEAR_MIPMAP_LINEAR ))
            {
                this.context.texParameterf(type, this.context.anisotropy, this.context.maxAnisotropy); // => 16xAF
            }
        }
    }
}

class gltfShader
{
    constructor(program, hash, gl)
    {
        this.program = program;
        this.hash = hash;
        this.uniforms = new Map();
        this.attributes = new Map();
        this.unknownAttributes = [];
        this.unknownUniforms = [];
        this.gl = gl;

        if(this.program !== undefined)
        {
            const uniformCount = this.gl.context.getProgramParameter(this.program, GL.ACTIVE_UNIFORMS);
            for(let i = 0; i < uniformCount; ++i)
            {
                const info = this.gl.context.getActiveUniform(this.program, i);
                const loc = this.gl.context.getUniformLocation(this.program, info.name);
                this.uniforms.set(info.name, {type: info.type, loc: loc});
            }

            const attribCount = this.gl.context.getProgramParameter(this.program, GL.ACTIVE_ATTRIBUTES);
            for(let i = 0; i < attribCount; ++i)
            {
                const info = this.gl.context.getActiveAttrib(this.program, i);
                const loc = this.gl.context.getAttribLocation(this.program, info.name);
                this.attributes.set(info.name, loc);
            }
        }
    }

    destroy()
    {
        if (this.program !== undefined)
        {
            this.deleteProgram(this.program);
        }

        this.program = undefined;
    }

    getAttributeLocation(name)
    {
        const loc = this.attributes.get(name);
        if (loc === undefined)
        {
            if (this.unknownAttributes.find(n => n === name) === undefined)
            {
                console.log("Attribute '%s' does not exist", name);
                this.unknownAttributes.push(name);
            }
            return -1;
        }
        return loc;
    }

    getUniformLocation(name)
    {
        const uniform = this.uniforms.get(name);
        if (uniform === undefined)
        {
            if (this.unknownUniforms.find(n => n === name) === undefined)
            {
                this.unknownUniforms.push(name);
            }
            return -1;
        }
        return uniform.loc;
    }

    updateUniform(objectName, object, log = false)
    {
        if (object instanceof UniformStruct)
        {
            this.updateUniformStruct(objectName, object, log);
        }
        else if (Array.isArray(object))
        {
            this.updateUniformArray(objectName, object, log);
        }
        else
        {
            this.updateUniformValue(objectName, object, log);
        }
    }

    updateUniformArray(arrayName, array, log)
    {
        if(array[0] instanceof UniformStruct)
        {
            for (let i = 0; i < array.length; ++i)
            {
                let element = array[i];
                let uniformName = arrayName + "[" + i + "]";
                this.updateUniform(uniformName, element, log);
            }
        }else {
            let uniformName = arrayName + "[0]";

            let flat = [];

            if(Array.isArray(array[0]) || array[0].length !== undefined)
            {
                for (let i = 0; i < array.length; ++i)
                {
                    flat.push.apply(flat, Array.from(array[i]));
                }
            }
            else
            {
                flat = array;
            }

            if(flat.length === 0)
            {
                console.error("Failed to flatten uniform array " + uniformName);
                return;
            }

            this.updateUniformValue(uniformName, flat, log);
        }
    }

    updateUniformStruct(structName, object, log)
    {
        let memberNames = Object.keys(object);
        for (let memberName of memberNames)
        {
            let uniformName = structName + "." + memberName;
            this.updateUniform(uniformName, object[memberName], log);
        }
    }

    // upload the values of a uniform with the given name using type resolve to get correct function call
    updateUniformValue(uniformName, value, log)
    {
        const uniform = this.uniforms.get(uniformName);

        if(uniform !== undefined)
        {
            switch (uniform.type) {
            case GL.FLOAT:
            {
                if(Array.isArray(value) || value instanceof Float32Array)
                {
                    this.gl.context.uniform1fv(uniform.loc, value);
                }else {
                    this.gl.context.uniform1f(uniform.loc, value);
                }
                break;
            }
            case GL.FLOAT_VEC2: this.gl.context.uniform2fv(uniform.loc, value); break;
            case GL.FLOAT_VEC3: this.gl.context.uniform3fv(uniform.loc, value); break;
            case GL.FLOAT_VEC4: this.gl.context.uniform4fv(uniform.loc, value); break;

            case GL.INT:
            {
                if(Array.isArray(value) || value instanceof Uint32Array || value instanceof Int32Array)
                {
                    this.gl.context.uniform1iv(uniform.loc, value);
                }else {
                    this.gl.context.uniform1i(uniform.loc, value);
                }
                break;
            }
            case GL.INT_VEC2: this.gl.context.uniform2iv(uniform.loc, value); break;
            case GL.INT_VEC3: this.gl.context.uniform3iv(uniform.loc, value); break;
            case GL.INT_VEC4: this.gl.context.uniform4iv(uniform.loc, value); break;

            case GL.FLOAT_MAT2: this.gl.context.uniformMatrix2fv(uniform.loc, false, value); break;
            case GL.FLOAT_MAT3: this.gl.context.uniformMatrix3fv(uniform.loc, false, value); break;
            case GL.FLOAT_MAT4: this.gl.context.uniformMatrix4fv(uniform.loc, false, value); break;
            }
        }
        else if(log)
        {
            console.warn("Unkown uniform: " + uniformName);
        }
    }
}

// THis class generates and caches the shader source text for a given permutation
class ShaderCache
{
    constructor(sources, gl)
    {
        this.sources  = sources; // shader name -> source code
        this.shaders  = new Map(); // name & permutations hashed -> compiled shader
        this.programs = new Map(); // (vertex shader, fragment shader) -> program
        this.gl = gl;

        // resovle / expande sources (TODO: break include cycles)
        for (let [key, src] of this.sources)
        {
            let changed = false;
            for (let [includeName, includeSource] of this.sources)
            {
                //var pattern = RegExp(/#include</ + includeName + />/);
                const pattern = "#include <" + includeName + ">";

                if(src.includes(pattern))
                {
                    // only replace the first occurance
                    src = src.replace(pattern, includeSource);

                    // remove the others
                    while (src.includes(pattern))
                    {
                        src = src.replace(pattern, "");
                    }

                    changed = true;
                }
            }

            if(changed)
            {
                this.sources.set(key, src);
            }
        }
    }

    destroy()
    {
        for (let [, shader] of this.shaders.entries())
        {
            this.gl.context.deleteShader(shader);
            shader = undefined;
        }

        this.shaders.clear();

        for (let [, program] of this.programs)
        {
            program.destroy();
        }

        this.programs.clear();
    }

    // example args: "pbr.vert", ["NORMALS", "TANGENTS"]
    selectShader(shaderIdentifier, permutationDefines)
    {
        // first check shaders for the exact permutation
        // if not present, check sources and compile it
        // if not present, return null object

        const src = this.sources.get(shaderIdentifier);
        if(src === undefined)
        {
            console.log("Shader source for " + shaderIdentifier + " not found");
            return null;
        }

        const isVert = shaderIdentifier.endsWith(".vert");
        let hash = stringHash(shaderIdentifier);

        // console.log(shaderIdentifier);

        let defines = "#version 300 es\n";
        for(let define of permutationDefines)
        {
            // console.log(define);
            hash ^= stringHash(define);
            defines += "#define " + define + "\n";
        }

        let shader = this.shaders.get(hash);

        if(shader === undefined)
        {
            // console.log(defines);
            // compile this variant
            shader = this.gl.compileShader(shaderIdentifier, isVert, defines + src);
            this.shaders.set(hash, shader);
        }

        return hash;
    }

    getShaderProgram(vertexShaderHash, fragmentShaderHash)
    {
        // just use a long string for this (the javascript engine should be fast enough with comparing this)
        const hash = String(vertexShaderHash) + "," + String(fragmentShaderHash);

        let program = this.programs.get(hash);

        if (program) // program already linked
        {
            return program;
        }
        else // link this shader program type!
        {
            let linkedProg = this.gl.linkProgram(this.shaders.get(vertexShaderHash), this.shaders.get(fragmentShaderHash));
            if(linkedProg)
            {
                let program = new gltfShader(linkedProg, hash, this.gl);
                this.programs.set(hash, program);
                return program;
            }
        }

        return undefined;
    }
}

class EnvironmentRenderer
{
    constructor(webgl)
    {
        const gl = webgl.context;

        this.indexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([
            1, 2, 0,
            2, 3, 0,
            6, 2, 1,
            1, 5, 6,
            6, 5, 4,
            4, 7, 6,
            6, 3, 2,
            7, 3, 6,
            3, 7, 0,
            7, 4, 0,
            5, 1, 0,
            4, 5, 0
        ]), gl.STATIC_DRAW);

        this.vertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
            -1, -1, -1,
             1, -1, -1,
             1,  1, -1,
            -1,  1, -1,
            -1, -1,  1,
             1, -1,  1,
             1,  1,  1,
            -1,  1,  1
        ]), gl.STATIC_DRAW);
    }

    drawEnvironmentMap(webGl, viewProjectionMatrix, state, shaderCache, fragDefines)
    {
        if (state.environment == undefined || state.renderingParameters.renderEnvironmentMap == false)
        {
            return;
        }

        const gl = webGl.context;

        const vertShader = shaderCache.selectShader("cubemap.vert", []);
        const fragShader = shaderCache.selectShader("cubemap.frag", fragDefines);
        const shader = shaderCache.getShaderProgram(vertShader, fragShader);

        gl.useProgram(shader.program);
        webGl.setTexture(shader.getUniformLocation("u_GGXEnvSampler"), state.environment, state.environment.specularEnvMap, 0);
        shader.updateUniform("u_MipCount", state.environment.mipCount);
        shader.updateUniform("u_EnvBlurNormalized", state.renderingParameters.blurEnvironmentMap ? 0.6 : 0.0);
        shader.updateUniform("u_EnvIntensity", state.renderingParameters.iblIntensity);

        shader.updateUniform("u_ViewProjectionMatrix", viewProjectionMatrix);
        shader.updateUniform("u_Exposure", state.renderingParameters.exposure, false);

        let rotMatrix4 = create$3();
        rotateY(rotMatrix4, rotMatrix4,  state.renderingParameters.environmentRotation / 180.0 * Math.PI);
        let rotMatrix3 = create$4();
        fromMat4(rotMatrix3, rotMatrix4);
        shader.updateUniform("u_EnvRotation", rotMatrix3);

        gl.frontFace(gl.CCW);
        gl.enable(gl.CULL_FACE);
        gl.disable(gl.BLEND);
        gl.disable(gl.DEPTH_TEST);

        const positionAttributeLocation = shader.getAttributeLocation("a_position");
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.vertexAttribPointer(positionAttributeLocation, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(positionAttributeLocation);
        gl.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_SHORT, 0);

        gl.enable(gl.DEPTH_TEST);
    }
}

var pbrShader = "precision highp float;\n#define GLSLIFY 1\n#include <tonemapping.glsl>\n#include <textures.glsl>\n#include <functions.glsl>\n#include <brdf.glsl>\n#include <punctual.glsl>\n#include <ibl.glsl>\n#include <material_info.glsl>\n#ifdef MATERIAL_IRIDESCENCE\n#include <iridescence.glsl>\n#endif\nout vec4 g_finalColor;void main(){vec4 baseColor=getBaseColor();\n#if ALPHAMODE == ALPHAMODE_OPAQUE\nbaseColor.a=1.0;\n#endif\nvec3 v=normalize(u_Camera-v_Position);NormalInfo normalInfo=getNormalInfo(v);vec3 n=normalInfo.n;vec3 t=normalInfo.t;vec3 b=normalInfo.b;float NdotV=clampedDot(n,v);float TdotV=clampedDot(t,v);float BdotV=clampedDot(b,v);MaterialInfo materialInfo;materialInfo.baseColor=baseColor.rgb;materialInfo.ior=1.5;materialInfo.f0=vec3(0.04);materialInfo.specularWeight=1.0;\n#if DEBUG == DEBUG_METALLIC_ROUGHNESS\n#undef MATERIAL_IRIDESCENCE\n#endif\n#ifdef MATERIAL_IOR\nmaterialInfo=getIorInfo(materialInfo);\n#endif\n#ifdef MATERIAL_SPECULARGLOSSINESS\nmaterialInfo=getSpecularGlossinessInfo(materialInfo);\n#endif\n#ifdef MATERIAL_METALLICROUGHNESS\nmaterialInfo=getMetallicRoughnessInfo(materialInfo);\n#endif\n#ifdef MATERIAL_SHEEN\nmaterialInfo=getSheenInfo(materialInfo);\n#endif\n#ifdef MATERIAL_CLEARCOAT\nmaterialInfo=getClearCoatInfo(materialInfo,normalInfo);\n#endif\n#ifdef MATERIAL_SPECULAR\nmaterialInfo=getSpecularInfo(materialInfo);\n#endif\n#ifdef MATERIAL_TRANSMISSION\nmaterialInfo=getTransmissionInfo(materialInfo);\n#endif\n#ifdef MATERIAL_VOLUME\nmaterialInfo=getVolumeInfo(materialInfo);\n#endif\n#ifdef MATERIAL_IRIDESCENCE\nmaterialInfo=getIridescenceInfo(materialInfo);\n#endif\nmaterialInfo.perceptualRoughness=clamp(materialInfo.perceptualRoughness,0.0,1.0);materialInfo.metallic=clamp(materialInfo.metallic,0.0,1.0);materialInfo.alphaRoughness=materialInfo.perceptualRoughness*materialInfo.perceptualRoughness;float reflectance=max(max(materialInfo.f0.r,materialInfo.f0.g),materialInfo.f0.b);materialInfo.f90=vec3(1.0);vec3 f_specular=vec3(0.0);vec3 f_diffuse=vec3(0.0);vec3 f_emissive=vec3(0.0);vec3 f_clearcoat=vec3(0.0);vec3 f_sheen=vec3(0.0);vec3 f_transmission=vec3(0.0);float albedoSheenScaling=1.0;\n#ifdef MATERIAL_IRIDESCENCE\nvec3 iridescenceFresnel=materialInfo.f0;vec3 iridescenceF0=materialInfo.f0;if(materialInfo.iridescenceThickness==0.0){materialInfo.iridescenceFactor=0.0;}if(materialInfo.iridescenceFactor>0.0){iridescenceFresnel=evalIridescence(1.0,materialInfo.iridescenceIor,NdotV,materialInfo.iridescenceThickness,materialInfo.f0);iridescenceF0=Schlick_to_F0(iridescenceFresnel,NdotV);}\n#endif\n#ifdef USE_IBL\n#ifdef MATERIAL_IRIDESCENCE\nf_specular+=getIBLRadianceGGXIridescence(n,v,materialInfo.perceptualRoughness,materialInfo.f0,iridescenceFresnel,materialInfo.iridescenceFactor,materialInfo.specularWeight);f_diffuse+=getIBLRadianceLambertianIridescence(n,v,materialInfo.perceptualRoughness,materialInfo.c_diff,materialInfo.f0,iridescenceF0,materialInfo.iridescenceFactor,materialInfo.specularWeight);\n#else\nf_specular+=getIBLRadianceGGX(n,v,materialInfo.perceptualRoughness,materialInfo.f0,materialInfo.specularWeight);f_diffuse+=getIBLRadianceLambertian(n,v,materialInfo.perceptualRoughness,materialInfo.c_diff,materialInfo.f0,materialInfo.specularWeight);\n#endif\n#ifdef MATERIAL_CLEARCOAT\nf_clearcoat+=getIBLRadianceGGX(materialInfo.clearcoatNormal,v,materialInfo.clearcoatRoughness,materialInfo.clearcoatF0,1.0);\n#endif\n#ifdef MATERIAL_SHEEN\nf_sheen+=getIBLRadianceCharlie(n,v,materialInfo.sheenRoughnessFactor,materialInfo.sheenColorFactor);\n#endif\n#endif\n#if defined(MATERIAL_TRANSMISSION) && defined(USE_IBL)\nf_transmission+=getIBLVolumeRefraction(n,v,materialInfo.perceptualRoughness,materialInfo.c_diff,materialInfo.f0,materialInfo.f90,v_Position,u_ModelMatrix,u_ViewMatrix,u_ProjectionMatrix,materialInfo.ior,materialInfo.thickness,materialInfo.attenuationColor,materialInfo.attenuationDistance);\n#endif\nfloat ao=1.0;\n#ifdef HAS_OCCLUSION_MAP\nao=texture(u_OcclusionSampler,getOcclusionUV()).r;f_diffuse=mix(f_diffuse,f_diffuse*ao,u_OcclusionStrength);f_specular=mix(f_specular,f_specular*ao,u_OcclusionStrength);f_sheen=mix(f_sheen,f_sheen*ao,u_OcclusionStrength);f_clearcoat=mix(f_clearcoat,f_clearcoat*ao,u_OcclusionStrength);\n#endif\n#ifdef USE_PUNCTUAL\nfor(int i=0;i<LIGHT_COUNT;++i){Light light=u_Lights[i];vec3 pointToLight;if(light.type!=LightType_Directional){pointToLight=light.position-v_Position;}else{pointToLight=-light.direction;}vec3 l=normalize(pointToLight);vec3 h=normalize(l+v);float NdotL=clampedDot(n,l);float NdotV=clampedDot(n,v);float NdotH=clampedDot(n,h);float LdotH=clampedDot(l,h);float VdotH=clampedDot(v,h);if(NdotL>0.0||NdotV>0.0){vec3 intensity=getLighIntensity(light,pointToLight);\n#ifdef MATERIAL_IRIDESCENCE\nf_diffuse+=intensity*NdotL*BRDF_lambertianIridescence(materialInfo.f0,materialInfo.f90,iridescenceFresnel,materialInfo.iridescenceFactor,materialInfo.c_diff,materialInfo.specularWeight,VdotH);f_specular+=intensity*NdotL*BRDF_specularGGXIridescence(materialInfo.f0,materialInfo.f90,iridescenceFresnel,materialInfo.alphaRoughness,materialInfo.iridescenceFactor,materialInfo.specularWeight,VdotH,NdotL,NdotV,NdotH);\n#else\nf_diffuse+=intensity*NdotL*BRDF_lambertian(materialInfo.f0,materialInfo.f90,materialInfo.c_diff,materialInfo.specularWeight,VdotH);f_specular+=intensity*NdotL*BRDF_specularGGX(materialInfo.f0,materialInfo.f90,materialInfo.alphaRoughness,materialInfo.specularWeight,VdotH,NdotL,NdotV,NdotH);\n#endif\n#ifdef MATERIAL_SHEEN\nf_sheen+=intensity*getPunctualRadianceSheen(materialInfo.sheenColorFactor,materialInfo.sheenRoughnessFactor,NdotL,NdotV,NdotH);albedoSheenScaling=min(1.0-max3(materialInfo.sheenColorFactor)*albedoSheenScalingLUT(NdotV,materialInfo.sheenRoughnessFactor),1.0-max3(materialInfo.sheenColorFactor)*albedoSheenScalingLUT(NdotL,materialInfo.sheenRoughnessFactor));\n#endif\n#ifdef MATERIAL_CLEARCOAT\nf_clearcoat+=intensity*getPunctualRadianceClearCoat(materialInfo.clearcoatNormal,v,l,h,VdotH,materialInfo.clearcoatF0,materialInfo.clearcoatF90,materialInfo.clearcoatRoughness);\n#endif\n}\n#ifdef MATERIAL_TRANSMISSION\nvec3 transmissionRay=getVolumeTransmissionRay(n,v,materialInfo.thickness,materialInfo.ior,u_ModelMatrix);pointToLight-=transmissionRay;l=normalize(pointToLight);vec3 intensity=getLighIntensity(light,pointToLight);vec3 transmittedLight=intensity*getPunctualRadianceTransmission(n,v,l,materialInfo.alphaRoughness,materialInfo.f0,materialInfo.f90,materialInfo.c_diff,materialInfo.ior);\n#ifdef MATERIAL_VOLUME\ntransmittedLight=applyVolumeAttenuation(transmittedLight,length(transmissionRay),materialInfo.attenuationColor,materialInfo.attenuationDistance);\n#endif\nf_transmission+=transmittedLight;\n#endif\n}\n#endif\nf_emissive=u_EmissiveFactor;\n#ifdef MATERIAL_EMISSIVE_STRENGTH\nf_emissive*=u_EmissiveStrength;\n#endif\n#ifdef HAS_EMISSIVE_MAP\nf_emissive*=texture(u_EmissiveSampler,getEmissiveUV()).rgb;\n#endif\nfloat clearcoatFactor=0.0;vec3 clearcoatFresnel=vec3(0);\n#ifdef MATERIAL_CLEARCOAT\nclearcoatFactor=materialInfo.clearcoatFactor;clearcoatFresnel=F_Schlick(materialInfo.clearcoatF0,materialInfo.clearcoatF90,clampedDot(materialInfo.clearcoatNormal,v));f_clearcoat=f_clearcoat*clearcoatFactor;\n#endif\n#ifdef MATERIAL_TRANSMISSION\nvec3 diffuse=mix(f_diffuse,f_transmission,materialInfo.transmissionFactor);\n#else\nvec3 diffuse=f_diffuse;\n#endif\nvec3 color=vec3(0);\n#ifdef MATERIAL_UNLIT\ncolor=baseColor.rgb;\n#else\ncolor=f_emissive+diffuse+f_specular;color=f_sheen+color*albedoSheenScaling;color=color*(1.0-clearcoatFactor*clearcoatFresnel)+f_clearcoat;\n#endif\n#if DEBUG == DEBUG_NONE\n#if ALPHAMODE == ALPHAMODE_MASK\nif(baseColor.a<u_AlphaCutoff){discard;}baseColor.a=1.0;\n#endif\n#ifdef LINEAR_OUTPUT\ng_finalColor=vec4(color.rgb,baseColor.a);\n#else\ng_finalColor=vec4(toneMap(color),baseColor.a);\n#endif\n#else\ng_finalColor=vec4(1.0);{float frequency=0.02;float gray=0.9;vec2 v1=step(0.5,fract(frequency*gl_FragCoord.xy));vec2 v2=step(0.5,vec2(1.0)-fract(frequency*gl_FragCoord.xy));g_finalColor.rgb*=gray+v1.x*v1.y+v2.x*v2.y;}\n#endif\n#if DEBUG == DEBUG_UV_0 && defined(HAS_TEXCOORD_0_VEC2)\ng_finalColor.rgb=vec3(v_texcoord_0,0);\n#endif\n#if DEBUG == DEBUG_UV_1 && defined(HAS_TEXCOORD_1_VEC2)\ng_finalColor.rgb=vec3(v_texcoord_1,0);\n#endif\n#if DEBUG == DEBUG_NORMAL_TEXTURE && defined(HAS_NORMAL_MAP)\ng_finalColor.rgb=(normalInfo.ntex+1.0)/2.0;\n#endif\n#if DEBUG == DEBUG_NORMAL_SHADING\ng_finalColor.rgb=(n+1.0)/2.0;\n#endif\n#if DEBUG == DEBUG_NORMAL_GEOMETRY\ng_finalColor.rgb=(normalInfo.ng+1.0)/2.0;\n#endif\n#if DEBUG == DEBUG_TANGENT\ng_finalColor.rgb=(normalInfo.t+1.0)/2.0;\n#endif\n#if DEBUG == DEBUG_BITANGENT\ng_finalColor.rgb=(normalInfo.b+1.0)/2.0;\n#endif\n#if DEBUG == DEBUG_ALPHA\ng_finalColor.rgb=vec3(baseColor.a);\n#endif\n#if DEBUG == DEBUG_OCCLUSION && defined(HAS_OCCLUSION_MAP)\ng_finalColor.rgb=vec3(ao);\n#endif\n#if DEBUG == DEBUG_EMISSIVE\ng_finalColor.rgb=linearTosRGB(f_emissive);\n#endif\n#ifdef MATERIAL_METALLICROUGHNESS\n#if DEBUG == DEBUG_METALLIC_ROUGHNESS\ng_finalColor.rgb=linearTosRGB(f_diffuse+f_specular);\n#endif\n#if DEBUG == DEBUG_METALLIC\ng_finalColor.rgb=vec3(materialInfo.metallic);\n#endif\n#if DEBUG == DEBUG_ROUGHNESS\ng_finalColor.rgb=vec3(materialInfo.perceptualRoughness);\n#endif\n#if DEBUG == DEBUG_BASE_COLOR\ng_finalColor.rgb=linearTosRGB(materialInfo.baseColor);\n#endif\n#endif\n#ifdef MATERIAL_CLEARCOAT\n#if DEBUG == DEBUG_CLEARCOAT\ng_finalColor.rgb=linearTosRGB(f_clearcoat);\n#endif\n#if DEBUG == DEBUG_CLEARCOAT_FACTOR\ng_finalColor.rgb=vec3(materialInfo.clearcoatFactor);\n#endif\n#if DEBUG == DEBUG_CLEARCOAT_ROUGHNESS\ng_finalColor.rgb=vec3(materialInfo.clearcoatRoughness);\n#endif\n#if DEBUG == DEBUG_CLEARCOAT_NORMAL\ng_finalColor.rgb=(materialInfo.clearcoatNormal+vec3(1))/2.0;\n#endif\n#endif\n#ifdef MATERIAL_SHEEN\n#if DEBUG == DEBUG_SHEEN\ng_finalColor.rgb=linearTosRGB(f_sheen);\n#endif\n#if DEBUG == DEBUG_SHEEN_COLOR\ng_finalColor.rgb=materialInfo.sheenColorFactor;\n#endif\n#if DEBUG == DEBUG_SHEEN_ROUGHNESS\ng_finalColor.rgb=vec3(materialInfo.sheenRoughnessFactor);\n#endif\n#endif\n#ifdef MATERIAL_SPECULAR\n#if DEBUG == DEBUG_SPECULAR\ng_finalColor.rgb=linearTosRGB(f_specular);\n#endif\n#if DEBUG == DEBUG_SPECULAR_FACTOR\ng_finalColor.rgb=vec3(materialInfo.specularWeight);\n#endif\n#if DEBUG == DEBUG_SPECULAR_COLOR\nvec3 specularTexture=vec3(1.0);\n#ifdef HAS_SPECULAR_COLOR_MAP\nspecularTexture.rgb=texture(u_SpecularColorSampler,getSpecularColorUV()).rgb;\n#endif\ng_finalColor.rgb=u_KHR_materials_specular_specularColorFactor*specularTexture.rgb;\n#endif\n#endif\n#ifdef MATERIAL_TRANSMISSION\n#if DEBUG == DEBUG_TRANSMISSION_VOLUME\ng_finalColor.rgb=linearTosRGB(f_transmission);\n#endif\n#if DEBUG == DEBUG_TRANSMISSION_FACTOR\ng_finalColor.rgb=vec3(materialInfo.transmissionFactor);\n#endif\n#endif\n#ifdef MATERIAL_VOLUME\n#if DEBUG == DEBUG_VOLUME_THICKNESS\ng_finalColor.rgb=vec3(materialInfo.thickness);\n#endif\n#endif\n#ifdef MATERIAL_IRIDESCENCE\n#if DEBUG == DEBUG_IRIDESCENCE\ng_finalColor.rgb=iridescenceFresnel;\n#endif\n#if DEBUG == DEBUG_IRIDESCENCE_FACTOR\ng_finalColor.rgb=vec3(materialInfo.iridescenceFactor);\n#endif\n#if DEBUG == DEBUG_IRIDESCENCE_THICKNESS\ng_finalColor.rgb=vec3(materialInfo.iridescenceThickness/1200.0);\n#endif\n#endif\n}"; // eslint-disable-line

var brdfShader = "#define GLSLIFY 1\nvec3 F_Schlick(vec3 f0,vec3 f90,float VdotH){return f0+(f90-f0)*pow(clamp(1.0-VdotH,0.0,1.0),5.0);}float F_Schlick(float f0,float f90,float VdotH){float x=clamp(1.0-VdotH,0.0,1.0);float x2=x*x;float x5=x*x2*x2;return f0+(f90-f0)*x5;}float F_Schlick(float f0,float VdotH){float f90=1.0;return F_Schlick(f0,f90,VdotH);}vec3 F_Schlick(vec3 f0,float f90,float VdotH){float x=clamp(1.0-VdotH,0.0,1.0);float x2=x*x;float x5=x*x2*x2;return f0+(f90-f0)*x5;}vec3 F_Schlick(vec3 f0,float VdotH){float f90=1.0;return F_Schlick(f0,f90,VdotH);}vec3 Schlick_to_F0(vec3 f,vec3 f90,float VdotH){float x=clamp(1.0-VdotH,0.0,1.0);float x2=x*x;float x5=clamp(x*x2*x2,0.0,0.9999);return(f-f90*x5)/(1.0-x5);}float Schlick_to_F0(float f,float f90,float VdotH){float x=clamp(1.0-VdotH,0.0,1.0);float x2=x*x;float x5=clamp(x*x2*x2,0.0,0.9999);return(f-f90*x5)/(1.0-x5);}vec3 Schlick_to_F0(vec3 f,float VdotH){return Schlick_to_F0(f,vec3(1.0),VdotH);}float Schlick_to_F0(float f,float VdotH){return Schlick_to_F0(f,1.0,VdotH);}float V_GGX(float NdotL,float NdotV,float alphaRoughness){float alphaRoughnessSq=alphaRoughness*alphaRoughness;float GGXV=NdotL*sqrt(NdotV*NdotV*(1.0-alphaRoughnessSq)+alphaRoughnessSq);float GGXL=NdotV*sqrt(NdotL*NdotL*(1.0-alphaRoughnessSq)+alphaRoughnessSq);float GGX=GGXV+GGXL;if(GGX>0.0){return 0.5/GGX;}return 0.0;}float D_GGX(float NdotH,float alphaRoughness){float alphaRoughnessSq=alphaRoughness*alphaRoughness;float f=(NdotH*NdotH)*(alphaRoughnessSq-1.0)+1.0;return alphaRoughnessSq/(M_PI*f*f);}float lambdaSheenNumericHelper(float x,float alphaG){float oneMinusAlphaSq=(1.0-alphaG)*(1.0-alphaG);float a=mix(21.5473,25.3245,oneMinusAlphaSq);float b=mix(3.82987,3.32435,oneMinusAlphaSq);float c=mix(0.19823,0.16801,oneMinusAlphaSq);float d=mix(-1.97760,-1.27393,oneMinusAlphaSq);float e=mix(-4.32054,-4.85967,oneMinusAlphaSq);return a/(1.0+b*pow(x,c))+d*x+e;}float lambdaSheen(float cosTheta,float alphaG){if(abs(cosTheta)<0.5){return exp(lambdaSheenNumericHelper(cosTheta,alphaG));}else{return exp(2.0*lambdaSheenNumericHelper(0.5,alphaG)-lambdaSheenNumericHelper(1.0-cosTheta,alphaG));}}float V_Sheen(float NdotL,float NdotV,float sheenRoughness){sheenRoughness=max(sheenRoughness,0.000001);float alphaG=sheenRoughness*sheenRoughness;return clamp(1.0/((1.0+lambdaSheen(NdotV,alphaG)+lambdaSheen(NdotL,alphaG))*(4.0*NdotV*NdotL)),0.0,1.0);}float D_Charlie(float sheenRoughness,float NdotH){sheenRoughness=max(sheenRoughness,0.000001);float alphaG=sheenRoughness*sheenRoughness;float invR=1.0/alphaG;float cos2h=NdotH*NdotH;float sin2h=1.0-cos2h;return(2.0+invR)*pow(sin2h,invR*0.5)/(2.0*M_PI);}vec3 BRDF_lambertian(vec3 f0,vec3 f90,vec3 diffuseColor,float specularWeight,float VdotH){return(1.0-specularWeight*F_Schlick(f0,f90,VdotH))*(diffuseColor/M_PI);}\n#ifdef MATERIAL_IRIDESCENCE\nvec3 BRDF_lambertianIridescence(vec3 f0,vec3 f90,vec3 iridescenceFresnel,float iridescenceFactor,vec3 diffuseColor,float specularWeight,float VdotH){vec3 iridescenceFresnelMax=vec3(max(max(iridescenceFresnel.r,iridescenceFresnel.g),iridescenceFresnel.b));vec3 schlickFresnel=F_Schlick(f0,f90,VdotH);vec3 F=mix(schlickFresnel,iridescenceFresnelMax,iridescenceFactor);return(1.0-specularWeight*F)*(diffuseColor/M_PI);}\n#endif\nvec3 BRDF_specularGGX(vec3 f0,vec3 f90,float alphaRoughness,float specularWeight,float VdotH,float NdotL,float NdotV,float NdotH){vec3 F=F_Schlick(f0,f90,VdotH);float Vis=V_GGX(NdotL,NdotV,alphaRoughness);float D=D_GGX(NdotH,alphaRoughness);return specularWeight*F*Vis*D;}\n#ifdef MATERIAL_IRIDESCENCE\nvec3 BRDF_specularGGXIridescence(vec3 f0,vec3 f90,vec3 iridescenceFresnel,float alphaRoughness,float iridescenceFactor,float specularWeight,float VdotH,float NdotL,float NdotV,float NdotH){vec3 F=mix(F_Schlick(f0,f90,VdotH),iridescenceFresnel,iridescenceFactor);float Vis=V_GGX(NdotL,NdotV,alphaRoughness);float D=D_GGX(NdotH,alphaRoughness);return specularWeight*F*Vis*D;}\n#endif\nvec3 BRDF_specularSheen(vec3 sheenColor,float sheenRoughness,float NdotL,float NdotV,float NdotH){float sheenDistribution=D_Charlie(sheenRoughness,NdotH);float sheenVisibility=V_Sheen(NdotL,NdotV,sheenRoughness);return sheenColor*sheenDistribution*sheenVisibility;}"; // eslint-disable-line

var iridescenceShader = "#define GLSLIFY 1\nconst mat3 XYZ_TO_REC709=mat3(3.2404542,-0.9692660,0.0556434,-1.5371385,1.8760108,-0.2040259,-0.4985314,0.0415560,1.0572252);vec3 Fresnel0ToIor(vec3 fresnel0){vec3 sqrtF0=sqrt(fresnel0);return(vec3(1.0)+sqrtF0)/(vec3(1.0)-sqrtF0);}vec3 IorToFresnel0(vec3 transmittedIor,float incidentIor){return sq((transmittedIor-vec3(incidentIor))/(transmittedIor+vec3(incidentIor)));}float IorToFresnel0(float transmittedIor,float incidentIor){return sq((transmittedIor-incidentIor)/(transmittedIor+incidentIor));}vec3 evalSensitivity(float OPD,vec3 shift){float phase=2.0*M_PI*OPD*1.0e-9;vec3 val=vec3(5.4856e-13,4.4201e-13,5.2481e-13);vec3 pos=vec3(1.6810e+06,1.7953e+06,2.2084e+06);vec3 var=vec3(4.3278e+09,9.3046e+09,6.6121e+09);vec3 xyz=val*sqrt(2.0*M_PI*var)*cos(pos*phase+shift)*exp(-sq(phase)*var);xyz.x+=9.7470e-14*sqrt(2.0*M_PI*4.5282e+09)*cos(2.2399e+06*phase+shift[0])*exp(-4.5282e+09*sq(phase));xyz/=1.0685e-7;vec3 srgb=XYZ_TO_REC709*xyz;return srgb;}vec3 evalIridescence(float outsideIOR,float eta2,float cosTheta1,float thinFilmThickness,vec3 baseF0){vec3 I;float iridescenceIor=mix(outsideIOR,eta2,smoothstep(0.0,0.03,thinFilmThickness));float sinTheta2Sq=sq(outsideIOR/iridescenceIor)*(1.0-sq(cosTheta1));float cosTheta2Sq=1.0-sinTheta2Sq;if(cosTheta2Sq<0.0){return vec3(1.0);}float cosTheta2=sqrt(cosTheta2Sq);float R0=IorToFresnel0(iridescenceIor,outsideIOR);float R12=F_Schlick(R0,cosTheta1);float R21=R12;float T121=1.0-R12;float phi12=0.0;if(iridescenceIor<outsideIOR)phi12=M_PI;float phi21=M_PI-phi12;vec3 baseIOR=Fresnel0ToIor(clamp(baseF0,0.0,0.9999));vec3 R1=IorToFresnel0(baseIOR,iridescenceIor);vec3 R23=F_Schlick(R1,cosTheta2);vec3 phi23=vec3(0.0);if(baseIOR[0]<iridescenceIor)phi23[0]=M_PI;if(baseIOR[1]<iridescenceIor)phi23[1]=M_PI;if(baseIOR[2]<iridescenceIor)phi23[2]=M_PI;float OPD=2.0*iridescenceIor*thinFilmThickness*cosTheta2;vec3 phi=vec3(phi21)+phi23;vec3 R123=clamp(R12*R23,1e-5,0.9999);vec3 r123=sqrt(R123);vec3 Rs=sq(T121)*R23/(vec3(1.0)-R123);vec3 C0=R12+Rs;I=C0;vec3 Cm=Rs-T121;for(int m=1;m<=2;++m){Cm*=r123;vec3 Sm=2.0*evalSensitivity(float(m)*OPD,float(m)*phi);I+=Cm*Sm;}return max(I,vec3(0.0));}"; // eslint-disable-line

var materialInfoShader = "#define GLSLIFY 1\nuniform float u_MetallicFactor;uniform float u_RoughnessFactor;uniform vec4 u_BaseColorFactor;uniform vec3 u_SpecularFactor;uniform vec4 u_DiffuseFactor;uniform float u_GlossinessFactor;uniform float u_SheenRoughnessFactor;uniform vec3 u_SheenColorFactor;uniform float u_ClearcoatFactor;uniform float u_ClearcoatRoughnessFactor;uniform vec3 u_KHR_materials_specular_specularColorFactor;uniform float u_KHR_materials_specular_specularFactor;uniform float u_TransmissionFactor;uniform float u_ThicknessFactor;uniform vec3 u_AttenuationColor;uniform float u_AttenuationDistance;uniform float u_IridescenceFactor;uniform float u_IridescenceIor;uniform float u_IridescenceThicknessMinimum;uniform float u_IridescenceThicknessMaximum;uniform float u_EmissiveStrength;uniform float u_Ior;uniform float u_AlphaCutoff;uniform vec3 u_Camera;\n#ifdef MATERIAL_TRANSMISSION\nuniform ivec2 u_ScreenSize;\n#endif\nuniform mat4 u_ModelMatrix;uniform mat4 u_ViewMatrix;uniform mat4 u_ProjectionMatrix;struct MaterialInfo{float ior;float perceptualRoughness;vec3 f0;float alphaRoughness;vec3 c_diff;vec3 f90;float metallic;vec3 baseColor;float sheenRoughnessFactor;vec3 sheenColorFactor;vec3 clearcoatF0;vec3 clearcoatF90;float clearcoatFactor;vec3 clearcoatNormal;float clearcoatRoughness;float specularWeight;float transmissionFactor;float thickness;vec3 attenuationColor;float attenuationDistance;float iridescenceFactor;float iridescenceIor;float iridescenceThickness;};NormalInfo getNormalInfo(vec3 v){vec2 UV=getNormalUV();vec3 uv_dx=dFdx(vec3(UV,0.0));vec3 uv_dy=dFdy(vec3(UV,0.0));if(length(uv_dx)+length(uv_dy)<=1e-6){uv_dx=vec3(1.0,0.0,0.0);uv_dy=vec3(0.0,1.0,0.0);}vec3 t_=(uv_dy.t*dFdx(v_Position)-uv_dx.t*dFdy(v_Position))/(uv_dx.s*uv_dy.t-uv_dy.s*uv_dx.t);vec3 n,t,b,ng;\n#ifdef HAS_NORMAL_VEC3\n#ifdef HAS_TANGENT_VEC4\nt=normalize(v_TBN[0]);b=normalize(v_TBN[1]);ng=normalize(v_TBN[2]);\n#else\nng=normalize(v_Normal);t=normalize(t_-ng*dot(ng,t_));b=cross(ng,t);\n#endif\n#else\nng=normalize(cross(dFdx(v_Position),dFdy(v_Position)));t=normalize(t_-ng*dot(ng,t_));b=cross(ng,t);\n#endif\nif(gl_FrontFacing==false){t*=-1.0;b*=-1.0;ng*=-1.0;}NormalInfo info;info.ng=ng;\n#ifdef HAS_NORMAL_MAP\ninfo.ntex=texture(u_NormalSampler,UV).rgb*2.0-vec3(1.0);info.ntex*=vec3(u_NormalScale,u_NormalScale,1.0);info.ntex=normalize(info.ntex);info.n=normalize(mat3(t,b,ng)*info.ntex);\n#else\ninfo.n=ng;\n#endif\ninfo.t=t;info.b=b;return info;}\n#ifdef MATERIAL_CLEARCOAT\nvec3 getClearcoatNormal(NormalInfo normalInfo){\n#ifdef HAS_CLEARCOAT_NORMAL_MAP\nvec3 n=texture(u_ClearcoatNormalSampler,getClearcoatNormalUV()).rgb*2.0-vec3(1.0);n*=vec3(u_ClearcoatNormalScale,u_ClearcoatNormalScale,1.0);n=mat3(normalInfo.t,normalInfo.b,normalInfo.ng)*normalize(n);return n;\n#else\nreturn normalInfo.ng;\n#endif\n}\n#endif\nvec4 getBaseColor(){vec4 baseColor=vec4(1);\n#if defined(MATERIAL_SPECULARGLOSSINESS)\nbaseColor=u_DiffuseFactor;\n#elif defined(MATERIAL_METALLICROUGHNESS)\nbaseColor=u_BaseColorFactor;\n#endif\n#if defined(MATERIAL_SPECULARGLOSSINESS) && defined(HAS_DIFFUSE_MAP)\nbaseColor*=texture(u_DiffuseSampler,getDiffuseUV());\n#elif defined(MATERIAL_METALLICROUGHNESS) && defined(HAS_BASE_COLOR_MAP)\nbaseColor*=texture(u_BaseColorSampler,getBaseColorUV());\n#endif\nreturn baseColor*getVertexColor();}\n#ifdef MATERIAL_SPECULARGLOSSINESS\nMaterialInfo getSpecularGlossinessInfo(MaterialInfo info){info.f0=u_SpecularFactor;info.perceptualRoughness=u_GlossinessFactor;\n#ifdef HAS_SPECULAR_GLOSSINESS_MAP\nvec4 sgSample=texture(u_SpecularGlossinessSampler,getSpecularGlossinessUV());info.perceptualRoughness*=sgSample.a;info.f0*=sgSample.rgb;\n#endif\ninfo.perceptualRoughness=1.0-info.perceptualRoughness;info.c_diff=info.baseColor.rgb*(1.0-max(max(info.f0.r,info.f0.g),info.f0.b));return info;}\n#endif\n#ifdef MATERIAL_METALLICROUGHNESS\nMaterialInfo getMetallicRoughnessInfo(MaterialInfo info){info.metallic=u_MetallicFactor;info.perceptualRoughness=u_RoughnessFactor;\n#ifdef HAS_METALLIC_ROUGHNESS_MAP\nvec4 mrSample=texture(u_MetallicRoughnessSampler,getMetallicRoughnessUV());info.perceptualRoughness*=mrSample.g;info.metallic*=mrSample.b;\n#endif\ninfo.c_diff=mix(info.baseColor.rgb,vec3(0),info.metallic);info.f0=mix(info.f0,info.baseColor.rgb,info.metallic);return info;}\n#endif\n#ifdef MATERIAL_SHEEN\nMaterialInfo getSheenInfo(MaterialInfo info){info.sheenColorFactor=u_SheenColorFactor;info.sheenRoughnessFactor=u_SheenRoughnessFactor;\n#ifdef HAS_SHEEN_COLOR_MAP\nvec4 sheenColorSample=texture(u_SheenColorSampler,getSheenColorUV());info.sheenColorFactor*=sheenColorSample.rgb;\n#endif\n#ifdef HAS_SHEEN_ROUGHNESS_MAP\nvec4 sheenRoughnessSample=texture(u_SheenRoughnessSampler,getSheenRoughnessUV());info.sheenRoughnessFactor*=sheenRoughnessSample.a;\n#endif\nreturn info;}\n#endif\n#ifdef MATERIAL_SPECULAR\nMaterialInfo getSpecularInfo(MaterialInfo info){vec4 specularTexture=vec4(1.0);\n#ifdef HAS_SPECULAR_MAP\nspecularTexture.a=texture(u_SpecularSampler,getSpecularUV()).a;\n#endif\n#ifdef HAS_SPECULAR_COLOR_MAP\nspecularTexture.rgb=texture(u_SpecularColorSampler,getSpecularColorUV()).rgb;\n#endif\nvec3 dielectricSpecularF0=min(info.f0*u_KHR_materials_specular_specularColorFactor*specularTexture.rgb,vec3(1.0));info.f0=mix(dielectricSpecularF0,info.baseColor.rgb,info.metallic);info.specularWeight=u_KHR_materials_specular_specularFactor*specularTexture.a;info.c_diff=mix(info.baseColor.rgb,vec3(0),info.metallic);return info;}\n#endif\n#ifdef MATERIAL_TRANSMISSION\nMaterialInfo getTransmissionInfo(MaterialInfo info){info.transmissionFactor=u_TransmissionFactor;\n#ifdef HAS_TRANSMISSION_MAP\nvec4 transmissionSample=texture(u_TransmissionSampler,getTransmissionUV());info.transmissionFactor*=transmissionSample.r;\n#endif\nreturn info;}\n#endif\n#ifdef MATERIAL_VOLUME\nMaterialInfo getVolumeInfo(MaterialInfo info){info.thickness=u_ThicknessFactor;info.attenuationColor=u_AttenuationColor;info.attenuationDistance=u_AttenuationDistance;\n#ifdef HAS_THICKNESS_MAP\nvec4 thicknessSample=texture(u_ThicknessSampler,getThicknessUV());info.thickness*=thicknessSample.g;\n#endif\nreturn info;}\n#endif\n#ifdef MATERIAL_IRIDESCENCE\nMaterialInfo getIridescenceInfo(MaterialInfo info){info.iridescenceFactor=u_IridescenceFactor;info.iridescenceIor=u_IridescenceIor;info.iridescenceThickness=u_IridescenceThicknessMaximum;\n#ifdef HAS_IRIDESCENCE_MAP\ninfo.iridescenceFactor*=texture(u_IridescenceSampler,getIridescenceUV()).r;\n#endif\n#ifdef HAS_IRIDESCENCE_THICKNESS_MAP\nfloat thicknessSampled=texture(u_IridescenceThicknessSampler,getIridescenceThicknessUV()).g;float thickness=mix(u_IridescenceThicknessMinimum,u_IridescenceThicknessMaximum,thicknessSampled);info.iridescenceThickness=thickness;\n#endif\nreturn info;}\n#endif\n#ifdef MATERIAL_CLEARCOAT\nMaterialInfo getClearCoatInfo(MaterialInfo info,NormalInfo normalInfo){info.clearcoatFactor=u_ClearcoatFactor;info.clearcoatRoughness=u_ClearcoatRoughnessFactor;info.clearcoatF0=vec3(pow((info.ior-1.0)/(info.ior+1.0),2.0));info.clearcoatF90=vec3(1.0);\n#ifdef HAS_CLEARCOAT_MAP\nvec4 clearcoatSample=texture(u_ClearcoatSampler,getClearcoatUV());info.clearcoatFactor*=clearcoatSample.r;\n#endif\n#ifdef HAS_CLEARCOAT_ROUGHNESS_MAP\nvec4 clearcoatSampleRoughness=texture(u_ClearcoatRoughnessSampler,getClearcoatRoughnessUV());info.clearcoatRoughness*=clearcoatSampleRoughness.g;\n#endif\ninfo.clearcoatNormal=getClearcoatNormal(normalInfo);info.clearcoatRoughness=clamp(info.clearcoatRoughness,0.0,1.0);return info;}\n#endif\n#ifdef MATERIAL_IOR\nMaterialInfo getIorInfo(MaterialInfo info){info.f0=vec3(pow((u_Ior-1.0)/(u_Ior+1.0),2.0));info.ior=u_Ior;return info;}\n#endif\nfloat albedoSheenScalingLUT(float NdotV,float sheenRoughnessFactor){return texture(u_SheenELUT,vec2(NdotV,sheenRoughnessFactor)).r;}"; // eslint-disable-line

var iblShader = "#define GLSLIFY 1\nuniform float u_EnvIntensity;vec3 getDiffuseLight(vec3 n){return texture(u_LambertianEnvSampler,u_EnvRotation*n).rgb*u_EnvIntensity;}vec4 getSpecularSample(vec3 reflection,float lod){return textureLod(u_GGXEnvSampler,u_EnvRotation*reflection,lod)*u_EnvIntensity;}vec4 getSheenSample(vec3 reflection,float lod){return textureLod(u_CharlieEnvSampler,u_EnvRotation*reflection,lod)*u_EnvIntensity;}vec3 getIBLRadianceGGX(vec3 n,vec3 v,float roughness,vec3 F0,float specularWeight){float NdotV=clampedDot(n,v);float lod=roughness*float(u_MipCount-1);vec3 reflection=normalize(reflect(-v,n));vec2 brdfSamplePoint=clamp(vec2(NdotV,roughness),vec2(0.0,0.0),vec2(1.0,1.0));vec2 f_ab=texture(u_GGXLUT,brdfSamplePoint).rg;vec4 specularSample=getSpecularSample(reflection,lod);vec3 specularLight=specularSample.rgb;vec3 Fr=max(vec3(1.0-roughness),F0)-F0;vec3 k_S=F0+Fr*pow(1.0-NdotV,5.0);vec3 FssEss=k_S*f_ab.x+f_ab.y;return specularWeight*specularLight*FssEss;}\n#ifdef MATERIAL_IRIDESCENCE\nvec3 getIBLRadianceGGXIridescence(vec3 n,vec3 v,float roughness,vec3 F0,vec3 iridescenceFresnel,float iridescenceFactor,float specularWeight){float NdotV=clampedDot(n,v);float lod=roughness*float(u_MipCount-1);vec3 reflection=normalize(reflect(-v,n));vec2 brdfSamplePoint=clamp(vec2(NdotV,roughness),vec2(0.0,0.0),vec2(1.0,1.0));vec2 f_ab=texture(u_GGXLUT,brdfSamplePoint).rg;vec4 specularSample=getSpecularSample(reflection,lod);vec3 specularLight=specularSample.rgb;vec3 Fr=max(vec3(1.0-roughness),F0)-F0;vec3 k_S=mix(F0+Fr*pow(1.0-NdotV,5.0),iridescenceFresnel,iridescenceFactor);vec3 FssEss=k_S*f_ab.x+f_ab.y;return specularWeight*specularLight*FssEss;}\n#endif\n#ifdef MATERIAL_TRANSMISSION\nvec3 getTransmissionSample(vec2 fragCoord,float roughness,float ior){float framebufferLod=log2(float(u_TransmissionFramebufferSize.x))*applyIorToRoughness(roughness,ior);vec3 transmittedLight=textureLod(u_TransmissionFramebufferSampler,fragCoord.xy,framebufferLod).rgb;return transmittedLight;}\n#endif\n#ifdef MATERIAL_TRANSMISSION\nvec3 getIBLVolumeRefraction(vec3 n,vec3 v,float perceptualRoughness,vec3 baseColor,vec3 f0,vec3 f90,vec3 position,mat4 modelMatrix,mat4 viewMatrix,mat4 projMatrix,float ior,float thickness,vec3 attenuationColor,float attenuationDistance){vec3 transmissionRay=getVolumeTransmissionRay(n,v,thickness,ior,modelMatrix);vec3 refractedRayExit=position+transmissionRay;vec4 ndcPos=projMatrix*viewMatrix*vec4(refractedRayExit,1.0);vec2 refractionCoords=ndcPos.xy/ndcPos.w;refractionCoords+=1.0;refractionCoords/=2.0;vec3 transmittedLight=getTransmissionSample(refractionCoords,perceptualRoughness,ior);vec3 attenuatedColor=applyVolumeAttenuation(transmittedLight,length(transmissionRay),attenuationColor,attenuationDistance);float NdotV=clampedDot(n,v);vec2 brdfSamplePoint=clamp(vec2(NdotV,perceptualRoughness),vec2(0.0,0.0),vec2(1.0,1.0));vec2 brdf=texture(u_GGXLUT,brdfSamplePoint).rg;vec3 specularColor=f0*brdf.x+f90*brdf.y;return(1.0-specularColor)*attenuatedColor*baseColor;}\n#endif\nvec3 getIBLRadianceLambertian(vec3 n,vec3 v,float roughness,vec3 diffuseColor,vec3 F0,float specularWeight){float NdotV=clampedDot(n,v);vec2 brdfSamplePoint=clamp(vec2(NdotV,roughness),vec2(0.0,0.0),vec2(1.0,1.0));vec2 f_ab=texture(u_GGXLUT,brdfSamplePoint).rg;vec3 irradiance=getDiffuseLight(n);vec3 Fr=max(vec3(1.0-roughness),F0)-F0;vec3 k_S=F0+Fr*pow(1.0-NdotV,5.0);vec3 FssEss=specularWeight*k_S*f_ab.x+f_ab.y;float Ems=(1.0-(f_ab.x+f_ab.y));vec3 F_avg=specularWeight*(F0+(1.0-F0)/21.0);vec3 FmsEms=Ems*FssEss*F_avg/(1.0-F_avg*Ems);vec3 k_D=diffuseColor*(1.0-FssEss+FmsEms);return(FmsEms+k_D)*irradiance;}\n#ifdef MATERIAL_IRIDESCENCE\nvec3 getIBLRadianceLambertianIridescence(vec3 n,vec3 v,float roughness,vec3 diffuseColor,vec3 F0,vec3 iridescenceF0,float iridescenceFactor,float specularWeight){float NdotV=clampedDot(n,v);vec2 brdfSamplePoint=clamp(vec2(NdotV,roughness),vec2(0.0,0.0),vec2(1.0,1.0));vec2 f_ab=texture(u_GGXLUT,brdfSamplePoint).rg;vec3 irradiance=getDiffuseLight(n);vec3 iridescenceF0Max=vec3(max(max(iridescenceF0.r,iridescenceF0.g),iridescenceF0.b));vec3 mixedF0=mix(F0,iridescenceF0Max,iridescenceFactor);vec3 Fr=max(vec3(1.0-roughness),mixedF0)-mixedF0;vec3 k_S=mixedF0+Fr*pow(1.0-NdotV,5.0);vec3 FssEss=specularWeight*k_S*f_ab.x+f_ab.y;float Ems=(1.0-(f_ab.x+f_ab.y));vec3 F_avg=specularWeight*(mixedF0+(1.0-mixedF0)/21.0);vec3 FmsEms=Ems*FssEss*F_avg/(1.0-F_avg*Ems);vec3 k_D=diffuseColor*(1.0-FssEss+FmsEms);return(FmsEms+k_D)*irradiance;}\n#endif\nvec3 getIBLRadianceCharlie(vec3 n,vec3 v,float sheenRoughness,vec3 sheenColor){float NdotV=clampedDot(n,v);float lod=sheenRoughness*float(u_MipCount-1);vec3 reflection=normalize(reflect(-v,n));vec2 brdfSamplePoint=clamp(vec2(NdotV,sheenRoughness),vec2(0.0,0.0),vec2(1.0,1.0));float brdf=texture(u_CharlieLUT,brdfSamplePoint).b;vec4 sheenSample=getSheenSample(reflection,lod);vec3 sheenLight=sheenSample.rgb;return sheenLight*sheenColor*brdf;}"; // eslint-disable-line

var punctualShader = "#define GLSLIFY 1\nstruct Light{vec3 direction;float range;vec3 color;float intensity;vec3 position;float innerConeCos;float outerConeCos;int type;};const int LightType_Directional=0;const int LightType_Point=1;const int LightType_Spot=2;\n#ifdef USE_PUNCTUAL\nuniform Light u_Lights[LIGHT_COUNT+1];\n#endif\nfloat getRangeAttenuation(float range,float distance){if(range<=0.0){return 1.0/pow(distance,2.0);}return max(min(1.0-pow(distance/range,4.0),1.0),0.0)/pow(distance,2.0);}float getSpotAttenuation(vec3 pointToLight,vec3 spotDirection,float outerConeCos,float innerConeCos){float actualCos=dot(normalize(spotDirection),normalize(-pointToLight));if(actualCos>outerConeCos){if(actualCos<innerConeCos){return smoothstep(outerConeCos,innerConeCos,actualCos);}return 1.0;}return 0.0;}vec3 getLighIntensity(Light light,vec3 pointToLight){float rangeAttenuation=1.0;float spotAttenuation=1.0;if(light.type!=LightType_Directional){rangeAttenuation=getRangeAttenuation(light.range,length(pointToLight));}if(light.type==LightType_Spot){spotAttenuation=getSpotAttenuation(pointToLight,light.direction,light.outerConeCos,light.innerConeCos);}return rangeAttenuation*spotAttenuation*light.intensity*light.color;}vec3 getPunctualRadianceTransmission(vec3 normal,vec3 view,vec3 pointToLight,float alphaRoughness,vec3 f0,vec3 f90,vec3 baseColor,float ior){float transmissionRougness=applyIorToRoughness(alphaRoughness,ior);vec3 n=normalize(normal);vec3 v=normalize(view);vec3 l=normalize(pointToLight);vec3 l_mirror=normalize(l+2.0*n*dot(-l,n));vec3 h=normalize(l_mirror+v);float D=D_GGX(clamp(dot(n,h),0.0,1.0),transmissionRougness);vec3 F=F_Schlick(f0,f90,clamp(dot(v,h),0.0,1.0));float Vis=V_GGX(clamp(dot(n,l_mirror),0.0,1.0),clamp(dot(n,v),0.0,1.0),transmissionRougness);return(1.0-F)*baseColor*D*Vis;}vec3 getPunctualRadianceClearCoat(vec3 clearcoatNormal,vec3 v,vec3 l,vec3 h,float VdotH,vec3 f0,vec3 f90,float clearcoatRoughness){float NdotL=clampedDot(clearcoatNormal,l);float NdotV=clampedDot(clearcoatNormal,v);float NdotH=clampedDot(clearcoatNormal,h);return NdotL*BRDF_specularGGX(f0,f90,clearcoatRoughness*clearcoatRoughness,1.0,VdotH,NdotL,NdotV,NdotH);}vec3 getPunctualRadianceSheen(vec3 sheenColor,float sheenRoughness,float NdotL,float NdotV,float NdotH){return NdotL*BRDF_specularSheen(sheenColor,sheenRoughness,NdotL,NdotV,NdotH);}vec3 applyVolumeAttenuation(vec3 radiance,float transmissionDistance,vec3 attenuationColor,float attenuationDistance){if(attenuationDistance==0.0){return radiance;}else{vec3 attenuationCoefficient=-log(attenuationColor)/attenuationDistance;vec3 transmittance=exp(-attenuationCoefficient*transmissionDistance);return transmittance*radiance;}}vec3 getVolumeTransmissionRay(vec3 n,vec3 v,float thickness,float ior,mat4 modelMatrix){vec3 refractionVector=refract(-v,normalize(n),1.0/ior);vec3 modelScale;modelScale.x=length(vec3(modelMatrix[0].xyz));modelScale.y=length(vec3(modelMatrix[1].xyz));modelScale.z=length(vec3(modelMatrix[2].xyz));return normalize(refractionVector)*thickness*modelScale;}"; // eslint-disable-line

var primitiveShader = "#define GLSLIFY 1\n#include <animation.glsl>\nuniform mat4 u_ViewProjectionMatrix;uniform mat4 u_ModelMatrix;uniform mat4 u_NormalMatrix;in vec3 a_position;out vec3 v_Position;\n#ifdef HAS_NORMAL_VEC3\nin vec3 a_normal;\n#endif\n#ifdef HAS_NORMAL_VEC3\n#ifdef HAS_TANGENT_VEC4\nin vec4 a_tangent;out mat3 v_TBN;\n#else\nout vec3 v_Normal;\n#endif\n#endif\n#ifdef HAS_TEXCOORD_0_VEC2\nin vec2 a_texcoord_0;\n#endif\n#ifdef HAS_TEXCOORD_1_VEC2\nin vec2 a_texcoord_1;\n#endif\nout vec2 v_texcoord_0;out vec2 v_texcoord_1;\n#ifdef HAS_COLOR_0_VEC3\nin vec3 a_color_0;out vec3 v_Color;\n#endif\n#ifdef HAS_COLOR_0_VEC4\nin vec4 a_color_0;out vec4 v_Color;\n#endif\nvec4 getPosition(){vec4 pos=vec4(a_position,1.0);\n#ifdef USE_MORPHING\npos+=getTargetPosition(gl_VertexID);\n#endif\n#ifdef USE_SKINNING\npos=getSkinningMatrix()*pos;\n#endif\nreturn pos;}\n#ifdef HAS_NORMAL_VEC3\nvec3 getNormal(){vec3 normal=a_normal;\n#ifdef USE_MORPHING\nnormal+=getTargetNormal(gl_VertexID);\n#endif\n#ifdef USE_SKINNING\nnormal=mat3(getSkinningNormalMatrix())*normal;\n#endif\nreturn normalize(normal);}\n#endif\n#ifdef HAS_NORMAL_VEC3\n#ifdef HAS_TANGENT_VEC4\nvec3 getTangent(){vec3 tangent=a_tangent.xyz;\n#ifdef USE_MORPHING\ntangent+=getTargetTangent(gl_VertexID);\n#endif\n#ifdef USE_SKINNING\ntangent=mat3(getSkinningMatrix())*tangent;\n#endif\nreturn normalize(tangent);}\n#endif\n#endif\nvoid main(){gl_PointSize=1.0f;vec4 pos=u_ModelMatrix*getPosition();v_Position=vec3(pos.xyz)/pos.w;\n#ifdef HAS_NORMAL_VEC3\n#ifdef HAS_TANGENT_VEC4\nvec3 tangent=getTangent();vec3 normalW=normalize(vec3(u_NormalMatrix*vec4(getNormal(),0.0)));vec3 tangentW=normalize(vec3(u_ModelMatrix*vec4(tangent,0.0)));vec3 bitangentW=cross(normalW,tangentW)*a_tangent.w;v_TBN=mat3(tangentW,bitangentW,normalW);\n#else\nv_Normal=normalize(vec3(u_NormalMatrix*vec4(getNormal(),0.0)));\n#endif\n#endif\nv_texcoord_0=vec2(0.0,0.0);v_texcoord_1=vec2(0.0,0.0);\n#ifdef HAS_TEXCOORD_0_VEC2\nv_texcoord_0=a_texcoord_0;\n#endif\n#ifdef HAS_TEXCOORD_1_VEC2\nv_texcoord_1=a_texcoord_1;\n#endif\n#ifdef USE_MORPHING\nv_texcoord_0+=getTargetTexCoord0(gl_VertexID);v_texcoord_1+=getTargetTexCoord1(gl_VertexID);\n#endif\n#if defined(HAS_COLOR_0_VEC3)\nv_Color=a_color_0;\n#if defined(USE_MORPHING)\nv_Color=clamp(v_Color+getTargetColor0(gl_VertexID).xyz,0.0f,1.0f);\n#endif\n#endif\n#if defined(HAS_COLOR_0_VEC4)\nv_Color=a_color_0;\n#if defined(USE_MORPHING)\nv_Color=clamp(v_Color+getTargetColor0(gl_VertexID),0.0f,1.0f);\n#endif\n#endif\ngl_Position=u_ViewProjectionMatrix*pos;}"; // eslint-disable-line

var texturesShader = "#define GLSLIFY 1\nuniform int u_MipCount;uniform samplerCube u_LambertianEnvSampler;uniform samplerCube u_GGXEnvSampler;uniform sampler2D u_GGXLUT;uniform samplerCube u_CharlieEnvSampler;uniform sampler2D u_CharlieLUT;uniform sampler2D u_SheenELUT;uniform mat3 u_EnvRotation;uniform sampler2D u_NormalSampler;uniform float u_NormalScale;uniform int u_NormalUVSet;uniform mat3 u_NormalUVTransform;uniform vec3 u_EmissiveFactor;uniform sampler2D u_EmissiveSampler;uniform int u_EmissiveUVSet;uniform mat3 u_EmissiveUVTransform;uniform sampler2D u_OcclusionSampler;uniform int u_OcclusionUVSet;uniform float u_OcclusionStrength;uniform mat3 u_OcclusionUVTransform;in vec2 v_texcoord_0;in vec2 v_texcoord_1;vec2 getNormalUV(){vec3 uv=vec3(u_NormalUVSet<1 ? v_texcoord_0 : v_texcoord_1,1.0);\n#ifdef HAS_NORMAL_UV_TRANSFORM\nuv=u_NormalUVTransform*uv;\n#endif\nreturn uv.xy;}vec2 getEmissiveUV(){vec3 uv=vec3(u_EmissiveUVSet<1 ? v_texcoord_0 : v_texcoord_1,1.0);\n#ifdef HAS_EMISSIVE_UV_TRANSFORM\nuv=u_EmissiveUVTransform*uv;\n#endif\nreturn uv.xy;}vec2 getOcclusionUV(){vec3 uv=vec3(u_OcclusionUVSet<1 ? v_texcoord_0 : v_texcoord_1,1.0);\n#ifdef HAS_OCCLUSION_UV_TRANSFORM\nuv=u_OcclusionUVTransform*uv;\n#endif\nreturn uv.xy;}\n#ifdef MATERIAL_METALLICROUGHNESS\nuniform sampler2D u_BaseColorSampler;uniform int u_BaseColorUVSet;uniform mat3 u_BaseColorUVTransform;uniform sampler2D u_MetallicRoughnessSampler;uniform int u_MetallicRoughnessUVSet;uniform mat3 u_MetallicRoughnessUVTransform;vec2 getBaseColorUV(){vec3 uv=vec3(u_BaseColorUVSet<1 ? v_texcoord_0 : v_texcoord_1,1.0);\n#ifdef HAS_BASECOLOR_UV_TRANSFORM\nuv=u_BaseColorUVTransform*uv;\n#endif\nreturn uv.xy;}vec2 getMetallicRoughnessUV(){vec3 uv=vec3(u_MetallicRoughnessUVSet<1 ? v_texcoord_0 : v_texcoord_1,1.0);\n#ifdef HAS_METALLICROUGHNESS_UV_TRANSFORM\nuv=u_MetallicRoughnessUVTransform*uv;\n#endif\nreturn uv.xy;}\n#endif\n#ifdef MATERIAL_SPECULARGLOSSINESS\nuniform sampler2D u_DiffuseSampler;uniform int u_DiffuseUVSet;uniform mat3 u_DiffuseUVTransform;uniform sampler2D u_SpecularGlossinessSampler;uniform int u_SpecularGlossinessUVSet;uniform mat3 u_SpecularGlossinessUVTransform;vec2 getSpecularGlossinessUV(){vec3 uv=vec3(u_SpecularGlossinessUVSet<1 ? v_texcoord_0 : v_texcoord_1,1.0);\n#ifdef HAS_SPECULARGLOSSINESS_UV_TRANSFORM\nuv=u_SpecularGlossinessUVTransform*uv;\n#endif\nreturn uv.xy;}vec2 getDiffuseUV(){vec3 uv=vec3(u_DiffuseUVSet<1 ? v_texcoord_0 : v_texcoord_1,1.0);\n#ifdef HAS_DIFFUSE_UV_TRANSFORM\nuv=u_DiffuseUVTransform*uv;\n#endif\nreturn uv.xy;}\n#endif\n#ifdef MATERIAL_CLEARCOAT\nuniform sampler2D u_ClearcoatSampler;uniform int u_ClearcoatUVSet;uniform mat3 u_ClearcoatUVTransform;uniform sampler2D u_ClearcoatRoughnessSampler;uniform int u_ClearcoatRoughnessUVSet;uniform mat3 u_ClearcoatRoughnessUVTransform;uniform sampler2D u_ClearcoatNormalSampler;uniform int u_ClearcoatNormalUVSet;uniform mat3 u_ClearcoatNormalUVTransform;uniform float u_ClearcoatNormalScale;vec2 getClearcoatUV(){vec3 uv=vec3(u_ClearcoatUVSet<1 ? v_texcoord_0 : v_texcoord_1,1.0);\n#ifdef HAS_CLEARCOAT_UV_TRANSFORM\nuv=u_ClearcoatUVTransform*uv;\n#endif\nreturn uv.xy;}vec2 getClearcoatRoughnessUV(){vec3 uv=vec3(u_ClearcoatRoughnessUVSet<1 ? v_texcoord_0 : v_texcoord_1,1.0);\n#ifdef HAS_CLEARCOATROUGHNESS_UV_TRANSFORM\nuv=u_ClearcoatRoughnessUVTransform*uv;\n#endif\nreturn uv.xy;}vec2 getClearcoatNormalUV(){vec3 uv=vec3(u_ClearcoatNormalUVSet<1 ? v_texcoord_0 : v_texcoord_1,1.0);\n#ifdef HAS_CLEARCOATNORMAL_UV_TRANSFORM\nuv=u_ClearcoatNormalUVTransform*uv;\n#endif\nreturn uv.xy;}\n#endif\n#ifdef MATERIAL_SHEEN\nuniform sampler2D u_SheenColorSampler;uniform int u_SheenColorUVSet;uniform mat3 u_SheenColorUVTransform;uniform sampler2D u_SheenRoughnessSampler;uniform int u_SheenRoughnessUVSet;uniform mat3 u_SheenRoughnessUVTransform;vec2 getSheenColorUV(){vec3 uv=vec3(u_SheenColorUVSet<1 ? v_texcoord_0 : v_texcoord_1,1.0);\n#ifdef HAS_SHEENCOLOR_UV_TRANSFORM\nuv=u_SheenColorUVTransform*uv;\n#endif\nreturn uv.xy;}vec2 getSheenRoughnessUV(){vec3 uv=vec3(u_SheenRoughnessUVSet<1 ? v_texcoord_0 : v_texcoord_1,1.0);\n#ifdef HAS_SHEENROUGHNESS_UV_TRANSFORM\nuv=u_SheenRoughnessUVTransform*uv;\n#endif\nreturn uv.xy;}\n#endif\n#ifdef MATERIAL_SPECULAR\nuniform sampler2D u_SpecularSampler;uniform int u_SpecularUVSet;uniform mat3 u_SpecularUVTransform;uniform sampler2D u_SpecularColorSampler;uniform int u_SpecularColorUVSet;uniform mat3 u_SpecularColorUVTransform;vec2 getSpecularUV(){vec3 uv=vec3(u_SpecularUVSet<1 ? v_texcoord_0 : v_texcoord_1,1.0);\n#ifdef HAS_SPECULAR_UV_TRANSFORM\nuv=u_SpecularUVTransform*uv;\n#endif\nreturn uv.xy;}vec2 getSpecularColorUV(){vec3 uv=vec3(u_SpecularColorUVSet<1 ? v_texcoord_0 : v_texcoord_1,1.0);\n#ifdef HAS_SPECULARCOLOR_UV_TRANSFORM\nuv=u_SpecularColorUVTransform*uv;\n#endif\nreturn uv.xy;}\n#endif\n#ifdef MATERIAL_TRANSMISSION\nuniform sampler2D u_TransmissionSampler;uniform int u_TransmissionUVSet;uniform mat3 u_TransmissionUVTransform;uniform sampler2D u_TransmissionFramebufferSampler;uniform ivec2 u_TransmissionFramebufferSize;vec2 getTransmissionUV(){vec3 uv=vec3(u_TransmissionUVSet<1 ? v_texcoord_0 : v_texcoord_1,1.0);\n#ifdef HAS_TRANSMISSION_UV_TRANSFORM\nuv=u_TransmissionUVTransform*uv;\n#endif\nreturn uv.xy;}\n#endif\n#ifdef MATERIAL_VOLUME\nuniform sampler2D u_ThicknessSampler;uniform int u_ThicknessUVSet;uniform mat3 u_ThicknessUVTransform;vec2 getThicknessUV(){vec3 uv=vec3(u_ThicknessUVSet<1 ? v_texcoord_0 : v_texcoord_1,1.0);\n#ifdef HAS_THICKNESS_UV_TRANSFORM\nuv=u_ThicknessUVTransform*uv;\n#endif\nreturn uv.xy;}\n#endif\n#ifdef MATERIAL_IRIDESCENCE\nuniform sampler2D u_IridescenceSampler;uniform int u_IridescenceUVSet;uniform mat3 u_IridescenceUVTransform;uniform sampler2D u_IridescenceThicknessSampler;uniform int u_IridescenceThicknessUVSet;uniform mat3 u_IridescenceThicknessUVTransform;vec2 getIridescenceUV(){vec3 uv=vec3(u_IridescenceUVSet<1 ? v_texcoord_0 : v_texcoord_1,1.0);\n#ifdef HAS_IRIDESCENCE_UV_TRANSFORM\nuv=u_IridescenceUVTransform*uv;\n#endif\nreturn uv.xy;}vec2 getIridescenceThicknessUV(){vec3 uv=vec3(u_IridescenceThicknessUVSet<1 ? v_texcoord_0 : v_texcoord_1,1.0);\n#ifdef HAS_IRIDESCENCETHICKNESS_UV_TRANSFORM\nuv=u_IridescenceThicknessUVTransform*uv;\n#endif\nreturn uv.xy;}\n#endif\n"; // eslint-disable-line

var tonemappingShader = "#define GLSLIFY 1\nuniform float u_Exposure;const float GAMMA=2.2;const float INV_GAMMA=1.0/GAMMA;const mat3 ACESInputMat=mat3(0.59719,0.07600,0.02840,0.35458,0.90834,0.13383,0.04823,0.01566,0.83777);const mat3 ACESOutputMat=mat3(1.60475,-0.10208,-0.00327,-0.53108,1.10813,-0.07276,-0.07367,-0.00605,1.07602);vec3 linearTosRGB(vec3 color){return pow(color,vec3(INV_GAMMA));}vec3 sRGBToLinear(vec3 srgbIn){return vec3(pow(srgbIn.xyz,vec3(GAMMA)));}vec4 sRGBToLinear(vec4 srgbIn){return vec4(sRGBToLinear(srgbIn.xyz),srgbIn.w);}vec3 toneMapACES_Narkowicz(vec3 color){const float A=2.51;const float B=0.03;const float C=2.43;const float D=0.59;const float E=0.14;return clamp((color*(A*color+B))/(color*(C*color+D)+E),0.0,1.0);}vec3 RRTAndODTFit(vec3 color){vec3 a=color*(color+0.0245786)-0.000090537;vec3 b=color*(0.983729*color+0.4329510)+0.238081;return a/b;}vec3 toneMapACES_Hill(vec3 color){color=ACESInputMat*color;color=RRTAndODTFit(color);color=ACESOutputMat*color;color=clamp(color,0.0,1.0);return color;}vec3 toneMap(vec3 color){color*=u_Exposure;\n#ifdef TONEMAP_ACES_NARKOWICZ\ncolor=toneMapACES_Narkowicz(color);\n#endif\n#ifdef TONEMAP_ACES_HILL\ncolor=toneMapACES_Hill(color);\n#endif\n#ifdef TONEMAP_ACES_HILL_EXPOSURE_BOOST\ncolor/=0.6;color=toneMapACES_Hill(color);\n#endif\nreturn linearTosRGB(color);}"; // eslint-disable-line

var shaderFunctions = "#define GLSLIFY 1\nconst float M_PI=3.141592653589793;in vec3 v_Position;\n#ifdef HAS_NORMAL_VEC3\n#ifdef HAS_TANGENT_VEC4\nin mat3 v_TBN;\n#else\nin vec3 v_Normal;\n#endif\n#endif\n#ifdef HAS_COLOR_0_VEC3\nin vec3 v_Color;\n#endif\n#ifdef HAS_COLOR_0_VEC4\nin vec4 v_Color;\n#endif\nvec4 getVertexColor(){vec4 color=vec4(1.0);\n#ifdef HAS_COLOR_0_VEC3\ncolor.rgb=v_Color.rgb;\n#endif\n#ifdef HAS_COLOR_0_VEC4\ncolor=v_Color;\n#endif\nreturn color;}struct NormalInfo{vec3 ng;vec3 t;vec3 b;vec3 n;vec3 ntex;};float clampedDot(vec3 x,vec3 y){return clamp(dot(x,y),0.0,1.0);}float max3(vec3 v){return max(max(v.x,v.y),v.z);}float sq(float t){return t*t;}vec2 sq(vec2 t){return t*t;}vec3 sq(vec3 t){return t*t;}vec4 sq(vec4 t){return t*t;}float applyIorToRoughness(float roughness,float ior){return roughness*clamp(ior*2.0-2.0,0.0,1.0);}"; // eslint-disable-line

var animationShader = "#define GLSLIFY 1\n#ifdef HAS_MORPH_TARGETS\nuniform highp sampler2DArray u_MorphTargetsSampler;\n#endif\n#ifdef USE_MORPHING\nuniform float u_morphWeights[WEIGHT_COUNT];\n#endif\n#ifdef HAS_JOINTS_0_VEC4\nin vec4 a_joints_0;\n#endif\n#ifdef HAS_JOINTS_1_VEC4\nin vec4 a_joints_1;\n#endif\n#ifdef HAS_WEIGHTS_0_VEC4\nin vec4 a_weights_0;\n#endif\n#ifdef HAS_WEIGHTS_1_VEC4\nin vec4 a_weights_1;\n#endif\n#ifdef USE_SKINNING\nuniform sampler2D u_jointsSampler;\n#endif\n#ifdef USE_SKINNING\nmat4 getMatrixFromTexture(sampler2D s,int index){mat4 result=mat4(1);int texSize=textureSize(s,0)[0];int pixelIndex=index*4;for(int i=0;i<4;++i){int x=(pixelIndex+i)% texSize;int y=(pixelIndex+i-x)/texSize;result[i]=texelFetch(s,ivec2(x,y),0);}return result;}mat4 getSkinningMatrix(){mat4 skin=mat4(0);\n#if defined(HAS_WEIGHTS_0_VEC4) && defined(HAS_JOINTS_0_VEC4)\nskin+=a_weights_0.x*getMatrixFromTexture(u_jointsSampler,int(a_joints_0.x)*2)+a_weights_0.y*getMatrixFromTexture(u_jointsSampler,int(a_joints_0.y)*2)+a_weights_0.z*getMatrixFromTexture(u_jointsSampler,int(a_joints_0.z)*2)+a_weights_0.w*getMatrixFromTexture(u_jointsSampler,int(a_joints_0.w)*2);\n#endif\n#if defined(HAS_WEIGHTS_1_VEC4) && defined(HAS_JOINTS_1_VEC4)\nskin+=a_weights_1.x*getMatrixFromTexture(u_jointsSampler,int(a_joints_1.x)*2)+a_weights_1.y*getMatrixFromTexture(u_jointsSampler,int(a_joints_1.y)*2)+a_weights_1.z*getMatrixFromTexture(u_jointsSampler,int(a_joints_1.z)*2)+a_weights_1.w*getMatrixFromTexture(u_jointsSampler,int(a_joints_1.w)*2);\n#endif\nif(skin==mat4(0)){return mat4(1);}return skin;}mat4 getSkinningNormalMatrix(){mat4 skin=mat4(0);\n#if defined(HAS_WEIGHTS_0_VEC4) && defined(HAS_JOINTS_0_VEC4)\nskin+=a_weights_0.x*getMatrixFromTexture(u_jointsSampler,int(a_joints_0.x)*2+1)+a_weights_0.y*getMatrixFromTexture(u_jointsSampler,int(a_joints_0.y)*2+1)+a_weights_0.z*getMatrixFromTexture(u_jointsSampler,int(a_joints_0.z)*2+1)+a_weights_0.w*getMatrixFromTexture(u_jointsSampler,int(a_joints_0.w)*2+1);\n#endif\n#if defined(HAS_WEIGHTS_1_VEC4) && defined(HAS_JOINTS_1_VEC4)\nskin+=a_weights_1.x*getMatrixFromTexture(u_jointsSampler,int(a_joints_1.x)*2+1)+a_weights_1.y*getMatrixFromTexture(u_jointsSampler,int(a_joints_1.y)*2+1)+a_weights_1.z*getMatrixFromTexture(u_jointsSampler,int(a_joints_1.z)*2+1)+a_weights_1.w*getMatrixFromTexture(u_jointsSampler,int(a_joints_1.w)*2+1);\n#endif\nif(skin==mat4(0)){return mat4(1);}return skin;}\n#endif\n#ifdef USE_MORPHING\n#ifdef HAS_MORPH_TARGETS\nvec4 getDisplacement(int vertexID,int targetIndex,int texSize){int x=vertexID % texSize;int y=(vertexID-x)/texSize;return texelFetch(u_MorphTargetsSampler,ivec3(x,y,targetIndex),0);}\n#endif\nvec4 getTargetPosition(int vertexID){vec4 pos=vec4(0);\n#ifdef HAS_MORPH_TARGET_POSITION\nint texSize=textureSize(u_MorphTargetsSampler,0)[0];for(int i=0;i<WEIGHT_COUNT;i++){vec4 displacement=getDisplacement(vertexID,MORPH_TARGET_POSITION_OFFSET+i,texSize);pos+=u_morphWeights[i]*displacement;}\n#endif\nreturn pos;}vec3 getTargetNormal(int vertexID){vec3 normal=vec3(0);\n#ifdef HAS_MORPH_TARGET_NORMAL\nint texSize=textureSize(u_MorphTargetsSampler,0)[0];for(int i=0;i<WEIGHT_COUNT;i++){vec3 displacement=getDisplacement(vertexID,MORPH_TARGET_NORMAL_OFFSET+i,texSize).xyz;normal+=u_morphWeights[i]*displacement;}\n#endif\nreturn normal;}vec3 getTargetTangent(int vertexID){vec3 tangent=vec3(0);\n#ifdef HAS_MORPH_TARGET_TANGENT\nint texSize=textureSize(u_MorphTargetsSampler,0)[0];for(int i=0;i<WEIGHT_COUNT;i++){vec3 displacement=getDisplacement(vertexID,MORPH_TARGET_TANGENT_OFFSET+i,texSize).xyz;tangent+=u_morphWeights[i]*displacement;}\n#endif\nreturn tangent;}vec2 getTargetTexCoord0(int vertexID){vec2 uv=vec2(0);\n#ifdef HAS_MORPH_TARGET_TEXCOORD_0\nint texSize=textureSize(u_MorphTargetsSampler,0)[0];for(int i=0;i<WEIGHT_COUNT;i++){vec2 displacement=getDisplacement(vertexID,MORPH_TARGET_TEXCOORD_0_OFFSET+i,texSize).xy;uv+=u_morphWeights[i]*displacement;}\n#endif\nreturn uv;}vec2 getTargetTexCoord1(int vertexID){vec2 uv=vec2(0);\n#ifdef HAS_MORPH_TARGET_TEXCOORD_1\nint texSize=textureSize(u_MorphTargetsSampler,0)[0];for(int i=0;i<WEIGHT_COUNT;i++){vec2 displacement=getDisplacement(vertexID,MORPH_TARGET_TEXCOORD_1_OFFSET+i,texSize).xy;uv+=u_morphWeights[i]*displacement;}\n#endif\nreturn uv;}vec4 getTargetColor0(int vertexID){vec4 color=vec4(0);\n#ifdef HAS_MORPH_TARGET_COLOR_0\nint texSize=textureSize(u_MorphTargetsSampler,0)[0];for(int i=0;i<WEIGHT_COUNT;i++){vec4 displacement=getDisplacement(vertexID,MORPH_TARGET_COLOR_0_OFFSET+i,texSize);color+=u_morphWeights[i]*displacement;}\n#endif\nreturn color;}\n#endif\n"; // eslint-disable-line

var cubemapVertShader = "#define GLSLIFY 1\nuniform mat4 u_ViewProjectionMatrix;uniform mat3 u_EnvRotation;in vec3 a_position;out vec3 v_TexCoords;void main(){v_TexCoords=u_EnvRotation*a_position;mat4 mat=u_ViewProjectionMatrix;mat[3]=vec4(0.0,0.0,0.0,0.1);vec4 pos=mat*vec4(a_position,1.0);gl_Position=pos.xyww;}"; // eslint-disable-line

var cubemapFragShader = "precision highp float;\n#define GLSLIFY 1\n#include <tonemapping.glsl>\nuniform float u_EnvIntensity;uniform float u_EnvBlurNormalized;uniform int u_MipCount;uniform samplerCube u_GGXEnvSampler;out vec4 FragColor;in vec3 v_TexCoords;void main(){vec4 color=textureLod(u_GGXEnvSampler,v_TexCoords,u_EnvBlurNormalized*float(u_MipCount-1))*u_EnvIntensity;\n#ifdef LINEAR_OUTPUT\nFragColor=color.rgba;\n#else\nFragColor=vec4(toneMap(color.rgb),color.a);\n#endif\n}"; // eslint-disable-line

class gltfLight extends GltfObject
{
    constructor(
        type = "directional",
        color = [1, 1, 1],
        intensity = 1,
        innerConeAngle = 0,
        outerConeAngle = Math.PI / 4,
        range = -1,
        name = undefined)
    {
        super();
        this.type = type;
        this.color = color;
        this.intensity = intensity;
        this.innerConeAngle = innerConeAngle;
        this.outerConeAngle = outerConeAngle;
        this.range = range;
        this.name = name;

        //Can be used to overwrite direction from node
        this.direction = undefined;
    }

    initGl(gltf, webGlContext)
    {
        super.initGl(gltf, webGlContext);
    }

    fromJson(jsonLight)
    {
        super.fromJson(jsonLight);

        if(jsonLight.spot !== undefined)
        {
            fromKeys(this, jsonLight.spot);
        }
    }

    toUniform(node)
    {
        const matrix = node?.worldTransform ?? identity;

        // To extract a correct rotation, the scaling component must be eliminated.
        var scale = fromValues$2(1, 1, 1);
        getScaling(scale, matrix);
        const mn = create$3();
        for(const col of [0, 1, 2])
        {
            mn[col] = matrix[col] / scale[0];
            mn[col + 4] = matrix[col + 4] / scale[1];
            mn[col + 8] = matrix[col + 8] / scale[2];
        }
        var rotation = create();
        getRotation(rotation, mn);
        normalize(rotation, rotation);

        const uLight = new UniformLight();

        const alongNegativeZ = fromValues$2(0, 0, -1);
        transformQuat(uLight.direction, alongNegativeZ, rotation);

        var translation = fromValues$2(0, 0, 0);
        getTranslation(translation, matrix);
        uLight.position = translation;

        if (this.direction !== undefined)
        {
            uLight.direction = this.direction;
        }

        uLight.range = this.range;
        uLight.color = jsToGl(this.color);
        uLight.intensity = this.intensity;

        uLight.innerConeCos = Math.cos(this.innerConeAngle);
        uLight.outerConeCos = Math.cos(this.outerConeAngle);

        switch(this.type)
        {
        case "spot":
            uLight.type = Type_Spot;
            break;
        case "point":
            uLight.type = Type_Point;
            break;
        case "directional":
        default:
            uLight.type = Type_Directional;
            break;
        }

        return uLight;
    }
}

const Type_Directional = 0;
const Type_Point = 1;
const Type_Spot = 2;

class UniformLight extends UniformStruct
{
    constructor()
    {
        super();

        const defaultDirection = fromValues$2(-0.7399, -0.6428, -0.1983);
        this.direction = defaultDirection;
        this.range = -1;

        this.color = jsToGl([1, 1, 1]);
        this.intensity = 1;

        this.position = jsToGl([0, 0, 0]);
        this.innerConeCos = 0.0;

        this.outerConeCos = Math.PI / 4;
        this.type = Type_Directional;
    }
}

class gltfRenderer
{
    constructor(context)
    {
        this.shader = undefined; // current shader

        this.currentWidth = 0;
        this.currentHeight = 0;

        this.webGl = new gltfWebGl(context);
        this.initialized = false;
        this.samples = 4;

        // create render target for non transmission materials
        this.opaqueRenderTexture = 0;
        this.opaqueFramebuffer = 0;
        this.opaqueDepthTexture = 0;
        this.opaqueFramebufferWidth = 1024;
        this.opaqueFramebufferHeight = 1024;

        const shaderSources = new Map();
        shaderSources.set("primitive.vert", primitiveShader);
        shaderSources.set("pbr.frag", pbrShader);
        shaderSources.set("material_info.glsl", materialInfoShader);
        shaderSources.set("brdf.glsl", brdfShader);
        shaderSources.set("iridescence.glsl", iridescenceShader);
        shaderSources.set("ibl.glsl", iblShader);
        shaderSources.set("punctual.glsl", punctualShader);
        shaderSources.set("tonemapping.glsl", tonemappingShader);
        shaderSources.set("textures.glsl", texturesShader);
        shaderSources.set("functions.glsl", shaderFunctions);
        shaderSources.set("animation.glsl", animationShader);
        shaderSources.set("cubemap.vert", cubemapVertShader);
        shaderSources.set("cubemap.frag", cubemapFragShader);

        this.shaderCache = new ShaderCache(shaderSources, this.webGl);

        this.webGl.loadWebGlExtensions();

        this.visibleLights = [];

        this.viewMatrix = create$3();
        this.projMatrix = create$3();
        this.viewProjectionMatrix = create$3();

        this.currentCameraPosition = create$2();

        this.lightKey = new gltfLight();
        this.lightFill = new gltfLight();
        this.lightFill.intensity = 0.5;
        const quatKey = fromValues(
            -0.3535534,
            -0.353553385,
            -0.146446586,
            0.8535534);
        const quatFill = fromValues(
            -0.8535534,
            0.146446645,
            -0.353553325,
            -0.353553444);
        this.lightKey.direction = create$2();
        this.lightFill.direction = create$2();
        transformQuat(this.lightKey.direction, [0, 0, -1], quatKey);
        transformQuat(this.lightFill.direction, [0, 0, -1], quatFill);
    }

    /////////////////////////////////////////////////////////////////////
    // Render glTF scene graph
    /////////////////////////////////////////////////////////////////////

    // app state
    init(state)
    {
        const context = this.webGl.context;
        const maxSamples = context.getParameter(context.MAX_SAMPLES);
        const samples = state.internalMSAA < maxSamples ? state.internalMSAA : maxSamples;
        if (!this.initialized){

            context.pixelStorei(GL.UNPACK_COLORSPACE_CONVERSION_WEBGL, GL.NONE);
            context.enable(GL.DEPTH_TEST);
            context.depthFunc(GL.LEQUAL);
            context.colorMask(true, true, true, true);
            context.clearDepth(1.0);

            this.opaqueRenderTexture = context.createTexture();
            context.bindTexture(context.TEXTURE_2D, this.opaqueRenderTexture);
            context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MIN_FILTER, context.LINEAR_MIPMAP_LINEAR);
            context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_S, context.CLAMP_TO_EDGE);
            context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_T, context.CLAMP_TO_EDGE);
            context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MAG_FILTER, context.NEAREST);
            context.texImage2D(context.TEXTURE_2D, 0, context.RGBA, this.opaqueFramebufferWidth, this.opaqueFramebufferHeight, 0, context.RGBA, context.UNSIGNED_BYTE, null);
            context.bindTexture(context.TEXTURE_2D, null);

            this.opaqueDepthTexture = context.createTexture();
            context.bindTexture(context.TEXTURE_2D, this.opaqueDepthTexture);
            context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MIN_FILTER, context.NEAREST);
            context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_S, context.CLAMP_TO_EDGE);
            context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_T, context.CLAMP_TO_EDGE);
            context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MAG_FILTER, context.NEAREST);
            context.texImage2D( context.TEXTURE_2D, 0, context.DEPTH_COMPONENT16, this.opaqueFramebufferWidth, this.opaqueFramebufferHeight, 0, context.DEPTH_COMPONENT, context.UNSIGNED_SHORT, null);
            context.bindTexture(context.TEXTURE_2D, null);


            this.colorRenderBuffer = context.createRenderbuffer();
            context.bindRenderbuffer(context.RENDERBUFFER, this.colorRenderBuffer);
            context.renderbufferStorageMultisample( context.RENDERBUFFER, samples, context.RGBA8,  this.opaqueFramebufferWidth, this.opaqueFramebufferHeight);

            this.depthRenderBuffer = context.createRenderbuffer();
            context.bindRenderbuffer(context.RENDERBUFFER, this.depthRenderBuffer);
            context.renderbufferStorageMultisample( context.RENDERBUFFER,
                samples,
                context.DEPTH_COMPONENT16, 
                this.opaqueFramebufferWidth,
                this.opaqueFramebufferHeight);

            this.samples = samples;

            this.opaqueFramebufferMSAA = context.createFramebuffer();
            context.bindFramebuffer(context.FRAMEBUFFER, this.opaqueFramebufferMSAA);
            context.framebufferRenderbuffer(context.FRAMEBUFFER, context.COLOR_ATTACHMENT0, context.RENDERBUFFER, this.colorRenderBuffer);
            context.framebufferRenderbuffer(context.FRAMEBUFFER, context.DEPTH_ATTACHMENT, context.RENDERBUFFER, this.depthRenderBuffer);


            this.opaqueFramebuffer = context.createFramebuffer();
            context.bindFramebuffer(context.FRAMEBUFFER, this.opaqueFramebuffer);
            context.framebufferTexture2D(context.FRAMEBUFFER, context.COLOR_ATTACHMENT0, context.TEXTURE_2D, this.opaqueRenderTexture, 0);
            context.framebufferTexture2D(context.FRAMEBUFFER, context.DEPTH_ATTACHMENT, context.TEXTURE_2D, this.opaqueDepthTexture, 0);
            context.viewport(0, 0, this.opaqueFramebufferWidth, this.opaqueFramebufferHeight);
            context.bindFramebuffer(context.FRAMEBUFFER, null);

            this.initialized = true;

            this.environmentRenderer = new EnvironmentRenderer(this.webGl);
        }
        else {
            if (this.samples != samples)
            {
                this.samples = samples;
                context.bindRenderbuffer(context.RENDERBUFFER, this.colorRenderBuffer);
                context.renderbufferStorageMultisample( context.RENDERBUFFER,
                    samples,
                    context.RGBA8, 
                    this.opaqueFramebufferWidth,
                    this.opaqueFramebufferHeight);
                
                context.bindRenderbuffer(context.RENDERBUFFER, this.depthRenderBuffer);
                context.renderbufferStorageMultisample( context.RENDERBUFFER,
                    samples,
                    context.DEPTH_COMPONENT16, 
                    this.opaqueFramebufferWidth,
                    this.opaqueFramebufferHeight);
            }
        }
    }

    resize(width, height)
    {
        if (this.currentWidth !== width || this.currentHeight !== height)
        {
            this.currentHeight = height;
            this.currentWidth = width;
            this.webGl.context.viewport(0, 0, width, height);
        }
    }

    // frame state
    clearFrame(clearColor)
    {
        this.webGl.context.bindFramebuffer(this.webGl.context.FRAMEBUFFER, null);
        this.webGl.context.clearColor(clearColor[0] / 255.0, clearColor[1] / 255.0, clearColor[2] / 255.0, clearColor[3] / 255.0);
        this.webGl.context.clear(GL.COLOR_BUFFER_BIT | GL.DEPTH_BUFFER_BIT);
        this.webGl.context.bindFramebuffer(this.webGl.context.FRAMEBUFFER, this.opaqueFramebuffer);
        this.webGl.context.clearColor(clearColor[0] / 255.0, clearColor[1] / 255.0, clearColor[2] / 255.0, clearColor[3] / 255.0);
        this.webGl.context.clear(GL.COLOR_BUFFER_BIT | GL.DEPTH_BUFFER_BIT);
        this.webGl.context.bindFramebuffer(this.webGl.context.FRAMEBUFFER, null);
        this.webGl.context.bindFramebuffer(this.webGl.context.FRAMEBUFFER, this.opaqueFramebufferMSAA);
        this.webGl.context.clearColor(clearColor[0] / 255.0, clearColor[1] / 255.0, clearColor[2] / 255.0, clearColor[3] / 255.0);
        this.webGl.context.clear(GL.COLOR_BUFFER_BIT | GL.DEPTH_BUFFER_BIT);
        this.webGl.context.bindFramebuffer(this.webGl.context.FRAMEBUFFER, null);
    }

    prepareScene(state, scene) {
        this.nodes = scene.gatherNodes(state.gltf);

        // collect drawables by essentially zipping primitives (for geometry and material)
        // and nodes for the transform
        const drawables = this.nodes
            .filter(node => node.mesh !== undefined)
            .reduce((acc, node) => acc.concat(state.gltf.meshes[node.mesh].primitives.map( primitive => {
                return  {node: node, primitive: primitive};
            })), [])
            .filter(({primitive}) => primitive.material !== undefined);

        // opaque drawables don't need sorting
        this.opaqueDrawables = drawables
            .filter(({primitive}) => state.gltf.materials[primitive.material].alphaMode !== "BLEND"
                && (state.gltf.materials[primitive.material].extensions === undefined
                    || state.gltf.materials[primitive.material].extensions.KHR_materials_transmission === undefined));

        // transparent drawables need sorting before they can be drawn
        this.transparentDrawables = drawables
            .filter(({primitive}) => state.gltf.materials[primitive.material].alphaMode === "BLEND"
                && (state.gltf.materials[primitive.material].extensions === undefined
                    || state.gltf.materials[primitive.material].extensions.KHR_materials_transmission === undefined));

        this.transmissionDrawables = drawables
            .filter(({primitive}) => state.gltf.materials[primitive.material].extensions !== undefined
                && state.gltf.materials[primitive.material].extensions.KHR_materials_transmission !== undefined);
    }

    // render complete gltf scene with given camera
    drawScene(state, scene)
    {
        if (this.preparedScene !== scene) {
            this.prepareScene(state, scene);
            this.preparedScene = scene;
        }

        let currentCamera = undefined;

        if (state.cameraIndex === undefined)
        {
            currentCamera = state.userCamera;
        }
        else
        {
            currentCamera = state.gltf.cameras[state.cameraIndex].clone();
        }

        currentCamera.aspectRatio = this.currentWidth / this.currentHeight;
        if(currentCamera.aspectRatio > 1.0) {
            currentCamera.xmag = currentCamera.ymag * currentCamera.aspectRatio; 
        } else {
            currentCamera.ymag = currentCamera.xmag / currentCamera.aspectRatio; 
        }

        this.projMatrix = currentCamera.getProjectionMatrix();
        this.viewMatrix = currentCamera.getViewMatrix(state.gltf);
        this.currentCameraPosition = currentCamera.getPosition(state.gltf);

        this.visibleLights = this.getVisibleLights(state.gltf, scene.nodes);
        if (this.visibleLights.length === 0 && !state.renderingParameters.useIBL &&
            state.renderingParameters.useDirectionalLightsWithDisabledIBL)
        {
            this.visibleLights.push([null, this.lightKey]);
            this.visibleLights.push([null, this.lightFill]);
        }

        multiply(this.viewProjectionMatrix, this.projMatrix, this.viewMatrix);

        // Update skins.
        for (const node of this.nodes)
        {
            if (node.mesh !== undefined && node.skin !== undefined)
            {
                this.updateSkin(state, node);
            }
        }

        // If any transmissive drawables are present, render all opaque and transparent drawables into a separate framebuffer.
        if (this.transmissionDrawables.length > 0) {
            // Render transmission sample texture
            this.webGl.context.bindFramebuffer(this.webGl.context.FRAMEBUFFER, this.opaqueFramebufferMSAA);
            this.webGl.context.viewport(0, 0, this.opaqueFramebufferWidth, this.opaqueFramebufferHeight);

            // Render environment for the transmission background
            this.environmentRenderer.drawEnvironmentMap(this.webGl, this.viewProjectionMatrix, state, this.shaderCache, ["LINEAR_OUTPUT 1"]);

            for (const drawable of this.opaqueDrawables)
            {
                let renderpassConfiguration = {};
                renderpassConfiguration.linearOutput = true;
                this.drawPrimitive(state, renderpassConfiguration, drawable.primitive, drawable.node, this.viewProjectionMatrix);
            }

            this.transparentDrawables = currentCamera.sortPrimitivesByDepth(state.gltf, this.transparentDrawables);
            for (const drawable of this.transparentDrawables)
            {
                let renderpassConfiguration = {};
                renderpassConfiguration.linearOutput = true;
                this.drawPrimitive(state, renderpassConfiguration, drawable.primitive, drawable.node, this.viewProjectionMatrix);
            }

            // "blit" the multisampled opaque texture into the color buffer, which adds antialiasing
            this.webGl.context.bindFramebuffer(this.webGl.context.READ_FRAMEBUFFER, this.opaqueFramebufferMSAA);
            this.webGl.context.bindFramebuffer(this.webGl.context.DRAW_FRAMEBUFFER, this.opaqueFramebuffer);
            this.webGl.context.blitFramebuffer(0, 0, this.opaqueFramebufferWidth, this.opaqueFramebufferHeight, 0, 0, this.opaqueFramebufferWidth, this.opaqueFramebufferHeight, this.webGl.context.COLOR_BUFFER_BIT, this.webGl.context.NEAREST);

            // Create Framebuffer Mipmaps
            this.webGl.context.bindTexture(this.webGl.context.TEXTURE_2D, this.opaqueRenderTexture);

            this.webGl.context.generateMipmap(this.webGl.context.TEXTURE_2D);
        }

        // Render to canvas
        this.webGl.context.bindFramebuffer(this.webGl.context.FRAMEBUFFER, null);
        this.webGl.context.viewport(0, 0,  this.currentWidth, this.currentHeight);

        // Render environment
        const fragDefines = [];
        this.pushFragParameterDefines(fragDefines, state);
        this.environmentRenderer.drawEnvironmentMap(this.webGl, this.viewProjectionMatrix, state, this.shaderCache, fragDefines);

        for (const drawable of this.opaqueDrawables)
        {  
            let renderpassConfiguration = {};
            renderpassConfiguration.linearOutput = false;
            this.drawPrimitive(state, renderpassConfiguration, drawable.primitive, drawable.node, this.viewProjectionMatrix);
        }

        // filter materials with transmission extension
        this.transmissionDrawables = currentCamera.sortPrimitivesByDepth(state.gltf, this.transmissionDrawables);
        for (const drawable of this.transmissionDrawables.filter((a) => a.depth <= 0))
        {
            let renderpassConfiguration = {};
            renderpassConfiguration.linearOutput = false;
            this.drawPrimitive(state, renderpassConfiguration, drawable.primitive, drawable.node, this.viewProjectionMatrix, this.opaqueRenderTexture);
        }


        this.transparentDrawables = currentCamera.sortPrimitivesByDepth(state.gltf, this.transparentDrawables);
        for (const drawable of this.transparentDrawables.filter((a) => a.depth <= 0))
        {
            let renderpassConfiguration = {};
            renderpassConfiguration.linearOutput = false;
            this.drawPrimitive(state, renderpassConfiguration, drawable.primitive, drawable.node, this.viewProjectionMatrix);
        }
    }

    // vertices with given material
    drawPrimitive(state, renderpassConfiguration, primitive, node, viewProjectionMatrix, transmissionSampleTexture)
    {
        if (primitive.skip) return;

        let material;
        if(primitive.mappings !== undefined && state.variant != "default")
        {
            const names = state.gltf.variants.map(obj => obj.name);
            const idx = names.indexOf(state.variant);
            let materialIdx = primitive.material;
            primitive.mappings.forEach(element => {
                if(element.variants.indexOf(idx) >= 0)
                {
                    materialIdx = element.material;
                }
            });
            material = state.gltf.materials[materialIdx];
        }
        else
        {
            material = state.gltf.materials[primitive.material];
        }

        //select shader permutation, compile and link program.

        let vertDefines = [];
        this.pushVertParameterDefines(vertDefines, state.renderingParameters, state.gltf, node, primitive);
        vertDefines = primitive.getDefines().concat(vertDefines);

        let fragDefines = material.getDefines(state.renderingParameters).concat(vertDefines);
        if(renderpassConfiguration.linearOutput === true)
        {
            fragDefines.push("LINEAR_OUTPUT 1");
        }
        this.pushFragParameterDefines(fragDefines, state);
        
        const fragmentHash = this.shaderCache.selectShader(material.getShaderIdentifier(), fragDefines);
        const vertexHash = this.shaderCache.selectShader(primitive.getShaderIdentifier(), vertDefines);

        if (fragmentHash && vertexHash)
        {
            this.shader = this.shaderCache.getShaderProgram(fragmentHash, vertexHash);
        }

        if (this.shader === undefined)
        {
            return;
        }

        this.webGl.context.useProgram(this.shader.program);

        if (state.renderingParameters.usePunctual)
        {
            this.applyLights();
        }

        // update model dependant matrices once per node
        this.shader.updateUniform("u_ViewProjectionMatrix", viewProjectionMatrix);
        this.shader.updateUniform("u_ModelMatrix", node.worldTransform);
        this.shader.updateUniform("u_NormalMatrix", node.normalMatrix, false);
        this.shader.updateUniform("u_Exposure", state.renderingParameters.exposure, false);
        this.shader.updateUniform("u_Camera", this.currentCameraPosition, false);

        this.updateAnimationUniforms(state, node, primitive);

        if (determinant(node.worldTransform) < 0.0)
        {
            this.webGl.context.frontFace(GL.CW);
        }
        else
        {
            this.webGl.context.frontFace(GL.CCW);
        }

        if (material.doubleSided)
        {
            this.webGl.context.disable(GL.CULL_FACE);
        }
        else
        {
            this.webGl.context.enable(GL.CULL_FACE);
        }

        if (material.alphaMode === 'BLEND')
        {
            this.webGl.context.enable(GL.BLEND);
            this.webGl.context.blendFuncSeparate(GL.SRC_ALPHA, GL.ONE_MINUS_SRC_ALPHA, GL.ONE, GL.ONE_MINUS_SRC_ALPHA);
            this.webGl.context.blendEquation(GL.FUNC_ADD);
        }
        else
        {
            this.webGl.context.disable(GL.BLEND);
        }

        const drawIndexed = primitive.indices !== undefined;
        if (drawIndexed)
        {
            if (!this.webGl.setIndices(state.gltf, primitive.indices))
            {
                return;
            }
        }

        let vertexCount = 0;
        for (const attribute of primitive.glAttributes)
        {
            const gltfAccessor = state.gltf.accessors[attribute.accessor];
            vertexCount = gltfAccessor.count;

            const location = this.shader.getAttributeLocation(attribute.name);
            if (location < 0)
            {
                continue; // only skip this attribute
            }
            if (!this.webGl.enableAttribute(state.gltf, location, gltfAccessor))
            {
                return; // skip this primitive
            }
        }

        for (let [uniform, val] of material.getProperties().entries())
        {
            this.shader.updateUniform(uniform, val, false);
        }

        let textureIndex = 0;
        for (; textureIndex < material.textures.length; ++textureIndex)
        {
            let info = material.textures[textureIndex];
            const location = this.shader.getUniformLocation(info.samplerName);

            if (location < 0)
            {
                console.log("Unable to find uniform location of "+info.samplerName);
                continue; // only skip this texture
            }
            if (!this.webGl.setTexture(location, state.gltf, info, textureIndex)) // binds texture and sampler
            {
                return; // skip this material
            }
        }

        // set the morph target texture
        if (primitive.morphTargetTextureInfo !== undefined) 
        {
            const location = this.shader.getUniformLocation(primitive.morphTargetTextureInfo.samplerName);
            if (location < 0)
            {
                console.log("Unable to find uniform location of " + primitive.morphTargetTextureInfo.samplerName);
            }

            this.webGl.setTexture(location, state.gltf, primitive.morphTargetTextureInfo, textureIndex); // binds texture and sampler
            textureIndex++;
        }

        // set the joints texture
        if (state.renderingParameters.skinning && node.skin !== undefined && primitive.hasWeights && primitive.hasJoints) 
        {
            const skin = state.gltf.skins[node.skin];
            const location = this.shader.getUniformLocation(skin.jointTextureInfo.samplerName);
            if (location < 0)
            {
                console.log("Unable to find uniform location of " + skin.jointTextureInfo.samplerName);
            }

            this.webGl.setTexture(location, state.gltf, skin.jointTextureInfo, textureIndex); // binds texture and sampler
            textureIndex++;
        }

        let textureCount = textureIndex;
        if (state.renderingParameters.useIBL && state.environment !== undefined)
        {
            textureCount = this.applyEnvironmentMap(state, textureCount);
        }

        if (state.renderingParameters.usePunctual && state.environment !== undefined)
        {
            this.webGl.setTexture(this.shader.getUniformLocation("u_SheenELUT"), state.environment, state.environment.sheenELUT, textureCount++);
        }

        if(transmissionSampleTexture !== undefined && state.renderingParameters.useIBL
                    && state.environment && state.renderingParameters.enabledExtensions.KHR_materials_transmission)
        {
            this.webGl.context.activeTexture(GL.TEXTURE0 + textureCount);
            this.webGl.context.bindTexture(this.webGl.context.TEXTURE_2D, this.opaqueRenderTexture);
            this.webGl.context.uniform1i(this.shader.getUniformLocation("u_TransmissionFramebufferSampler"), textureCount);
            textureCount++;

            this.webGl.context.uniform2i(this.shader.getUniformLocation("u_TransmissionFramebufferSize"), this.opaqueFramebufferWidth, this.opaqueFramebufferHeight);

            this.webGl.context.uniformMatrix4fv(this.shader.getUniformLocation("u_ModelMatrix"),false, node.worldTransform);
            this.webGl.context.uniformMatrix4fv(this.shader.getUniformLocation("u_ViewMatrix"),false, this.viewMatrix);
            this.webGl.context.uniformMatrix4fv(this.shader.getUniformLocation("u_ProjectionMatrix"),false, this.projMatrix);
        }

        if (drawIndexed)
        {
            const indexAccessor = state.gltf.accessors[primitive.indices];
            this.webGl.context.drawElements(primitive.mode, indexAccessor.count, indexAccessor.componentType, 0);
        }
        else
        {
            this.webGl.context.drawArrays(primitive.mode, 0, vertexCount);
        }

        for (const attribute of primitive.glAttributes)
        {
            const location = this.shader.getAttributeLocation(attribute.name);
            if (location < 0)
            {
                continue; // skip this attribute
            }
            this.webGl.context.disableVertexAttribArray(location);
        }
    }

    /// Compute a list of lights instantiated by one or more nodes as a list of node-light tuples.
    getVisibleLights(gltf, nodes)
    {
        let nodeLights = [];

        for (const nodeIndex of nodes) {
            const node = gltf.nodes[nodeIndex];

            if (node.children !== undefined) {
                nodeLights = nodeLights.concat(this.getVisibleLights(gltf, node.children));
            }

            const lightIndex = node.extensions?.KHR_lights_punctual?.light;
            if (lightIndex === undefined) {
                continue;
            }
            const light = gltf.lights[lightIndex];
            nodeLights.push([node, light]);
        }

        return nodeLights;
    }

    updateSkin(state, node)
    {
        if (state.renderingParameters.skinning && state.gltf.skins !== undefined)
        {
            const skin = state.gltf.skins[node.skin];
            skin.computeJoints(state.gltf, node, this.webGl.context);
        }
    }

    pushVertParameterDefines(vertDefines, parameters, gltf, node, primitive)
    {
        // skinning
        if (parameters.skinning && node.skin !== undefined && primitive.hasWeights && primitive.hasJoints)
        {
            vertDefines.push("USE_SKINNING 1");
        }

        // morphing
        if (parameters.morphing && node.mesh !== undefined && primitive.targets.length > 0)
        {
            const mesh = gltf.meshes[node.mesh];
            if (mesh.getWeightsAnimated() !== undefined && mesh.getWeightsAnimated().length > 0)
            {
                vertDefines.push("USE_MORPHING 1");
                vertDefines.push("WEIGHT_COUNT " + mesh.getWeightsAnimated().length);
            }
        }
    }

    updateAnimationUniforms(state, node, primitive)
    {
        if (state.renderingParameters.morphing && node.mesh !== undefined && primitive.targets.length > 0)
        {
            const mesh = state.gltf.meshes[node.mesh];
            const weightsAnimated = mesh.getWeightsAnimated();
            if (weightsAnimated !== undefined && weightsAnimated.length > 0)
            {
                this.shader.updateUniformArray("u_morphWeights", weightsAnimated);
            }
        }
    }

    pushFragParameterDefines(fragDefines, state)
    {
        if (state.renderingParameters.usePunctual)
        {
            fragDefines.push("USE_PUNCTUAL 1");
            fragDefines.push(`LIGHT_COUNT ${this.visibleLights.length}`);
        }

        if (state.renderingParameters.useIBL && state.environment)
        {
            fragDefines.push("USE_IBL 1");
        }

        switch (state.renderingParameters.toneMap)
        {
        case (GltfState.ToneMaps.ACES_NARKOWICZ):
            fragDefines.push("TONEMAP_ACES_NARKOWICZ 1");
            break;
        case (GltfState.ToneMaps.ACES_HILL):
            fragDefines.push("TONEMAP_ACES_HILL 1");
            break;
        case (GltfState.ToneMaps.ACES_HILL_EXPOSURE_BOOST):
            fragDefines.push("TONEMAP_ACES_HILL_EXPOSURE_BOOST 1");
            break;
        case (GltfState.ToneMaps.NONE):
        }

        let debugOutputMapping = [
            {debugOutput: GltfState.DebugOutput.NONE, shaderDefine: "DEBUG_NONE"},
            
            {debugOutput: GltfState.DebugOutput.generic.WORLDSPACENORMAL, shaderDefine: "DEBUG_NORMAL_SHADING"},
            {debugOutput: GltfState.DebugOutput.generic.NORMAL, shaderDefine: "DEBUG_NORMAL_TEXTURE"},
            {debugOutput: GltfState.DebugOutput.generic.GEOMETRYNORMAL, shaderDefine: "DEBUG_NORMAL_GEOMETRY"},
            {debugOutput: GltfState.DebugOutput.generic.TANGENT, shaderDefine: "DEBUG_TANGENT"},
            {debugOutput: GltfState.DebugOutput.generic.BITANGENT, shaderDefine: "DEBUG_BITANGENT"},
            {debugOutput: GltfState.DebugOutput.generic.ALPHA, shaderDefine: "DEBUG_ALPHA"},
            {debugOutput: GltfState.DebugOutput.generic.UV_COORDS_0, shaderDefine: "DEBUG_UV_0"},
            {debugOutput: GltfState.DebugOutput.generic.UV_COORDS_1, shaderDefine: "DEBUG_UV_1"},
            {debugOutput: GltfState.DebugOutput.generic.OCCLUSION, shaderDefine: "DEBUG_OCCLUSION"},
            {debugOutput: GltfState.DebugOutput.generic.EMISSIVE, shaderDefine: "DEBUG_EMISSIVE"},

            {debugOutput: GltfState.DebugOutput.mr.METALLIC_ROUGHNESS, shaderDefine: "DEBUG_METALLIC_ROUGHNESS"},
            {debugOutput: GltfState.DebugOutput.mr.BASECOLOR, shaderDefine: "DEBUG_BASE_COLOR"},
            {debugOutput: GltfState.DebugOutput.mr.ROUGHNESS, shaderDefine: "DEBUG_ROUGHNESS"},
            {debugOutput: GltfState.DebugOutput.mr.METALLIC, shaderDefine: "DEBUG_METALLIC"},
            
            {debugOutput: GltfState.DebugOutput.clearcoat.CLEARCOAT, shaderDefine: "DEBUG_CLEARCOAT"},
            {debugOutput: GltfState.DebugOutput.clearcoat.CLEARCOAT_FACTOR, shaderDefine: "DEBUG_CLEARCOAT_FACTOR"},
            {debugOutput: GltfState.DebugOutput.clearcoat.CLEARCOAT_ROUGHNESS, shaderDefine: "DEBUG_CLEARCOAT_ROUGHNESS"},
            {debugOutput: GltfState.DebugOutput.clearcoat.CLEARCOAT_NORMAL, shaderDefine: "DEBUG_CLEARCOAT_NORMAL"},
            
            {debugOutput: GltfState.DebugOutput.sheen.SHEEN, shaderDefine: "DEBUG_SHEEN"},
            {debugOutput: GltfState.DebugOutput.sheen.SHEEN_COLOR, shaderDefine: "DEBUG_SHEEN_COLOR"},
            {debugOutput: GltfState.DebugOutput.sheen.SHEEN_ROUGHNESS, shaderDefine: "DEBUG_SHEEN_ROUGHNESS"},

            {debugOutput: GltfState.DebugOutput.specular.SPECULAR, shaderDefine: "DEBUG_SPECULAR"},
            {debugOutput: GltfState.DebugOutput.specular.SPECULAR_FACTOR, shaderDefine: "DEBUG_SPECULAR_FACTOR"},
            {debugOutput: GltfState.DebugOutput.specular.SPECULAR_COLOR, shaderDefine: "DEBUG_SPECULAR_COLOR"},

            {debugOutput: GltfState.DebugOutput.transmission.TRANSMISSION_VOLUME, shaderDefine: "DEBUG_TRANSMISSION_VOLUME"},
            {debugOutput: GltfState.DebugOutput.transmission.TRANSMISSION_FACTOR, shaderDefine: "DEBUG_TRANSMISSION_FACTOR"},
            {debugOutput: GltfState.DebugOutput.transmission.VOLUME_THICKNESS, shaderDefine: "DEBUG_VOLUME_THICKNESS"},

            {debugOutput: GltfState.DebugOutput.iridescence.IRIDESCENCE, shaderDefine: "DEBUG_IRIDESCENCE"},
            {debugOutput: GltfState.DebugOutput.iridescence.IRIDESCENCE_FACTOR, shaderDefine: "DEBUG_IRIDESCENCE_FACTOR"},
            {debugOutput: GltfState.DebugOutput.iridescence.IRIDESCENCE_THICKNESS, shaderDefine: "DEBUG_IRIDESCENCE_THICKNESS"},
        ];

        let mappingCount = 0;
        let mappingFound = false;
        for (let mapping of debugOutputMapping) {
            fragDefines.push(mapping.shaderDefine+" "+mappingCount++);
            if(state.renderingParameters.debugOutput == mapping.debugOutput){
                fragDefines.push("DEBUG "+mapping.shaderDefine);
                mappingFound = true;
            }
        }

        if(mappingFound == false) { // fallback
            fragDefines.push("DEBUG DEBUG_NONE");
        }

    }

    applyLights()
    {
        const uniforms = [];
        for (const [node, light] of this.visibleLights)
        {
            uniforms.push(light.toUniform(node));
        }
        if (uniforms.length > 0)
        {
            this.shader.updateUniform("u_Lights", uniforms);
        }
    }

    applyEnvironmentMap(state, texSlotOffset)
    {
        const environment = state.environment;
        this.webGl.setTexture(this.shader.getUniformLocation("u_LambertianEnvSampler"), environment, environment.diffuseEnvMap, texSlotOffset++);

        this.webGl.setTexture(this.shader.getUniformLocation("u_GGXEnvSampler"), environment, environment.specularEnvMap, texSlotOffset++);
        this.webGl.setTexture(this.shader.getUniformLocation("u_GGXLUT"), environment, environment.lut, texSlotOffset++);

        this.webGl.setTexture(this.shader.getUniformLocation("u_CharlieEnvSampler"), environment, environment.sheenEnvMap, texSlotOffset++);
        this.webGl.setTexture(this.shader.getUniformLocation("u_CharlieLUT"), environment, environment.sheenLUT, texSlotOffset++);

        this.shader.updateUniform("u_MipCount", environment.mipCount);

        let rotMatrix4 = create$3();
        rotateY(rotMatrix4, rotMatrix4,  state.renderingParameters.environmentRotation / 180.0 * Math.PI);
        let rotMatrix3 = create$4();
        fromMat4(rotMatrix3, rotMatrix4);
        this.shader.updateUniform("u_EnvRotation", rotMatrix3);

        this.shader.updateUniform("u_EnvIntensity", state.renderingParameters.iblIntensity);

        return texSlotOffset;
    }

    destroy()
    {
        this.shaderCache.destroy();
    }
}

function getDefaultExportFromCjs (x) {
	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
}

var axios$3 = {exports: {}};

var axios$2 = {exports: {}};

var bind$2 = function bind(fn, thisArg) {
  return function wrap() {
    var args = new Array(arguments.length);
    for (var i = 0; i < args.length; i++) {
      args[i] = arguments[i];
    }
    return fn.apply(thisArg, args);
  };
};

var bind$1 = bind$2;

// utils is a library of generic helper functions non-specific to axios

var toString$2 = Object.prototype.toString;

/**
 * Determine if a value is an Array
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is an Array, otherwise false
 */
function isArray(val) {
  return toString$2.call(val) === '[object Array]';
}

/**
 * Determine if a value is undefined
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if the value is undefined, otherwise false
 */
function isUndefined(val) {
  return typeof val === 'undefined';
}

/**
 * Determine if a value is a Buffer
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a Buffer, otherwise false
 */
function isBuffer(val) {
  return val !== null && !isUndefined(val) && val.constructor !== null && !isUndefined(val.constructor)
    && typeof val.constructor.isBuffer === 'function' && val.constructor.isBuffer(val);
}

/**
 * Determine if a value is an ArrayBuffer
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is an ArrayBuffer, otherwise false
 */
function isArrayBuffer(val) {
  return toString$2.call(val) === '[object ArrayBuffer]';
}

/**
 * Determine if a value is a FormData
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is an FormData, otherwise false
 */
function isFormData(val) {
  return (typeof FormData !== 'undefined') && (val instanceof FormData);
}

/**
 * Determine if a value is a view on an ArrayBuffer
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a view on an ArrayBuffer, otherwise false
 */
function isArrayBufferView(val) {
  var result;
  if ((typeof ArrayBuffer !== 'undefined') && (ArrayBuffer.isView)) {
    result = ArrayBuffer.isView(val);
  } else {
    result = (val) && (val.buffer) && (val.buffer instanceof ArrayBuffer);
  }
  return result;
}

/**
 * Determine if a value is a String
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a String, otherwise false
 */
function isString(val) {
  return typeof val === 'string';
}

/**
 * Determine if a value is a Number
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a Number, otherwise false
 */
function isNumber(val) {
  return typeof val === 'number';
}

/**
 * Determine if a value is an Object
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is an Object, otherwise false
 */
function isObject(val) {
  return val !== null && typeof val === 'object';
}

/**
 * Determine if a value is a plain Object
 *
 * @param {Object} val The value to test
 * @return {boolean} True if value is a plain Object, otherwise false
 */
function isPlainObject(val) {
  if (toString$2.call(val) !== '[object Object]') {
    return false;
  }

  var prototype = Object.getPrototypeOf(val);
  return prototype === null || prototype === Object.prototype;
}

/**
 * Determine if a value is a Date
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a Date, otherwise false
 */
function isDate(val) {
  return toString$2.call(val) === '[object Date]';
}

/**
 * Determine if a value is a File
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a File, otherwise false
 */
function isFile(val) {
  return toString$2.call(val) === '[object File]';
}

/**
 * Determine if a value is a Blob
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a Blob, otherwise false
 */
function isBlob(val) {
  return toString$2.call(val) === '[object Blob]';
}

/**
 * Determine if a value is a Function
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a Function, otherwise false
 */
function isFunction(val) {
  return toString$2.call(val) === '[object Function]';
}

/**
 * Determine if a value is a Stream
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a Stream, otherwise false
 */
function isStream(val) {
  return isObject(val) && isFunction(val.pipe);
}

/**
 * Determine if a value is a URLSearchParams object
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a URLSearchParams object, otherwise false
 */
function isURLSearchParams(val) {
  return typeof URLSearchParams !== 'undefined' && val instanceof URLSearchParams;
}

/**
 * Trim excess whitespace off the beginning and end of a string
 *
 * @param {String} str The String to trim
 * @returns {String} The String freed of excess whitespace
 */
function trim(str) {
  return str.trim ? str.trim() : str.replace(/^\s+|\s+$/g, '');
}

/**
 * Determine if we're running in a standard browser environment
 *
 * This allows axios to run in a web worker, and react-native.
 * Both environments support XMLHttpRequest, but not fully standard globals.
 *
 * web workers:
 *  typeof window -> undefined
 *  typeof document -> undefined
 *
 * react-native:
 *  navigator.product -> 'ReactNative'
 * nativescript
 *  navigator.product -> 'NativeScript' or 'NS'
 */
function isStandardBrowserEnv() {
  if (typeof navigator !== 'undefined' && (navigator.product === 'ReactNative' ||
                                           navigator.product === 'NativeScript' ||
                                           navigator.product === 'NS')) {
    return false;
  }
  return (
    typeof window !== 'undefined' &&
    typeof document !== 'undefined'
  );
}

/**
 * Iterate over an Array or an Object invoking a function for each item.
 *
 * If `obj` is an Array callback will be called passing
 * the value, index, and complete array for each item.
 *
 * If 'obj' is an Object callback will be called passing
 * the value, key, and complete object for each property.
 *
 * @param {Object|Array} obj The object to iterate
 * @param {Function} fn The callback to invoke for each item
 */
function forEach(obj, fn) {
  // Don't bother if no value provided
  if (obj === null || typeof obj === 'undefined') {
    return;
  }

  // Force an array if not already something iterable
  if (typeof obj !== 'object') {
    /*eslint no-param-reassign:0*/
    obj = [obj];
  }

  if (isArray(obj)) {
    // Iterate over array values
    for (var i = 0, l = obj.length; i < l; i++) {
      fn.call(null, obj[i], i, obj);
    }
  } else {
    // Iterate over object keys
    for (var key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        fn.call(null, obj[key], key, obj);
      }
    }
  }
}

/**
 * Accepts varargs expecting each argument to be an object, then
 * immutably merges the properties of each object and returns result.
 *
 * When multiple objects contain the same key the later object in
 * the arguments list will take precedence.
 *
 * Example:
 *
 * ```js
 * var result = merge({foo: 123}, {foo: 456});
 * console.log(result.foo); // outputs 456
 * ```
 *
 * @param {Object} obj1 Object to merge
 * @returns {Object} Result of all merge properties
 */
function merge(/* obj1, obj2, obj3, ... */) {
  var result = {};
  function assignValue(val, key) {
    if (isPlainObject(result[key]) && isPlainObject(val)) {
      result[key] = merge(result[key], val);
    } else if (isPlainObject(val)) {
      result[key] = merge({}, val);
    } else if (isArray(val)) {
      result[key] = val.slice();
    } else {
      result[key] = val;
    }
  }

  for (var i = 0, l = arguments.length; i < l; i++) {
    forEach(arguments[i], assignValue);
  }
  return result;
}

/**
 * Extends object a by mutably adding to it the properties of object b.
 *
 * @param {Object} a The object to be extended
 * @param {Object} b The object to copy properties from
 * @param {Object} thisArg The object to bind function to
 * @return {Object} The resulting value of object a
 */
function extend(a, b, thisArg) {
  forEach(b, function assignValue(val, key) {
    if (thisArg && typeof val === 'function') {
      a[key] = bind$1(val, thisArg);
    } else {
      a[key] = val;
    }
  });
  return a;
}

/**
 * Remove byte order marker. This catches EF BB BF (the UTF-8 BOM)
 *
 * @param {string} content with BOM
 * @return {string} content value without BOM
 */
function stripBOM(content) {
  if (content.charCodeAt(0) === 0xFEFF) {
    content = content.slice(1);
  }
  return content;
}

var utils$8 = {
  isArray: isArray,
  isArrayBuffer: isArrayBuffer,
  isBuffer: isBuffer,
  isFormData: isFormData,
  isArrayBufferView: isArrayBufferView,
  isString: isString,
  isNumber: isNumber,
  isObject: isObject,
  isPlainObject: isPlainObject,
  isUndefined: isUndefined,
  isDate: isDate,
  isFile: isFile,
  isBlob: isBlob,
  isFunction: isFunction,
  isStream: isStream,
  isURLSearchParams: isURLSearchParams,
  isStandardBrowserEnv: isStandardBrowserEnv,
  forEach: forEach,
  merge: merge,
  extend: extend,
  trim: trim,
  stripBOM: stripBOM
};

var utils$7 = utils$8;

function encode$2(val) {
  return encodeURIComponent(val).
    replace(/%3A/gi, ':').
    replace(/%24/g, '$').
    replace(/%2C/gi, ',').
    replace(/%20/g, '+').
    replace(/%5B/gi, '[').
    replace(/%5D/gi, ']');
}

/**
 * Build a URL by appending params to the end
 *
 * @param {string} url The base of the url (e.g., http://www.google.com)
 * @param {object} [params] The params to be appended
 * @returns {string} The formatted url
 */
var buildURL$1 = function buildURL(url, params, paramsSerializer) {
  /*eslint no-param-reassign:0*/
  if (!params) {
    return url;
  }

  var serializedParams;
  if (paramsSerializer) {
    serializedParams = paramsSerializer(params);
  } else if (utils$7.isURLSearchParams(params)) {
    serializedParams = params.toString();
  } else {
    var parts = [];

    utils$7.forEach(params, function serialize(val, key) {
      if (val === null || typeof val === 'undefined') {
        return;
      }

      if (utils$7.isArray(val)) {
        key = key + '[]';
      } else {
        val = [val];
      }

      utils$7.forEach(val, function parseValue(v) {
        if (utils$7.isDate(v)) {
          v = v.toISOString();
        } else if (utils$7.isObject(v)) {
          v = JSON.stringify(v);
        }
        parts.push(encode$2(key) + '=' + encode$2(v));
      });
    });

    serializedParams = parts.join('&');
  }

  if (serializedParams) {
    var hashmarkIndex = url.indexOf('#');
    if (hashmarkIndex !== -1) {
      url = url.slice(0, hashmarkIndex);
    }

    url += (url.indexOf('?') === -1 ? '?' : '&') + serializedParams;
  }

  return url;
};

var utils$6 = utils$8;

function InterceptorManager$1() {
  this.handlers = [];
}

/**
 * Add a new interceptor to the stack
 *
 * @param {Function} fulfilled The function to handle `then` for a `Promise`
 * @param {Function} rejected The function to handle `reject` for a `Promise`
 *
 * @return {Number} An ID used to remove interceptor later
 */
InterceptorManager$1.prototype.use = function use(fulfilled, rejected, options) {
  this.handlers.push({
    fulfilled: fulfilled,
    rejected: rejected,
    synchronous: options ? options.synchronous : false,
    runWhen: options ? options.runWhen : null
  });
  return this.handlers.length - 1;
};

/**
 * Remove an interceptor from the stack
 *
 * @param {Number} id The ID that was returned by `use`
 */
InterceptorManager$1.prototype.eject = function eject(id) {
  if (this.handlers[id]) {
    this.handlers[id] = null;
  }
};

/**
 * Iterate over all the registered interceptors
 *
 * This method is particularly useful for skipping over any
 * interceptors that may have become `null` calling `eject`.
 *
 * @param {Function} fn The function to call for each interceptor
 */
InterceptorManager$1.prototype.forEach = function forEach(fn) {
  utils$6.forEach(this.handlers, function forEachHandler(h) {
    if (h !== null) {
      fn(h);
    }
  });
};

var InterceptorManager_1 = InterceptorManager$1;

var utils$5 = utils$8;

var normalizeHeaderName = function normalizeHeaderName(headers, normalizedName) {
  utils$5.forEach(headers, function processHeader(value, name) {
    if (name !== normalizedName && name.toUpperCase() === normalizedName.toUpperCase()) {
      headers[normalizedName] = value;
      delete headers[name];
    }
  });
};

/**
 * Update an Error with the specified config, error code, and response.
 *
 * @param {Error} error The error to update.
 * @param {Object} config The config.
 * @param {string} [code] The error code (for example, 'ECONNABORTED').
 * @param {Object} [request] The request.
 * @param {Object} [response] The response.
 * @returns {Error} The error.
 */
var enhanceError = function enhanceError(error, config, code, request, response) {
  error.config = config;
  if (code) {
    error.code = code;
  }

  error.request = request;
  error.response = response;
  error.isAxiosError = true;

  error.toJSON = function toJSON() {
    return {
      // Standard
      message: this.message,
      name: this.name,
      // Microsoft
      description: this.description,
      number: this.number,
      // Mozilla
      fileName: this.fileName,
      lineNumber: this.lineNumber,
      columnNumber: this.columnNumber,
      stack: this.stack,
      // Axios
      config: this.config,
      code: this.code,
      status: this.response && this.response.status ? this.response.status : null
    };
  };
  return error;
};

var createError;
var hasRequiredCreateError;

function requireCreateError () {
	if (hasRequiredCreateError) return createError;
	hasRequiredCreateError = 1;

	var enhanceError$1 = enhanceError;

	/**
	 * Create an Error with the specified message, config, error code, request and response.
	 *
	 * @param {string} message The error message.
	 * @param {Object} config The config.
	 * @param {string} [code] The error code (for example, 'ECONNABORTED').
	 * @param {Object} [request] The request.
	 * @param {Object} [response] The response.
	 * @returns {Error} The created error.
	 */
	createError = function createError(message, config, code, request, response) {
	  var error = new Error(message);
	  return enhanceError$1(error, config, code, request, response);
	};
	return createError;
}

var settle;
var hasRequiredSettle;

function requireSettle () {
	if (hasRequiredSettle) return settle;
	hasRequiredSettle = 1;

	var createError = requireCreateError();

	/**
	 * Resolve or reject a Promise based on response status.
	 *
	 * @param {Function} resolve A function that resolves the promise.
	 * @param {Function} reject A function that rejects the promise.
	 * @param {object} response The response.
	 */
	settle = function settle(resolve, reject, response) {
	  var validateStatus = response.config.validateStatus;
	  if (!response.status || !validateStatus || validateStatus(response.status)) {
	    resolve(response);
	  } else {
	    reject(createError(
	      'Request failed with status code ' + response.status,
	      response.config,
	      null,
	      response.request,
	      response
	    ));
	  }
	};
	return settle;
}

var cookies;
var hasRequiredCookies;

function requireCookies () {
	if (hasRequiredCookies) return cookies;
	hasRequiredCookies = 1;

	var utils = utils$8;

	cookies = (
	  utils.isStandardBrowserEnv() ?

	  // Standard browser envs support document.cookie
	    (function standardBrowserEnv() {
	      return {
	        write: function write(name, value, expires, path, domain, secure) {
	          var cookie = [];
	          cookie.push(name + '=' + encodeURIComponent(value));

	          if (utils.isNumber(expires)) {
	            cookie.push('expires=' + new Date(expires).toGMTString());
	          }

	          if (utils.isString(path)) {
	            cookie.push('path=' + path);
	          }

	          if (utils.isString(domain)) {
	            cookie.push('domain=' + domain);
	          }

	          if (secure === true) {
	            cookie.push('secure');
	          }

	          document.cookie = cookie.join('; ');
	        },

	        read: function read(name) {
	          var match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'));
	          return (match ? decodeURIComponent(match[3]) : null);
	        },

	        remove: function remove(name) {
	          this.write(name, '', Date.now() - 86400000);
	        }
	      };
	    })() :

	  // Non standard browser env (web workers, react-native) lack needed support.
	    (function nonStandardBrowserEnv() {
	      return {
	        write: function write() {},
	        read: function read() { return null; },
	        remove: function remove() {}
	      };
	    })()
	);
	return cookies;
}

var isAbsoluteURL;
var hasRequiredIsAbsoluteURL;

function requireIsAbsoluteURL () {
	if (hasRequiredIsAbsoluteURL) return isAbsoluteURL;
	hasRequiredIsAbsoluteURL = 1;

	/**
	 * Determines whether the specified URL is absolute
	 *
	 * @param {string} url The URL to test
	 * @returns {boolean} True if the specified URL is absolute, otherwise false
	 */
	isAbsoluteURL = function isAbsoluteURL(url) {
	  // A URL is considered absolute if it begins with "<scheme>://" or "//" (protocol-relative URL).
	  // RFC 3986 defines scheme name as a sequence of characters beginning with a letter and followed
	  // by any combination of letters, digits, plus, period, or hyphen.
	  return /^([a-z][a-z\d\+\-\.]*:)?\/\//i.test(url);
	};
	return isAbsoluteURL;
}

var combineURLs;
var hasRequiredCombineURLs;

function requireCombineURLs () {
	if (hasRequiredCombineURLs) return combineURLs;
	hasRequiredCombineURLs = 1;

	/**
	 * Creates a new URL by combining the specified URLs
	 *
	 * @param {string} baseURL The base URL
	 * @param {string} relativeURL The relative URL
	 * @returns {string} The combined URL
	 */
	combineURLs = function combineURLs(baseURL, relativeURL) {
	  return relativeURL
	    ? baseURL.replace(/\/+$/, '') + '/' + relativeURL.replace(/^\/+/, '')
	    : baseURL;
	};
	return combineURLs;
}

var buildFullPath;
var hasRequiredBuildFullPath;

function requireBuildFullPath () {
	if (hasRequiredBuildFullPath) return buildFullPath;
	hasRequiredBuildFullPath = 1;

	var isAbsoluteURL = requireIsAbsoluteURL();
	var combineURLs = requireCombineURLs();

	/**
	 * Creates a new URL by combining the baseURL with the requestedURL,
	 * only when the requestedURL is not already an absolute URL.
	 * If the requestURL is absolute, this function returns the requestedURL untouched.
	 *
	 * @param {string} baseURL The base URL
	 * @param {string} requestedURL Absolute or relative URL to combine
	 * @returns {string} The combined full path
	 */
	buildFullPath = function buildFullPath(baseURL, requestedURL) {
	  if (baseURL && !isAbsoluteURL(requestedURL)) {
	    return combineURLs(baseURL, requestedURL);
	  }
	  return requestedURL;
	};
	return buildFullPath;
}

var parseHeaders;
var hasRequiredParseHeaders;

function requireParseHeaders () {
	if (hasRequiredParseHeaders) return parseHeaders;
	hasRequiredParseHeaders = 1;

	var utils = utils$8;

	// Headers whose duplicates are ignored by node
	// c.f. https://nodejs.org/api/http.html#http_message_headers
	var ignoreDuplicateOf = [
	  'age', 'authorization', 'content-length', 'content-type', 'etag',
	  'expires', 'from', 'host', 'if-modified-since', 'if-unmodified-since',
	  'last-modified', 'location', 'max-forwards', 'proxy-authorization',
	  'referer', 'retry-after', 'user-agent'
	];

	/**
	 * Parse headers into an object
	 *
	 * ```
	 * Date: Wed, 27 Aug 2014 08:58:49 GMT
	 * Content-Type: application/json
	 * Connection: keep-alive
	 * Transfer-Encoding: chunked
	 * ```
	 *
	 * @param {String} headers Headers needing to be parsed
	 * @returns {Object} Headers parsed into an object
	 */
	parseHeaders = function parseHeaders(headers) {
	  var parsed = {};
	  var key;
	  var val;
	  var i;

	  if (!headers) { return parsed; }

	  utils.forEach(headers.split('\n'), function parser(line) {
	    i = line.indexOf(':');
	    key = utils.trim(line.substr(0, i)).toLowerCase();
	    val = utils.trim(line.substr(i + 1));

	    if (key) {
	      if (parsed[key] && ignoreDuplicateOf.indexOf(key) >= 0) {
	        return;
	      }
	      if (key === 'set-cookie') {
	        parsed[key] = (parsed[key] ? parsed[key] : []).concat([val]);
	      } else {
	        parsed[key] = parsed[key] ? parsed[key] + ', ' + val : val;
	      }
	    }
	  });

	  return parsed;
	};
	return parseHeaders;
}

var isURLSameOrigin;
var hasRequiredIsURLSameOrigin;

function requireIsURLSameOrigin () {
	if (hasRequiredIsURLSameOrigin) return isURLSameOrigin;
	hasRequiredIsURLSameOrigin = 1;

	var utils = utils$8;

	isURLSameOrigin = (
	  utils.isStandardBrowserEnv() ?

	  // Standard browser envs have full support of the APIs needed to test
	  // whether the request URL is of the same origin as current location.
	    (function standardBrowserEnv() {
	      var msie = /(msie|trident)/i.test(navigator.userAgent);
	      var urlParsingNode = document.createElement('a');
	      var originURL;

	      /**
	    * Parse a URL to discover it's components
	    *
	    * @param {String} url The URL to be parsed
	    * @returns {Object}
	    */
	      function resolveURL(url) {
	        var href = url;

	        if (msie) {
	        // IE needs attribute set twice to normalize properties
	          urlParsingNode.setAttribute('href', href);
	          href = urlParsingNode.href;
	        }

	        urlParsingNode.setAttribute('href', href);

	        // urlParsingNode provides the UrlUtils interface - http://url.spec.whatwg.org/#urlutils
	        return {
	          href: urlParsingNode.href,
	          protocol: urlParsingNode.protocol ? urlParsingNode.protocol.replace(/:$/, '') : '',
	          host: urlParsingNode.host,
	          search: urlParsingNode.search ? urlParsingNode.search.replace(/^\?/, '') : '',
	          hash: urlParsingNode.hash ? urlParsingNode.hash.replace(/^#/, '') : '',
	          hostname: urlParsingNode.hostname,
	          port: urlParsingNode.port,
	          pathname: (urlParsingNode.pathname.charAt(0) === '/') ?
	            urlParsingNode.pathname :
	            '/' + urlParsingNode.pathname
	        };
	      }

	      originURL = resolveURL(window.location.href);

	      /**
	    * Determine if a URL shares the same origin as the current location
	    *
	    * @param {String} requestURL The URL to test
	    * @returns {boolean} True if URL shares the same origin, otherwise false
	    */
	      return function isURLSameOrigin(requestURL) {
	        var parsed = (utils.isString(requestURL)) ? resolveURL(requestURL) : requestURL;
	        return (parsed.protocol === originURL.protocol &&
	            parsed.host === originURL.host);
	      };
	    })() :

	  // Non standard browser envs (web workers, react-native) lack needed support.
	    (function nonStandardBrowserEnv() {
	      return function isURLSameOrigin() {
	        return true;
	      };
	    })()
	);
	return isURLSameOrigin;
}

var Cancel_1;
var hasRequiredCancel;

function requireCancel () {
	if (hasRequiredCancel) return Cancel_1;
	hasRequiredCancel = 1;

	/**
	 * A `Cancel` is an object that is thrown when an operation is canceled.
	 *
	 * @class
	 * @param {string=} message The message.
	 */
	function Cancel(message) {
	  this.message = message;
	}

	Cancel.prototype.toString = function toString() {
	  return 'Cancel' + (this.message ? ': ' + this.message : '');
	};

	Cancel.prototype.__CANCEL__ = true;

	Cancel_1 = Cancel;
	return Cancel_1;
}

var xhr;
var hasRequiredXhr;

function requireXhr () {
	if (hasRequiredXhr) return xhr;
	hasRequiredXhr = 1;

	var utils = utils$8;
	var settle = requireSettle();
	var cookies = requireCookies();
	var buildURL = buildURL$1;
	var buildFullPath = requireBuildFullPath();
	var parseHeaders = requireParseHeaders();
	var isURLSameOrigin = requireIsURLSameOrigin();
	var createError = requireCreateError();
	var defaults = requireDefaults();
	var Cancel = requireCancel();

	xhr = function xhrAdapter(config) {
	  return new Promise(function dispatchXhrRequest(resolve, reject) {
	    var requestData = config.data;
	    var requestHeaders = config.headers;
	    var responseType = config.responseType;
	    var onCanceled;
	    function done() {
	      if (config.cancelToken) {
	        config.cancelToken.unsubscribe(onCanceled);
	      }

	      if (config.signal) {
	        config.signal.removeEventListener('abort', onCanceled);
	      }
	    }

	    if (utils.isFormData(requestData)) {
	      delete requestHeaders['Content-Type']; // Let the browser set it
	    }

	    var request = new XMLHttpRequest();

	    // HTTP basic authentication
	    if (config.auth) {
	      var username = config.auth.username || '';
	      var password = config.auth.password ? unescape(encodeURIComponent(config.auth.password)) : '';
	      requestHeaders.Authorization = 'Basic ' + btoa(username + ':' + password);
	    }

	    var fullPath = buildFullPath(config.baseURL, config.url);
	    request.open(config.method.toUpperCase(), buildURL(fullPath, config.params, config.paramsSerializer), true);

	    // Set the request timeout in MS
	    request.timeout = config.timeout;

	    function onloadend() {
	      if (!request) {
	        return;
	      }
	      // Prepare the response
	      var responseHeaders = 'getAllResponseHeaders' in request ? parseHeaders(request.getAllResponseHeaders()) : null;
	      var responseData = !responseType || responseType === 'text' ||  responseType === 'json' ?
	        request.responseText : request.response;
	      var response = {
	        data: responseData,
	        status: request.status,
	        statusText: request.statusText,
	        headers: responseHeaders,
	        config: config,
	        request: request
	      };

	      settle(function _resolve(value) {
	        resolve(value);
	        done();
	      }, function _reject(err) {
	        reject(err);
	        done();
	      }, response);

	      // Clean up request
	      request = null;
	    }

	    if ('onloadend' in request) {
	      // Use onloadend if available
	      request.onloadend = onloadend;
	    } else {
	      // Listen for ready state to emulate onloadend
	      request.onreadystatechange = function handleLoad() {
	        if (!request || request.readyState !== 4) {
	          return;
	        }

	        // The request errored out and we didn't get a response, this will be
	        // handled by onerror instead
	        // With one exception: request that using file: protocol, most browsers
	        // will return status as 0 even though it's a successful request
	        if (request.status === 0 && !(request.responseURL && request.responseURL.indexOf('file:') === 0)) {
	          return;
	        }
	        // readystate handler is calling before onerror or ontimeout handlers,
	        // so we should call onloadend on the next 'tick'
	        setTimeout(onloadend);
	      };
	    }

	    // Handle browser request cancellation (as opposed to a manual cancellation)
	    request.onabort = function handleAbort() {
	      if (!request) {
	        return;
	      }

	      reject(createError('Request aborted', config, 'ECONNABORTED', request));

	      // Clean up request
	      request = null;
	    };

	    // Handle low level network errors
	    request.onerror = function handleError() {
	      // Real errors are hidden from us by the browser
	      // onerror should only fire if it's a network error
	      reject(createError('Network Error', config, null, request));

	      // Clean up request
	      request = null;
	    };

	    // Handle timeout
	    request.ontimeout = function handleTimeout() {
	      var timeoutErrorMessage = config.timeout ? 'timeout of ' + config.timeout + 'ms exceeded' : 'timeout exceeded';
	      var transitional = config.transitional || defaults.transitional;
	      if (config.timeoutErrorMessage) {
	        timeoutErrorMessage = config.timeoutErrorMessage;
	      }
	      reject(createError(
	        timeoutErrorMessage,
	        config,
	        transitional.clarifyTimeoutError ? 'ETIMEDOUT' : 'ECONNABORTED',
	        request));

	      // Clean up request
	      request = null;
	    };

	    // Add xsrf header
	    // This is only done if running in a standard browser environment.
	    // Specifically not if we're in a web worker, or react-native.
	    if (utils.isStandardBrowserEnv()) {
	      // Add xsrf header
	      var xsrfValue = (config.withCredentials || isURLSameOrigin(fullPath)) && config.xsrfCookieName ?
	        cookies.read(config.xsrfCookieName) :
	        undefined;

	      if (xsrfValue) {
	        requestHeaders[config.xsrfHeaderName] = xsrfValue;
	      }
	    }

	    // Add headers to the request
	    if ('setRequestHeader' in request) {
	      utils.forEach(requestHeaders, function setRequestHeader(val, key) {
	        if (typeof requestData === 'undefined' && key.toLowerCase() === 'content-type') {
	          // Remove Content-Type if data is undefined
	          delete requestHeaders[key];
	        } else {
	          // Otherwise add header to the request
	          request.setRequestHeader(key, val);
	        }
	      });
	    }

	    // Add withCredentials to request if needed
	    if (!utils.isUndefined(config.withCredentials)) {
	      request.withCredentials = !!config.withCredentials;
	    }

	    // Add responseType to request if needed
	    if (responseType && responseType !== 'json') {
	      request.responseType = config.responseType;
	    }

	    // Handle progress if needed
	    if (typeof config.onDownloadProgress === 'function') {
	      request.addEventListener('progress', config.onDownloadProgress);
	    }

	    // Not all browsers support upload events
	    if (typeof config.onUploadProgress === 'function' && request.upload) {
	      request.upload.addEventListener('progress', config.onUploadProgress);
	    }

	    if (config.cancelToken || config.signal) {
	      // Handle cancellation
	      // eslint-disable-next-line func-names
	      onCanceled = function(cancel) {
	        if (!request) {
	          return;
	        }
	        reject(!cancel || (cancel && cancel.type) ? new Cancel('canceled') : cancel);
	        request.abort();
	        request = null;
	      };

	      config.cancelToken && config.cancelToken.subscribe(onCanceled);
	      if (config.signal) {
	        config.signal.aborted ? onCanceled() : config.signal.addEventListener('abort', onCanceled);
	      }
	    }

	    if (!requestData) {
	      requestData = null;
	    }

	    // Send the request
	    request.send(requestData);
	  });
	};
	return xhr;
}

var defaults_1;
var hasRequiredDefaults;

function requireDefaults () {
	if (hasRequiredDefaults) return defaults_1;
	hasRequiredDefaults = 1;

	var utils = utils$8;
	var normalizeHeaderName$1 = normalizeHeaderName;
	var enhanceError$1 = enhanceError;

	var DEFAULT_CONTENT_TYPE = {
	  'Content-Type': 'application/x-www-form-urlencoded'
	};

	function setContentTypeIfUnset(headers, value) {
	  if (!utils.isUndefined(headers) && utils.isUndefined(headers['Content-Type'])) {
	    headers['Content-Type'] = value;
	  }
	}

	function getDefaultAdapter() {
	  var adapter;
	  if (typeof XMLHttpRequest !== 'undefined') {
	    // For browsers use XHR adapter
	    adapter = requireXhr();
	  } else if (typeof process !== 'undefined' && Object.prototype.toString.call(process) === '[object process]') {
	    // For node use HTTP adapter
	    adapter = requireXhr();
	  }
	  return adapter;
	}

	function stringifySafely(rawValue, parser, encoder) {
	  if (utils.isString(rawValue)) {
	    try {
	      (parser || JSON.parse)(rawValue);
	      return utils.trim(rawValue);
	    } catch (e) {
	      if (e.name !== 'SyntaxError') {
	        throw e;
	      }
	    }
	  }

	  return (encoder || JSON.stringify)(rawValue);
	}

	var defaults = {

	  transitional: {
	    silentJSONParsing: true,
	    forcedJSONParsing: true,
	    clarifyTimeoutError: false
	  },

	  adapter: getDefaultAdapter(),

	  transformRequest: [function transformRequest(data, headers) {
	    normalizeHeaderName$1(headers, 'Accept');
	    normalizeHeaderName$1(headers, 'Content-Type');

	    if (utils.isFormData(data) ||
	      utils.isArrayBuffer(data) ||
	      utils.isBuffer(data) ||
	      utils.isStream(data) ||
	      utils.isFile(data) ||
	      utils.isBlob(data)
	    ) {
	      return data;
	    }
	    if (utils.isArrayBufferView(data)) {
	      return data.buffer;
	    }
	    if (utils.isURLSearchParams(data)) {
	      setContentTypeIfUnset(headers, 'application/x-www-form-urlencoded;charset=utf-8');
	      return data.toString();
	    }
	    if (utils.isObject(data) || (headers && headers['Content-Type'] === 'application/json')) {
	      setContentTypeIfUnset(headers, 'application/json');
	      return stringifySafely(data);
	    }
	    return data;
	  }],

	  transformResponse: [function transformResponse(data) {
	    var transitional = this.transitional || defaults.transitional;
	    var silentJSONParsing = transitional && transitional.silentJSONParsing;
	    var forcedJSONParsing = transitional && transitional.forcedJSONParsing;
	    var strictJSONParsing = !silentJSONParsing && this.responseType === 'json';

	    if (strictJSONParsing || (forcedJSONParsing && utils.isString(data) && data.length)) {
	      try {
	        return JSON.parse(data);
	      } catch (e) {
	        if (strictJSONParsing) {
	          if (e.name === 'SyntaxError') {
	            throw enhanceError$1(e, this, 'E_JSON_PARSE');
	          }
	          throw e;
	        }
	      }
	    }

	    return data;
	  }],

	  /**
	   * A timeout in milliseconds to abort a request. If set to 0 (default) a
	   * timeout is not created.
	   */
	  timeout: 0,

	  xsrfCookieName: 'XSRF-TOKEN',
	  xsrfHeaderName: 'X-XSRF-TOKEN',

	  maxContentLength: -1,
	  maxBodyLength: -1,

	  validateStatus: function validateStatus(status) {
	    return status >= 200 && status < 300;
	  },

	  headers: {
	    common: {
	      'Accept': 'application/json, text/plain, */*'
	    }
	  }
	};

	utils.forEach(['delete', 'get', 'head'], function forEachMethodNoData(method) {
	  defaults.headers[method] = {};
	});

	utils.forEach(['post', 'put', 'patch'], function forEachMethodWithData(method) {
	  defaults.headers[method] = utils.merge(DEFAULT_CONTENT_TYPE);
	});

	defaults_1 = defaults;
	return defaults_1;
}

var utils$4 = utils$8;
var defaults$2 = requireDefaults();

/**
 * Transform the data for a request or a response
 *
 * @param {Object|String} data The data to be transformed
 * @param {Array} headers The headers for the request or response
 * @param {Array|Function} fns A single function or Array of functions
 * @returns {*} The resulting transformed data
 */
var transformData$1 = function transformData(data, headers, fns) {
  var context = this || defaults$2;
  /*eslint no-param-reassign:0*/
  utils$4.forEach(fns, function transform(fn) {
    data = fn.call(context, data, headers);
  });

  return data;
};

var isCancel$1;
var hasRequiredIsCancel;

function requireIsCancel () {
	if (hasRequiredIsCancel) return isCancel$1;
	hasRequiredIsCancel = 1;

	isCancel$1 = function isCancel(value) {
	  return !!(value && value.__CANCEL__);
	};
	return isCancel$1;
}

var utils$3 = utils$8;
var transformData = transformData$1;
var isCancel = requireIsCancel();
var defaults$1 = requireDefaults();
var Cancel = requireCancel();

/**
 * Throws a `Cancel` if cancellation has been requested.
 */
function throwIfCancellationRequested(config) {
  if (config.cancelToken) {
    config.cancelToken.throwIfRequested();
  }

  if (config.signal && config.signal.aborted) {
    throw new Cancel('canceled');
  }
}

/**
 * Dispatch a request to the server using the configured adapter.
 *
 * @param {object} config The config that is to be used for the request
 * @returns {Promise} The Promise to be fulfilled
 */
var dispatchRequest$1 = function dispatchRequest(config) {
  throwIfCancellationRequested(config);

  // Ensure headers exist
  config.headers = config.headers || {};

  // Transform request data
  config.data = transformData.call(
    config,
    config.data,
    config.headers,
    config.transformRequest
  );

  // Flatten headers
  config.headers = utils$3.merge(
    config.headers.common || {},
    config.headers[config.method] || {},
    config.headers
  );

  utils$3.forEach(
    ['delete', 'get', 'head', 'post', 'put', 'patch', 'common'],
    function cleanHeaderConfig(method) {
      delete config.headers[method];
    }
  );

  var adapter = config.adapter || defaults$1.adapter;

  return adapter(config).then(function onAdapterResolution(response) {
    throwIfCancellationRequested(config);

    // Transform response data
    response.data = transformData.call(
      config,
      response.data,
      response.headers,
      config.transformResponse
    );

    return response;
  }, function onAdapterRejection(reason) {
    if (!isCancel(reason)) {
      throwIfCancellationRequested(config);

      // Transform response data
      if (reason && reason.response) {
        reason.response.data = transformData.call(
          config,
          reason.response.data,
          reason.response.headers,
          config.transformResponse
        );
      }
    }

    return Promise.reject(reason);
  });
};

var utils$2 = utils$8;

/**
 * Config-specific merge-function which creates a new config-object
 * by merging two configuration objects together.
 *
 * @param {Object} config1
 * @param {Object} config2
 * @returns {Object} New object resulting from merging config2 to config1
 */
var mergeConfig$2 = function mergeConfig(config1, config2) {
  // eslint-disable-next-line no-param-reassign
  config2 = config2 || {};
  var config = {};

  function getMergedValue(target, source) {
    if (utils$2.isPlainObject(target) && utils$2.isPlainObject(source)) {
      return utils$2.merge(target, source);
    } else if (utils$2.isPlainObject(source)) {
      return utils$2.merge({}, source);
    } else if (utils$2.isArray(source)) {
      return source.slice();
    }
    return source;
  }

  // eslint-disable-next-line consistent-return
  function mergeDeepProperties(prop) {
    if (!utils$2.isUndefined(config2[prop])) {
      return getMergedValue(config1[prop], config2[prop]);
    } else if (!utils$2.isUndefined(config1[prop])) {
      return getMergedValue(undefined, config1[prop]);
    }
  }

  // eslint-disable-next-line consistent-return
  function valueFromConfig2(prop) {
    if (!utils$2.isUndefined(config2[prop])) {
      return getMergedValue(undefined, config2[prop]);
    }
  }

  // eslint-disable-next-line consistent-return
  function defaultToConfig2(prop) {
    if (!utils$2.isUndefined(config2[prop])) {
      return getMergedValue(undefined, config2[prop]);
    } else if (!utils$2.isUndefined(config1[prop])) {
      return getMergedValue(undefined, config1[prop]);
    }
  }

  // eslint-disable-next-line consistent-return
  function mergeDirectKeys(prop) {
    if (prop in config2) {
      return getMergedValue(config1[prop], config2[prop]);
    } else if (prop in config1) {
      return getMergedValue(undefined, config1[prop]);
    }
  }

  var mergeMap = {
    'url': valueFromConfig2,
    'method': valueFromConfig2,
    'data': valueFromConfig2,
    'baseURL': defaultToConfig2,
    'transformRequest': defaultToConfig2,
    'transformResponse': defaultToConfig2,
    'paramsSerializer': defaultToConfig2,
    'timeout': defaultToConfig2,
    'timeoutMessage': defaultToConfig2,
    'withCredentials': defaultToConfig2,
    'adapter': defaultToConfig2,
    'responseType': defaultToConfig2,
    'xsrfCookieName': defaultToConfig2,
    'xsrfHeaderName': defaultToConfig2,
    'onUploadProgress': defaultToConfig2,
    'onDownloadProgress': defaultToConfig2,
    'decompress': defaultToConfig2,
    'maxContentLength': defaultToConfig2,
    'maxBodyLength': defaultToConfig2,
    'transport': defaultToConfig2,
    'httpAgent': defaultToConfig2,
    'httpsAgent': defaultToConfig2,
    'cancelToken': defaultToConfig2,
    'socketPath': defaultToConfig2,
    'responseEncoding': defaultToConfig2,
    'validateStatus': mergeDirectKeys
  };

  utils$2.forEach(Object.keys(config1).concat(Object.keys(config2)), function computeConfigValue(prop) {
    var merge = mergeMap[prop] || mergeDeepProperties;
    var configValue = merge(prop);
    (utils$2.isUndefined(configValue) && merge !== mergeDirectKeys) || (config[prop] = configValue);
  });

  return config;
};

var data;
var hasRequiredData;

function requireData () {
	if (hasRequiredData) return data;
	hasRequiredData = 1;
	data = {
	  "version": "0.23.0"
	};
	return data;
}

var VERSION = requireData().version;

var validators$1 = {};

// eslint-disable-next-line func-names
['object', 'boolean', 'number', 'function', 'string', 'symbol'].forEach(function(type, i) {
  validators$1[type] = function validator(thing) {
    return typeof thing === type || 'a' + (i < 1 ? 'n ' : ' ') + type;
  };
});

var deprecatedWarnings = {};

/**
 * Transitional option validator
 * @param {function|boolean?} validator - set to false if the transitional option has been removed
 * @param {string?} version - deprecated version / removed since version
 * @param {string?} message - some message with additional info
 * @returns {function}
 */
validators$1.transitional = function transitional(validator, version, message) {
  function formatMessage(opt, desc) {
    return '[Axios v' + VERSION + '] Transitional option \'' + opt + '\'' + desc + (message ? '. ' + message : '');
  }

  // eslint-disable-next-line func-names
  return function(value, opt, opts) {
    if (validator === false) {
      throw new Error(formatMessage(opt, ' has been removed' + (version ? ' in ' + version : '')));
    }

    if (version && !deprecatedWarnings[opt]) {
      deprecatedWarnings[opt] = true;
      // eslint-disable-next-line no-console
      console.warn(
        formatMessage(
          opt,
          ' has been deprecated since v' + version + ' and will be removed in the near future'
        )
      );
    }

    return validator ? validator(value, opt, opts) : true;
  };
};

/**
 * Assert object's properties type
 * @param {object} options
 * @param {object} schema
 * @param {boolean?} allowUnknown
 */

function assertOptions(options, schema, allowUnknown) {
  if (typeof options !== 'object') {
    throw new TypeError('options must be an object');
  }
  var keys = Object.keys(options);
  var i = keys.length;
  while (i-- > 0) {
    var opt = keys[i];
    var validator = schema[opt];
    if (validator) {
      var value = options[opt];
      var result = value === undefined || validator(value, opt, options);
      if (result !== true) {
        throw new TypeError('option ' + opt + ' must be ' + result);
      }
      continue;
    }
    if (allowUnknown !== true) {
      throw Error('Unknown option ' + opt);
    }
  }
}

var validator$1 = {
  assertOptions: assertOptions,
  validators: validators$1
};

var utils$1 = utils$8;
var buildURL = buildURL$1;
var InterceptorManager = InterceptorManager_1;
var dispatchRequest = dispatchRequest$1;
var mergeConfig$1 = mergeConfig$2;
var validator = validator$1;

var validators = validator.validators;
/**
 * Create a new instance of Axios
 *
 * @param {Object} instanceConfig The default config for the instance
 */
function Axios$1(instanceConfig) {
  this.defaults = instanceConfig;
  this.interceptors = {
    request: new InterceptorManager(),
    response: new InterceptorManager()
  };
}

/**
 * Dispatch a request
 *
 * @param {Object} config The config specific for this request (merged with this.defaults)
 */
Axios$1.prototype.request = function request(config) {
  /*eslint no-param-reassign:0*/
  // Allow for axios('example/url'[, config]) a la fetch API
  if (typeof config === 'string') {
    config = arguments[1] || {};
    config.url = arguments[0];
  } else {
    config = config || {};
  }

  config = mergeConfig$1(this.defaults, config);

  // Set config.method
  if (config.method) {
    config.method = config.method.toLowerCase();
  } else if (this.defaults.method) {
    config.method = this.defaults.method.toLowerCase();
  } else {
    config.method = 'get';
  }

  var transitional = config.transitional;

  if (transitional !== undefined) {
    validator.assertOptions(transitional, {
      silentJSONParsing: validators.transitional(validators.boolean),
      forcedJSONParsing: validators.transitional(validators.boolean),
      clarifyTimeoutError: validators.transitional(validators.boolean)
    }, false);
  }

  // filter out skipped interceptors
  var requestInterceptorChain = [];
  var synchronousRequestInterceptors = true;
  this.interceptors.request.forEach(function unshiftRequestInterceptors(interceptor) {
    if (typeof interceptor.runWhen === 'function' && interceptor.runWhen(config) === false) {
      return;
    }

    synchronousRequestInterceptors = synchronousRequestInterceptors && interceptor.synchronous;

    requestInterceptorChain.unshift(interceptor.fulfilled, interceptor.rejected);
  });

  var responseInterceptorChain = [];
  this.interceptors.response.forEach(function pushResponseInterceptors(interceptor) {
    responseInterceptorChain.push(interceptor.fulfilled, interceptor.rejected);
  });

  var promise;

  if (!synchronousRequestInterceptors) {
    var chain = [dispatchRequest, undefined];

    Array.prototype.unshift.apply(chain, requestInterceptorChain);
    chain = chain.concat(responseInterceptorChain);

    promise = Promise.resolve(config);
    while (chain.length) {
      promise = promise.then(chain.shift(), chain.shift());
    }

    return promise;
  }


  var newConfig = config;
  while (requestInterceptorChain.length) {
    var onFulfilled = requestInterceptorChain.shift();
    var onRejected = requestInterceptorChain.shift();
    try {
      newConfig = onFulfilled(newConfig);
    } catch (error) {
      onRejected(error);
      break;
    }
  }

  try {
    promise = dispatchRequest(newConfig);
  } catch (error) {
    return Promise.reject(error);
  }

  while (responseInterceptorChain.length) {
    promise = promise.then(responseInterceptorChain.shift(), responseInterceptorChain.shift());
  }

  return promise;
};

Axios$1.prototype.getUri = function getUri(config) {
  config = mergeConfig$1(this.defaults, config);
  return buildURL(config.url, config.params, config.paramsSerializer).replace(/^\?/, '');
};

// Provide aliases for supported request methods
utils$1.forEach(['delete', 'get', 'head', 'options'], function forEachMethodNoData(method) {
  /*eslint func-names:0*/
  Axios$1.prototype[method] = function(url, config) {
    return this.request(mergeConfig$1(config || {}, {
      method: method,
      url: url,
      data: (config || {}).data
    }));
  };
});

utils$1.forEach(['post', 'put', 'patch'], function forEachMethodWithData(method) {
  /*eslint func-names:0*/
  Axios$1.prototype[method] = function(url, data, config) {
    return this.request(mergeConfig$1(config || {}, {
      method: method,
      url: url,
      data: data
    }));
  };
});

var Axios_1 = Axios$1;

var CancelToken_1;
var hasRequiredCancelToken;

function requireCancelToken () {
	if (hasRequiredCancelToken) return CancelToken_1;
	hasRequiredCancelToken = 1;

	var Cancel = requireCancel();

	/**
	 * A `CancelToken` is an object that can be used to request cancellation of an operation.
	 *
	 * @class
	 * @param {Function} executor The executor function.
	 */
	function CancelToken(executor) {
	  if (typeof executor !== 'function') {
	    throw new TypeError('executor must be a function.');
	  }

	  var resolvePromise;

	  this.promise = new Promise(function promiseExecutor(resolve) {
	    resolvePromise = resolve;
	  });

	  var token = this;

	  // eslint-disable-next-line func-names
	  this.promise.then(function(cancel) {
	    if (!token._listeners) return;

	    var i;
	    var l = token._listeners.length;

	    for (i = 0; i < l; i++) {
	      token._listeners[i](cancel);
	    }
	    token._listeners = null;
	  });

	  // eslint-disable-next-line func-names
	  this.promise.then = function(onfulfilled) {
	    var _resolve;
	    // eslint-disable-next-line func-names
	    var promise = new Promise(function(resolve) {
	      token.subscribe(resolve);
	      _resolve = resolve;
	    }).then(onfulfilled);

	    promise.cancel = function reject() {
	      token.unsubscribe(_resolve);
	    };

	    return promise;
	  };

	  executor(function cancel(message) {
	    if (token.reason) {
	      // Cancellation has already been requested
	      return;
	    }

	    token.reason = new Cancel(message);
	    resolvePromise(token.reason);
	  });
	}

	/**
	 * Throws a `Cancel` if cancellation has been requested.
	 */
	CancelToken.prototype.throwIfRequested = function throwIfRequested() {
	  if (this.reason) {
	    throw this.reason;
	  }
	};

	/**
	 * Subscribe to the cancel signal
	 */

	CancelToken.prototype.subscribe = function subscribe(listener) {
	  if (this.reason) {
	    listener(this.reason);
	    return;
	  }

	  if (this._listeners) {
	    this._listeners.push(listener);
	  } else {
	    this._listeners = [listener];
	  }
	};

	/**
	 * Unsubscribe from the cancel signal
	 */

	CancelToken.prototype.unsubscribe = function unsubscribe(listener) {
	  if (!this._listeners) {
	    return;
	  }
	  var index = this._listeners.indexOf(listener);
	  if (index !== -1) {
	    this._listeners.splice(index, 1);
	  }
	};

	/**
	 * Returns an object that contains a new `CancelToken` and a function that, when called,
	 * cancels the `CancelToken`.
	 */
	CancelToken.source = function source() {
	  var cancel;
	  var token = new CancelToken(function executor(c) {
	    cancel = c;
	  });
	  return {
	    token: token,
	    cancel: cancel
	  };
	};

	CancelToken_1 = CancelToken;
	return CancelToken_1;
}

var spread;
var hasRequiredSpread;

function requireSpread () {
	if (hasRequiredSpread) return spread;
	hasRequiredSpread = 1;

	/**
	 * Syntactic sugar for invoking a function and expanding an array for arguments.
	 *
	 * Common use case would be to use `Function.prototype.apply`.
	 *
	 *  ```js
	 *  function f(x, y, z) {}
	 *  var args = [1, 2, 3];
	 *  f.apply(null, args);
	 *  ```
	 *
	 * With `spread` this example can be re-written.
	 *
	 *  ```js
	 *  spread(function(x, y, z) {})([1, 2, 3]);
	 *  ```
	 *
	 * @param {Function} callback
	 * @returns {Function}
	 */
	spread = function spread(callback) {
	  return function wrap(arr) {
	    return callback.apply(null, arr);
	  };
	};
	return spread;
}

var isAxiosError;
var hasRequiredIsAxiosError;

function requireIsAxiosError () {
	if (hasRequiredIsAxiosError) return isAxiosError;
	hasRequiredIsAxiosError = 1;

	/**
	 * Determines whether the payload is an error thrown by Axios
	 *
	 * @param {*} payload The value to test
	 * @returns {boolean} True if the payload is an error thrown by Axios, otherwise false
	 */
	isAxiosError = function isAxiosError(payload) {
	  return (typeof payload === 'object') && (payload.isAxiosError === true);
	};
	return isAxiosError;
}

var utils = utils$8;
var bind = bind$2;
var Axios = Axios_1;
var mergeConfig = mergeConfig$2;
var defaults = requireDefaults();

/**
 * Create an instance of Axios
 *
 * @param {Object} defaultConfig The default config for the instance
 * @return {Axios} A new instance of Axios
 */
function createInstance(defaultConfig) {
  var context = new Axios(defaultConfig);
  var instance = bind(Axios.prototype.request, context);

  // Copy axios.prototype to instance
  utils.extend(instance, Axios.prototype, context);

  // Copy context to instance
  utils.extend(instance, context);

  // Factory for creating new instances
  instance.create = function create(instanceConfig) {
    return createInstance(mergeConfig(defaultConfig, instanceConfig));
  };

  return instance;
}

// Create the default instance to be exported
var axios$1 = createInstance(defaults);

// Expose Axios class to allow class inheritance
axios$1.Axios = Axios;

// Expose Cancel & CancelToken
axios$1.Cancel = requireCancel();
axios$1.CancelToken = requireCancelToken();
axios$1.isCancel = requireIsCancel();
axios$1.VERSION = requireData().version;

// Expose all/spread
axios$1.all = function all(promises) {
  return Promise.all(promises);
};
axios$1.spread = requireSpread();

// Expose isAxiosError
axios$1.isAxiosError = requireIsAxiosError();

axios$2.exports = axios$1;

// Allow use of default import syntax in TypeScript
axios$2.exports.default = axios$1;

(function (module) {
	module.exports = axios$2.exports;
} (axios$3));

var axios = /*@__PURE__*/getDefaultExportFromCjs(axios$3.exports);

class gltfAccessor extends GltfObject
{
    constructor()
    {
        super();
        this.bufferView = undefined;
        this.byteOffset = 0;
        this.componentType = undefined;
        this.normalized = false;
        this.count = undefined;
        this.type = undefined;
        this.max = undefined;
        this.min = undefined;
        this.sparse = undefined;
        this.name = undefined;

        // non gltf
        this.glBuffer = undefined;
        this.typedView = undefined;
        this.filteredView = undefined;
        this.normalizedFilteredView = undefined;
        this.normalizedTypedView = undefined;
    }

    // getTypedView provides a view to the accessors data in form of
    // a TypedArray. This data can directly be passed to vertexAttribPointer
    getTypedView(gltf)
    {
        if (this.typedView !== undefined)
        {
            return this.typedView;
        }

        if (this.bufferView !== undefined)
        {
            const bufferView = gltf.bufferViews[this.bufferView];
            const buffer = gltf.buffers[bufferView.buffer];
            const byteOffset = this.byteOffset + bufferView.byteOffset;

            const componentSize = this.getComponentSize(this.componentType);
            let componentCount = this.getComponentCount(this.type);

            let arrayLength = 0;
            if(bufferView.byteStride !== 0)
            {
                if (componentSize !== 0)
                {
                    arrayLength = bufferView.byteStride / componentSize * (this.count - 1) + componentCount;
                }
                else
                {
                    console.warn("Invalid component type in accessor '" + (this.name ? this.name : "") + "'");
                }
            }
            else
            {
                arrayLength = this.count * componentCount;
            }

            if (arrayLength * componentSize > buffer.buffer.byteLength - byteOffset)
            {
                arrayLength = (buffer.buffer.byteLength - byteOffset) / componentSize;
                console.warn("Count in accessor '" + (this.name ? this.name : "") + "' is too large.");
            }

            switch (this.componentType)
            {
            case GL.BYTE:
                this.typedView = new Int8Array(buffer.buffer, byteOffset, arrayLength);
                break;
            case GL.UNSIGNED_BYTE:
                this.typedView = new Uint8Array(buffer.buffer, byteOffset, arrayLength);
                break;
            case GL.SHORT:
                this.typedView = new Int16Array(buffer.buffer, byteOffset, arrayLength);
                break;
            case GL.UNSIGNED_SHORT:
                this.typedView = new Uint16Array(buffer.buffer, byteOffset, arrayLength);
                break;
            case GL.UNSIGNED_INT:
                this.typedView = new Uint32Array(buffer.buffer, byteOffset, arrayLength);
                break;
            case GL.FLOAT:
                this.typedView = new Float32Array(buffer.buffer, byteOffset, arrayLength);
                break;
            }
        }
        else
        {
            this.typedView = this.createView();
        }

        if (this.sparse !== undefined)
        {
            this.applySparse(gltf, this.typedView);
        }

        return this.typedView;
    }

    // getNormalizedTypedView provides an alternative view to the accessors data,
    // where quantized data is already normalized. This is useful if the data is not passed
    // to vertexAttribPointer but used immediately (like e.g. animations)
    getNormalizedTypedView(gltf)
    {
        if(this.normalizedTypedView !== undefined)
        {
            return this.normalizedTypedView;
        }

        const typedView = this.getTypedView(gltf);
        this.normalizedTypedView = this.normalized ? gltfAccessor.dequantize(typedView, this.componentType) : typedView;
        return this.normalizedTypedView;
    }

    // getDeinterlacedView provides a view to the accessors data in form of
    // a TypedArray. In contrast to getTypedView, getDeinterlacedView deinterlaces
    // data, i.e. stripping padding and unrelated components from the array. It then
    // only contains the data of the accessor
    getDeinterlacedView(gltf)
    {
        if (this.filteredView !== undefined)
        {
            return this.filteredView;
        }

        if (this.bufferView !== undefined)
        {
            const bufferView = gltf.bufferViews[this.bufferView];
            const buffer = gltf.buffers[bufferView.buffer];
            const byteOffset = this.byteOffset + bufferView.byteOffset;

            const componentSize = this.getComponentSize(this.componentType);
            const componentCount = this.getComponentCount(this.type);
            const arrayLength = this.count * componentCount;

            let stride = bufferView.byteStride !== 0 ? bufferView.byteStride : componentCount * componentSize;
            let dv = new DataView(buffer.buffer, byteOffset, this.count * stride);

            let func = 'getFloat32';
            switch (this.componentType)
            {
            case GL.BYTE:
                this.filteredView = new Int8Array(arrayLength);
                func = 'getInt8';
                break;
            case GL.UNSIGNED_BYTE:
                this.filteredView = new Uint8Array(arrayLength);
                func = 'getUint8';
                break;
            case GL.SHORT:
                this.filteredView = new Int16Array(arrayLength);
                func = 'getInt16';
                break;
            case GL.UNSIGNED_SHORT:
                this.filteredView = new Uint16Array(arrayLength);
                func = 'getUint16';
                break;
            case GL.UNSIGNED_INT:
                this.filteredView = new Uint32Array(arrayLength);
                func = 'getUint32';
                break;
            case GL.FLOAT:
                this.filteredView = new Float32Array(arrayLength);
                func = 'getFloat32';
                break;
            }

            for(let i = 0; i < arrayLength; ++i)
            {
                let offset = Math.floor(i/componentCount) * stride + (i % componentCount) * componentSize;
                this.filteredView[i] = dv[func](offset, true);
            }
        }
        else
        {
            this.filteredView = this.createView();
        }

        if (this.sparse !== undefined)
        {
            this.applySparse(gltf, this.filteredView);
        }

        return this.filteredView;
    }

    createView()
    {
        const size = this.count * this.getComponentCount(this.type);
        if (this.componentType == GL.BYTE) return new Int8Array(size);
        if (this.componentType == GL.UNSIGNED_BYTE) return new Uint8Array(size);
        if (this.componentType == GL.SHORT) return new Int16Array(size);
        if (this.componentType == GL.UNSIGNED_SHORT) return new Uint16Array(size);
        if (this.componentType == GL.UNSIGNED_INT) return new Uint32Array(size);
        if (this.componentType == GL.FLOAT) return new Float32Array(size);
        return undefined;
    }

    // getNormalizedDeinterlacedView provides an alternative view to the accessors data,
    // where quantized data is already normalized. This is useful if the data is not passed
    // to vertexAttribPointer but used immediately (like e.g. animations)
    getNormalizedDeinterlacedView(gltf)
    {
        if(this.normalizedFilteredView !== undefined)
        {
            return this.normalizedFilteredView;
        }

        const filteredView = this.getDeinterlacedView(gltf);
        this.normalizedFilteredView = this.normalized ? gltfAccessor.dequantize(filteredView, this.componentType) : filteredView;
        return this.normalizedFilteredView;
    }

    byteStride(gltf)
    {
        return gltf.bufferViews[this.bufferView]?.byteStride ??
            gltf.bufferViews[this.sparse?.values.bufferView]?.byteStride ??
            0;
    }

    applySparse(gltf, view)
    {
        // Gather indices.

        const indicesBufferView = gltf.bufferViews[this.sparse.indices.bufferView];
        const indicesBuffer = gltf.buffers[indicesBufferView.buffer];
        const indicesByteOffset = this.sparse.indices.byteOffset ?? 0 + indicesBufferView.byteOffset ?? 0;

        const indicesComponentSize = this.getComponentSize(this.sparse.indices.componentType);
        let indicesComponentCount = 1;

        if(indicesBufferView.byteStride !== 0)
        {
            indicesComponentCount = indicesBufferView.byteStride / indicesComponentSize;
        }

        const indicesArrayLength = this.sparse.count * indicesComponentCount;

        let indicesTypedView;
        switch (this.sparse.indices.componentType)
        {
        case GL.UNSIGNED_BYTE:
            indicesTypedView = new Uint8Array(indicesBuffer.buffer, indicesByteOffset, indicesArrayLength);
            break;
        case GL.UNSIGNED_SHORT:
            indicesTypedView = new Uint16Array(indicesBuffer.buffer, indicesByteOffset, indicesArrayLength);
            break;
        case GL.UNSIGNED_INT:
            indicesTypedView = new Uint32Array(indicesBuffer.buffer, indicesByteOffset, indicesArrayLength);
            break;
        }

        // Gather values.

        const valuesBufferView = gltf.bufferViews[this.sparse.values.bufferView];
        const valuesBuffer = gltf.buffers[valuesBufferView.buffer];
        const valuesByteOffset = this.sparse.values.byteOffset ?? 0 + valuesBufferView.byteOffset ?? 0;

        const valuesComponentSize = this.getComponentSize(this.componentType);
        let valuesComponentCount = this.getComponentCount(this.type);

        if(valuesBufferView.byteStride !== 0)
        {
            valuesComponentCount = valuesBufferView.byteStride / valuesComponentSize;
        }

        const valuesArrayLength = this.sparse.count * valuesComponentCount;

        let valuesTypedView;
        switch (this.componentType)
        {
        case GL.BYTE:
            valuesTypedView = new Int8Array(valuesBuffer.buffer, valuesByteOffset, valuesArrayLength);
            break;
        case GL.UNSIGNED_BYTE:
            valuesTypedView = new Uint8Array(valuesBuffer.buffer, valuesByteOffset, valuesArrayLength);
            break;
        case GL.SHORT:
            valuesTypedView = new Int16Array(valuesBuffer.buffer, valuesByteOffset, valuesArrayLength);
            break;
        case GL.UNSIGNED_SHORT:
            valuesTypedView = new Uint16Array(valuesBuffer.buffer, valuesByteOffset, valuesArrayLength);
            break;
        case GL.UNSIGNED_INT:
            valuesTypedView = new Uint32Array(valuesBuffer.buffer, valuesByteOffset, valuesArrayLength);
            break;
        case GL.FLOAT:
            valuesTypedView = new Float32Array(valuesBuffer.buffer, valuesByteOffset, valuesArrayLength);
            break;
        }

        // Overwrite values.

        for(let i = 0; i < this.sparse.count; ++i)
        {
            for(let k = 0; k < valuesComponentCount; ++k)
            {
                view[indicesTypedView[i] * valuesComponentCount + k] = valuesTypedView[i * valuesComponentCount + k];
            }
        }
    }

    // dequantize can be used to perform the normalization from WebGL2 vertexAttribPointer explicitly
    static dequantize(typedArray, componentType)
    {
        switch (componentType)
        {
        case GL.BYTE:
            return new Float32Array(typedArray).map(c => Math.max(c / 127.0, -1.0));
        case GL.UNSIGNED_BYTE:
            return new Float32Array(typedArray).map(c => c / 255.0);
        case GL.SHORT:
            return new Float32Array(typedArray).map(c => Math.max(c / 32767.0, -1.0));
        case GL.UNSIGNED_SHORT:
            return new Float32Array(typedArray).map(c => c / 65535.0);
        default:
            return typedArray;
        }
    }

    getComponentCount(type)
    {
        return CompononentCount.get(type);
    }

    getComponentSize(componentType)
    {
        switch (componentType)
        {
        case GL.BYTE:
        case GL.UNSIGNED_BYTE:
            return 1;
        case GL.SHORT:
        case GL.UNSIGNED_SHORT:
            return 2;
        case GL.UNSIGNED_INT:
        case GL.FLOAT:
            return 4;
        default:
            return 0;
        }
    }

    destroy()
    {
        if (this.glBuffer !== undefined)
        {
            // TODO: this breaks the dependency direction
            WebGl.context.deleteBuffer(this.glBuffer);
        }

        this.glBuffer = undefined;
    }
}

const CompononentCount = new Map(
    [
        ["SCALAR", 1],
        ["VEC2", 2],
        ["VEC3", 3],
        ["VEC4", 4],
        ["MAT2", 4],
        ["MAT3", 9],
        ["MAT4", 16]
    ]
);

class gltfBuffer extends GltfObject
{
    constructor()
    {
        super();
        this.uri = undefined;
        this.byteLength = undefined;
        this.name = undefined;

        // non gltf
        this.buffer = undefined; // raw data blob
    }

    load(gltf, additionalFiles = undefined)
    {
        if (this.buffer !== undefined)
        {
            console.error("buffer has already been loaded");
            return;
        }

        const self = this;
        return new Promise(function(resolve)
        {
            if (!self.setBufferFromFiles(additionalFiles, resolve) &&
                !self.setBufferFromUri(gltf, resolve))
            {
                console.error("Was not able to resolve buffer with uri '%s'", self.uri);
                resolve();
            }
        });
    }

    setBufferFromUri(gltf, callback)
    {
        if (this.uri === undefined)
        {
            return false;
        }

        const self = this;
        axios.get(getContainingFolder(gltf.path) + this.uri, { responseType: 'arraybuffer'})
            .then(function(response)
            {
                self.buffer = response.data;
                callback();
            });
        return true;
    }

    setBufferFromFiles(files, callback)
    {
        if (this.uri === undefined || files === undefined)
        {
            return false;
        }

        const foundFile = files.find(function(file)
        {
            if (file.name === this.uri || file.fullPath === this.uri)
            {
                return true;
            }
        }, this);

        if (foundFile === undefined)
        {
            return false;
        }

        const self = this;
        const reader = new FileReader();
        reader.onloadend = function(event)
        {
            self.buffer = event.target.result;
            callback();
        };
        reader.readAsArrayBuffer(foundFile);

        return true;
    }
}

class gltfBufferView extends GltfObject
{
    constructor()
    {
        super();
        this.buffer = undefined;
        this.byteOffset = 0;
        this.byteLength = undefined;
        this.byteStride = 0;
        this.target = undefined;
        this.name = undefined;
    }
}

class AsyncFileReader
{
    static async readAsArrayBuffer(path) {
        return new Promise( (resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsArrayBuffer(path);
        });
    }

    static async readAsText(path) {
        return new Promise( (resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsText(path);
        });
    }

    static async readAsDataURL(path) {
        return new Promise( (resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(path);
        });
    }
}

var encoder$1 = {exports: {}};

/*
  Copyright (c) 2008, Adobe Systems Incorporated
  All rights reserved.

  Redistribution and use in source and binary forms, with or without 
  modification, are permitted provided that the following conditions are
  met:

  * Redistributions of source code must retain the above copyright notice, 
    this list of conditions and the following disclaimer.
  
  * Redistributions in binary form must reproduce the above copyright
    notice, this list of conditions and the following disclaimer in the 
    documentation and/or other materials provided with the distribution.
  
  * Neither the name of Adobe Systems Incorporated nor the names of its 
    contributors may be used to endorse or promote products derived from 
    this software without specific prior written permission.

  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS
  IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO,
  THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
  PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR 
  CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
  EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
  PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
  PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
  LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
  NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
  SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

(function (module) {

	function JPEGEncoder(quality) {
		var ffloor = Math.floor;
		var YTable = new Array(64);
		var UVTable = new Array(64);
		var fdtbl_Y = new Array(64);
		var fdtbl_UV = new Array(64);
		var YDC_HT;
		var UVDC_HT;
		var YAC_HT;
		var UVAC_HT;
		
		var bitcode = new Array(65535);
		var category = new Array(65535);
		var outputfDCTQuant = new Array(64);
		var DU = new Array(64);
		var byteout = [];
		var bytenew = 0;
		var bytepos = 7;
		
		var YDU = new Array(64);
		var UDU = new Array(64);
		var VDU = new Array(64);
		var clt = new Array(256);
		var RGB_YUV_TABLE = new Array(2048);
		var currentQuality;
		
		var ZigZag = [
				 0, 1, 5, 6,14,15,27,28,
				 2, 4, 7,13,16,26,29,42,
				 3, 8,12,17,25,30,41,43,
				 9,11,18,24,31,40,44,53,
				10,19,23,32,39,45,52,54,
				20,22,33,38,46,51,55,60,
				21,34,37,47,50,56,59,61,
				35,36,48,49,57,58,62,63
			];
		
		var std_dc_luminance_nrcodes = [0,0,1,5,1,1,1,1,1,1,0,0,0,0,0,0,0];
		var std_dc_luminance_values = [0,1,2,3,4,5,6,7,8,9,10,11];
		var std_ac_luminance_nrcodes = [0,0,2,1,3,3,2,4,3,5,5,4,4,0,0,1,0x7d];
		var std_ac_luminance_values = [
				0x01,0x02,0x03,0x00,0x04,0x11,0x05,0x12,
				0x21,0x31,0x41,0x06,0x13,0x51,0x61,0x07,
				0x22,0x71,0x14,0x32,0x81,0x91,0xa1,0x08,
				0x23,0x42,0xb1,0xc1,0x15,0x52,0xd1,0xf0,
				0x24,0x33,0x62,0x72,0x82,0x09,0x0a,0x16,
				0x17,0x18,0x19,0x1a,0x25,0x26,0x27,0x28,
				0x29,0x2a,0x34,0x35,0x36,0x37,0x38,0x39,
				0x3a,0x43,0x44,0x45,0x46,0x47,0x48,0x49,
				0x4a,0x53,0x54,0x55,0x56,0x57,0x58,0x59,
				0x5a,0x63,0x64,0x65,0x66,0x67,0x68,0x69,
				0x6a,0x73,0x74,0x75,0x76,0x77,0x78,0x79,
				0x7a,0x83,0x84,0x85,0x86,0x87,0x88,0x89,
				0x8a,0x92,0x93,0x94,0x95,0x96,0x97,0x98,
				0x99,0x9a,0xa2,0xa3,0xa4,0xa5,0xa6,0xa7,
				0xa8,0xa9,0xaa,0xb2,0xb3,0xb4,0xb5,0xb6,
				0xb7,0xb8,0xb9,0xba,0xc2,0xc3,0xc4,0xc5,
				0xc6,0xc7,0xc8,0xc9,0xca,0xd2,0xd3,0xd4,
				0xd5,0xd6,0xd7,0xd8,0xd9,0xda,0xe1,0xe2,
				0xe3,0xe4,0xe5,0xe6,0xe7,0xe8,0xe9,0xea,
				0xf1,0xf2,0xf3,0xf4,0xf5,0xf6,0xf7,0xf8,
				0xf9,0xfa
			];
		
		var std_dc_chrominance_nrcodes = [0,0,3,1,1,1,1,1,1,1,1,1,0,0,0,0,0];
		var std_dc_chrominance_values = [0,1,2,3,4,5,6,7,8,9,10,11];
		var std_ac_chrominance_nrcodes = [0,0,2,1,2,4,4,3,4,7,5,4,4,0,1,2,0x77];
		var std_ac_chrominance_values = [
				0x00,0x01,0x02,0x03,0x11,0x04,0x05,0x21,
				0x31,0x06,0x12,0x41,0x51,0x07,0x61,0x71,
				0x13,0x22,0x32,0x81,0x08,0x14,0x42,0x91,
				0xa1,0xb1,0xc1,0x09,0x23,0x33,0x52,0xf0,
				0x15,0x62,0x72,0xd1,0x0a,0x16,0x24,0x34,
				0xe1,0x25,0xf1,0x17,0x18,0x19,0x1a,0x26,
				0x27,0x28,0x29,0x2a,0x35,0x36,0x37,0x38,
				0x39,0x3a,0x43,0x44,0x45,0x46,0x47,0x48,
				0x49,0x4a,0x53,0x54,0x55,0x56,0x57,0x58,
				0x59,0x5a,0x63,0x64,0x65,0x66,0x67,0x68,
				0x69,0x6a,0x73,0x74,0x75,0x76,0x77,0x78,
				0x79,0x7a,0x82,0x83,0x84,0x85,0x86,0x87,
				0x88,0x89,0x8a,0x92,0x93,0x94,0x95,0x96,
				0x97,0x98,0x99,0x9a,0xa2,0xa3,0xa4,0xa5,
				0xa6,0xa7,0xa8,0xa9,0xaa,0xb2,0xb3,0xb4,
				0xb5,0xb6,0xb7,0xb8,0xb9,0xba,0xc2,0xc3,
				0xc4,0xc5,0xc6,0xc7,0xc8,0xc9,0xca,0xd2,
				0xd3,0xd4,0xd5,0xd6,0xd7,0xd8,0xd9,0xda,
				0xe2,0xe3,0xe4,0xe5,0xe6,0xe7,0xe8,0xe9,
				0xea,0xf2,0xf3,0xf4,0xf5,0xf6,0xf7,0xf8,
				0xf9,0xfa
			];
		
		function initQuantTables(sf){
				var YQT = [
					16, 11, 10, 16, 24, 40, 51, 61,
					12, 12, 14, 19, 26, 58, 60, 55,
					14, 13, 16, 24, 40, 57, 69, 56,
					14, 17, 22, 29, 51, 87, 80, 62,
					18, 22, 37, 56, 68,109,103, 77,
					24, 35, 55, 64, 81,104,113, 92,
					49, 64, 78, 87,103,121,120,101,
					72, 92, 95, 98,112,100,103, 99
				];
				
				for (var i = 0; i < 64; i++) {
					var t = ffloor((YQT[i]*sf+50)/100);
					if (t < 1) {
						t = 1;
					} else if (t > 255) {
						t = 255;
					}
					YTable[ZigZag[i]] = t;
				}
				var UVQT = [
					17, 18, 24, 47, 99, 99, 99, 99,
					18, 21, 26, 66, 99, 99, 99, 99,
					24, 26, 56, 99, 99, 99, 99, 99,
					47, 66, 99, 99, 99, 99, 99, 99,
					99, 99, 99, 99, 99, 99, 99, 99,
					99, 99, 99, 99, 99, 99, 99, 99,
					99, 99, 99, 99, 99, 99, 99, 99,
					99, 99, 99, 99, 99, 99, 99, 99
				];
				for (var j = 0; j < 64; j++) {
					var u = ffloor((UVQT[j]*sf+50)/100);
					if (u < 1) {
						u = 1;
					} else if (u > 255) {
						u = 255;
					}
					UVTable[ZigZag[j]] = u;
				}
				var aasf = [
					1.0, 1.387039845, 1.306562965, 1.175875602,
					1.0, 0.785694958, 0.541196100, 0.275899379
				];
				var k = 0;
				for (var row = 0; row < 8; row++)
				{
					for (var col = 0; col < 8; col++)
					{
						fdtbl_Y[k]  = (1.0 / (YTable [ZigZag[k]] * aasf[row] * aasf[col] * 8.0));
						fdtbl_UV[k] = (1.0 / (UVTable[ZigZag[k]] * aasf[row] * aasf[col] * 8.0));
						k++;
					}
				}
			}
			
			function computeHuffmanTbl(nrcodes, std_table){
				var codevalue = 0;
				var pos_in_table = 0;
				var HT = new Array();
				for (var k = 1; k <= 16; k++) {
					for (var j = 1; j <= nrcodes[k]; j++) {
						HT[std_table[pos_in_table]] = [];
						HT[std_table[pos_in_table]][0] = codevalue;
						HT[std_table[pos_in_table]][1] = k;
						pos_in_table++;
						codevalue++;
					}
					codevalue*=2;
				}
				return HT;
			}
			
			function initHuffmanTbl()
			{
				YDC_HT = computeHuffmanTbl(std_dc_luminance_nrcodes,std_dc_luminance_values);
				UVDC_HT = computeHuffmanTbl(std_dc_chrominance_nrcodes,std_dc_chrominance_values);
				YAC_HT = computeHuffmanTbl(std_ac_luminance_nrcodes,std_ac_luminance_values);
				UVAC_HT = computeHuffmanTbl(std_ac_chrominance_nrcodes,std_ac_chrominance_values);
			}
		
			function initCategoryNumber()
			{
				var nrlower = 1;
				var nrupper = 2;
				for (var cat = 1; cat <= 15; cat++) {
					//Positive numbers
					for (var nr = nrlower; nr<nrupper; nr++) {
						category[32767+nr] = cat;
						bitcode[32767+nr] = [];
						bitcode[32767+nr][1] = cat;
						bitcode[32767+nr][0] = nr;
					}
					//Negative numbers
					for (var nrneg =-(nrupper-1); nrneg<=-nrlower; nrneg++) {
						category[32767+nrneg] = cat;
						bitcode[32767+nrneg] = [];
						bitcode[32767+nrneg][1] = cat;
						bitcode[32767+nrneg][0] = nrupper-1+nrneg;
					}
					nrlower <<= 1;
					nrupper <<= 1;
				}
			}
			
			function initRGBYUVTable() {
				for(var i = 0; i < 256;i++) {
					RGB_YUV_TABLE[i]      		=  19595 * i;
					RGB_YUV_TABLE[(i+ 256)>>0] 	=  38470 * i;
					RGB_YUV_TABLE[(i+ 512)>>0] 	=   7471 * i + 0x8000;
					RGB_YUV_TABLE[(i+ 768)>>0] 	= -11059 * i;
					RGB_YUV_TABLE[(i+1024)>>0] 	= -21709 * i;
					RGB_YUV_TABLE[(i+1280)>>0] 	=  32768 * i + 0x807FFF;
					RGB_YUV_TABLE[(i+1536)>>0] 	= -27439 * i;
					RGB_YUV_TABLE[(i+1792)>>0] 	= - 5329 * i;
				}
			}
			
			// IO functions
			function writeBits(bs)
			{
				var value = bs[0];
				var posval = bs[1]-1;
				while ( posval >= 0 ) {
					if (value & (1 << posval) ) {
						bytenew |= (1 << bytepos);
					}
					posval--;
					bytepos--;
					if (bytepos < 0) {
						if (bytenew == 0xFF) {
							writeByte(0xFF);
							writeByte(0);
						}
						else {
							writeByte(bytenew);
						}
						bytepos=7;
						bytenew=0;
					}
				}
			}
		
			function writeByte(value)
			{
				//byteout.push(clt[value]); // write char directly instead of converting later
	      byteout.push(value);
			}
		
			function writeWord(value)
			{
				writeByte((value>>8)&0xFF);
				writeByte((value   )&0xFF);
			}
			
			// DCT & quantization core
			function fDCTQuant(data, fdtbl)
			{
				var d0, d1, d2, d3, d4, d5, d6, d7;
				/* Pass 1: process rows. */
				var dataOff=0;
				var i;
				var I8 = 8;
				var I64 = 64;
				for (i=0; i<I8; ++i)
				{
					d0 = data[dataOff];
					d1 = data[dataOff+1];
					d2 = data[dataOff+2];
					d3 = data[dataOff+3];
					d4 = data[dataOff+4];
					d5 = data[dataOff+5];
					d6 = data[dataOff+6];
					d7 = data[dataOff+7];
					
					var tmp0 = d0 + d7;
					var tmp7 = d0 - d7;
					var tmp1 = d1 + d6;
					var tmp6 = d1 - d6;
					var tmp2 = d2 + d5;
					var tmp5 = d2 - d5;
					var tmp3 = d3 + d4;
					var tmp4 = d3 - d4;
		
					/* Even part */
					var tmp10 = tmp0 + tmp3;	/* phase 2 */
					var tmp13 = tmp0 - tmp3;
					var tmp11 = tmp1 + tmp2;
					var tmp12 = tmp1 - tmp2;
		
					data[dataOff] = tmp10 + tmp11; /* phase 3 */
					data[dataOff+4] = tmp10 - tmp11;
		
					var z1 = (tmp12 + tmp13) * 0.707106781; /* c4 */
					data[dataOff+2] = tmp13 + z1; /* phase 5 */
					data[dataOff+6] = tmp13 - z1;
		
					/* Odd part */
					tmp10 = tmp4 + tmp5; /* phase 2 */
					tmp11 = tmp5 + tmp6;
					tmp12 = tmp6 + tmp7;
		
					/* The rotator is modified from fig 4-8 to avoid extra negations. */
					var z5 = (tmp10 - tmp12) * 0.382683433; /* c6 */
					var z2 = 0.541196100 * tmp10 + z5; /* c2-c6 */
					var z4 = 1.306562965 * tmp12 + z5; /* c2+c6 */
					var z3 = tmp11 * 0.707106781; /* c4 */
		
					var z11 = tmp7 + z3;	/* phase 5 */
					var z13 = tmp7 - z3;
		
					data[dataOff+5] = z13 + z2;	/* phase 6 */
					data[dataOff+3] = z13 - z2;
					data[dataOff+1] = z11 + z4;
					data[dataOff+7] = z11 - z4;
		
					dataOff += 8; /* advance pointer to next row */
				}
		
				/* Pass 2: process columns. */
				dataOff = 0;
				for (i=0; i<I8; ++i)
				{
					d0 = data[dataOff];
					d1 = data[dataOff + 8];
					d2 = data[dataOff + 16];
					d3 = data[dataOff + 24];
					d4 = data[dataOff + 32];
					d5 = data[dataOff + 40];
					d6 = data[dataOff + 48];
					d7 = data[dataOff + 56];
					
					var tmp0p2 = d0 + d7;
					var tmp7p2 = d0 - d7;
					var tmp1p2 = d1 + d6;
					var tmp6p2 = d1 - d6;
					var tmp2p2 = d2 + d5;
					var tmp5p2 = d2 - d5;
					var tmp3p2 = d3 + d4;
					var tmp4p2 = d3 - d4;
		
					/* Even part */
					var tmp10p2 = tmp0p2 + tmp3p2;	/* phase 2 */
					var tmp13p2 = tmp0p2 - tmp3p2;
					var tmp11p2 = tmp1p2 + tmp2p2;
					var tmp12p2 = tmp1p2 - tmp2p2;
		
					data[dataOff] = tmp10p2 + tmp11p2; /* phase 3 */
					data[dataOff+32] = tmp10p2 - tmp11p2;
		
					var z1p2 = (tmp12p2 + tmp13p2) * 0.707106781; /* c4 */
					data[dataOff+16] = tmp13p2 + z1p2; /* phase 5 */
					data[dataOff+48] = tmp13p2 - z1p2;
		
					/* Odd part */
					tmp10p2 = tmp4p2 + tmp5p2; /* phase 2 */
					tmp11p2 = tmp5p2 + tmp6p2;
					tmp12p2 = tmp6p2 + tmp7p2;
		
					/* The rotator is modified from fig 4-8 to avoid extra negations. */
					var z5p2 = (tmp10p2 - tmp12p2) * 0.382683433; /* c6 */
					var z2p2 = 0.541196100 * tmp10p2 + z5p2; /* c2-c6 */
					var z4p2 = 1.306562965 * tmp12p2 + z5p2; /* c2+c6 */
					var z3p2 = tmp11p2 * 0.707106781; /* c4 */
		
					var z11p2 = tmp7p2 + z3p2;	/* phase 5 */
					var z13p2 = tmp7p2 - z3p2;
		
					data[dataOff+40] = z13p2 + z2p2; /* phase 6 */
					data[dataOff+24] = z13p2 - z2p2;
					data[dataOff+ 8] = z11p2 + z4p2;
					data[dataOff+56] = z11p2 - z4p2;
		
					dataOff++; /* advance pointer to next column */
				}
		
				// Quantize/descale the coefficients
				var fDCTQuant;
				for (i=0; i<I64; ++i)
				{
					// Apply the quantization and scaling factor & Round to nearest integer
					fDCTQuant = data[i]*fdtbl[i];
					outputfDCTQuant[i] = (fDCTQuant > 0.0) ? ((fDCTQuant + 0.5)|0) : ((fDCTQuant - 0.5)|0);
					//outputfDCTQuant[i] = fround(fDCTQuant);

				}
				return outputfDCTQuant;
			}
			
			function writeAPP0()
			{
				writeWord(0xFFE0); // marker
				writeWord(16); // length
				writeByte(0x4A); // J
				writeByte(0x46); // F
				writeByte(0x49); // I
				writeByte(0x46); // F
				writeByte(0); // = "JFIF",'\0'
				writeByte(1); // versionhi
				writeByte(1); // versionlo
				writeByte(0); // xyunits
				writeWord(1); // xdensity
				writeWord(1); // ydensity
				writeByte(0); // thumbnwidth
				writeByte(0); // thumbnheight
			}

			function writeAPP1(exifBuffer) {
				if (!exifBuffer) return;

				writeWord(0xFFE1); // APP1 marker

				if (exifBuffer[0] === 0x45 &&
						exifBuffer[1] === 0x78 &&
						exifBuffer[2] === 0x69 &&
						exifBuffer[3] === 0x66) {
					// Buffer already starts with EXIF, just use it directly
					writeWord(exifBuffer.length + 2); // length is buffer + length itself!
				} else {
					// Buffer doesn't start with EXIF, write it for them
					writeWord(exifBuffer.length + 5 + 2); // length is buffer + EXIF\0 + length itself!
					writeByte(0x45); // E
					writeByte(0x78); // X
					writeByte(0x69); // I
					writeByte(0x66); // F
					writeByte(0); // = "EXIF",'\0'
				}

				for (var i = 0; i < exifBuffer.length; i++) {
					writeByte(exifBuffer[i]);
				}
			}

			function writeSOF0(width, height)
			{
				writeWord(0xFFC0); // marker
				writeWord(17);   // length, truecolor YUV JPG
				writeByte(8);    // precision
				writeWord(height);
				writeWord(width);
				writeByte(3);    // nrofcomponents
				writeByte(1);    // IdY
				writeByte(0x11); // HVY
				writeByte(0);    // QTY
				writeByte(2);    // IdU
				writeByte(0x11); // HVU
				writeByte(1);    // QTU
				writeByte(3);    // IdV
				writeByte(0x11); // HVV
				writeByte(1);    // QTV
			}
		
			function writeDQT()
			{
				writeWord(0xFFDB); // marker
				writeWord(132);	   // length
				writeByte(0);
				for (var i=0; i<64; i++) {
					writeByte(YTable[i]);
				}
				writeByte(1);
				for (var j=0; j<64; j++) {
					writeByte(UVTable[j]);
				}
			}
		
			function writeDHT()
			{
				writeWord(0xFFC4); // marker
				writeWord(0x01A2); // length
		
				writeByte(0); // HTYDCinfo
				for (var i=0; i<16; i++) {
					writeByte(std_dc_luminance_nrcodes[i+1]);
				}
				for (var j=0; j<=11; j++) {
					writeByte(std_dc_luminance_values[j]);
				}
		
				writeByte(0x10); // HTYACinfo
				for (var k=0; k<16; k++) {
					writeByte(std_ac_luminance_nrcodes[k+1]);
				}
				for (var l=0; l<=161; l++) {
					writeByte(std_ac_luminance_values[l]);
				}
		
				writeByte(1); // HTUDCinfo
				for (var m=0; m<16; m++) {
					writeByte(std_dc_chrominance_nrcodes[m+1]);
				}
				for (var n=0; n<=11; n++) {
					writeByte(std_dc_chrominance_values[n]);
				}
		
				writeByte(0x11); // HTUACinfo
				for (var o=0; o<16; o++) {
					writeByte(std_ac_chrominance_nrcodes[o+1]);
				}
				for (var p=0; p<=161; p++) {
					writeByte(std_ac_chrominance_values[p]);
				}
			}
		
			function writeSOS()
			{
				writeWord(0xFFDA); // marker
				writeWord(12); // length
				writeByte(3); // nrofcomponents
				writeByte(1); // IdY
				writeByte(0); // HTY
				writeByte(2); // IdU
				writeByte(0x11); // HTU
				writeByte(3); // IdV
				writeByte(0x11); // HTV
				writeByte(0); // Ss
				writeByte(0x3f); // Se
				writeByte(0); // Bf
			}
			
			function processDU(CDU, fdtbl, DC, HTDC, HTAC){
				var EOB = HTAC[0x00];
				var M16zeroes = HTAC[0xF0];
				var pos;
				var I16 = 16;
				var I63 = 63;
				var I64 = 64;
				var DU_DCT = fDCTQuant(CDU, fdtbl);
				//ZigZag reorder
				for (var j=0;j<I64;++j) {
					DU[ZigZag[j]]=DU_DCT[j];
				}
				var Diff = DU[0] - DC; DC = DU[0];
				//Encode DC
				if (Diff==0) {
					writeBits(HTDC[0]); // Diff might be 0
				} else {
					pos = 32767+Diff;
					writeBits(HTDC[category[pos]]);
					writeBits(bitcode[pos]);
				}
				//Encode ACs
				var end0pos = 63; // was const... which is crazy
				for (; (end0pos>0)&&(DU[end0pos]==0); end0pos--) {}				//end0pos = first element in reverse order !=0
				if ( end0pos == 0) {
					writeBits(EOB);
					return DC;
				}
				var i = 1;
				var lng;
				while ( i <= end0pos ) {
					var startpos = i;
					for (; (DU[i]==0) && (i<=end0pos); ++i) {}
					var nrzeroes = i-startpos;
					if ( nrzeroes >= I16 ) {
						lng = nrzeroes>>4;
						for (var nrmarker=1; nrmarker <= lng; ++nrmarker)
							writeBits(M16zeroes);
						nrzeroes = nrzeroes&0xF;
					}
					pos = 32767+DU[i];
					writeBits(HTAC[(nrzeroes<<4)+category[pos]]);
					writeBits(bitcode[pos]);
					i++;
				}
				if ( end0pos != I63 ) {
					writeBits(EOB);
				}
				return DC;
			}

			function initCharLookupTable(){
				var sfcc = String.fromCharCode;
				for(var i=0; i < 256; i++){ ///// ACHTUNG // 255
					clt[i] = sfcc(i);
				}
			}
			
			this.encode = function(image,quality) // image data object
			{
				new Date().getTime();
				
				if(quality) setQuality(quality);
				
				// Initialize bit writer
				byteout = new Array();
				bytenew=0;
				bytepos=7;
		
				// Add JPEG headers
				writeWord(0xFFD8); // SOI
				writeAPP0();
				writeAPP1(image.exifBuffer);
				writeDQT();
				writeSOF0(image.width,image.height);
				writeDHT();
				writeSOS();

		
				// Encode 8x8 macroblocks
				var DCY=0;
				var DCU=0;
				var DCV=0;
				
				bytenew=0;
				bytepos=7;
				
				
				this.encode.displayName = "_encode_";

				var imageData = image.data;
				var width = image.width;
				var height = image.height;

				var quadWidth = width*4;
				
				var x, y = 0;
				var r, g, b;
				var start,p, col,row,pos;
				while(y < height){
					x = 0;
					while(x < quadWidth){
					start = quadWidth * y + x;
					p = start;
					col = -1;
					row = 0;
					
					for(pos=0; pos < 64; pos++){
						row = pos >> 3;// /8
						col = ( pos & 7 ) * 4; // %8
						p = start + ( row * quadWidth ) + col;		
						
						if(y+row >= height){ // padding bottom
							p-= (quadWidth*(y+1+row-height));
						}

						if(x+col >= quadWidth){ // padding right	
							p-= ((x+col) - quadWidth +4);
						}
						
						r = imageData[ p++ ];
						g = imageData[ p++ ];
						b = imageData[ p++ ];
						
						
						/* // calculate YUV values dynamically
						YDU[pos]=((( 0.29900)*r+( 0.58700)*g+( 0.11400)*b))-128; //-0x80
						UDU[pos]=(((-0.16874)*r+(-0.33126)*g+( 0.50000)*b));
						VDU[pos]=((( 0.50000)*r+(-0.41869)*g+(-0.08131)*b));
						*/
						
						// use lookup table (slightly faster)
						YDU[pos] = ((RGB_YUV_TABLE[r]             + RGB_YUV_TABLE[(g +  256)>>0] + RGB_YUV_TABLE[(b +  512)>>0]) >> 16)-128;
						UDU[pos] = ((RGB_YUV_TABLE[(r +  768)>>0] + RGB_YUV_TABLE[(g + 1024)>>0] + RGB_YUV_TABLE[(b + 1280)>>0]) >> 16)-128;
						VDU[pos] = ((RGB_YUV_TABLE[(r + 1280)>>0] + RGB_YUV_TABLE[(g + 1536)>>0] + RGB_YUV_TABLE[(b + 1792)>>0]) >> 16)-128;

					}
					
					DCY = processDU(YDU, fdtbl_Y, DCY, YDC_HT, YAC_HT);
					DCU = processDU(UDU, fdtbl_UV, DCU, UVDC_HT, UVAC_HT);
					DCV = processDU(VDU, fdtbl_UV, DCV, UVDC_HT, UVAC_HT);
					x+=32;
					}
					y+=8;
				}
				
				
				////////////////////////////////////////////////////////////////
		
				// Do the bit alignment of the EOI marker
				if ( bytepos >= 0 ) {
					var fillbits = [];
					fillbits[1] = bytepos+1;
					fillbits[0] = (1<<(bytepos+1))-1;
					writeBits(fillbits);
				}
		
				writeWord(0xFFD9); //EOI
	      return Buffer.from(byteout);
		};
		
		function setQuality(quality){
			if (quality <= 0) {
				quality = 1;
			}
			if (quality > 100) {
				quality = 100;
			}
			
			if(currentQuality == quality) return // don't recalc if unchanged
			
			var sf = 0;
			if (quality < 50) {
				sf = Math.floor(5000 / quality);
			} else {
				sf = Math.floor(200 - quality*2);
			}
			
			initQuantTables(sf);
			currentQuality = quality;
			//console.log('Quality set to: '+quality +'%');
		}
		
		function init(){
			var time_start = new Date().getTime();
			if(!quality) quality = 50;
			// Create tables
			initCharLookupTable();
			initHuffmanTbl();
			initCategoryNumber();
			initRGBYUVTable();
			
			setQuality(quality);
			new Date().getTime() - time_start;
	    	//console.log('Initialization '+ duration + 'ms');
		}
		
		init();
		
	}
	{
		module.exports = encode;
	}

	function encode(imgData, qu) {
	  if (typeof qu === 'undefined') qu = 50;
	  var encoder = new JPEGEncoder(qu);
		var data = encoder.encode(imgData, qu);
	  return {
	    data: data,
	    width: imgData.width,
	    height: imgData.height
	  };
	}
} (encoder$1));

var decoder$1 = {exports: {}};

/* -*- tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

(function (module) {
	/*
	   Copyright 2011 notmasteryet

	   Licensed under the Apache License, Version 2.0 (the "License");
	   you may not use this file except in compliance with the License.
	   You may obtain a copy of the License at

	       http://www.apache.org/licenses/LICENSE-2.0

	   Unless required by applicable law or agreed to in writing, software
	   distributed under the License is distributed on an "AS IS" BASIS,
	   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
	   See the License for the specific language governing permissions and
	   limitations under the License.
	*/

	// - The JPEG specification can be found in the ITU CCITT Recommendation T.81
	//   (www.w3.org/Graphics/JPEG/itu-t81.pdf)
	// - The JFIF specification can be found in the JPEG File Interchange Format
	//   (www.w3.org/Graphics/JPEG/jfif3.pdf)
	// - The Adobe Application-Specific JPEG markers in the Supporting the DCT Filters
	//   in PostScript Level 2, Technical Note #5116
	//   (partners.adobe.com/public/developer/en/ps/sdk/5116.DCT_Filter.pdf)

	var JpegImage = (function jpegImage() {
	  var dctZigZag = new Int32Array([
	     0,
	     1,  8,
	    16,  9,  2,
	     3, 10, 17, 24,
	    32, 25, 18, 11, 4,
	     5, 12, 19, 26, 33, 40,
	    48, 41, 34, 27, 20, 13,  6,
	     7, 14, 21, 28, 35, 42, 49, 56,
	    57, 50, 43, 36, 29, 22, 15,
	    23, 30, 37, 44, 51, 58,
	    59, 52, 45, 38, 31,
	    39, 46, 53, 60,
	    61, 54, 47,
	    55, 62,
	    63
	  ]);

	  var dctCos1  =  4017;   // cos(pi/16)
	  var dctSin1  =   799;   // sin(pi/16)
	  var dctCos3  =  3406;   // cos(3*pi/16)
	  var dctSin3  =  2276;   // sin(3*pi/16)
	  var dctCos6  =  1567;   // cos(6*pi/16)
	  var dctSin6  =  3784;   // sin(6*pi/16)
	  var dctSqrt2 =  5793;   // sqrt(2)
	  var dctSqrt1d2 = 2896;  // sqrt(2) / 2

	  function constructor() {
	  }

	  function buildHuffmanTable(codeLengths, values) {
	    var k = 0, code = [], i, j, length = 16;
	    while (length > 0 && !codeLengths[length - 1])
	      length--;
	    code.push({children: [], index: 0});
	    var p = code[0], q;
	    for (i = 0; i < length; i++) {
	      for (j = 0; j < codeLengths[i]; j++) {
	        p = code.pop();
	        p.children[p.index] = values[k];
	        while (p.index > 0) {
	          if (code.length === 0)
	            throw new Error('Could not recreate Huffman Table');
	          p = code.pop();
	        }
	        p.index++;
	        code.push(p);
	        while (code.length <= i) {
	          code.push(q = {children: [], index: 0});
	          p.children[p.index] = q.children;
	          p = q;
	        }
	        k++;
	      }
	      if (i + 1 < length) {
	        // p here points to last code
	        code.push(q = {children: [], index: 0});
	        p.children[p.index] = q.children;
	        p = q;
	      }
	    }
	    return code[0].children;
	  }

	  function decodeScan(data, offset,
	                      frame, components, resetInterval,
	                      spectralStart, spectralEnd,
	                      successivePrev, successive, opts) {
	    frame.precision;
	    frame.samplesPerLine;
	    frame.scanLines;
	    var mcusPerLine = frame.mcusPerLine;
	    var progressive = frame.progressive;
	    frame.maxH; frame.maxV;

	    var startOffset = offset, bitsData = 0, bitsCount = 0;
	    function readBit() {
	      if (bitsCount > 0) {
	        bitsCount--;
	        return (bitsData >> bitsCount) & 1;
	      }
	      bitsData = data[offset++];
	      if (bitsData == 0xFF) {
	        var nextByte = data[offset++];
	        if (nextByte) {
	          throw new Error("unexpected marker: " + ((bitsData << 8) | nextByte).toString(16));
	        }
	        // unstuff 0
	      }
	      bitsCount = 7;
	      return bitsData >>> 7;
	    }
	    function decodeHuffman(tree) {
	      var node = tree, bit;
	      while ((bit = readBit()) !== null) {
	        node = node[bit];
	        if (typeof node === 'number')
	          return node;
	        if (typeof node !== 'object')
	          throw new Error("invalid huffman sequence");
	      }
	      return null;
	    }
	    function receive(length) {
	      var n = 0;
	      while (length > 0) {
	        var bit = readBit();
	        if (bit === null) return;
	        n = (n << 1) | bit;
	        length--;
	      }
	      return n;
	    }
	    function receiveAndExtend(length) {
	      var n = receive(length);
	      if (n >= 1 << (length - 1))
	        return n;
	      return n + (-1 << length) + 1;
	    }
	    function decodeBaseline(component, zz) {
	      var t = decodeHuffman(component.huffmanTableDC);
	      var diff = t === 0 ? 0 : receiveAndExtend(t);
	      zz[0]= (component.pred += diff);
	      var k = 1;
	      while (k < 64) {
	        var rs = decodeHuffman(component.huffmanTableAC);
	        var s = rs & 15, r = rs >> 4;
	        if (s === 0) {
	          if (r < 15)
	            break;
	          k += 16;
	          continue;
	        }
	        k += r;
	        var z = dctZigZag[k];
	        zz[z] = receiveAndExtend(s);
	        k++;
	      }
	    }
	    function decodeDCFirst(component, zz) {
	      var t = decodeHuffman(component.huffmanTableDC);
	      var diff = t === 0 ? 0 : (receiveAndExtend(t) << successive);
	      zz[0] = (component.pred += diff);
	    }
	    function decodeDCSuccessive(component, zz) {
	      zz[0] |= readBit() << successive;
	    }
	    var eobrun = 0;
	    function decodeACFirst(component, zz) {
	      if (eobrun > 0) {
	        eobrun--;
	        return;
	      }
	      var k = spectralStart, e = spectralEnd;
	      while (k <= e) {
	        var rs = decodeHuffman(component.huffmanTableAC);
	        var s = rs & 15, r = rs >> 4;
	        if (s === 0) {
	          if (r < 15) {
	            eobrun = receive(r) + (1 << r) - 1;
	            break;
	          }
	          k += 16;
	          continue;
	        }
	        k += r;
	        var z = dctZigZag[k];
	        zz[z] = receiveAndExtend(s) * (1 << successive);
	        k++;
	      }
	    }
	    var successiveACState = 0, successiveACNextValue;
	    function decodeACSuccessive(component, zz) {
	      var k = spectralStart, e = spectralEnd, r = 0;
	      while (k <= e) {
	        var z = dctZigZag[k];
	        var direction = zz[z] < 0 ? -1 : 1;
	        switch (successiveACState) {
	        case 0: // initial state
	          var rs = decodeHuffman(component.huffmanTableAC);
	          var s = rs & 15, r = rs >> 4;
	          if (s === 0) {
	            if (r < 15) {
	              eobrun = receive(r) + (1 << r);
	              successiveACState = 4;
	            } else {
	              r = 16;
	              successiveACState = 1;
	            }
	          } else {
	            if (s !== 1)
	              throw new Error("invalid ACn encoding");
	            successiveACNextValue = receiveAndExtend(s);
	            successiveACState = r ? 2 : 3;
	          }
	          continue;
	        case 1: // skipping r zero items
	        case 2:
	          if (zz[z])
	            zz[z] += (readBit() << successive) * direction;
	          else {
	            r--;
	            if (r === 0)
	              successiveACState = successiveACState == 2 ? 3 : 0;
	          }
	          break;
	        case 3: // set value for a zero item
	          if (zz[z])
	            zz[z] += (readBit() << successive) * direction;
	          else {
	            zz[z] = successiveACNextValue << successive;
	            successiveACState = 0;
	          }
	          break;
	        case 4: // eob
	          if (zz[z])
	            zz[z] += (readBit() << successive) * direction;
	          break;
	        }
	        k++;
	      }
	      if (successiveACState === 4) {
	        eobrun--;
	        if (eobrun === 0)
	          successiveACState = 0;
	      }
	    }
	    function decodeMcu(component, decode, mcu, row, col) {
	      var mcuRow = (mcu / mcusPerLine) | 0;
	      var mcuCol = mcu % mcusPerLine;
	      var blockRow = mcuRow * component.v + row;
	      var blockCol = mcuCol * component.h + col;
	      // If the block is missing and we're in tolerant mode, just skip it.
	      if (component.blocks[blockRow] === undefined && opts.tolerantDecoding)
	        return;
	      decode(component, component.blocks[blockRow][blockCol]);
	    }
	    function decodeBlock(component, decode, mcu) {
	      var blockRow = (mcu / component.blocksPerLine) | 0;
	      var blockCol = mcu % component.blocksPerLine;
	      // If the block is missing and we're in tolerant mode, just skip it.
	      if (component.blocks[blockRow] === undefined && opts.tolerantDecoding)
	        return;
	      decode(component, component.blocks[blockRow][blockCol]);
	    }

	    var componentsLength = components.length;
	    var component, i, j, k, n;
	    var decodeFn;
	    if (progressive) {
	      if (spectralStart === 0)
	        decodeFn = successivePrev === 0 ? decodeDCFirst : decodeDCSuccessive;
	      else
	        decodeFn = successivePrev === 0 ? decodeACFirst : decodeACSuccessive;
	    } else {
	      decodeFn = decodeBaseline;
	    }

	    var mcu = 0, marker;
	    var mcuExpected;
	    if (componentsLength == 1) {
	      mcuExpected = components[0].blocksPerLine * components[0].blocksPerColumn;
	    } else {
	      mcuExpected = mcusPerLine * frame.mcusPerColumn;
	    }
	    if (!resetInterval) resetInterval = mcuExpected;

	    var h, v;
	    while (mcu < mcuExpected) {
	      // reset interval stuff
	      for (i = 0; i < componentsLength; i++)
	        components[i].pred = 0;
	      eobrun = 0;

	      if (componentsLength == 1) {
	        component = components[0];
	        for (n = 0; n < resetInterval; n++) {
	          decodeBlock(component, decodeFn, mcu);
	          mcu++;
	        }
	      } else {
	        for (n = 0; n < resetInterval; n++) {
	          for (i = 0; i < componentsLength; i++) {
	            component = components[i];
	            h = component.h;
	            v = component.v;
	            for (j = 0; j < v; j++) {
	              for (k = 0; k < h; k++) {
	                decodeMcu(component, decodeFn, mcu, j, k);
	              }
	            }
	          }
	          mcu++;

	          // If we've reached our expected MCU's, stop decoding
	          if (mcu === mcuExpected) break;
	        }
	      }

	      if (mcu === mcuExpected) {
	        // Skip trailing bytes at the end of the scan - until we reach the next marker
	        do {
	          if (data[offset] === 0xFF) {
	            if (data[offset + 1] !== 0x00) {
	              break;
	            }
	          }
	          offset += 1;
	        } while (offset < data.length - 2);
	      }

	      // find marker
	      bitsCount = 0;
	      marker = (data[offset] << 8) | data[offset + 1];
	      if (marker < 0xFF00) {
	        throw new Error("marker was not found");
	      }

	      if (marker >= 0xFFD0 && marker <= 0xFFD7) { // RSTx
	        offset += 2;
	      }
	      else
	        break;
	    }

	    return offset - startOffset;
	  }

	  function buildComponentData(frame, component) {
	    var lines = [];
	    var blocksPerLine = component.blocksPerLine;
	    var blocksPerColumn = component.blocksPerColumn;
	    var samplesPerLine = blocksPerLine << 3;
	    // Only 1 used per invocation of this function and garbage collected after invocation, so no need to account for its memory footprint.
	    var R = new Int32Array(64), r = new Uint8Array(64);

	    // A port of poppler's IDCT method which in turn is taken from:
	    //   Christoph Loeffler, Adriaan Ligtenberg, George S. Moschytz,
	    //   "Practical Fast 1-D DCT Algorithms with 11 Multiplications",
	    //   IEEE Intl. Conf. on Acoustics, Speech & Signal Processing, 1989,
	    //   988-991.
	    function quantizeAndInverse(zz, dataOut, dataIn) {
	      var qt = component.quantizationTable;
	      var v0, v1, v2, v3, v4, v5, v6, v7, t;
	      var p = dataIn;
	      var i;

	      // dequant
	      for (i = 0; i < 64; i++)
	        p[i] = zz[i] * qt[i];

	      // inverse DCT on rows
	      for (i = 0; i < 8; ++i) {
	        var row = 8 * i;

	        // check for all-zero AC coefficients
	        if (p[1 + row] == 0 && p[2 + row] == 0 && p[3 + row] == 0 &&
	            p[4 + row] == 0 && p[5 + row] == 0 && p[6 + row] == 0 &&
	            p[7 + row] == 0) {
	          t = (dctSqrt2 * p[0 + row] + 512) >> 10;
	          p[0 + row] = t;
	          p[1 + row] = t;
	          p[2 + row] = t;
	          p[3 + row] = t;
	          p[4 + row] = t;
	          p[5 + row] = t;
	          p[6 + row] = t;
	          p[7 + row] = t;
	          continue;
	        }

	        // stage 4
	        v0 = (dctSqrt2 * p[0 + row] + 128) >> 8;
	        v1 = (dctSqrt2 * p[4 + row] + 128) >> 8;
	        v2 = p[2 + row];
	        v3 = p[6 + row];
	        v4 = (dctSqrt1d2 * (p[1 + row] - p[7 + row]) + 128) >> 8;
	        v7 = (dctSqrt1d2 * (p[1 + row] + p[7 + row]) + 128) >> 8;
	        v5 = p[3 + row] << 4;
	        v6 = p[5 + row] << 4;

	        // stage 3
	        t = (v0 - v1+ 1) >> 1;
	        v0 = (v0 + v1 + 1) >> 1;
	        v1 = t;
	        t = (v2 * dctSin6 + v3 * dctCos6 + 128) >> 8;
	        v2 = (v2 * dctCos6 - v3 * dctSin6 + 128) >> 8;
	        v3 = t;
	        t = (v4 - v6 + 1) >> 1;
	        v4 = (v4 + v6 + 1) >> 1;
	        v6 = t;
	        t = (v7 + v5 + 1) >> 1;
	        v5 = (v7 - v5 + 1) >> 1;
	        v7 = t;

	        // stage 2
	        t = (v0 - v3 + 1) >> 1;
	        v0 = (v0 + v3 + 1) >> 1;
	        v3 = t;
	        t = (v1 - v2 + 1) >> 1;
	        v1 = (v1 + v2 + 1) >> 1;
	        v2 = t;
	        t = (v4 * dctSin3 + v7 * dctCos3 + 2048) >> 12;
	        v4 = (v4 * dctCos3 - v7 * dctSin3 + 2048) >> 12;
	        v7 = t;
	        t = (v5 * dctSin1 + v6 * dctCos1 + 2048) >> 12;
	        v5 = (v5 * dctCos1 - v6 * dctSin1 + 2048) >> 12;
	        v6 = t;

	        // stage 1
	        p[0 + row] = v0 + v7;
	        p[7 + row] = v0 - v7;
	        p[1 + row] = v1 + v6;
	        p[6 + row] = v1 - v6;
	        p[2 + row] = v2 + v5;
	        p[5 + row] = v2 - v5;
	        p[3 + row] = v3 + v4;
	        p[4 + row] = v3 - v4;
	      }

	      // inverse DCT on columns
	      for (i = 0; i < 8; ++i) {
	        var col = i;

	        // check for all-zero AC coefficients
	        if (p[1*8 + col] == 0 && p[2*8 + col] == 0 && p[3*8 + col] == 0 &&
	            p[4*8 + col] == 0 && p[5*8 + col] == 0 && p[6*8 + col] == 0 &&
	            p[7*8 + col] == 0) {
	          t = (dctSqrt2 * dataIn[i+0] + 8192) >> 14;
	          p[0*8 + col] = t;
	          p[1*8 + col] = t;
	          p[2*8 + col] = t;
	          p[3*8 + col] = t;
	          p[4*8 + col] = t;
	          p[5*8 + col] = t;
	          p[6*8 + col] = t;
	          p[7*8 + col] = t;
	          continue;
	        }

	        // stage 4
	        v0 = (dctSqrt2 * p[0*8 + col] + 2048) >> 12;
	        v1 = (dctSqrt2 * p[4*8 + col] + 2048) >> 12;
	        v2 = p[2*8 + col];
	        v3 = p[6*8 + col];
	        v4 = (dctSqrt1d2 * (p[1*8 + col] - p[7*8 + col]) + 2048) >> 12;
	        v7 = (dctSqrt1d2 * (p[1*8 + col] + p[7*8 + col]) + 2048) >> 12;
	        v5 = p[3*8 + col];
	        v6 = p[5*8 + col];

	        // stage 3
	        t = (v0 - v1 + 1) >> 1;
	        v0 = (v0 + v1 + 1) >> 1;
	        v1 = t;
	        t = (v2 * dctSin6 + v3 * dctCos6 + 2048) >> 12;
	        v2 = (v2 * dctCos6 - v3 * dctSin6 + 2048) >> 12;
	        v3 = t;
	        t = (v4 - v6 + 1) >> 1;
	        v4 = (v4 + v6 + 1) >> 1;
	        v6 = t;
	        t = (v7 + v5 + 1) >> 1;
	        v5 = (v7 - v5 + 1) >> 1;
	        v7 = t;

	        // stage 2
	        t = (v0 - v3 + 1) >> 1;
	        v0 = (v0 + v3 + 1) >> 1;
	        v3 = t;
	        t = (v1 - v2 + 1) >> 1;
	        v1 = (v1 + v2 + 1) >> 1;
	        v2 = t;
	        t = (v4 * dctSin3 + v7 * dctCos3 + 2048) >> 12;
	        v4 = (v4 * dctCos3 - v7 * dctSin3 + 2048) >> 12;
	        v7 = t;
	        t = (v5 * dctSin1 + v6 * dctCos1 + 2048) >> 12;
	        v5 = (v5 * dctCos1 - v6 * dctSin1 + 2048) >> 12;
	        v6 = t;

	        // stage 1
	        p[0*8 + col] = v0 + v7;
	        p[7*8 + col] = v0 - v7;
	        p[1*8 + col] = v1 + v6;
	        p[6*8 + col] = v1 - v6;
	        p[2*8 + col] = v2 + v5;
	        p[5*8 + col] = v2 - v5;
	        p[3*8 + col] = v3 + v4;
	        p[4*8 + col] = v3 - v4;
	      }

	      // convert to 8-bit integers
	      for (i = 0; i < 64; ++i) {
	        var sample = 128 + ((p[i] + 8) >> 4);
	        dataOut[i] = sample < 0 ? 0 : sample > 0xFF ? 0xFF : sample;
	      }
	    }

	    requestMemoryAllocation(samplesPerLine * blocksPerColumn * 8);

	    var i, j;
	    for (var blockRow = 0; blockRow < blocksPerColumn; blockRow++) {
	      var scanLine = blockRow << 3;
	      for (i = 0; i < 8; i++)
	        lines.push(new Uint8Array(samplesPerLine));
	      for (var blockCol = 0; blockCol < blocksPerLine; blockCol++) {
	        quantizeAndInverse(component.blocks[blockRow][blockCol], r, R);

	        var offset = 0, sample = blockCol << 3;
	        for (j = 0; j < 8; j++) {
	          var line = lines[scanLine + j];
	          for (i = 0; i < 8; i++)
	            line[sample + i] = r[offset++];
	        }
	      }
	    }
	    return lines;
	  }

	  function clampTo8bit(a) {
	    return a < 0 ? 0 : a > 255 ? 255 : a;
	  }

	  constructor.prototype = {
	    load: function load(path) {
	      var xhr = new XMLHttpRequest();
	      xhr.open("GET", path, true);
	      xhr.responseType = "arraybuffer";
	      xhr.onload = (function() {
	        // TODO catch parse error
	        var data = new Uint8Array(xhr.response || xhr.mozResponseArrayBuffer);
	        this.parse(data);
	        if (this.onload)
	          this.onload();
	      }).bind(this);
	      xhr.send(null);
	    },
	    parse: function parse(data) {
	      var maxResolutionInPixels = this.opts.maxResolutionInMP * 1000 * 1000;
	      var offset = 0; data.length;
	      function readUint16() {
	        var value = (data[offset] << 8) | data[offset + 1];
	        offset += 2;
	        return value;
	      }
	      function readDataBlock() {
	        var length = readUint16();
	        var array = data.subarray(offset, offset + length - 2);
	        offset += array.length;
	        return array;
	      }
	      function prepareComponents(frame) {
	        var maxH = 0, maxV = 0;
	        var component, componentId;
	        for (componentId in frame.components) {
	          if (frame.components.hasOwnProperty(componentId)) {
	            component = frame.components[componentId];
	            if (maxH < component.h) maxH = component.h;
	            if (maxV < component.v) maxV = component.v;
	          }
	        }
	        var mcusPerLine = Math.ceil(frame.samplesPerLine / 8 / maxH);
	        var mcusPerColumn = Math.ceil(frame.scanLines / 8 / maxV);
	        for (componentId in frame.components) {
	          if (frame.components.hasOwnProperty(componentId)) {
	            component = frame.components[componentId];
	            var blocksPerLine = Math.ceil(Math.ceil(frame.samplesPerLine / 8) * component.h / maxH);
	            var blocksPerColumn = Math.ceil(Math.ceil(frame.scanLines  / 8) * component.v / maxV);
	            var blocksPerLineForMcu = mcusPerLine * component.h;
	            var blocksPerColumnForMcu = mcusPerColumn * component.v;
	            var blocksToAllocate = blocksPerColumnForMcu * blocksPerLineForMcu;
	            var blocks = [];

	            // Each block is a Int32Array of length 64 (4 x 64 = 256 bytes)
	            requestMemoryAllocation(blocksToAllocate * 256);

	            for (var i = 0; i < blocksPerColumnForMcu; i++) {
	              var row = [];
	              for (var j = 0; j < blocksPerLineForMcu; j++)
	                row.push(new Int32Array(64));
	              blocks.push(row);
	            }
	            component.blocksPerLine = blocksPerLine;
	            component.blocksPerColumn = blocksPerColumn;
	            component.blocks = blocks;
	          }
	        }
	        frame.maxH = maxH;
	        frame.maxV = maxV;
	        frame.mcusPerLine = mcusPerLine;
	        frame.mcusPerColumn = mcusPerColumn;
	      }
	      var jfif = null;
	      var adobe = null;
	      var frame, resetInterval;
	      var quantizationTables = [], frames = [];
	      var huffmanTablesAC = [], huffmanTablesDC = [];
	      var fileMarker = readUint16();
	      var malformedDataOffset = -1;
	      this.comments = [];
	      if (fileMarker != 0xFFD8) { // SOI (Start of Image)
	        throw new Error("SOI not found");
	      }

	      fileMarker = readUint16();
	      while (fileMarker != 0xFFD9) { // EOI (End of image)
	        var i, j;
	        switch(fileMarker) {
	          case 0xFF00: break;
	          case 0xFFE0: // APP0 (Application Specific)
	          case 0xFFE1: // APP1
	          case 0xFFE2: // APP2
	          case 0xFFE3: // APP3
	          case 0xFFE4: // APP4
	          case 0xFFE5: // APP5
	          case 0xFFE6: // APP6
	          case 0xFFE7: // APP7
	          case 0xFFE8: // APP8
	          case 0xFFE9: // APP9
	          case 0xFFEA: // APP10
	          case 0xFFEB: // APP11
	          case 0xFFEC: // APP12
	          case 0xFFED: // APP13
	          case 0xFFEE: // APP14
	          case 0xFFEF: // APP15
	          case 0xFFFE: // COM (Comment)
	            var appData = readDataBlock();

	            if (fileMarker === 0xFFFE) {
	              var comment = String.fromCharCode.apply(null, appData);
	              this.comments.push(comment);
	            }

	            if (fileMarker === 0xFFE0) {
	              if (appData[0] === 0x4A && appData[1] === 0x46 && appData[2] === 0x49 &&
	                appData[3] === 0x46 && appData[4] === 0) { // 'JFIF\x00'
	                jfif = {
	                  version: { major: appData[5], minor: appData[6] },
	                  densityUnits: appData[7],
	                  xDensity: (appData[8] << 8) | appData[9],
	                  yDensity: (appData[10] << 8) | appData[11],
	                  thumbWidth: appData[12],
	                  thumbHeight: appData[13],
	                  thumbData: appData.subarray(14, 14 + 3 * appData[12] * appData[13])
	                };
	              }
	            }
	            // TODO APP1 - Exif
	            if (fileMarker === 0xFFE1) {
	              if (appData[0] === 0x45 &&
	                appData[1] === 0x78 &&
	                appData[2] === 0x69 &&
	                appData[3] === 0x66 &&
	                appData[4] === 0) { // 'EXIF\x00'
	                this.exifBuffer = appData.subarray(5, appData.length);
	              }
	            }

	            if (fileMarker === 0xFFEE) {
	              if (appData[0] === 0x41 && appData[1] === 0x64 && appData[2] === 0x6F &&
	                appData[3] === 0x62 && appData[4] === 0x65 && appData[5] === 0) { // 'Adobe\x00'
	                adobe = {
	                  version: appData[6],
	                  flags0: (appData[7] << 8) | appData[8],
	                  flags1: (appData[9] << 8) | appData[10],
	                  transformCode: appData[11]
	                };
	              }
	            }
	            break;

	          case 0xFFDB: // DQT (Define Quantization Tables)
	            var quantizationTablesLength = readUint16();
	            var quantizationTablesEnd = quantizationTablesLength + offset - 2;
	            while (offset < quantizationTablesEnd) {
	              var quantizationTableSpec = data[offset++];
	              requestMemoryAllocation(64 * 4);
	              var tableData = new Int32Array(64);
	              if ((quantizationTableSpec >> 4) === 0) { // 8 bit values
	                for (j = 0; j < 64; j++) {
	                  var z = dctZigZag[j];
	                  tableData[z] = data[offset++];
	                }
	              } else if ((quantizationTableSpec >> 4) === 1) { //16 bit
	                for (j = 0; j < 64; j++) {
	                  var z = dctZigZag[j];
	                  tableData[z] = readUint16();
	                }
	              } else
	                throw new Error("DQT: invalid table spec");
	              quantizationTables[quantizationTableSpec & 15] = tableData;
	            }
	            break;

	          case 0xFFC0: // SOF0 (Start of Frame, Baseline DCT)
	          case 0xFFC1: // SOF1 (Start of Frame, Extended DCT)
	          case 0xFFC2: // SOF2 (Start of Frame, Progressive DCT)
	            readUint16(); // skip data length
	            frame = {};
	            frame.extended = (fileMarker === 0xFFC1);
	            frame.progressive = (fileMarker === 0xFFC2);
	            frame.precision = data[offset++];
	            frame.scanLines = readUint16();
	            frame.samplesPerLine = readUint16();
	            frame.components = {};
	            frame.componentsOrder = [];

	            var pixelsInFrame = frame.scanLines * frame.samplesPerLine;
	            if (pixelsInFrame > maxResolutionInPixels) {
	              var exceededAmount = Math.ceil((pixelsInFrame - maxResolutionInPixels) / 1e6);
	              throw new Error(`maxResolutionInMP limit exceeded by ${exceededAmount}MP`);
	            }

	            var componentsCount = data[offset++], componentId;
	            for (i = 0; i < componentsCount; i++) {
	              componentId = data[offset];
	              var h = data[offset + 1] >> 4;
	              var v = data[offset + 1] & 15;
	              var qId = data[offset + 2];
	              frame.componentsOrder.push(componentId);
	              frame.components[componentId] = {
	                h: h,
	                v: v,
	                quantizationIdx: qId
	              };
	              offset += 3;
	            }
	            prepareComponents(frame);
	            frames.push(frame);
	            break;

	          case 0xFFC4: // DHT (Define Huffman Tables)
	            var huffmanLength = readUint16();
	            for (i = 2; i < huffmanLength;) {
	              var huffmanTableSpec = data[offset++];
	              var codeLengths = new Uint8Array(16);
	              var codeLengthSum = 0;
	              for (j = 0; j < 16; j++, offset++) {
	                codeLengthSum += (codeLengths[j] = data[offset]);
	              }
	              requestMemoryAllocation(16 + codeLengthSum);
	              var huffmanValues = new Uint8Array(codeLengthSum);
	              for (j = 0; j < codeLengthSum; j++, offset++)
	                huffmanValues[j] = data[offset];
	              i += 17 + codeLengthSum;

	              ((huffmanTableSpec >> 4) === 0 ?
	                huffmanTablesDC : huffmanTablesAC)[huffmanTableSpec & 15] =
	                buildHuffmanTable(codeLengths, huffmanValues);
	            }
	            break;

	          case 0xFFDD: // DRI (Define Restart Interval)
	            readUint16(); // skip data length
	            resetInterval = readUint16();
	            break;

	          case 0xFFDC: // Number of Lines marker
	            readUint16(); // skip data length
	            readUint16(); // Ignore this data since it represents the image height
	            break;
	            
	          case 0xFFDA: // SOS (Start of Scan)
	            readUint16();
	            var selectorsCount = data[offset++];
	            var components = [], component;
	            for (i = 0; i < selectorsCount; i++) {
	              component = frame.components[data[offset++]];
	              var tableSpec = data[offset++];
	              component.huffmanTableDC = huffmanTablesDC[tableSpec >> 4];
	              component.huffmanTableAC = huffmanTablesAC[tableSpec & 15];
	              components.push(component);
	            }
	            var spectralStart = data[offset++];
	            var spectralEnd = data[offset++];
	            var successiveApproximation = data[offset++];
	            var processed = decodeScan(data, offset,
	              frame, components, resetInterval,
	              spectralStart, spectralEnd,
	              successiveApproximation >> 4, successiveApproximation & 15, this.opts);
	            offset += processed;
	            break;

	          case 0xFFFF: // Fill bytes
	            if (data[offset] !== 0xFF) { // Avoid skipping a valid marker.
	              offset--;
	            }
	            break;
	          default:
	            if (data[offset - 3] == 0xFF &&
	                data[offset - 2] >= 0xC0 && data[offset - 2] <= 0xFE) {
	              // could be incorrect encoding -- last 0xFF byte of the previous
	              // block was eaten by the encoder
	              offset -= 3;
	              break;
	            }
	            else if (fileMarker === 0xE0 || fileMarker == 0xE1) {
	              // Recover from malformed APP1 markers popular in some phone models.
	              // See https://github.com/eugeneware/jpeg-js/issues/82
	              if (malformedDataOffset !== -1) {
	                throw new Error(`first unknown JPEG marker at offset ${malformedDataOffset.toString(16)}, second unknown JPEG marker ${fileMarker.toString(16)} at offset ${(offset - 1).toString(16)}`);
	              }
	              malformedDataOffset = offset - 1;
	              const nextOffset = readUint16();
	              if (data[offset + nextOffset - 2] === 0xFF) {
	                offset += nextOffset - 2;
	                break;
	              }
	            }
	            throw new Error("unknown JPEG marker " + fileMarker.toString(16));
	        }
	        fileMarker = readUint16();
	      }
	      if (frames.length != 1)
	        throw new Error("only single frame JPEGs supported");

	      // set each frame's components quantization table
	      for (var i = 0; i < frames.length; i++) {
	        var cp = frames[i].components;
	        for (var j in cp) {
	          cp[j].quantizationTable = quantizationTables[cp[j].quantizationIdx];
	          delete cp[j].quantizationIdx;
	        }
	      }

	      this.width = frame.samplesPerLine;
	      this.height = frame.scanLines;
	      this.jfif = jfif;
	      this.adobe = adobe;
	      this.components = [];
	      for (var i = 0; i < frame.componentsOrder.length; i++) {
	        var component = frame.components[frame.componentsOrder[i]];
	        this.components.push({
	          lines: buildComponentData(frame, component),
	          scaleX: component.h / frame.maxH,
	          scaleY: component.v / frame.maxV
	        });
	      }
	    },
	    getData: function getData(width, height) {
	      var scaleX = this.width / width, scaleY = this.height / height;

	      var component1, component2, component3, component4;
	      var component1Line, component2Line, component3Line, component4Line;
	      var x, y;
	      var offset = 0;
	      var Y, Cb, Cr, K, C, M, Ye, R, G, B;
	      var colorTransform;
	      var dataLength = width * height * this.components.length;
	      requestMemoryAllocation(dataLength);
	      var data = new Uint8Array(dataLength);
	      switch (this.components.length) {
	        case 1:
	          component1 = this.components[0];
	          for (y = 0; y < height; y++) {
	            component1Line = component1.lines[0 | (y * component1.scaleY * scaleY)];
	            for (x = 0; x < width; x++) {
	              Y = component1Line[0 | (x * component1.scaleX * scaleX)];

	              data[offset++] = Y;
	            }
	          }
	          break;
	        case 2:
	          // PDF might compress two component data in custom colorspace
	          component1 = this.components[0];
	          component2 = this.components[1];
	          for (y = 0; y < height; y++) {
	            component1Line = component1.lines[0 | (y * component1.scaleY * scaleY)];
	            component2Line = component2.lines[0 | (y * component2.scaleY * scaleY)];
	            for (x = 0; x < width; x++) {
	              Y = component1Line[0 | (x * component1.scaleX * scaleX)];
	              data[offset++] = Y;
	              Y = component2Line[0 | (x * component2.scaleX * scaleX)];
	              data[offset++] = Y;
	            }
	          }
	          break;
	        case 3:
	          // The default transform for three components is true
	          colorTransform = true;
	          // The adobe transform marker overrides any previous setting
	          if (this.adobe && this.adobe.transformCode)
	            colorTransform = true;
	          else if (typeof this.opts.colorTransform !== 'undefined')
	            colorTransform = !!this.opts.colorTransform;

	          component1 = this.components[0];
	          component2 = this.components[1];
	          component3 = this.components[2];
	          for (y = 0; y < height; y++) {
	            component1Line = component1.lines[0 | (y * component1.scaleY * scaleY)];
	            component2Line = component2.lines[0 | (y * component2.scaleY * scaleY)];
	            component3Line = component3.lines[0 | (y * component3.scaleY * scaleY)];
	            for (x = 0; x < width; x++) {
	              if (!colorTransform) {
	                R = component1Line[0 | (x * component1.scaleX * scaleX)];
	                G = component2Line[0 | (x * component2.scaleX * scaleX)];
	                B = component3Line[0 | (x * component3.scaleX * scaleX)];
	              } else {
	                Y = component1Line[0 | (x * component1.scaleX * scaleX)];
	                Cb = component2Line[0 | (x * component2.scaleX * scaleX)];
	                Cr = component3Line[0 | (x * component3.scaleX * scaleX)];

	                R = clampTo8bit(Y + 1.402 * (Cr - 128));
	                G = clampTo8bit(Y - 0.3441363 * (Cb - 128) - 0.71413636 * (Cr - 128));
	                B = clampTo8bit(Y + 1.772 * (Cb - 128));
	              }

	              data[offset++] = R;
	              data[offset++] = G;
	              data[offset++] = B;
	            }
	          }
	          break;
	        case 4:
	          if (!this.adobe)
	            throw new Error('Unsupported color mode (4 components)');
	          // The default transform for four components is false
	          colorTransform = false;
	          // The adobe transform marker overrides any previous setting
	          if (this.adobe && this.adobe.transformCode)
	            colorTransform = true;
	          else if (typeof this.opts.colorTransform !== 'undefined')
	            colorTransform = !!this.opts.colorTransform;

	          component1 = this.components[0];
	          component2 = this.components[1];
	          component3 = this.components[2];
	          component4 = this.components[3];
	          for (y = 0; y < height; y++) {
	            component1Line = component1.lines[0 | (y * component1.scaleY * scaleY)];
	            component2Line = component2.lines[0 | (y * component2.scaleY * scaleY)];
	            component3Line = component3.lines[0 | (y * component3.scaleY * scaleY)];
	            component4Line = component4.lines[0 | (y * component4.scaleY * scaleY)];
	            for (x = 0; x < width; x++) {
	              if (!colorTransform) {
	                C = component1Line[0 | (x * component1.scaleX * scaleX)];
	                M = component2Line[0 | (x * component2.scaleX * scaleX)];
	                Ye = component3Line[0 | (x * component3.scaleX * scaleX)];
	                K = component4Line[0 | (x * component4.scaleX * scaleX)];
	              } else {
	                Y = component1Line[0 | (x * component1.scaleX * scaleX)];
	                Cb = component2Line[0 | (x * component2.scaleX * scaleX)];
	                Cr = component3Line[0 | (x * component3.scaleX * scaleX)];
	                K = component4Line[0 | (x * component4.scaleX * scaleX)];

	                C = 255 - clampTo8bit(Y + 1.402 * (Cr - 128));
	                M = 255 - clampTo8bit(Y - 0.3441363 * (Cb - 128) - 0.71413636 * (Cr - 128));
	                Ye = 255 - clampTo8bit(Y + 1.772 * (Cb - 128));
	              }
	              data[offset++] = 255-C;
	              data[offset++] = 255-M;
	              data[offset++] = 255-Ye;
	              data[offset++] = 255-K;
	            }
	          }
	          break;
	        default:
	          throw new Error('Unsupported color mode');
	      }
	      return data;
	    },
	    copyToImageData: function copyToImageData(imageData, formatAsRGBA) {
	      var width = imageData.width, height = imageData.height;
	      var imageDataArray = imageData.data;
	      var data = this.getData(width, height);
	      var i = 0, j = 0, x, y;
	      var Y, K, C, M, R, G, B;
	      switch (this.components.length) {
	        case 1:
	          for (y = 0; y < height; y++) {
	            for (x = 0; x < width; x++) {
	              Y = data[i++];

	              imageDataArray[j++] = Y;
	              imageDataArray[j++] = Y;
	              imageDataArray[j++] = Y;
	              if (formatAsRGBA) {
	                imageDataArray[j++] = 255;
	              }
	            }
	          }
	          break;
	        case 3:
	          for (y = 0; y < height; y++) {
	            for (x = 0; x < width; x++) {
	              R = data[i++];
	              G = data[i++];
	              B = data[i++];

	              imageDataArray[j++] = R;
	              imageDataArray[j++] = G;
	              imageDataArray[j++] = B;
	              if (formatAsRGBA) {
	                imageDataArray[j++] = 255;
	              }
	            }
	          }
	          break;
	        case 4:
	          for (y = 0; y < height; y++) {
	            for (x = 0; x < width; x++) {
	              C = data[i++];
	              M = data[i++];
	              Y = data[i++];
	              K = data[i++];

	              R = 255 - clampTo8bit(C * (1 - K / 255) + K);
	              G = 255 - clampTo8bit(M * (1 - K / 255) + K);
	              B = 255 - clampTo8bit(Y * (1 - K / 255) + K);

	              imageDataArray[j++] = R;
	              imageDataArray[j++] = G;
	              imageDataArray[j++] = B;
	              if (formatAsRGBA) {
	                imageDataArray[j++] = 255;
	              }
	            }
	          }
	          break;
	        default:
	          throw new Error('Unsupported color mode');
	      }
	    }
	  };


	  // We cap the amount of memory used by jpeg-js to avoid unexpected OOMs from untrusted content.
	  var totalBytesAllocated = 0;
	  var maxMemoryUsageBytes = 0;
	  function requestMemoryAllocation(increaseAmount = 0) {
	    var totalMemoryImpactBytes = totalBytesAllocated + increaseAmount;
	    if (totalMemoryImpactBytes > maxMemoryUsageBytes) {
	      var exceededAmount = Math.ceil((totalMemoryImpactBytes - maxMemoryUsageBytes) / 1024 / 1024);
	      throw new Error(`maxMemoryUsageInMB limit exceeded by at least ${exceededAmount}MB`);
	    }

	    totalBytesAllocated = totalMemoryImpactBytes;
	  }

	  constructor.resetMaxMemoryUsage = function (maxMemoryUsageBytes_) {
	    totalBytesAllocated = 0;
	    maxMemoryUsageBytes = maxMemoryUsageBytes_;
	  };

	  constructor.getBytesAllocated = function () {
	    return totalBytesAllocated;
	  };

	  constructor.requestMemoryAllocation = requestMemoryAllocation;

	  return constructor;
	})();

	{
		module.exports = decode;
	}

	function decode(jpegData, userOpts = {}) {
	  var defaultOpts = {
	    // "undefined" means "Choose whether to transform colors based on the image’s color model."
	    colorTransform: undefined,
	    useTArray: false,
	    formatAsRGBA: true,
	    tolerantDecoding: true,
	    maxResolutionInMP: 100, // Don't decode more than 100 megapixels
	    maxMemoryUsageInMB: 512, // Don't decode if memory footprint is more than 512MB
	  };

	  var opts = {...defaultOpts, ...userOpts};
	  var arr = new Uint8Array(jpegData);
	  var decoder = new JpegImage();
	  decoder.opts = opts;
	  // If this constructor ever supports async decoding this will need to be done differently.
	  // Until then, treating as singleton limit is fine.
	  JpegImage.resetMaxMemoryUsage(opts.maxMemoryUsageInMB * 1024 * 1024);
	  decoder.parse(arr);

	  var channels = (opts.formatAsRGBA) ? 4 : 3;
	  var bytesNeeded = decoder.width * decoder.height * channels;
	  try {
	    JpegImage.requestMemoryAllocation(bytesNeeded);
	    var image = {
	      width: decoder.width,
	      height: decoder.height,
	      exifBuffer: decoder.exifBuffer,
	      data: opts.useTArray ?
	        new Uint8Array(bytesNeeded) :
	        Buffer.alloc(bytesNeeded)
	    };
	    if(decoder.comments.length > 0) {
	      image["comments"] = decoder.comments;
	    }
	  } catch (err){
	    if (err instanceof RangeError){
	      throw new Error("Could not allocate enough memory for the image. " +
	                      "Required: " + bytesNeeded);
	    } else {
	      throw err;
	    }
	  }

	  decoder.copyToImageData(image, opts.formatAsRGBA);

	  return image;
	}
} (decoder$1));

var encode$1 = encoder$1.exports,
    decode$1 = decoder$1.exports;

var jpegJs = {
  encode: encode$1,
  decode: decode$1
};

/*
 * Copyright 2017 Sam Thorogood. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not
 * use this file except in compliance with the License. You may obtain a copy of
 * the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations under
 * the License.
 */
(function (scope) {
    // fail early
    if (scope['TextEncoder'] && scope['TextDecoder']) {
        return false;
    }
    /**
     * @constructor
     * @param {string=} utfLabel
     */
    function FastTextEncoder(utfLabel = 'utf-8') {
        if (utfLabel !== 'utf-8') {
            throw new RangeError(`Failed to construct 'TextEncoder': The encoding label provided ('${utfLabel}') is invalid.`);
        }
    }
    Object.defineProperty(FastTextEncoder.prototype, 'encoding', {
        value: 'utf-8',
    });
    /**
     * @param {string} string
     * @param {{stream: boolean}=} options
     * @return {!Uint8Array}
     */
    FastTextEncoder.prototype.encode = function (string, options = { stream: false }) {
        if (options.stream) {
            throw new Error(`Failed to encode: the 'stream' option is unsupported.`);
        }
        let pos = 0;
        const len = string.length;
        let at = 0; // output position
        let tlen = Math.max(32, len + (len >> 1) + 7); // 1.5x size
        let target = new Uint8Array((tlen >> 3) << 3); // ... but at 8 byte offset
        while (pos < len) {
            let value = string.charCodeAt(pos++);
            if (value >= 0xd800 && value <= 0xdbff) {
                // high surrogate
                if (pos < len) {
                    const extra = string.charCodeAt(pos);
                    if ((extra & 0xfc00) === 0xdc00) {
                        ++pos;
                        value = ((value & 0x3ff) << 10) + (extra & 0x3ff) + 0x10000;
                    }
                }
                if (value >= 0xd800 && value <= 0xdbff) {
                    continue; // drop lone surrogate
                }
            }
            // expand the buffer if we couldn't write 4 bytes
            if (at + 4 > target.length) {
                tlen += 8; // minimum extra
                tlen *= 1.0 + (pos / string.length) * 2; // take 2x the remaining
                tlen = (tlen >> 3) << 3; // 8 byte offset
                const update = new Uint8Array(tlen);
                update.set(target);
                target = update;
            }
            if ((value & 0xffffff80) === 0) {
                // 1-byte
                target[at++] = value; // ASCII
                continue;
            }
            else if ((value & 0xfffff800) === 0) {
                // 2-byte
                target[at++] = ((value >> 6) & 0x1f) | 0xc0;
            }
            else if ((value & 0xffff0000) === 0) {
                // 3-byte
                target[at++] = ((value >> 12) & 0x0f) | 0xe0;
                target[at++] = ((value >> 6) & 0x3f) | 0x80;
            }
            else if ((value & 0xffe00000) === 0) {
                // 4-byte
                target[at++] = ((value >> 18) & 0x07) | 0xf0;
                target[at++] = ((value >> 12) & 0x3f) | 0x80;
                target[at++] = ((value >> 6) & 0x3f) | 0x80;
            }
            else {
                // FIXME: do we care
                continue;
            }
            target[at++] = (value & 0x3f) | 0x80;
        }
        return target.slice(0, at);
    };
    /**
     * @constructor
     * @param {string=} utfLabel
     * @param {{fatal: boolean}=} options
     */
    function FastTextDecoder(utfLabel = 'utf-8', options = { fatal: false }) {
        if (utfLabel !== 'utf-8') {
            throw new RangeError(`Failed to construct 'TextDecoder': The encoding label provided ('${utfLabel}') is invalid.`);
        }
        if (options.fatal) {
            throw new Error(`Failed to construct 'TextDecoder': the 'fatal' option is unsupported.`);
        }
    }
    Object.defineProperty(FastTextDecoder.prototype, 'encoding', {
        value: 'utf-8',
    });
    Object.defineProperty(FastTextDecoder.prototype, 'fatal', { value: false });
    Object.defineProperty(FastTextDecoder.prototype, 'ignoreBOM', {
        value: false,
    });
    /**
     * @param {(!ArrayBuffer|!ArrayBufferView)} buffer
     * @param {{stream: boolean}=} options
     */
    FastTextDecoder.prototype.decode = function (buffer, options = { stream: false }) {
        if (options['stream']) {
            throw new Error(`Failed to decode: the 'stream' option is unsupported.`);
        }
        const bytes = new Uint8Array(buffer);
        let pos = 0;
        const len = bytes.length;
        const out = [];
        while (pos < len) {
            const byte1 = bytes[pos++];
            if (byte1 === 0) {
                break; // NULL
            }
            if ((byte1 & 0x80) === 0) {
                // 1-byte
                out.push(byte1);
            }
            else if ((byte1 & 0xe0) === 0xc0) {
                // 2-byte
                const byte2 = bytes[pos++] & 0x3f;
                out.push(((byte1 & 0x1f) << 6) | byte2);
            }
            else if ((byte1 & 0xf0) === 0xe0) {
                const byte2 = bytes[pos++] & 0x3f;
                const byte3 = bytes[pos++] & 0x3f;
                out.push(((byte1 & 0x1f) << 12) | (byte2 << 6) | byte3);
            }
            else if ((byte1 & 0xf8) === 0xf0) {
                const byte2 = bytes[pos++] & 0x3f;
                const byte3 = bytes[pos++] & 0x3f;
                const byte4 = bytes[pos++] & 0x3f;
                // this can be > 0xffff, so possibly generate surrogates
                let codepoint = ((byte1 & 0x07) << 0x12) | (byte2 << 0x0c) | (byte3 << 0x06) | byte4;
                if (codepoint > 0xffff) {
                    // codepoint &= ~0x10000;
                    codepoint -= 0x10000;
                    out.push(((codepoint >>> 10) & 0x3ff) | 0xd800);
                    codepoint = 0xdc00 | (codepoint & 0x3ff);
                }
                out.push(codepoint);
            }
            else ;
        }
        return String.fromCharCode.apply(null, out);
    };
    scope['TextEncoder'] = FastTextEncoder;
    scope['TextDecoder'] = FastTextDecoder;
})(typeof window !== 'undefined'
    ? window
    : typeof self !== 'undefined'
        ? self
        : undefined);

// eslint-disable-next-line import/no-unassigned-import
const decoder = new TextDecoder('utf-8');
function decode(bytes) {
    return decoder.decode(bytes);
}
const encoder = new TextEncoder();
function encode(str) {
    return encoder.encode(str);
}

const defaultByteLength = 1024 * 8;
class IOBuffer {
    /**
     * @param data - The data to construct the IOBuffer with.
     * If data is a number, it will be the new buffer's length<br>
     * If data is `undefined`, the buffer will be initialized with a default length of 8Kb<br>
     * If data is an ArrayBuffer, SharedArrayBuffer, an ArrayBufferView (Typed Array), an IOBuffer instance,
     * or a Node.js Buffer, a view will be created over the underlying ArrayBuffer.
     * @param options
     */
    constructor(data = defaultByteLength, options = {}) {
        let dataIsGiven = false;
        if (typeof data === 'number') {
            data = new ArrayBuffer(data);
        }
        else {
            dataIsGiven = true;
            this.lastWrittenByte = data.byteLength;
        }
        const offset = options.offset ? options.offset >>> 0 : 0;
        const byteLength = data.byteLength - offset;
        let dvOffset = offset;
        if (ArrayBuffer.isView(data) || data instanceof IOBuffer) {
            if (data.byteLength !== data.buffer.byteLength) {
                dvOffset = data.byteOffset + offset;
            }
            data = data.buffer;
        }
        if (dataIsGiven) {
            this.lastWrittenByte = byteLength;
        }
        else {
            this.lastWrittenByte = 0;
        }
        this.buffer = data;
        this.length = byteLength;
        this.byteLength = byteLength;
        this.byteOffset = dvOffset;
        this.offset = 0;
        this.littleEndian = true;
        this._data = new DataView(this.buffer, dvOffset, byteLength);
        this._mark = 0;
        this._marks = [];
    }
    /**
     * Checks if the memory allocated to the buffer is sufficient to store more
     * bytes after the offset.
     * @param byteLength - The needed memory in bytes.
     * @returns `true` if there is sufficient space and `false` otherwise.
     */
    available(byteLength = 1) {
        return this.offset + byteLength <= this.length;
    }
    /**
     * Check if little-endian mode is used for reading and writing multi-byte
     * values.
     * @returns `true` if little-endian mode is used, `false` otherwise.
     */
    isLittleEndian() {
        return this.littleEndian;
    }
    /**
     * Set little-endian mode for reading and writing multi-byte values.
     */
    setLittleEndian() {
        this.littleEndian = true;
        return this;
    }
    /**
     * Check if big-endian mode is used for reading and writing multi-byte values.
     * @returns `true` if big-endian mode is used, `false` otherwise.
     */
    isBigEndian() {
        return !this.littleEndian;
    }
    /**
     * Switches to big-endian mode for reading and writing multi-byte values.
     */
    setBigEndian() {
        this.littleEndian = false;
        return this;
    }
    /**
     * Move the pointer n bytes forward.
     * @param n - Number of bytes to skip.
     */
    skip(n = 1) {
        this.offset += n;
        return this;
    }
    /**
     * Move the pointer to the given offset.
     * @param offset
     */
    seek(offset) {
        this.offset = offset;
        return this;
    }
    /**
     * Store the current pointer offset.
     * @see {@link IOBuffer#reset}
     */
    mark() {
        this._mark = this.offset;
        return this;
    }
    /**
     * Move the pointer back to the last pointer offset set by mark.
     * @see {@link IOBuffer#mark}
     */
    reset() {
        this.offset = this._mark;
        return this;
    }
    /**
     * Push the current pointer offset to the mark stack.
     * @see {@link IOBuffer#popMark}
     */
    pushMark() {
        this._marks.push(this.offset);
        return this;
    }
    /**
     * Pop the last pointer offset from the mark stack, and set the current
     * pointer offset to the popped value.
     * @see {@link IOBuffer#pushMark}
     */
    popMark() {
        const offset = this._marks.pop();
        if (offset === undefined) {
            throw new Error('Mark stack empty');
        }
        this.seek(offset);
        return this;
    }
    /**
     * Move the pointer offset back to 0.
     */
    rewind() {
        this.offset = 0;
        return this;
    }
    /**
     * Make sure the buffer has sufficient memory to write a given byteLength at
     * the current pointer offset.
     * If the buffer's memory is insufficient, this method will create a new
     * buffer (a copy) with a length that is twice (byteLength + current offset).
     * @param byteLength
     */
    ensureAvailable(byteLength = 1) {
        if (!this.available(byteLength)) {
            const lengthNeeded = this.offset + byteLength;
            const newLength = lengthNeeded * 2;
            const newArray = new Uint8Array(newLength);
            newArray.set(new Uint8Array(this.buffer));
            this.buffer = newArray.buffer;
            this.length = this.byteLength = newLength;
            this._data = new DataView(this.buffer);
        }
        return this;
    }
    /**
     * Read a byte and return false if the byte's value is 0, or true otherwise.
     * Moves pointer forward by one byte.
     */
    readBoolean() {
        return this.readUint8() !== 0;
    }
    /**
     * Read a signed 8-bit integer and move pointer forward by 1 byte.
     */
    readInt8() {
        return this._data.getInt8(this.offset++);
    }
    /**
     * Read an unsigned 8-bit integer and move pointer forward by 1 byte.
     */
    readUint8() {
        return this._data.getUint8(this.offset++);
    }
    /**
     * Alias for {@link IOBuffer#readUint8}.
     */
    readByte() {
        return this.readUint8();
    }
    /**
     * Read `n` bytes and move pointer forward by `n` bytes.
     */
    readBytes(n = 1) {
        const bytes = new Uint8Array(n);
        for (let i = 0; i < n; i++) {
            bytes[i] = this.readByte();
        }
        return bytes;
    }
    /**
     * Read a 16-bit signed integer and move pointer forward by 2 bytes.
     */
    readInt16() {
        const value = this._data.getInt16(this.offset, this.littleEndian);
        this.offset += 2;
        return value;
    }
    /**
     * Read a 16-bit unsigned integer and move pointer forward by 2 bytes.
     */
    readUint16() {
        const value = this._data.getUint16(this.offset, this.littleEndian);
        this.offset += 2;
        return value;
    }
    /**
     * Read a 32-bit signed integer and move pointer forward by 4 bytes.
     */
    readInt32() {
        const value = this._data.getInt32(this.offset, this.littleEndian);
        this.offset += 4;
        return value;
    }
    /**
     * Read a 32-bit unsigned integer and move pointer forward by 4 bytes.
     */
    readUint32() {
        const value = this._data.getUint32(this.offset, this.littleEndian);
        this.offset += 4;
        return value;
    }
    /**
     * Read a 32-bit floating number and move pointer forward by 4 bytes.
     */
    readFloat32() {
        const value = this._data.getFloat32(this.offset, this.littleEndian);
        this.offset += 4;
        return value;
    }
    /**
     * Read a 64-bit floating number and move pointer forward by 8 bytes.
     */
    readFloat64() {
        const value = this._data.getFloat64(this.offset, this.littleEndian);
        this.offset += 8;
        return value;
    }
    /**
     * Read a 64-bit signed integer number and move pointer forward by 8 bytes.
     */
    readBigInt64() {
        const value = this._data.getBigInt64(this.offset, this.littleEndian);
        this.offset += 8;
        return value;
    }
    /**
     * Read a 64-bit unsigned integer number and move pointer forward by 8 bytes.
     */
    readBigUint64() {
        const value = this._data.getBigUint64(this.offset, this.littleEndian);
        this.offset += 8;
        return value;
    }
    /**
     * Read a 1-byte ASCII character and move pointer forward by 1 byte.
     */
    readChar() {
        return String.fromCharCode(this.readInt8());
    }
    /**
     * Read `n` 1-byte ASCII characters and move pointer forward by `n` bytes.
     */
    readChars(n = 1) {
        let result = '';
        for (let i = 0; i < n; i++) {
            result += this.readChar();
        }
        return result;
    }
    /**
     * Read the next `n` bytes, return a UTF-8 decoded string and move pointer
     * forward by `n` bytes.
     */
    readUtf8(n = 1) {
        return decode(this.readBytes(n));
    }
    /**
     * Write 0xff if the passed value is truthy, 0x00 otherwise and move pointer
     * forward by 1 byte.
     */
    writeBoolean(value) {
        this.writeUint8(value ? 0xff : 0x00);
        return this;
    }
    /**
     * Write `value` as an 8-bit signed integer and move pointer forward by 1 byte.
     */
    writeInt8(value) {
        this.ensureAvailable(1);
        this._data.setInt8(this.offset++, value);
        this._updateLastWrittenByte();
        return this;
    }
    /**
     * Write `value` as an 8-bit unsigned integer and move pointer forward by 1
     * byte.
     */
    writeUint8(value) {
        this.ensureAvailable(1);
        this._data.setUint8(this.offset++, value);
        this._updateLastWrittenByte();
        return this;
    }
    /**
     * An alias for {@link IOBuffer#writeUint8}.
     */
    writeByte(value) {
        return this.writeUint8(value);
    }
    /**
     * Write all elements of `bytes` as uint8 values and move pointer forward by
     * `bytes.length` bytes.
     */
    writeBytes(bytes) {
        this.ensureAvailable(bytes.length);
        for (let i = 0; i < bytes.length; i++) {
            this._data.setUint8(this.offset++, bytes[i]);
        }
        this._updateLastWrittenByte();
        return this;
    }
    /**
     * Write `value` as a 16-bit signed integer and move pointer forward by 2
     * bytes.
     */
    writeInt16(value) {
        this.ensureAvailable(2);
        this._data.setInt16(this.offset, value, this.littleEndian);
        this.offset += 2;
        this._updateLastWrittenByte();
        return this;
    }
    /**
     * Write `value` as a 16-bit unsigned integer and move pointer forward by 2
     * bytes.
     */
    writeUint16(value) {
        this.ensureAvailable(2);
        this._data.setUint16(this.offset, value, this.littleEndian);
        this.offset += 2;
        this._updateLastWrittenByte();
        return this;
    }
    /**
     * Write `value` as a 32-bit signed integer and move pointer forward by 4
     * bytes.
     */
    writeInt32(value) {
        this.ensureAvailable(4);
        this._data.setInt32(this.offset, value, this.littleEndian);
        this.offset += 4;
        this._updateLastWrittenByte();
        return this;
    }
    /**
     * Write `value` as a 32-bit unsigned integer and move pointer forward by 4
     * bytes.
     */
    writeUint32(value) {
        this.ensureAvailable(4);
        this._data.setUint32(this.offset, value, this.littleEndian);
        this.offset += 4;
        this._updateLastWrittenByte();
        return this;
    }
    /**
     * Write `value` as a 32-bit floating number and move pointer forward by 4
     * bytes.
     */
    writeFloat32(value) {
        this.ensureAvailable(4);
        this._data.setFloat32(this.offset, value, this.littleEndian);
        this.offset += 4;
        this._updateLastWrittenByte();
        return this;
    }
    /**
     * Write `value` as a 64-bit floating number and move pointer forward by 8
     * bytes.
     */
    writeFloat64(value) {
        this.ensureAvailable(8);
        this._data.setFloat64(this.offset, value, this.littleEndian);
        this.offset += 8;
        this._updateLastWrittenByte();
        return this;
    }
    /**
     * Write `value` as a 64-bit signed bigint and move pointer forward by 8
     * bytes.
     */
    writeBigInt64(value) {
        this.ensureAvailable(8);
        this._data.setBigInt64(this.offset, value, this.littleEndian);
        this.offset += 8;
        this._updateLastWrittenByte();
        return this;
    }
    /**
     * Write `value` as a 64-bit unsigned bigint and move pointer forward by 8
     * bytes.
     */
    writeBigUint64(value) {
        this.ensureAvailable(8);
        this._data.setBigUint64(this.offset, value, this.littleEndian);
        this.offset += 8;
        this._updateLastWrittenByte();
        return this;
    }
    /**
     * Write the charCode of `str`'s first character as an 8-bit unsigned integer
     * and move pointer forward by 1 byte.
     */
    writeChar(str) {
        return this.writeUint8(str.charCodeAt(0));
    }
    /**
     * Write the charCodes of all `str`'s characters as 8-bit unsigned integers
     * and move pointer forward by `str.length` bytes.
     */
    writeChars(str) {
        for (let i = 0; i < str.length; i++) {
            this.writeUint8(str.charCodeAt(i));
        }
        return this;
    }
    /**
     * UTF-8 encode and write `str` to the current pointer offset and move pointer
     * forward according to the encoded length.
     */
    writeUtf8(str) {
        return this.writeBytes(encode(str));
    }
    /**
     * Export a Uint8Array view of the internal buffer.
     * The view starts at the byte offset and its length
     * is calculated to stop at the last written byte or the original length.
     */
    toArray() {
        return new Uint8Array(this.buffer, this.byteOffset, this.lastWrittenByte);
    }
    /**
     * Update the last written byte offset
     * @private
     */
    _updateLastWrittenByte() {
        if (this.offset > this.lastWrittenByte) {
            this.lastWrittenByte = this.offset;
        }
    }
}

/*============================================================================*/


function zero$1(buf) { let len = buf.length; while (--len >= 0) { buf[len] = 0; } }
/* The three kinds of block type */

const MIN_MATCH$1    = 3;
const MAX_MATCH$1    = 258;
/* The minimum and maximum match lengths */

// From deflate.h
/* ===========================================================================
 * Internal compression state.
 */

const LENGTH_CODES$1  = 29;
/* number of length codes, not counting the special END_BLOCK code */

const LITERALS$1      = 256;
/* number of literal bytes 0..255 */

const L_CODES$1       = LITERALS$1 + 1 + LENGTH_CODES$1;
/* number of Literal or Length codes, including the END_BLOCK code */

const D_CODES$1       = 30;
/* eslint-enable comma-spacing,array-bracket-spacing */

/* The lengths of the bit length codes are sent in order of decreasing
 * probability, to avoid transmitting the lengths for unused bit length codes.
 */

/* ===========================================================================
 * Local data. These are initialized only once.
 */

// We pre-fill arrays with 0 to avoid uninitialized gaps

const DIST_CODE_LEN = 512; /* see definition of array dist_code below */

// !!!! Use flat array instead of structure, Freq = i*2, Len = i*2+1
const static_ltree  = new Array((L_CODES$1 + 2) * 2);
zero$1(static_ltree);
/* The static literal tree. Since the bit lengths are imposed, there is no
 * need for the L_CODES extra codes used during heap construction. However
 * The codes 286 and 287 are needed to build a canonical tree (see _tr_init
 * below).
 */

const static_dtree  = new Array(D_CODES$1 * 2);
zero$1(static_dtree);
/* The static distance tree. (Actually a trivial tree since all codes use
 * 5 bits.)
 */

const _dist_code    = new Array(DIST_CODE_LEN);
zero$1(_dist_code);
/* Distance codes. The first 256 values correspond to the distances
 * 3 .. 258, the last 256 values correspond to the top 8 bits of
 * the 15 bit distances.
 */

const _length_code  = new Array(MAX_MATCH$1 - MIN_MATCH$1 + 1);
zero$1(_length_code);
/* length code for each normalized match length (0 == MIN_MATCH) */

const base_length   = new Array(LENGTH_CODES$1);
zero$1(base_length);
/* First normalized length for each code (0 = MIN_MATCH) */

const base_dist     = new Array(D_CODES$1);
zero$1(base_dist);

// Note: adler32 takes 12% for level 0 and 2% for level 6.
// It isn't worth it to make additional optimizations as in original.
// Small size is preferable.

// (C) 1995-2013 Jean-loup Gailly and Mark Adler
// (C) 2014-2017 Vitaly Puzrin and Andrey Tupitsin
//
// This software is provided 'as-is', without any express or implied
// warranty. In no event will the authors be held liable for any damages
// arising from the use of this software.
//
// Permission is granted to anyone to use this software for any purpose,
// including commercial applications, and to alter it and redistribute it
// freely, subject to the following restrictions:
//
// 1. The origin of this software must not be misrepresented; you must not
//   claim that you wrote the original software. If you use this software
//   in a product, an acknowledgment in the product documentation would be
//   appreciated but is not required.
// 2. Altered source versions must be plainly marked as such, and must not be
//   misrepresented as being the original software.
// 3. This notice may not be removed or altered from any source distribution.

const adler32 = (adler, buf, len, pos) => {
  let s1 = (adler & 0xffff) |0,
      s2 = ((adler >>> 16) & 0xffff) |0,
      n = 0;

  while (len !== 0) {
    // Set limit ~ twice less than 5552, to keep
    // s2 in 31-bits, because we force signed ints.
    // in other case %= will fail.
    n = len > 2000 ? 2000 : len;
    len -= n;

    do {
      s1 = (s1 + buf[pos++]) |0;
      s2 = (s2 + s1) |0;
    } while (--n);

    s1 %= 65521;
    s2 %= 65521;
  }

  return (s1 | (s2 << 16)) |0;
};


var adler32_1 = adler32;

// Note: we can't get significant speed boost here.
// So write code to minimize size - no pregenerated tables
// and array tools dependencies.

// (C) 1995-2013 Jean-loup Gailly and Mark Adler
// (C) 2014-2017 Vitaly Puzrin and Andrey Tupitsin
//
// This software is provided 'as-is', without any express or implied
// warranty. In no event will the authors be held liable for any damages
// arising from the use of this software.
//
// Permission is granted to anyone to use this software for any purpose,
// including commercial applications, and to alter it and redistribute it
// freely, subject to the following restrictions:
//
// 1. The origin of this software must not be misrepresented; you must not
//   claim that you wrote the original software. If you use this software
//   in a product, an acknowledgment in the product documentation would be
//   appreciated but is not required.
// 2. Altered source versions must be plainly marked as such, and must not be
//   misrepresented as being the original software.
// 3. This notice may not be removed or altered from any source distribution.

// Use ordinary array, since untyped makes no boost here
const makeTable = () => {
  let c, table = [];

  for (var n = 0; n < 256; n++) {
    c = n;
    for (var k = 0; k < 8; k++) {
      c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
    }
    table[n] = c;
  }

  return table;
};

// Create table on load. Just 255 signed longs. Not a problem.
const crcTable$1 = new Uint32Array(makeTable());


const crc32 = (crc, buf, len, pos) => {
  const t = crcTable$1;
  const end = pos + len;

  crc ^= -1;

  for (let i = pos; i < end; i++) {
    crc = (crc >>> 8) ^ t[(crc ^ buf[i]) & 0xFF];
  }

  return (crc ^ (-1)); // >>> 0;
};


var crc32_1 = crc32;

// (C) 1995-2013 Jean-loup Gailly and Mark Adler
// (C) 2014-2017 Vitaly Puzrin and Andrey Tupitsin
//
// This software is provided 'as-is', without any express or implied
// warranty. In no event will the authors be held liable for any damages
// arising from the use of this software.
//
// Permission is granted to anyone to use this software for any purpose,
// including commercial applications, and to alter it and redistribute it
// freely, subject to the following restrictions:
//
// 1. The origin of this software must not be misrepresented; you must not
//   claim that you wrote the original software. If you use this software
//   in a product, an acknowledgment in the product documentation would be
//   appreciated but is not required.
// 2. Altered source versions must be plainly marked as such, and must not be
//   misrepresented as being the original software.
// 3. This notice may not be removed or altered from any source distribution.

var messages = {
  2:      'need dictionary',     /* Z_NEED_DICT       2  */
  1:      'stream end',          /* Z_STREAM_END      1  */
  0:      '',                    /* Z_OK              0  */
  '-1':   'file error',          /* Z_ERRNO         (-1) */
  '-2':   'stream error',        /* Z_STREAM_ERROR  (-2) */
  '-3':   'data error',          /* Z_DATA_ERROR    (-3) */
  '-4':   'insufficient memory', /* Z_MEM_ERROR     (-4) */
  '-5':   'buffer error',        /* Z_BUF_ERROR     (-5) */
  '-6':   'incompatible version' /* Z_VERSION_ERROR (-6) */
};

// (C) 1995-2013 Jean-loup Gailly and Mark Adler
// (C) 2014-2017 Vitaly Puzrin and Andrey Tupitsin
//
// This software is provided 'as-is', without any express or implied
// warranty. In no event will the authors be held liable for any damages
// arising from the use of this software.
//
// Permission is granted to anyone to use this software for any purpose,
// including commercial applications, and to alter it and redistribute it
// freely, subject to the following restrictions:
//
// 1. The origin of this software must not be misrepresented; you must not
//   claim that you wrote the original software. If you use this software
//   in a product, an acknowledgment in the product documentation would be
//   appreciated but is not required.
// 2. Altered source versions must be plainly marked as such, and must not be
//   misrepresented as being the original software.
// 3. This notice may not be removed or altered from any source distribution.

var constants$2 = {

  /* Allowed flush values; see deflate() and inflate() below for details */
  Z_NO_FLUSH:         0,
  Z_PARTIAL_FLUSH:    1,
  Z_SYNC_FLUSH:       2,
  Z_FULL_FLUSH:       3,
  Z_FINISH:           4,
  Z_BLOCK:            5,
  Z_TREES:            6,

  /* Return codes for the compression/decompression functions. Negative values
  * are errors, positive values are used for special but normal events.
  */
  Z_OK:               0,
  Z_STREAM_END:       1,
  Z_NEED_DICT:        2,
  Z_ERRNO:           -1,
  Z_STREAM_ERROR:    -2,
  Z_DATA_ERROR:      -3,
  Z_MEM_ERROR:       -4,
  Z_BUF_ERROR:       -5,
  //Z_VERSION_ERROR: -6,

  /* compression levels */
  Z_NO_COMPRESSION:         0,
  Z_BEST_SPEED:             1,
  Z_BEST_COMPRESSION:       9,
  Z_DEFAULT_COMPRESSION:   -1,


  Z_FILTERED:               1,
  Z_HUFFMAN_ONLY:           2,
  Z_RLE:                    3,
  Z_FIXED:                  4,
  Z_DEFAULT_STRATEGY:       0,

  /* Possible values of the data_type field (though see inflate()) */
  Z_BINARY:                 0,
  Z_TEXT:                   1,
  //Z_ASCII:                1, // = Z_TEXT (deprecated)
  Z_UNKNOWN:                2,

  /* The deflate compression method */
  Z_DEFLATED:               8
  //Z_NULL:                 null // Use -1 or null inline, depending on var type
};

const _has = (obj, key) => {
  return Object.prototype.hasOwnProperty.call(obj, key);
};

var assign = function (obj /*from1, from2, from3, ...*/) {
  const sources = Array.prototype.slice.call(arguments, 1);
  while (sources.length) {
    const source = sources.shift();
    if (!source) { continue; }

    if (typeof source !== 'object') {
      throw new TypeError(source + 'must be non-object');
    }

    for (const p in source) {
      if (_has(source, p)) {
        obj[p] = source[p];
      }
    }
  }

  return obj;
};


// Join array of chunks to single array.
var flattenChunks = (chunks) => {
  // calculate data length
  let len = 0;

  for (let i = 0, l = chunks.length; i < l; i++) {
    len += chunks[i].length;
  }

  // join chunks
  const result = new Uint8Array(len);

  for (let i = 0, pos = 0, l = chunks.length; i < l; i++) {
    let chunk = chunks[i];
    result.set(chunk, pos);
    pos += chunk.length;
  }

  return result;
};

var common = {
	assign: assign,
	flattenChunks: flattenChunks
};

// String encode/decode helpers


// Quick check if we can use fast array to bin string conversion
//
// - apply(Array) can fail on Android 2.2
// - apply(Uint8Array) can fail on iOS 5.1 Safari
//
let STR_APPLY_UIA_OK = true;

try { String.fromCharCode.apply(null, new Uint8Array(1)); } catch (__) { STR_APPLY_UIA_OK = false; }


// Table with utf8 lengths (calculated by first byte of sequence)
// Note, that 5 & 6-byte values and some 4-byte values can not be represented in JS,
// because max possible codepoint is 0x10ffff
const _utf8len = new Uint8Array(256);
for (let q = 0; q < 256; q++) {
  _utf8len[q] = (q >= 252 ? 6 : q >= 248 ? 5 : q >= 240 ? 4 : q >= 224 ? 3 : q >= 192 ? 2 : 1);
}
_utf8len[254] = _utf8len[254] = 1; // Invalid sequence start


// convert string to array (typed, when possible)
var string2buf = (str) => {
  if (typeof TextEncoder === 'function' && TextEncoder.prototype.encode) {
    return new TextEncoder().encode(str);
  }

  let buf, c, c2, m_pos, i, str_len = str.length, buf_len = 0;

  // count binary size
  for (m_pos = 0; m_pos < str_len; m_pos++) {
    c = str.charCodeAt(m_pos);
    if ((c & 0xfc00) === 0xd800 && (m_pos + 1 < str_len)) {
      c2 = str.charCodeAt(m_pos + 1);
      if ((c2 & 0xfc00) === 0xdc00) {
        c = 0x10000 + ((c - 0xd800) << 10) + (c2 - 0xdc00);
        m_pos++;
      }
    }
    buf_len += c < 0x80 ? 1 : c < 0x800 ? 2 : c < 0x10000 ? 3 : 4;
  }

  // allocate buffer
  buf = new Uint8Array(buf_len);

  // convert
  for (i = 0, m_pos = 0; i < buf_len; m_pos++) {
    c = str.charCodeAt(m_pos);
    if ((c & 0xfc00) === 0xd800 && (m_pos + 1 < str_len)) {
      c2 = str.charCodeAt(m_pos + 1);
      if ((c2 & 0xfc00) === 0xdc00) {
        c = 0x10000 + ((c - 0xd800) << 10) + (c2 - 0xdc00);
        m_pos++;
      }
    }
    if (c < 0x80) {
      /* one byte */
      buf[i++] = c;
    } else if (c < 0x800) {
      /* two bytes */
      buf[i++] = 0xC0 | (c >>> 6);
      buf[i++] = 0x80 | (c & 0x3f);
    } else if (c < 0x10000) {
      /* three bytes */
      buf[i++] = 0xE0 | (c >>> 12);
      buf[i++] = 0x80 | (c >>> 6 & 0x3f);
      buf[i++] = 0x80 | (c & 0x3f);
    } else {
      /* four bytes */
      buf[i++] = 0xf0 | (c >>> 18);
      buf[i++] = 0x80 | (c >>> 12 & 0x3f);
      buf[i++] = 0x80 | (c >>> 6 & 0x3f);
      buf[i++] = 0x80 | (c & 0x3f);
    }
  }

  return buf;
};

// Helper
const buf2binstring = (buf, len) => {
  // On Chrome, the arguments in a function call that are allowed is `65534`.
  // If the length of the buffer is smaller than that, we can use this optimization,
  // otherwise we will take a slower path.
  if (len < 65534) {
    if (buf.subarray && STR_APPLY_UIA_OK) {
      return String.fromCharCode.apply(null, buf.length === len ? buf : buf.subarray(0, len));
    }
  }

  let result = '';
  for (let i = 0; i < len; i++) {
    result += String.fromCharCode(buf[i]);
  }
  return result;
};


// convert array to string
var buf2string = (buf, max) => {
  const len = max || buf.length;

  if (typeof TextDecoder === 'function' && TextDecoder.prototype.decode) {
    return new TextDecoder().decode(buf.subarray(0, max));
  }

  let i, out;

  // Reserve max possible length (2 words per char)
  // NB: by unknown reasons, Array is significantly faster for
  //     String.fromCharCode.apply than Uint16Array.
  const utf16buf = new Array(len * 2);

  for (out = 0, i = 0; i < len;) {
    let c = buf[i++];
    // quick process ascii
    if (c < 0x80) { utf16buf[out++] = c; continue; }

    let c_len = _utf8len[c];
    // skip 5 & 6 byte codes
    if (c_len > 4) { utf16buf[out++] = 0xfffd; i += c_len - 1; continue; }

    // apply mask on first byte
    c &= c_len === 2 ? 0x1f : c_len === 3 ? 0x0f : 0x07;
    // join the rest
    while (c_len > 1 && i < len) {
      c = (c << 6) | (buf[i++] & 0x3f);
      c_len--;
    }

    // terminated by end of string?
    if (c_len > 1) { utf16buf[out++] = 0xfffd; continue; }

    if (c < 0x10000) {
      utf16buf[out++] = c;
    } else {
      c -= 0x10000;
      utf16buf[out++] = 0xd800 | ((c >> 10) & 0x3ff);
      utf16buf[out++] = 0xdc00 | (c & 0x3ff);
    }
  }

  return buf2binstring(utf16buf, out);
};


// Calculate max possible position in utf8 buffer,
// that will not break sequence. If that's not possible
// - (very small limits) return max size as is.
//
// buf[] - utf8 bytes array
// max   - length limit (mandatory);
var utf8border = (buf, max) => {

  max = max || buf.length;
  if (max > buf.length) { max = buf.length; }

  // go back from last position, until start of sequence found
  let pos = max - 1;
  while (pos >= 0 && (buf[pos] & 0xC0) === 0x80) { pos--; }

  // Very small and broken sequence,
  // return max, because we should return something anyway.
  if (pos < 0) { return max; }

  // If we came to start of buffer - that means buffer is too small,
  // return max too.
  if (pos === 0) { return max; }

  return (pos + _utf8len[buf[pos]] > max) ? pos : max;
};

var strings = {
	string2buf: string2buf,
	buf2string: buf2string,
	utf8border: utf8border
};

// (C) 1995-2013 Jean-loup Gailly and Mark Adler
// (C) 2014-2017 Vitaly Puzrin and Andrey Tupitsin
//
// This software is provided 'as-is', without any express or implied
// warranty. In no event will the authors be held liable for any damages
// arising from the use of this software.
//
// Permission is granted to anyone to use this software for any purpose,
// including commercial applications, and to alter it and redistribute it
// freely, subject to the following restrictions:
//
// 1. The origin of this software must not be misrepresented; you must not
//   claim that you wrote the original software. If you use this software
//   in a product, an acknowledgment in the product documentation would be
//   appreciated but is not required.
// 2. Altered source versions must be plainly marked as such, and must not be
//   misrepresented as being the original software.
// 3. This notice may not be removed or altered from any source distribution.

function ZStream() {
  /* next input byte */
  this.input = null; // JS specific, because we have no pointers
  this.next_in = 0;
  /* number of bytes available at input */
  this.avail_in = 0;
  /* total number of input bytes read so far */
  this.total_in = 0;
  /* next output byte should be put there */
  this.output = null; // JS specific, because we have no pointers
  this.next_out = 0;
  /* remaining free space at output */
  this.avail_out = 0;
  /* total number of bytes output so far */
  this.total_out = 0;
  /* last error message, NULL if no error */
  this.msg = ''/*Z_NULL*/;
  /* not visible by applications */
  this.state = null;
  /* best guess about the data type: binary or text */
  this.data_type = 2/*Z_UNKNOWN*/;
  /* adler32 value of the uncompressed data */
  this.adler = 0;
}

var zstream = ZStream;

// (C) 1995-2013 Jean-loup Gailly and Mark Adler
// (C) 2014-2017 Vitaly Puzrin and Andrey Tupitsin
//
// This software is provided 'as-is', without any express or implied
// warranty. In no event will the authors be held liable for any damages
// arising from the use of this software.
//
// Permission is granted to anyone to use this software for any purpose,
// including commercial applications, and to alter it and redistribute it
// freely, subject to the following restrictions:
//
// 1. The origin of this software must not be misrepresented; you must not
//   claim that you wrote the original software. If you use this software
//   in a product, an acknowledgment in the product documentation would be
//   appreciated but is not required.
// 2. Altered source versions must be plainly marked as such, and must not be
//   misrepresented as being the original software.
// 3. This notice may not be removed or altered from any source distribution.

// See state defs from inflate.js
const BAD$1 = 30;       /* got a data error -- remain here until reset */
const TYPE$1 = 12;      /* i: waiting for type bits, including last-flag bit */

/*
   Decode literal, length, and distance codes and write out the resulting
   literal and match bytes until either not enough input or output is
   available, an end-of-block is encountered, or a data error is encountered.
   When large enough input and output buffers are supplied to inflate(), for
   example, a 16K input buffer and a 64K output buffer, more than 95% of the
   inflate execution time is spent in this routine.

   Entry assumptions:

        state.mode === LEN
        strm.avail_in >= 6
        strm.avail_out >= 258
        start >= strm.avail_out
        state.bits < 8

   On return, state.mode is one of:

        LEN -- ran out of enough output space or enough available input
        TYPE -- reached end of block code, inflate() to interpret next block
        BAD -- error in block data

   Notes:

    - The maximum input bits used by a length/distance pair is 15 bits for the
      length code, 5 bits for the length extra, 15 bits for the distance code,
      and 13 bits for the distance extra.  This totals 48 bits, or six bytes.
      Therefore if strm.avail_in >= 6, then there is enough input to avoid
      checking for available input while decoding.

    - The maximum bytes that a single length/distance pair can output is 258
      bytes, which is the maximum length that can be coded.  inflate_fast()
      requires strm.avail_out >= 258 for each loop to avoid checking for
      output space.
 */
var inffast = function inflate_fast(strm, start) {
  let _in;                    /* local strm.input */
  let last;                   /* have enough input while in < last */
  let _out;                   /* local strm.output */
  let beg;                    /* inflate()'s initial strm.output */
  let end;                    /* while out < end, enough space available */
//#ifdef INFLATE_STRICT
  let dmax;                   /* maximum distance from zlib header */
//#endif
  let wsize;                  /* window size or zero if not using window */
  let whave;                  /* valid bytes in the window */
  let wnext;                  /* window write index */
  // Use `s_window` instead `window`, avoid conflict with instrumentation tools
  let s_window;               /* allocated sliding window, if wsize != 0 */
  let hold;                   /* local strm.hold */
  let bits;                   /* local strm.bits */
  let lcode;                  /* local strm.lencode */
  let dcode;                  /* local strm.distcode */
  let lmask;                  /* mask for first level of length codes */
  let dmask;                  /* mask for first level of distance codes */
  let here;                   /* retrieved table entry */
  let op;                     /* code bits, operation, extra bits, or */
                              /*  window position, window bytes to copy */
  let len;                    /* match length, unused bytes */
  let dist;                   /* match distance */
  let from;                   /* where to copy match from */
  let from_source;


  let input, output; // JS specific, because we have no pointers

  /* copy state to local variables */
  const state = strm.state;
  //here = state.here;
  _in = strm.next_in;
  input = strm.input;
  last = _in + (strm.avail_in - 5);
  _out = strm.next_out;
  output = strm.output;
  beg = _out - (start - strm.avail_out);
  end = _out + (strm.avail_out - 257);
//#ifdef INFLATE_STRICT
  dmax = state.dmax;
//#endif
  wsize = state.wsize;
  whave = state.whave;
  wnext = state.wnext;
  s_window = state.window;
  hold = state.hold;
  bits = state.bits;
  lcode = state.lencode;
  dcode = state.distcode;
  lmask = (1 << state.lenbits) - 1;
  dmask = (1 << state.distbits) - 1;


  /* decode literals and length/distances until end-of-block or not enough
     input data or output space */

  top:
  do {
    if (bits < 15) {
      hold += input[_in++] << bits;
      bits += 8;
      hold += input[_in++] << bits;
      bits += 8;
    }

    here = lcode[hold & lmask];

    dolen:
    for (;;) { // Goto emulation
      op = here >>> 24/*here.bits*/;
      hold >>>= op;
      bits -= op;
      op = (here >>> 16) & 0xff/*here.op*/;
      if (op === 0) {                          /* literal */
        //Tracevv((stderr, here.val >= 0x20 && here.val < 0x7f ?
        //        "inflate:         literal '%c'\n" :
        //        "inflate:         literal 0x%02x\n", here.val));
        output[_out++] = here & 0xffff/*here.val*/;
      }
      else if (op & 16) {                     /* length base */
        len = here & 0xffff/*here.val*/;
        op &= 15;                           /* number of extra bits */
        if (op) {
          if (bits < op) {
            hold += input[_in++] << bits;
            bits += 8;
          }
          len += hold & ((1 << op) - 1);
          hold >>>= op;
          bits -= op;
        }
        //Tracevv((stderr, "inflate:         length %u\n", len));
        if (bits < 15) {
          hold += input[_in++] << bits;
          bits += 8;
          hold += input[_in++] << bits;
          bits += 8;
        }
        here = dcode[hold & dmask];

        dodist:
        for (;;) { // goto emulation
          op = here >>> 24/*here.bits*/;
          hold >>>= op;
          bits -= op;
          op = (here >>> 16) & 0xff/*here.op*/;

          if (op & 16) {                      /* distance base */
            dist = here & 0xffff/*here.val*/;
            op &= 15;                       /* number of extra bits */
            if (bits < op) {
              hold += input[_in++] << bits;
              bits += 8;
              if (bits < op) {
                hold += input[_in++] << bits;
                bits += 8;
              }
            }
            dist += hold & ((1 << op) - 1);
//#ifdef INFLATE_STRICT
            if (dist > dmax) {
              strm.msg = 'invalid distance too far back';
              state.mode = BAD$1;
              break top;
            }
//#endif
            hold >>>= op;
            bits -= op;
            //Tracevv((stderr, "inflate:         distance %u\n", dist));
            op = _out - beg;                /* max distance in output */
            if (dist > op) {                /* see if copy from window */
              op = dist - op;               /* distance back in window */
              if (op > whave) {
                if (state.sane) {
                  strm.msg = 'invalid distance too far back';
                  state.mode = BAD$1;
                  break top;
                }

// (!) This block is disabled in zlib defaults,
// don't enable it for binary compatibility
//#ifdef INFLATE_ALLOW_INVALID_DISTANCE_TOOFAR_ARRR
//                if (len <= op - whave) {
//                  do {
//                    output[_out++] = 0;
//                  } while (--len);
//                  continue top;
//                }
//                len -= op - whave;
//                do {
//                  output[_out++] = 0;
//                } while (--op > whave);
//                if (op === 0) {
//                  from = _out - dist;
//                  do {
//                    output[_out++] = output[from++];
//                  } while (--len);
//                  continue top;
//                }
//#endif
              }
              from = 0; // window index
              from_source = s_window;
              if (wnext === 0) {           /* very common case */
                from += wsize - op;
                if (op < len) {         /* some from window */
                  len -= op;
                  do {
                    output[_out++] = s_window[from++];
                  } while (--op);
                  from = _out - dist;  /* rest from output */
                  from_source = output;
                }
              }
              else if (wnext < op) {      /* wrap around window */
                from += wsize + wnext - op;
                op -= wnext;
                if (op < len) {         /* some from end of window */
                  len -= op;
                  do {
                    output[_out++] = s_window[from++];
                  } while (--op);
                  from = 0;
                  if (wnext < len) {  /* some from start of window */
                    op = wnext;
                    len -= op;
                    do {
                      output[_out++] = s_window[from++];
                    } while (--op);
                    from = _out - dist;      /* rest from output */
                    from_source = output;
                  }
                }
              }
              else {                      /* contiguous in window */
                from += wnext - op;
                if (op < len) {         /* some from window */
                  len -= op;
                  do {
                    output[_out++] = s_window[from++];
                  } while (--op);
                  from = _out - dist;  /* rest from output */
                  from_source = output;
                }
              }
              while (len > 2) {
                output[_out++] = from_source[from++];
                output[_out++] = from_source[from++];
                output[_out++] = from_source[from++];
                len -= 3;
              }
              if (len) {
                output[_out++] = from_source[from++];
                if (len > 1) {
                  output[_out++] = from_source[from++];
                }
              }
            }
            else {
              from = _out - dist;          /* copy direct from output */
              do {                        /* minimum length is three */
                output[_out++] = output[from++];
                output[_out++] = output[from++];
                output[_out++] = output[from++];
                len -= 3;
              } while (len > 2);
              if (len) {
                output[_out++] = output[from++];
                if (len > 1) {
                  output[_out++] = output[from++];
                }
              }
            }
          }
          else if ((op & 64) === 0) {          /* 2nd level distance code */
            here = dcode[(here & 0xffff)/*here.val*/ + (hold & ((1 << op) - 1))];
            continue dodist;
          }
          else {
            strm.msg = 'invalid distance code';
            state.mode = BAD$1;
            break top;
          }

          break; // need to emulate goto via "continue"
        }
      }
      else if ((op & 64) === 0) {              /* 2nd level length code */
        here = lcode[(here & 0xffff)/*here.val*/ + (hold & ((1 << op) - 1))];
        continue dolen;
      }
      else if (op & 32) {                     /* end-of-block */
        //Tracevv((stderr, "inflate:         end of block\n"));
        state.mode = TYPE$1;
        break top;
      }
      else {
        strm.msg = 'invalid literal/length code';
        state.mode = BAD$1;
        break top;
      }

      break; // need to emulate goto via "continue"
    }
  } while (_in < last && _out < end);

  /* return unused bytes (on entry, bits < 8, so in won't go too far back) */
  len = bits >> 3;
  _in -= len;
  bits -= len << 3;
  hold &= (1 << bits) - 1;

  /* update state and return */
  strm.next_in = _in;
  strm.next_out = _out;
  strm.avail_in = (_in < last ? 5 + (last - _in) : 5 - (_in - last));
  strm.avail_out = (_out < end ? 257 + (end - _out) : 257 - (_out - end));
  state.hold = hold;
  state.bits = bits;
  return;
};

// (C) 1995-2013 Jean-loup Gailly and Mark Adler
// (C) 2014-2017 Vitaly Puzrin and Andrey Tupitsin
//
// This software is provided 'as-is', without any express or implied
// warranty. In no event will the authors be held liable for any damages
// arising from the use of this software.
//
// Permission is granted to anyone to use this software for any purpose,
// including commercial applications, and to alter it and redistribute it
// freely, subject to the following restrictions:
//
// 1. The origin of this software must not be misrepresented; you must not
//   claim that you wrote the original software. If you use this software
//   in a product, an acknowledgment in the product documentation would be
//   appreciated but is not required.
// 2. Altered source versions must be plainly marked as such, and must not be
//   misrepresented as being the original software.
// 3. This notice may not be removed or altered from any source distribution.

const MAXBITS = 15;
const ENOUGH_LENS$1 = 852;
const ENOUGH_DISTS$1 = 592;
//const ENOUGH = (ENOUGH_LENS+ENOUGH_DISTS);

const CODES$1 = 0;
const LENS$1 = 1;
const DISTS$1 = 2;

const lbase = new Uint16Array([ /* Length codes 257..285 base */
  3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31,
  35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258, 0, 0
]);

const lext = new Uint8Array([ /* Length codes 257..285 extra */
  16, 16, 16, 16, 16, 16, 16, 16, 17, 17, 17, 17, 18, 18, 18, 18,
  19, 19, 19, 19, 20, 20, 20, 20, 21, 21, 21, 21, 16, 72, 78
]);

const dbase = new Uint16Array([ /* Distance codes 0..29 base */
  1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193,
  257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145,
  8193, 12289, 16385, 24577, 0, 0
]);

const dext = new Uint8Array([ /* Distance codes 0..29 extra */
  16, 16, 16, 16, 17, 17, 18, 18, 19, 19, 20, 20, 21, 21, 22, 22,
  23, 23, 24, 24, 25, 25, 26, 26, 27, 27,
  28, 28, 29, 29, 64, 64
]);

const inflate_table = (type, lens, lens_index, codes, table, table_index, work, opts) =>
{
  const bits = opts.bits;
      //here = opts.here; /* table entry for duplication */

  let len = 0;               /* a code's length in bits */
  let sym = 0;               /* index of code symbols */
  let min = 0, max = 0;          /* minimum and maximum code lengths */
  let root = 0;              /* number of index bits for root table */
  let curr = 0;              /* number of index bits for current table */
  let drop = 0;              /* code bits to drop for sub-table */
  let left = 0;                   /* number of prefix codes available */
  let used = 0;              /* code entries in table used */
  let huff = 0;              /* Huffman code */
  let incr;              /* for incrementing code, index */
  let fill;              /* index for replicating entries */
  let low;               /* low bits for current root entry */
  let mask;              /* mask for low root bits */
  let next;             /* next available space in table */
  let base = null;     /* base value table to use */
  let base_index = 0;
//  let shoextra;    /* extra bits table to use */
  let end;                    /* use base and extra for symbol > end */
  const count = new Uint16Array(MAXBITS + 1); //[MAXBITS+1];    /* number of codes of each length */
  const offs = new Uint16Array(MAXBITS + 1); //[MAXBITS+1];     /* offsets in table for each length */
  let extra = null;
  let extra_index = 0;

  let here_bits, here_op, here_val;

  /*
   Process a set of code lengths to create a canonical Huffman code.  The
   code lengths are lens[0..codes-1].  Each length corresponds to the
   symbols 0..codes-1.  The Huffman code is generated by first sorting the
   symbols by length from short to long, and retaining the symbol order
   for codes with equal lengths.  Then the code starts with all zero bits
   for the first code of the shortest length, and the codes are integer
   increments for the same length, and zeros are appended as the length
   increases.  For the deflate format, these bits are stored backwards
   from their more natural integer increment ordering, and so when the
   decoding tables are built in the large loop below, the integer codes
   are incremented backwards.

   This routine assumes, but does not check, that all of the entries in
   lens[] are in the range 0..MAXBITS.  The caller must assure this.
   1..MAXBITS is interpreted as that code length.  zero means that that
   symbol does not occur in this code.

   The codes are sorted by computing a count of codes for each length,
   creating from that a table of starting indices for each length in the
   sorted table, and then entering the symbols in order in the sorted
   table.  The sorted table is work[], with that space being provided by
   the caller.

   The length counts are used for other purposes as well, i.e. finding
   the minimum and maximum length codes, determining if there are any
   codes at all, checking for a valid set of lengths, and looking ahead
   at length counts to determine sub-table sizes when building the
   decoding tables.
   */

  /* accumulate lengths for codes (assumes lens[] all in 0..MAXBITS) */
  for (len = 0; len <= MAXBITS; len++) {
    count[len] = 0;
  }
  for (sym = 0; sym < codes; sym++) {
    count[lens[lens_index + sym]]++;
  }

  /* bound code lengths, force root to be within code lengths */
  root = bits;
  for (max = MAXBITS; max >= 1; max--) {
    if (count[max] !== 0) { break; }
  }
  if (root > max) {
    root = max;
  }
  if (max === 0) {                     /* no symbols to code at all */
    //table.op[opts.table_index] = 64;  //here.op = (var char)64;    /* invalid code marker */
    //table.bits[opts.table_index] = 1;   //here.bits = (var char)1;
    //table.val[opts.table_index++] = 0;   //here.val = (var short)0;
    table[table_index++] = (1 << 24) | (64 << 16) | 0;


    //table.op[opts.table_index] = 64;
    //table.bits[opts.table_index] = 1;
    //table.val[opts.table_index++] = 0;
    table[table_index++] = (1 << 24) | (64 << 16) | 0;

    opts.bits = 1;
    return 0;     /* no symbols, but wait for decoding to report error */
  }
  for (min = 1; min < max; min++) {
    if (count[min] !== 0) { break; }
  }
  if (root < min) {
    root = min;
  }

  /* check for an over-subscribed or incomplete set of lengths */
  left = 1;
  for (len = 1; len <= MAXBITS; len++) {
    left <<= 1;
    left -= count[len];
    if (left < 0) {
      return -1;
    }        /* over-subscribed */
  }
  if (left > 0 && (type === CODES$1 || max !== 1)) {
    return -1;                      /* incomplete set */
  }

  /* generate offsets into symbol table for each length for sorting */
  offs[1] = 0;
  for (len = 1; len < MAXBITS; len++) {
    offs[len + 1] = offs[len] + count[len];
  }

  /* sort symbols by length, by symbol order within each length */
  for (sym = 0; sym < codes; sym++) {
    if (lens[lens_index + sym] !== 0) {
      work[offs[lens[lens_index + sym]]++] = sym;
    }
  }

  /*
   Create and fill in decoding tables.  In this loop, the table being
   filled is at next and has curr index bits.  The code being used is huff
   with length len.  That code is converted to an index by dropping drop
   bits off of the bottom.  For codes where len is less than drop + curr,
   those top drop + curr - len bits are incremented through all values to
   fill the table with replicated entries.

   root is the number of index bits for the root table.  When len exceeds
   root, sub-tables are created pointed to by the root entry with an index
   of the low root bits of huff.  This is saved in low to check for when a
   new sub-table should be started.  drop is zero when the root table is
   being filled, and drop is root when sub-tables are being filled.

   When a new sub-table is needed, it is necessary to look ahead in the
   code lengths to determine what size sub-table is needed.  The length
   counts are used for this, and so count[] is decremented as codes are
   entered in the tables.

   used keeps track of how many table entries have been allocated from the
   provided *table space.  It is checked for LENS and DIST tables against
   the constants ENOUGH_LENS and ENOUGH_DISTS to guard against changes in
   the initial root table size constants.  See the comments in inftrees.h
   for more information.

   sym increments through all symbols, and the loop terminates when
   all codes of length max, i.e. all codes, have been processed.  This
   routine permits incomplete codes, so another loop after this one fills
   in the rest of the decoding tables with invalid code markers.
   */

  /* set up for code type */
  // poor man optimization - use if-else instead of switch,
  // to avoid deopts in old v8
  if (type === CODES$1) {
    base = extra = work;    /* dummy value--not used */
    end = 19;

  } else if (type === LENS$1) {
    base = lbase;
    base_index -= 257;
    extra = lext;
    extra_index -= 257;
    end = 256;

  } else {                    /* DISTS */
    base = dbase;
    extra = dext;
    end = -1;
  }

  /* initialize opts for loop */
  huff = 0;                   /* starting code */
  sym = 0;                    /* starting code symbol */
  len = min;                  /* starting code length */
  next = table_index;              /* current table to fill in */
  curr = root;                /* current table index bits */
  drop = 0;                   /* current bits to drop from code for index */
  low = -1;                   /* trigger new sub-table when len > root */
  used = 1 << root;          /* use root table entries */
  mask = used - 1;            /* mask for comparing low */

  /* check available table space */
  if ((type === LENS$1 && used > ENOUGH_LENS$1) ||
    (type === DISTS$1 && used > ENOUGH_DISTS$1)) {
    return 1;
  }

  /* process all codes and make table entries */
  for (;;) {
    /* create table entry */
    here_bits = len - drop;
    if (work[sym] < end) {
      here_op = 0;
      here_val = work[sym];
    }
    else if (work[sym] > end) {
      here_op = extra[extra_index + work[sym]];
      here_val = base[base_index + work[sym]];
    }
    else {
      here_op = 32 + 64;         /* end of block */
      here_val = 0;
    }

    /* replicate for those indices with low len bits equal to huff */
    incr = 1 << (len - drop);
    fill = 1 << curr;
    min = fill;                 /* save offset to next table */
    do {
      fill -= incr;
      table[next + (huff >> drop) + fill] = (here_bits << 24) | (here_op << 16) | here_val |0;
    } while (fill !== 0);

    /* backwards increment the len-bit code huff */
    incr = 1 << (len - 1);
    while (huff & incr) {
      incr >>= 1;
    }
    if (incr !== 0) {
      huff &= incr - 1;
      huff += incr;
    } else {
      huff = 0;
    }

    /* go to next symbol, update count, len */
    sym++;
    if (--count[len] === 0) {
      if (len === max) { break; }
      len = lens[lens_index + work[sym]];
    }

    /* create new sub-table if needed */
    if (len > root && (huff & mask) !== low) {
      /* if first time, transition to sub-tables */
      if (drop === 0) {
        drop = root;
      }

      /* increment past last table */
      next += min;            /* here min is 1 << curr */

      /* determine length of next table */
      curr = len - drop;
      left = 1 << curr;
      while (curr + drop < max) {
        left -= count[curr + drop];
        if (left <= 0) { break; }
        curr++;
        left <<= 1;
      }

      /* check for enough space */
      used += 1 << curr;
      if ((type === LENS$1 && used > ENOUGH_LENS$1) ||
        (type === DISTS$1 && used > ENOUGH_DISTS$1)) {
        return 1;
      }

      /* point entry in root table to sub-table */
      low = huff & mask;
      /*table.op[low] = curr;
      table.bits[low] = root;
      table.val[low] = next - opts.table_index;*/
      table[low] = (root << 24) | (curr << 16) | (next - table_index) |0;
    }
  }

  /* fill in remaining table entry if code is incomplete (guaranteed to have
   at most one remaining entry, since if the code is incomplete, the
   maximum code length that was allowed to get this far is one bit) */
  if (huff !== 0) {
    //table.op[next + huff] = 64;            /* invalid code marker */
    //table.bits[next + huff] = len - drop;
    //table.val[next + huff] = 0;
    table[next + huff] = ((len - drop) << 24) | (64 << 16) |0;
  }

  /* set return parameters */
  //opts.table_index += used;
  opts.bits = root;
  return 0;
};


var inftrees = inflate_table;

// (C) 1995-2013 Jean-loup Gailly and Mark Adler
// (C) 2014-2017 Vitaly Puzrin and Andrey Tupitsin
//
// This software is provided 'as-is', without any express or implied
// warranty. In no event will the authors be held liable for any damages
// arising from the use of this software.
//
// Permission is granted to anyone to use this software for any purpose,
// including commercial applications, and to alter it and redistribute it
// freely, subject to the following restrictions:
//
// 1. The origin of this software must not be misrepresented; you must not
//   claim that you wrote the original software. If you use this software
//   in a product, an acknowledgment in the product documentation would be
//   appreciated but is not required.
// 2. Altered source versions must be plainly marked as such, and must not be
//   misrepresented as being the original software.
// 3. This notice may not be removed or altered from any source distribution.






const CODES = 0;
const LENS = 1;
const DISTS = 2;

/* Public constants ==========================================================*/
/* ===========================================================================*/

const {
  Z_FINISH: Z_FINISH$1, Z_BLOCK, Z_TREES,
  Z_OK: Z_OK$1, Z_STREAM_END: Z_STREAM_END$1, Z_NEED_DICT: Z_NEED_DICT$1, Z_STREAM_ERROR: Z_STREAM_ERROR$1, Z_DATA_ERROR: Z_DATA_ERROR$1, Z_MEM_ERROR: Z_MEM_ERROR$1, Z_BUF_ERROR,
  Z_DEFLATED
} = constants$2;


/* STATES ====================================================================*/
/* ===========================================================================*/


const    HEAD = 1;       /* i: waiting for magic header */
const    FLAGS = 2;      /* i: waiting for method and flags (gzip) */
const    TIME = 3;       /* i: waiting for modification time (gzip) */
const    OS = 4;         /* i: waiting for extra flags and operating system (gzip) */
const    EXLEN = 5;      /* i: waiting for extra length (gzip) */
const    EXTRA = 6;      /* i: waiting for extra bytes (gzip) */
const    NAME = 7;       /* i: waiting for end of file name (gzip) */
const    COMMENT = 8;    /* i: waiting for end of comment (gzip) */
const    HCRC = 9;       /* i: waiting for header crc (gzip) */
const    DICTID = 10;    /* i: waiting for dictionary check value */
const    DICT = 11;      /* waiting for inflateSetDictionary() call */
const        TYPE = 12;      /* i: waiting for type bits, including last-flag bit */
const        TYPEDO = 13;    /* i: same, but skip check to exit inflate on new block */
const        STORED = 14;    /* i: waiting for stored size (length and complement) */
const        COPY_ = 15;     /* i/o: same as COPY below, but only first time in */
const        COPY = 16;      /* i/o: waiting for input or output to copy stored block */
const        TABLE = 17;     /* i: waiting for dynamic block table lengths */
const        LENLENS = 18;   /* i: waiting for code length code lengths */
const        CODELENS = 19;  /* i: waiting for length/lit and distance code lengths */
const            LEN_ = 20;      /* i: same as LEN below, but only first time in */
const            LEN = 21;       /* i: waiting for length/lit/eob code */
const            LENEXT = 22;    /* i: waiting for length extra bits */
const            DIST = 23;      /* i: waiting for distance code */
const            DISTEXT = 24;   /* i: waiting for distance extra bits */
const            MATCH = 25;     /* o: waiting for output space to copy string */
const            LIT = 26;       /* o: waiting for output space to write literal */
const    CHECK = 27;     /* i: waiting for 32-bit check value */
const    LENGTH = 28;    /* i: waiting for 32-bit length (gzip) */
const    DONE = 29;      /* finished check, done -- remain here until reset */
const    BAD = 30;       /* got a data error -- remain here until reset */
const    MEM = 31;       /* got an inflate() memory error -- remain here until reset */
const    SYNC = 32;      /* looking for synchronization bytes to restart inflate() */

/* ===========================================================================*/



const ENOUGH_LENS = 852;
const ENOUGH_DISTS = 592;
//const ENOUGH =  (ENOUGH_LENS+ENOUGH_DISTS);

const MAX_WBITS = 15;
/* 32K LZ77 window */
const DEF_WBITS = MAX_WBITS;


const zswap32 = (q) => {

  return  (((q >>> 24) & 0xff) +
          ((q >>> 8) & 0xff00) +
          ((q & 0xff00) << 8) +
          ((q & 0xff) << 24));
};


function InflateState() {
  this.mode = 0;             /* current inflate mode */
  this.last = false;          /* true if processing last block */
  this.wrap = 0;              /* bit 0 true for zlib, bit 1 true for gzip */
  this.havedict = false;      /* true if dictionary provided */
  this.flags = 0;             /* gzip header method and flags (0 if zlib) */
  this.dmax = 0;              /* zlib header max distance (INFLATE_STRICT) */
  this.check = 0;             /* protected copy of check value */
  this.total = 0;             /* protected copy of output count */
  // TODO: may be {}
  this.head = null;           /* where to save gzip header information */

  /* sliding window */
  this.wbits = 0;             /* log base 2 of requested window size */
  this.wsize = 0;             /* window size or zero if not using window */
  this.whave = 0;             /* valid bytes in the window */
  this.wnext = 0;             /* window write index */
  this.window = null;         /* allocated sliding window, if needed */

  /* bit accumulator */
  this.hold = 0;              /* input bit accumulator */
  this.bits = 0;              /* number of bits in "in" */

  /* for string and stored block copying */
  this.length = 0;            /* literal or length of data to copy */
  this.offset = 0;            /* distance back to copy string from */

  /* for table and code decoding */
  this.extra = 0;             /* extra bits needed */

  /* fixed and dynamic code tables */
  this.lencode = null;          /* starting table for length/literal codes */
  this.distcode = null;         /* starting table for distance codes */
  this.lenbits = 0;           /* index bits for lencode */
  this.distbits = 0;          /* index bits for distcode */

  /* dynamic table building */
  this.ncode = 0;             /* number of code length code lengths */
  this.nlen = 0;              /* number of length code lengths */
  this.ndist = 0;             /* number of distance code lengths */
  this.have = 0;              /* number of code lengths in lens[] */
  this.next = null;              /* next available space in codes[] */

  this.lens = new Uint16Array(320); /* temporary storage for code lengths */
  this.work = new Uint16Array(288); /* work area for code table building */

  /*
   because we don't have pointers in js, we use lencode and distcode directly
   as buffers so we don't need codes
  */
  //this.codes = new Int32Array(ENOUGH);       /* space for code tables */
  this.lendyn = null;              /* dynamic table for length/literal codes (JS specific) */
  this.distdyn = null;             /* dynamic table for distance codes (JS specific) */
  this.sane = 0;                   /* if false, allow invalid distance too far */
  this.back = 0;                   /* bits back of last unprocessed length/lit */
  this.was = 0;                    /* initial length of match */
}


const inflateResetKeep = (strm) => {

  if (!strm || !strm.state) { return Z_STREAM_ERROR$1; }
  const state = strm.state;
  strm.total_in = strm.total_out = state.total = 0;
  strm.msg = ''; /*Z_NULL*/
  if (state.wrap) {       /* to support ill-conceived Java test suite */
    strm.adler = state.wrap & 1;
  }
  state.mode = HEAD;
  state.last = 0;
  state.havedict = 0;
  state.dmax = 32768;
  state.head = null/*Z_NULL*/;
  state.hold = 0;
  state.bits = 0;
  //state.lencode = state.distcode = state.next = state.codes;
  state.lencode = state.lendyn = new Int32Array(ENOUGH_LENS);
  state.distcode = state.distdyn = new Int32Array(ENOUGH_DISTS);

  state.sane = 1;
  state.back = -1;
  //Tracev((stderr, "inflate: reset\n"));
  return Z_OK$1;
};


const inflateReset = (strm) => {

  if (!strm || !strm.state) { return Z_STREAM_ERROR$1; }
  const state = strm.state;
  state.wsize = 0;
  state.whave = 0;
  state.wnext = 0;
  return inflateResetKeep(strm);

};


const inflateReset2 = (strm, windowBits) => {
  let wrap;

  /* get the state */
  if (!strm || !strm.state) { return Z_STREAM_ERROR$1; }
  const state = strm.state;

  /* extract wrap request from windowBits parameter */
  if (windowBits < 0) {
    wrap = 0;
    windowBits = -windowBits;
  }
  else {
    wrap = (windowBits >> 4) + 1;
    if (windowBits < 48) {
      windowBits &= 15;
    }
  }

  /* set number of window bits, free window if different */
  if (windowBits && (windowBits < 8 || windowBits > 15)) {
    return Z_STREAM_ERROR$1;
  }
  if (state.window !== null && state.wbits !== windowBits) {
    state.window = null;
  }

  /* update state and reset the rest of it */
  state.wrap = wrap;
  state.wbits = windowBits;
  return inflateReset(strm);
};


const inflateInit2 = (strm, windowBits) => {

  if (!strm) { return Z_STREAM_ERROR$1; }
  //strm.msg = Z_NULL;                 /* in case we return an error */

  const state = new InflateState();

  //if (state === Z_NULL) return Z_MEM_ERROR;
  //Tracev((stderr, "inflate: allocated\n"));
  strm.state = state;
  state.window = null/*Z_NULL*/;
  const ret = inflateReset2(strm, windowBits);
  if (ret !== Z_OK$1) {
    strm.state = null/*Z_NULL*/;
  }
  return ret;
};


const inflateInit = (strm) => {

  return inflateInit2(strm, DEF_WBITS);
};


/*
 Return state with length and distance decoding tables and index sizes set to
 fixed code decoding.  Normally this returns fixed tables from inffixed.h.
 If BUILDFIXED is defined, then instead this routine builds the tables the
 first time it's called, and returns those tables the first time and
 thereafter.  This reduces the size of the code by about 2K bytes, in
 exchange for a little execution time.  However, BUILDFIXED should not be
 used for threaded applications, since the rewriting of the tables and virgin
 may not be thread-safe.
 */
let virgin = true;

let lenfix, distfix; // We have no pointers in JS, so keep tables separate


const fixedtables = (state) => {

  /* build fixed huffman tables if first call (may not be thread safe) */
  if (virgin) {
    lenfix = new Int32Array(512);
    distfix = new Int32Array(32);

    /* literal/length table */
    let sym = 0;
    while (sym < 144) { state.lens[sym++] = 8; }
    while (sym < 256) { state.lens[sym++] = 9; }
    while (sym < 280) { state.lens[sym++] = 7; }
    while (sym < 288) { state.lens[sym++] = 8; }

    inftrees(LENS,  state.lens, 0, 288, lenfix,   0, state.work, { bits: 9 });

    /* distance table */
    sym = 0;
    while (sym < 32) { state.lens[sym++] = 5; }

    inftrees(DISTS, state.lens, 0, 32,   distfix, 0, state.work, { bits: 5 });

    /* do this just once */
    virgin = false;
  }

  state.lencode = lenfix;
  state.lenbits = 9;
  state.distcode = distfix;
  state.distbits = 5;
};


/*
 Update the window with the last wsize (normally 32K) bytes written before
 returning.  If window does not exist yet, create it.  This is only called
 when a window is already in use, or when output has been written during this
 inflate call, but the end of the deflate stream has not been reached yet.
 It is also called to create a window for dictionary data when a dictionary
 is loaded.

 Providing output buffers larger than 32K to inflate() should provide a speed
 advantage, since only the last 32K of output is copied to the sliding window
 upon return from inflate(), and since all distances after the first 32K of
 output will fall in the output data, making match copies simpler and faster.
 The advantage may be dependent on the size of the processor's data caches.
 */
const updatewindow = (strm, src, end, copy) => {

  let dist;
  const state = strm.state;

  /* if it hasn't been done already, allocate space for the window */
  if (state.window === null) {
    state.wsize = 1 << state.wbits;
    state.wnext = 0;
    state.whave = 0;

    state.window = new Uint8Array(state.wsize);
  }

  /* copy state->wsize or less output bytes into the circular window */
  if (copy >= state.wsize) {
    state.window.set(src.subarray(end - state.wsize, end), 0);
    state.wnext = 0;
    state.whave = state.wsize;
  }
  else {
    dist = state.wsize - state.wnext;
    if (dist > copy) {
      dist = copy;
    }
    //zmemcpy(state->window + state->wnext, end - copy, dist);
    state.window.set(src.subarray(end - copy, end - copy + dist), state.wnext);
    copy -= dist;
    if (copy) {
      //zmemcpy(state->window, end - copy, copy);
      state.window.set(src.subarray(end - copy, end), 0);
      state.wnext = copy;
      state.whave = state.wsize;
    }
    else {
      state.wnext += dist;
      if (state.wnext === state.wsize) { state.wnext = 0; }
      if (state.whave < state.wsize) { state.whave += dist; }
    }
  }
  return 0;
};


const inflate$2 = (strm, flush) => {

  let state;
  let input, output;          // input/output buffers
  let next;                   /* next input INDEX */
  let put;                    /* next output INDEX */
  let have, left;             /* available input and output */
  let hold;                   /* bit buffer */
  let bits;                   /* bits in bit buffer */
  let _in, _out;              /* save starting available input and output */
  let copy;                   /* number of stored or match bytes to copy */
  let from;                   /* where to copy match bytes from */
  let from_source;
  let here = 0;               /* current decoding table entry */
  let here_bits, here_op, here_val; // paked "here" denormalized (JS specific)
  //let last;                   /* parent table entry */
  let last_bits, last_op, last_val; // paked "last" denormalized (JS specific)
  let len;                    /* length to copy for repeats, bits to drop */
  let ret;                    /* return code */
  const hbuf = new Uint8Array(4);    /* buffer for gzip header crc calculation */
  let opts;

  let n; // temporary variable for NEED_BITS

  const order = /* permutation of code lengths */
    new Uint8Array([ 16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15 ]);


  if (!strm || !strm.state || !strm.output ||
      (!strm.input && strm.avail_in !== 0)) {
    return Z_STREAM_ERROR$1;
  }

  state = strm.state;
  if (state.mode === TYPE) { state.mode = TYPEDO; }    /* skip check */


  //--- LOAD() ---
  put = strm.next_out;
  output = strm.output;
  left = strm.avail_out;
  next = strm.next_in;
  input = strm.input;
  have = strm.avail_in;
  hold = state.hold;
  bits = state.bits;
  //---

  _in = have;
  _out = left;
  ret = Z_OK$1;

  inf_leave: // goto emulation
  for (;;) {
    switch (state.mode) {
      case HEAD:
        if (state.wrap === 0) {
          state.mode = TYPEDO;
          break;
        }
        //=== NEEDBITS(16);
        while (bits < 16) {
          if (have === 0) { break inf_leave; }
          have--;
          hold += input[next++] << bits;
          bits += 8;
        }
        //===//
        if ((state.wrap & 2) && hold === 0x8b1f) {  /* gzip header */
          state.check = 0/*crc32(0L, Z_NULL, 0)*/;
          //=== CRC2(state.check, hold);
          hbuf[0] = hold & 0xff;
          hbuf[1] = (hold >>> 8) & 0xff;
          state.check = crc32_1(state.check, hbuf, 2, 0);
          //===//

          //=== INITBITS();
          hold = 0;
          bits = 0;
          //===//
          state.mode = FLAGS;
          break;
        }
        state.flags = 0;           /* expect zlib header */
        if (state.head) {
          state.head.done = false;
        }
        if (!(state.wrap & 1) ||   /* check if zlib header allowed */
          (((hold & 0xff)/*BITS(8)*/ << 8) + (hold >> 8)) % 31) {
          strm.msg = 'incorrect header check';
          state.mode = BAD;
          break;
        }
        if ((hold & 0x0f)/*BITS(4)*/ !== Z_DEFLATED) {
          strm.msg = 'unknown compression method';
          state.mode = BAD;
          break;
        }
        //--- DROPBITS(4) ---//
        hold >>>= 4;
        bits -= 4;
        //---//
        len = (hold & 0x0f)/*BITS(4)*/ + 8;
        if (state.wbits === 0) {
          state.wbits = len;
        }
        else if (len > state.wbits) {
          strm.msg = 'invalid window size';
          state.mode = BAD;
          break;
        }

        // !!! pako patch. Force use `options.windowBits` if passed.
        // Required to always use max window size by default.
        state.dmax = 1 << state.wbits;
        //state.dmax = 1 << len;

        //Tracev((stderr, "inflate:   zlib header ok\n"));
        strm.adler = state.check = 1/*adler32(0L, Z_NULL, 0)*/;
        state.mode = hold & 0x200 ? DICTID : TYPE;
        //=== INITBITS();
        hold = 0;
        bits = 0;
        //===//
        break;
      case FLAGS:
        //=== NEEDBITS(16); */
        while (bits < 16) {
          if (have === 0) { break inf_leave; }
          have--;
          hold += input[next++] << bits;
          bits += 8;
        }
        //===//
        state.flags = hold;
        if ((state.flags & 0xff) !== Z_DEFLATED) {
          strm.msg = 'unknown compression method';
          state.mode = BAD;
          break;
        }
        if (state.flags & 0xe000) {
          strm.msg = 'unknown header flags set';
          state.mode = BAD;
          break;
        }
        if (state.head) {
          state.head.text = ((hold >> 8) & 1);
        }
        if (state.flags & 0x0200) {
          //=== CRC2(state.check, hold);
          hbuf[0] = hold & 0xff;
          hbuf[1] = (hold >>> 8) & 0xff;
          state.check = crc32_1(state.check, hbuf, 2, 0);
          //===//
        }
        //=== INITBITS();
        hold = 0;
        bits = 0;
        //===//
        state.mode = TIME;
        /* falls through */
      case TIME:
        //=== NEEDBITS(32); */
        while (bits < 32) {
          if (have === 0) { break inf_leave; }
          have--;
          hold += input[next++] << bits;
          bits += 8;
        }
        //===//
        if (state.head) {
          state.head.time = hold;
        }
        if (state.flags & 0x0200) {
          //=== CRC4(state.check, hold)
          hbuf[0] = hold & 0xff;
          hbuf[1] = (hold >>> 8) & 0xff;
          hbuf[2] = (hold >>> 16) & 0xff;
          hbuf[3] = (hold >>> 24) & 0xff;
          state.check = crc32_1(state.check, hbuf, 4, 0);
          //===
        }
        //=== INITBITS();
        hold = 0;
        bits = 0;
        //===//
        state.mode = OS;
        /* falls through */
      case OS:
        //=== NEEDBITS(16); */
        while (bits < 16) {
          if (have === 0) { break inf_leave; }
          have--;
          hold += input[next++] << bits;
          bits += 8;
        }
        //===//
        if (state.head) {
          state.head.xflags = (hold & 0xff);
          state.head.os = (hold >> 8);
        }
        if (state.flags & 0x0200) {
          //=== CRC2(state.check, hold);
          hbuf[0] = hold & 0xff;
          hbuf[1] = (hold >>> 8) & 0xff;
          state.check = crc32_1(state.check, hbuf, 2, 0);
          //===//
        }
        //=== INITBITS();
        hold = 0;
        bits = 0;
        //===//
        state.mode = EXLEN;
        /* falls through */
      case EXLEN:
        if (state.flags & 0x0400) {
          //=== NEEDBITS(16); */
          while (bits < 16) {
            if (have === 0) { break inf_leave; }
            have--;
            hold += input[next++] << bits;
            bits += 8;
          }
          //===//
          state.length = hold;
          if (state.head) {
            state.head.extra_len = hold;
          }
          if (state.flags & 0x0200) {
            //=== CRC2(state.check, hold);
            hbuf[0] = hold & 0xff;
            hbuf[1] = (hold >>> 8) & 0xff;
            state.check = crc32_1(state.check, hbuf, 2, 0);
            //===//
          }
          //=== INITBITS();
          hold = 0;
          bits = 0;
          //===//
        }
        else if (state.head) {
          state.head.extra = null/*Z_NULL*/;
        }
        state.mode = EXTRA;
        /* falls through */
      case EXTRA:
        if (state.flags & 0x0400) {
          copy = state.length;
          if (copy > have) { copy = have; }
          if (copy) {
            if (state.head) {
              len = state.head.extra_len - state.length;
              if (!state.head.extra) {
                // Use untyped array for more convenient processing later
                state.head.extra = new Uint8Array(state.head.extra_len);
              }
              state.head.extra.set(
                input.subarray(
                  next,
                  // extra field is limited to 65536 bytes
                  // - no need for additional size check
                  next + copy
                ),
                /*len + copy > state.head.extra_max - len ? state.head.extra_max : copy,*/
                len
              );
              //zmemcpy(state.head.extra + len, next,
              //        len + copy > state.head.extra_max ?
              //        state.head.extra_max - len : copy);
            }
            if (state.flags & 0x0200) {
              state.check = crc32_1(state.check, input, copy, next);
            }
            have -= copy;
            next += copy;
            state.length -= copy;
          }
          if (state.length) { break inf_leave; }
        }
        state.length = 0;
        state.mode = NAME;
        /* falls through */
      case NAME:
        if (state.flags & 0x0800) {
          if (have === 0) { break inf_leave; }
          copy = 0;
          do {
            // TODO: 2 or 1 bytes?
            len = input[next + copy++];
            /* use constant limit because in js we should not preallocate memory */
            if (state.head && len &&
                (state.length < 65536 /*state.head.name_max*/)) {
              state.head.name += String.fromCharCode(len);
            }
          } while (len && copy < have);

          if (state.flags & 0x0200) {
            state.check = crc32_1(state.check, input, copy, next);
          }
          have -= copy;
          next += copy;
          if (len) { break inf_leave; }
        }
        else if (state.head) {
          state.head.name = null;
        }
        state.length = 0;
        state.mode = COMMENT;
        /* falls through */
      case COMMENT:
        if (state.flags & 0x1000) {
          if (have === 0) { break inf_leave; }
          copy = 0;
          do {
            len = input[next + copy++];
            /* use constant limit because in js we should not preallocate memory */
            if (state.head && len &&
                (state.length < 65536 /*state.head.comm_max*/)) {
              state.head.comment += String.fromCharCode(len);
            }
          } while (len && copy < have);
          if (state.flags & 0x0200) {
            state.check = crc32_1(state.check, input, copy, next);
          }
          have -= copy;
          next += copy;
          if (len) { break inf_leave; }
        }
        else if (state.head) {
          state.head.comment = null;
        }
        state.mode = HCRC;
        /* falls through */
      case HCRC:
        if (state.flags & 0x0200) {
          //=== NEEDBITS(16); */
          while (bits < 16) {
            if (have === 0) { break inf_leave; }
            have--;
            hold += input[next++] << bits;
            bits += 8;
          }
          //===//
          if (hold !== (state.check & 0xffff)) {
            strm.msg = 'header crc mismatch';
            state.mode = BAD;
            break;
          }
          //=== INITBITS();
          hold = 0;
          bits = 0;
          //===//
        }
        if (state.head) {
          state.head.hcrc = ((state.flags >> 9) & 1);
          state.head.done = true;
        }
        strm.adler = state.check = 0;
        state.mode = TYPE;
        break;
      case DICTID:
        //=== NEEDBITS(32); */
        while (bits < 32) {
          if (have === 0) { break inf_leave; }
          have--;
          hold += input[next++] << bits;
          bits += 8;
        }
        //===//
        strm.adler = state.check = zswap32(hold);
        //=== INITBITS();
        hold = 0;
        bits = 0;
        //===//
        state.mode = DICT;
        /* falls through */
      case DICT:
        if (state.havedict === 0) {
          //--- RESTORE() ---
          strm.next_out = put;
          strm.avail_out = left;
          strm.next_in = next;
          strm.avail_in = have;
          state.hold = hold;
          state.bits = bits;
          //---
          return Z_NEED_DICT$1;
        }
        strm.adler = state.check = 1/*adler32(0L, Z_NULL, 0)*/;
        state.mode = TYPE;
        /* falls through */
      case TYPE:
        if (flush === Z_BLOCK || flush === Z_TREES) { break inf_leave; }
        /* falls through */
      case TYPEDO:
        if (state.last) {
          //--- BYTEBITS() ---//
          hold >>>= bits & 7;
          bits -= bits & 7;
          //---//
          state.mode = CHECK;
          break;
        }
        //=== NEEDBITS(3); */
        while (bits < 3) {
          if (have === 0) { break inf_leave; }
          have--;
          hold += input[next++] << bits;
          bits += 8;
        }
        //===//
        state.last = (hold & 0x01)/*BITS(1)*/;
        //--- DROPBITS(1) ---//
        hold >>>= 1;
        bits -= 1;
        //---//

        switch ((hold & 0x03)/*BITS(2)*/) {
          case 0:                             /* stored block */
            //Tracev((stderr, "inflate:     stored block%s\n",
            //        state.last ? " (last)" : ""));
            state.mode = STORED;
            break;
          case 1:                             /* fixed block */
            fixedtables(state);
            //Tracev((stderr, "inflate:     fixed codes block%s\n",
            //        state.last ? " (last)" : ""));
            state.mode = LEN_;             /* decode codes */
            if (flush === Z_TREES) {
              //--- DROPBITS(2) ---//
              hold >>>= 2;
              bits -= 2;
              //---//
              break inf_leave;
            }
            break;
          case 2:                             /* dynamic block */
            //Tracev((stderr, "inflate:     dynamic codes block%s\n",
            //        state.last ? " (last)" : ""));
            state.mode = TABLE;
            break;
          case 3:
            strm.msg = 'invalid block type';
            state.mode = BAD;
        }
        //--- DROPBITS(2) ---//
        hold >>>= 2;
        bits -= 2;
        //---//
        break;
      case STORED:
        //--- BYTEBITS() ---// /* go to byte boundary */
        hold >>>= bits & 7;
        bits -= bits & 7;
        //---//
        //=== NEEDBITS(32); */
        while (bits < 32) {
          if (have === 0) { break inf_leave; }
          have--;
          hold += input[next++] << bits;
          bits += 8;
        }
        //===//
        if ((hold & 0xffff) !== ((hold >>> 16) ^ 0xffff)) {
          strm.msg = 'invalid stored block lengths';
          state.mode = BAD;
          break;
        }
        state.length = hold & 0xffff;
        //Tracev((stderr, "inflate:       stored length %u\n",
        //        state.length));
        //=== INITBITS();
        hold = 0;
        bits = 0;
        //===//
        state.mode = COPY_;
        if (flush === Z_TREES) { break inf_leave; }
        /* falls through */
      case COPY_:
        state.mode = COPY;
        /* falls through */
      case COPY:
        copy = state.length;
        if (copy) {
          if (copy > have) { copy = have; }
          if (copy > left) { copy = left; }
          if (copy === 0) { break inf_leave; }
          //--- zmemcpy(put, next, copy); ---
          output.set(input.subarray(next, next + copy), put);
          //---//
          have -= copy;
          next += copy;
          left -= copy;
          put += copy;
          state.length -= copy;
          break;
        }
        //Tracev((stderr, "inflate:       stored end\n"));
        state.mode = TYPE;
        break;
      case TABLE:
        //=== NEEDBITS(14); */
        while (bits < 14) {
          if (have === 0) { break inf_leave; }
          have--;
          hold += input[next++] << bits;
          bits += 8;
        }
        //===//
        state.nlen = (hold & 0x1f)/*BITS(5)*/ + 257;
        //--- DROPBITS(5) ---//
        hold >>>= 5;
        bits -= 5;
        //---//
        state.ndist = (hold & 0x1f)/*BITS(5)*/ + 1;
        //--- DROPBITS(5) ---//
        hold >>>= 5;
        bits -= 5;
        //---//
        state.ncode = (hold & 0x0f)/*BITS(4)*/ + 4;
        //--- DROPBITS(4) ---//
        hold >>>= 4;
        bits -= 4;
        //---//
//#ifndef PKZIP_BUG_WORKAROUND
        if (state.nlen > 286 || state.ndist > 30) {
          strm.msg = 'too many length or distance symbols';
          state.mode = BAD;
          break;
        }
//#endif
        //Tracev((stderr, "inflate:       table sizes ok\n"));
        state.have = 0;
        state.mode = LENLENS;
        /* falls through */
      case LENLENS:
        while (state.have < state.ncode) {
          //=== NEEDBITS(3);
          while (bits < 3) {
            if (have === 0) { break inf_leave; }
            have--;
            hold += input[next++] << bits;
            bits += 8;
          }
          //===//
          state.lens[order[state.have++]] = (hold & 0x07);//BITS(3);
          //--- DROPBITS(3) ---//
          hold >>>= 3;
          bits -= 3;
          //---//
        }
        while (state.have < 19) {
          state.lens[order[state.have++]] = 0;
        }
        // We have separate tables & no pointers. 2 commented lines below not needed.
        //state.next = state.codes;
        //state.lencode = state.next;
        // Switch to use dynamic table
        state.lencode = state.lendyn;
        state.lenbits = 7;

        opts = { bits: state.lenbits };
        ret = inftrees(CODES, state.lens, 0, 19, state.lencode, 0, state.work, opts);
        state.lenbits = opts.bits;

        if (ret) {
          strm.msg = 'invalid code lengths set';
          state.mode = BAD;
          break;
        }
        //Tracev((stderr, "inflate:       code lengths ok\n"));
        state.have = 0;
        state.mode = CODELENS;
        /* falls through */
      case CODELENS:
        while (state.have < state.nlen + state.ndist) {
          for (;;) {
            here = state.lencode[hold & ((1 << state.lenbits) - 1)];/*BITS(state.lenbits)*/
            here_bits = here >>> 24;
            here_op = (here >>> 16) & 0xff;
            here_val = here & 0xffff;

            if ((here_bits) <= bits) { break; }
            //--- PULLBYTE() ---//
            if (have === 0) { break inf_leave; }
            have--;
            hold += input[next++] << bits;
            bits += 8;
            //---//
          }
          if (here_val < 16) {
            //--- DROPBITS(here.bits) ---//
            hold >>>= here_bits;
            bits -= here_bits;
            //---//
            state.lens[state.have++] = here_val;
          }
          else {
            if (here_val === 16) {
              //=== NEEDBITS(here.bits + 2);
              n = here_bits + 2;
              while (bits < n) {
                if (have === 0) { break inf_leave; }
                have--;
                hold += input[next++] << bits;
                bits += 8;
              }
              //===//
              //--- DROPBITS(here.bits) ---//
              hold >>>= here_bits;
              bits -= here_bits;
              //---//
              if (state.have === 0) {
                strm.msg = 'invalid bit length repeat';
                state.mode = BAD;
                break;
              }
              len = state.lens[state.have - 1];
              copy = 3 + (hold & 0x03);//BITS(2);
              //--- DROPBITS(2) ---//
              hold >>>= 2;
              bits -= 2;
              //---//
            }
            else if (here_val === 17) {
              //=== NEEDBITS(here.bits + 3);
              n = here_bits + 3;
              while (bits < n) {
                if (have === 0) { break inf_leave; }
                have--;
                hold += input[next++] << bits;
                bits += 8;
              }
              //===//
              //--- DROPBITS(here.bits) ---//
              hold >>>= here_bits;
              bits -= here_bits;
              //---//
              len = 0;
              copy = 3 + (hold & 0x07);//BITS(3);
              //--- DROPBITS(3) ---//
              hold >>>= 3;
              bits -= 3;
              //---//
            }
            else {
              //=== NEEDBITS(here.bits + 7);
              n = here_bits + 7;
              while (bits < n) {
                if (have === 0) { break inf_leave; }
                have--;
                hold += input[next++] << bits;
                bits += 8;
              }
              //===//
              //--- DROPBITS(here.bits) ---//
              hold >>>= here_bits;
              bits -= here_bits;
              //---//
              len = 0;
              copy = 11 + (hold & 0x7f);//BITS(7);
              //--- DROPBITS(7) ---//
              hold >>>= 7;
              bits -= 7;
              //---//
            }
            if (state.have + copy > state.nlen + state.ndist) {
              strm.msg = 'invalid bit length repeat';
              state.mode = BAD;
              break;
            }
            while (copy--) {
              state.lens[state.have++] = len;
            }
          }
        }

        /* handle error breaks in while */
        if (state.mode === BAD) { break; }

        /* check for end-of-block code (better have one) */
        if (state.lens[256] === 0) {
          strm.msg = 'invalid code -- missing end-of-block';
          state.mode = BAD;
          break;
        }

        /* build code tables -- note: do not change the lenbits or distbits
           values here (9 and 6) without reading the comments in inftrees.h
           concerning the ENOUGH constants, which depend on those values */
        state.lenbits = 9;

        opts = { bits: state.lenbits };
        ret = inftrees(LENS, state.lens, 0, state.nlen, state.lencode, 0, state.work, opts);
        // We have separate tables & no pointers. 2 commented lines below not needed.
        // state.next_index = opts.table_index;
        state.lenbits = opts.bits;
        // state.lencode = state.next;

        if (ret) {
          strm.msg = 'invalid literal/lengths set';
          state.mode = BAD;
          break;
        }

        state.distbits = 6;
        //state.distcode.copy(state.codes);
        // Switch to use dynamic table
        state.distcode = state.distdyn;
        opts = { bits: state.distbits };
        ret = inftrees(DISTS, state.lens, state.nlen, state.ndist, state.distcode, 0, state.work, opts);
        // We have separate tables & no pointers. 2 commented lines below not needed.
        // state.next_index = opts.table_index;
        state.distbits = opts.bits;
        // state.distcode = state.next;

        if (ret) {
          strm.msg = 'invalid distances set';
          state.mode = BAD;
          break;
        }
        //Tracev((stderr, 'inflate:       codes ok\n'));
        state.mode = LEN_;
        if (flush === Z_TREES) { break inf_leave; }
        /* falls through */
      case LEN_:
        state.mode = LEN;
        /* falls through */
      case LEN:
        if (have >= 6 && left >= 258) {
          //--- RESTORE() ---
          strm.next_out = put;
          strm.avail_out = left;
          strm.next_in = next;
          strm.avail_in = have;
          state.hold = hold;
          state.bits = bits;
          //---
          inffast(strm, _out);
          //--- LOAD() ---
          put = strm.next_out;
          output = strm.output;
          left = strm.avail_out;
          next = strm.next_in;
          input = strm.input;
          have = strm.avail_in;
          hold = state.hold;
          bits = state.bits;
          //---

          if (state.mode === TYPE) {
            state.back = -1;
          }
          break;
        }
        state.back = 0;
        for (;;) {
          here = state.lencode[hold & ((1 << state.lenbits) - 1)];  /*BITS(state.lenbits)*/
          here_bits = here >>> 24;
          here_op = (here >>> 16) & 0xff;
          here_val = here & 0xffff;

          if (here_bits <= bits) { break; }
          //--- PULLBYTE() ---//
          if (have === 0) { break inf_leave; }
          have--;
          hold += input[next++] << bits;
          bits += 8;
          //---//
        }
        if (here_op && (here_op & 0xf0) === 0) {
          last_bits = here_bits;
          last_op = here_op;
          last_val = here_val;
          for (;;) {
            here = state.lencode[last_val +
                    ((hold & ((1 << (last_bits + last_op)) - 1))/*BITS(last.bits + last.op)*/ >> last_bits)];
            here_bits = here >>> 24;
            here_op = (here >>> 16) & 0xff;
            here_val = here & 0xffff;

            if ((last_bits + here_bits) <= bits) { break; }
            //--- PULLBYTE() ---//
            if (have === 0) { break inf_leave; }
            have--;
            hold += input[next++] << bits;
            bits += 8;
            //---//
          }
          //--- DROPBITS(last.bits) ---//
          hold >>>= last_bits;
          bits -= last_bits;
          //---//
          state.back += last_bits;
        }
        //--- DROPBITS(here.bits) ---//
        hold >>>= here_bits;
        bits -= here_bits;
        //---//
        state.back += here_bits;
        state.length = here_val;
        if (here_op === 0) {
          //Tracevv((stderr, here.val >= 0x20 && here.val < 0x7f ?
          //        "inflate:         literal '%c'\n" :
          //        "inflate:         literal 0x%02x\n", here.val));
          state.mode = LIT;
          break;
        }
        if (here_op & 32) {
          //Tracevv((stderr, "inflate:         end of block\n"));
          state.back = -1;
          state.mode = TYPE;
          break;
        }
        if (here_op & 64) {
          strm.msg = 'invalid literal/length code';
          state.mode = BAD;
          break;
        }
        state.extra = here_op & 15;
        state.mode = LENEXT;
        /* falls through */
      case LENEXT:
        if (state.extra) {
          //=== NEEDBITS(state.extra);
          n = state.extra;
          while (bits < n) {
            if (have === 0) { break inf_leave; }
            have--;
            hold += input[next++] << bits;
            bits += 8;
          }
          //===//
          state.length += hold & ((1 << state.extra) - 1)/*BITS(state.extra)*/;
          //--- DROPBITS(state.extra) ---//
          hold >>>= state.extra;
          bits -= state.extra;
          //---//
          state.back += state.extra;
        }
        //Tracevv((stderr, "inflate:         length %u\n", state.length));
        state.was = state.length;
        state.mode = DIST;
        /* falls through */
      case DIST:
        for (;;) {
          here = state.distcode[hold & ((1 << state.distbits) - 1)];/*BITS(state.distbits)*/
          here_bits = here >>> 24;
          here_op = (here >>> 16) & 0xff;
          here_val = here & 0xffff;

          if ((here_bits) <= bits) { break; }
          //--- PULLBYTE() ---//
          if (have === 0) { break inf_leave; }
          have--;
          hold += input[next++] << bits;
          bits += 8;
          //---//
        }
        if ((here_op & 0xf0) === 0) {
          last_bits = here_bits;
          last_op = here_op;
          last_val = here_val;
          for (;;) {
            here = state.distcode[last_val +
                    ((hold & ((1 << (last_bits + last_op)) - 1))/*BITS(last.bits + last.op)*/ >> last_bits)];
            here_bits = here >>> 24;
            here_op = (here >>> 16) & 0xff;
            here_val = here & 0xffff;

            if ((last_bits + here_bits) <= bits) { break; }
            //--- PULLBYTE() ---//
            if (have === 0) { break inf_leave; }
            have--;
            hold += input[next++] << bits;
            bits += 8;
            //---//
          }
          //--- DROPBITS(last.bits) ---//
          hold >>>= last_bits;
          bits -= last_bits;
          //---//
          state.back += last_bits;
        }
        //--- DROPBITS(here.bits) ---//
        hold >>>= here_bits;
        bits -= here_bits;
        //---//
        state.back += here_bits;
        if (here_op & 64) {
          strm.msg = 'invalid distance code';
          state.mode = BAD;
          break;
        }
        state.offset = here_val;
        state.extra = (here_op) & 15;
        state.mode = DISTEXT;
        /* falls through */
      case DISTEXT:
        if (state.extra) {
          //=== NEEDBITS(state.extra);
          n = state.extra;
          while (bits < n) {
            if (have === 0) { break inf_leave; }
            have--;
            hold += input[next++] << bits;
            bits += 8;
          }
          //===//
          state.offset += hold & ((1 << state.extra) - 1)/*BITS(state.extra)*/;
          //--- DROPBITS(state.extra) ---//
          hold >>>= state.extra;
          bits -= state.extra;
          //---//
          state.back += state.extra;
        }
//#ifdef INFLATE_STRICT
        if (state.offset > state.dmax) {
          strm.msg = 'invalid distance too far back';
          state.mode = BAD;
          break;
        }
//#endif
        //Tracevv((stderr, "inflate:         distance %u\n", state.offset));
        state.mode = MATCH;
        /* falls through */
      case MATCH:
        if (left === 0) { break inf_leave; }
        copy = _out - left;
        if (state.offset > copy) {         /* copy from window */
          copy = state.offset - copy;
          if (copy > state.whave) {
            if (state.sane) {
              strm.msg = 'invalid distance too far back';
              state.mode = BAD;
              break;
            }
// (!) This block is disabled in zlib defaults,
// don't enable it for binary compatibility
//#ifdef INFLATE_ALLOW_INVALID_DISTANCE_TOOFAR_ARRR
//          Trace((stderr, "inflate.c too far\n"));
//          copy -= state.whave;
//          if (copy > state.length) { copy = state.length; }
//          if (copy > left) { copy = left; }
//          left -= copy;
//          state.length -= copy;
//          do {
//            output[put++] = 0;
//          } while (--copy);
//          if (state.length === 0) { state.mode = LEN; }
//          break;
//#endif
          }
          if (copy > state.wnext) {
            copy -= state.wnext;
            from = state.wsize - copy;
          }
          else {
            from = state.wnext - copy;
          }
          if (copy > state.length) { copy = state.length; }
          from_source = state.window;
        }
        else {                              /* copy from output */
          from_source = output;
          from = put - state.offset;
          copy = state.length;
        }
        if (copy > left) { copy = left; }
        left -= copy;
        state.length -= copy;
        do {
          output[put++] = from_source[from++];
        } while (--copy);
        if (state.length === 0) { state.mode = LEN; }
        break;
      case LIT:
        if (left === 0) { break inf_leave; }
        output[put++] = state.length;
        left--;
        state.mode = LEN;
        break;
      case CHECK:
        if (state.wrap) {
          //=== NEEDBITS(32);
          while (bits < 32) {
            if (have === 0) { break inf_leave; }
            have--;
            // Use '|' instead of '+' to make sure that result is signed
            hold |= input[next++] << bits;
            bits += 8;
          }
          //===//
          _out -= left;
          strm.total_out += _out;
          state.total += _out;
          if (_out) {
            strm.adler = state.check =
                /*UPDATE(state.check, put - _out, _out);*/
                (state.flags ? crc32_1(state.check, output, _out, put - _out) : adler32_1(state.check, output, _out, put - _out));

          }
          _out = left;
          // NB: crc32 stored as signed 32-bit int, zswap32 returns signed too
          if ((state.flags ? hold : zswap32(hold)) !== state.check) {
            strm.msg = 'incorrect data check';
            state.mode = BAD;
            break;
          }
          //=== INITBITS();
          hold = 0;
          bits = 0;
          //===//
          //Tracev((stderr, "inflate:   check matches trailer\n"));
        }
        state.mode = LENGTH;
        /* falls through */
      case LENGTH:
        if (state.wrap && state.flags) {
          //=== NEEDBITS(32);
          while (bits < 32) {
            if (have === 0) { break inf_leave; }
            have--;
            hold += input[next++] << bits;
            bits += 8;
          }
          //===//
          if (hold !== (state.total & 0xffffffff)) {
            strm.msg = 'incorrect length check';
            state.mode = BAD;
            break;
          }
          //=== INITBITS();
          hold = 0;
          bits = 0;
          //===//
          //Tracev((stderr, "inflate:   length matches trailer\n"));
        }
        state.mode = DONE;
        /* falls through */
      case DONE:
        ret = Z_STREAM_END$1;
        break inf_leave;
      case BAD:
        ret = Z_DATA_ERROR$1;
        break inf_leave;
      case MEM:
        return Z_MEM_ERROR$1;
      case SYNC:
        /* falls through */
      default:
        return Z_STREAM_ERROR$1;
    }
  }

  // inf_leave <- here is real place for "goto inf_leave", emulated via "break inf_leave"

  /*
     Return from inflate(), updating the total counts and the check value.
     If there was no progress during the inflate() call, return a buffer
     error.  Call updatewindow() to create and/or update the window state.
     Note: a memory error from inflate() is non-recoverable.
   */

  //--- RESTORE() ---
  strm.next_out = put;
  strm.avail_out = left;
  strm.next_in = next;
  strm.avail_in = have;
  state.hold = hold;
  state.bits = bits;
  //---

  if (state.wsize || (_out !== strm.avail_out && state.mode < BAD &&
                      (state.mode < CHECK || flush !== Z_FINISH$1))) {
    if (updatewindow(strm, strm.output, strm.next_out, _out - strm.avail_out)) ;
  }
  _in -= strm.avail_in;
  _out -= strm.avail_out;
  strm.total_in += _in;
  strm.total_out += _out;
  state.total += _out;
  if (state.wrap && _out) {
    strm.adler = state.check = /*UPDATE(state.check, strm.next_out - _out, _out);*/
      (state.flags ? crc32_1(state.check, output, _out, strm.next_out - _out) : adler32_1(state.check, output, _out, strm.next_out - _out));
  }
  strm.data_type = state.bits + (state.last ? 64 : 0) +
                    (state.mode === TYPE ? 128 : 0) +
                    (state.mode === LEN_ || state.mode === COPY_ ? 256 : 0);
  if (((_in === 0 && _out === 0) || flush === Z_FINISH$1) && ret === Z_OK$1) {
    ret = Z_BUF_ERROR;
  }
  return ret;
};


const inflateEnd = (strm) => {

  if (!strm || !strm.state /*|| strm->zfree == (free_func)0*/) {
    return Z_STREAM_ERROR$1;
  }

  let state = strm.state;
  if (state.window) {
    state.window = null;
  }
  strm.state = null;
  return Z_OK$1;
};


const inflateGetHeader = (strm, head) => {

  /* check state */
  if (!strm || !strm.state) { return Z_STREAM_ERROR$1; }
  const state = strm.state;
  if ((state.wrap & 2) === 0) { return Z_STREAM_ERROR$1; }

  /* save header structure */
  state.head = head;
  head.done = false;
  return Z_OK$1;
};


const inflateSetDictionary = (strm, dictionary) => {
  const dictLength = dictionary.length;

  let state;
  let dictid;
  let ret;

  /* check state */
  if (!strm /* == Z_NULL */ || !strm.state /* == Z_NULL */) { return Z_STREAM_ERROR$1; }
  state = strm.state;

  if (state.wrap !== 0 && state.mode !== DICT) {
    return Z_STREAM_ERROR$1;
  }

  /* check for correct dictionary identifier */
  if (state.mode === DICT) {
    dictid = 1; /* adler32(0, null, 0)*/
    /* dictid = adler32(dictid, dictionary, dictLength); */
    dictid = adler32_1(dictid, dictionary, dictLength, 0);
    if (dictid !== state.check) {
      return Z_DATA_ERROR$1;
    }
  }
  /* copy dictionary to window using updatewindow(), which will amend the
   existing dictionary if appropriate */
  ret = updatewindow(strm, dictionary, dictLength, dictLength);
  if (ret) {
    state.mode = MEM;
    return Z_MEM_ERROR$1;
  }
  state.havedict = 1;
  // Tracev((stderr, "inflate:   dictionary set\n"));
  return Z_OK$1;
};


var inflateReset_1 = inflateReset;
var inflateReset2_1 = inflateReset2;
var inflateResetKeep_1 = inflateResetKeep;
var inflateInit_1 = inflateInit;
var inflateInit2_1 = inflateInit2;
var inflate_2$1 = inflate$2;
var inflateEnd_1 = inflateEnd;
var inflateGetHeader_1 = inflateGetHeader;
var inflateSetDictionary_1 = inflateSetDictionary;
var inflateInfo = 'pako inflate (from Nodeca project)';

/* Not implemented
module.exports.inflateCopy = inflateCopy;
module.exports.inflateGetDictionary = inflateGetDictionary;
module.exports.inflateMark = inflateMark;
module.exports.inflatePrime = inflatePrime;
module.exports.inflateSync = inflateSync;
module.exports.inflateSyncPoint = inflateSyncPoint;
module.exports.inflateUndermine = inflateUndermine;
*/

var inflate_1$2 = {
	inflateReset: inflateReset_1,
	inflateReset2: inflateReset2_1,
	inflateResetKeep: inflateResetKeep_1,
	inflateInit: inflateInit_1,
	inflateInit2: inflateInit2_1,
	inflate: inflate_2$1,
	inflateEnd: inflateEnd_1,
	inflateGetHeader: inflateGetHeader_1,
	inflateSetDictionary: inflateSetDictionary_1,
	inflateInfo: inflateInfo
};

// (C) 1995-2013 Jean-loup Gailly and Mark Adler
// (C) 2014-2017 Vitaly Puzrin and Andrey Tupitsin
//
// This software is provided 'as-is', without any express or implied
// warranty. In no event will the authors be held liable for any damages
// arising from the use of this software.
//
// Permission is granted to anyone to use this software for any purpose,
// including commercial applications, and to alter it and redistribute it
// freely, subject to the following restrictions:
//
// 1. The origin of this software must not be misrepresented; you must not
//   claim that you wrote the original software. If you use this software
//   in a product, an acknowledgment in the product documentation would be
//   appreciated but is not required.
// 2. Altered source versions must be plainly marked as such, and must not be
//   misrepresented as being the original software.
// 3. This notice may not be removed or altered from any source distribution.

function GZheader() {
  /* true if compressed data believed to be text */
  this.text       = 0;
  /* modification time */
  this.time       = 0;
  /* extra flags (not used when writing a gzip file) */
  this.xflags     = 0;
  /* operating system */
  this.os         = 0;
  /* pointer to extra field or Z_NULL if none */
  this.extra      = null;
  /* extra field length (valid if extra != Z_NULL) */
  this.extra_len  = 0; // Actually, we don't need it in JS,
                       // but leave for few code modifications

  //
  // Setup limits is not necessary because in js we should not preallocate memory
  // for inflate use constant limit in 65536 bytes
  //

  /* space at extra (only when reading header) */
  // this.extra_max  = 0;
  /* pointer to zero-terminated file name or Z_NULL */
  this.name       = '';
  /* space at name (only when reading header) */
  // this.name_max   = 0;
  /* pointer to zero-terminated comment or Z_NULL */
  this.comment    = '';
  /* space at comment (only when reading header) */
  // this.comm_max   = 0;
  /* true if there was or will be a header crc */
  this.hcrc       = 0;
  /* true when done reading gzip header (not used when writing a gzip file) */
  this.done       = false;
}

var gzheader = GZheader;

const toString = Object.prototype.toString;

/* Public constants ==========================================================*/
/* ===========================================================================*/

const {
  Z_NO_FLUSH, Z_FINISH,
  Z_OK, Z_STREAM_END, Z_NEED_DICT, Z_STREAM_ERROR, Z_DATA_ERROR, Z_MEM_ERROR
} = constants$2;

/* ===========================================================================*/


/**
 * class Inflate
 *
 * Generic JS-style wrapper for zlib calls. If you don't need
 * streaming behaviour - use more simple functions: [[inflate]]
 * and [[inflateRaw]].
 **/

/* internal
 * inflate.chunks -> Array
 *
 * Chunks of output data, if [[Inflate#onData]] not overridden.
 **/

/**
 * Inflate.result -> Uint8Array|String
 *
 * Uncompressed result, generated by default [[Inflate#onData]]
 * and [[Inflate#onEnd]] handlers. Filled after you push last chunk
 * (call [[Inflate#push]] with `Z_FINISH` / `true` param).
 **/

/**
 * Inflate.err -> Number
 *
 * Error code after inflate finished. 0 (Z_OK) on success.
 * Should be checked if broken data possible.
 **/

/**
 * Inflate.msg -> String
 *
 * Error message, if [[Inflate.err]] != 0
 **/


/**
 * new Inflate(options)
 * - options (Object): zlib inflate options.
 *
 * Creates new inflator instance with specified params. Throws exception
 * on bad params. Supported options:
 *
 * - `windowBits`
 * - `dictionary`
 *
 * [http://zlib.net/manual.html#Advanced](http://zlib.net/manual.html#Advanced)
 * for more information on these.
 *
 * Additional options, for internal needs:
 *
 * - `chunkSize` - size of generated data chunks (16K by default)
 * - `raw` (Boolean) - do raw inflate
 * - `to` (String) - if equal to 'string', then result will be converted
 *   from utf8 to utf16 (javascript) string. When string output requested,
 *   chunk length can differ from `chunkSize`, depending on content.
 *
 * By default, when no options set, autodetect deflate/gzip data format via
 * wrapper header.
 *
 * ##### Example:
 *
 * ```javascript
 * const pako = require('pako')
 * const chunk1 = new Uint8Array([1,2,3,4,5,6,7,8,9])
 * const chunk2 = new Uint8Array([10,11,12,13,14,15,16,17,18,19]);
 *
 * const inflate = new pako.Inflate({ level: 3});
 *
 * inflate.push(chunk1, false);
 * inflate.push(chunk2, true);  // true -> last chunk
 *
 * if (inflate.err) { throw new Error(inflate.err); }
 *
 * console.log(inflate.result);
 * ```
 **/
function Inflate$1(options) {
  this.options = common.assign({
    chunkSize: 1024 * 64,
    windowBits: 15,
    to: ''
  }, options || {});

  const opt = this.options;

  // Force window size for `raw` data, if not set directly,
  // because we have no header for autodetect.
  if (opt.raw && (opt.windowBits >= 0) && (opt.windowBits < 16)) {
    opt.windowBits = -opt.windowBits;
    if (opt.windowBits === 0) { opt.windowBits = -15; }
  }

  // If `windowBits` not defined (and mode not raw) - set autodetect flag for gzip/deflate
  if ((opt.windowBits >= 0) && (opt.windowBits < 16) &&
      !(options && options.windowBits)) {
    opt.windowBits += 32;
  }

  // Gzip header has no info about windows size, we can do autodetect only
  // for deflate. So, if window size not set, force it to max when gzip possible
  if ((opt.windowBits > 15) && (opt.windowBits < 48)) {
    // bit 3 (16) -> gzipped data
    // bit 4 (32) -> autodetect gzip/deflate
    if ((opt.windowBits & 15) === 0) {
      opt.windowBits |= 15;
    }
  }

  this.err    = 0;      // error code, if happens (0 = Z_OK)
  this.msg    = '';     // error message
  this.ended  = false;  // used to avoid multiple onEnd() calls
  this.chunks = [];     // chunks of compressed data

  this.strm   = new zstream();
  this.strm.avail_out = 0;

  let status  = inflate_1$2.inflateInit2(
    this.strm,
    opt.windowBits
  );

  if (status !== Z_OK) {
    throw new Error(messages[status]);
  }

  this.header = new gzheader();

  inflate_1$2.inflateGetHeader(this.strm, this.header);

  // Setup dictionary
  if (opt.dictionary) {
    // Convert data if needed
    if (typeof opt.dictionary === 'string') {
      opt.dictionary = strings.string2buf(opt.dictionary);
    } else if (toString.call(opt.dictionary) === '[object ArrayBuffer]') {
      opt.dictionary = new Uint8Array(opt.dictionary);
    }
    if (opt.raw) { //In raw mode we need to set the dictionary early
      status = inflate_1$2.inflateSetDictionary(this.strm, opt.dictionary);
      if (status !== Z_OK) {
        throw new Error(messages[status]);
      }
    }
  }
}

/**
 * Inflate#push(data[, flush_mode]) -> Boolean
 * - data (Uint8Array|ArrayBuffer): input data
 * - flush_mode (Number|Boolean): 0..6 for corresponding Z_NO_FLUSH..Z_TREE
 *   flush modes. See constants. Skipped or `false` means Z_NO_FLUSH,
 *   `true` means Z_FINISH.
 *
 * Sends input data to inflate pipe, generating [[Inflate#onData]] calls with
 * new output chunks. Returns `true` on success. If end of stream detected,
 * [[Inflate#onEnd]] will be called.
 *
 * `flush_mode` is not needed for normal operation, because end of stream
 * detected automatically. You may try to use it for advanced things, but
 * this functionality was not tested.
 *
 * On fail call [[Inflate#onEnd]] with error code and return false.
 *
 * ##### Example
 *
 * ```javascript
 * push(chunk, false); // push one of data chunks
 * ...
 * push(chunk, true);  // push last chunk
 * ```
 **/
Inflate$1.prototype.push = function (data, flush_mode) {
  const strm = this.strm;
  const chunkSize = this.options.chunkSize;
  const dictionary = this.options.dictionary;
  let status, _flush_mode, last_avail_out;

  if (this.ended) return false;

  if (flush_mode === ~~flush_mode) _flush_mode = flush_mode;
  else _flush_mode = flush_mode === true ? Z_FINISH : Z_NO_FLUSH;

  // Convert data if needed
  if (toString.call(data) === '[object ArrayBuffer]') {
    strm.input = new Uint8Array(data);
  } else {
    strm.input = data;
  }

  strm.next_in = 0;
  strm.avail_in = strm.input.length;

  for (;;) {
    if (strm.avail_out === 0) {
      strm.output = new Uint8Array(chunkSize);
      strm.next_out = 0;
      strm.avail_out = chunkSize;
    }

    status = inflate_1$2.inflate(strm, _flush_mode);

    if (status === Z_NEED_DICT && dictionary) {
      status = inflate_1$2.inflateSetDictionary(strm, dictionary);

      if (status === Z_OK) {
        status = inflate_1$2.inflate(strm, _flush_mode);
      } else if (status === Z_DATA_ERROR) {
        // Replace code with more verbose
        status = Z_NEED_DICT;
      }
    }

    // Skip snyc markers if more data follows and not raw mode
    while (strm.avail_in > 0 &&
           status === Z_STREAM_END &&
           strm.state.wrap > 0 &&
           data[strm.next_in] !== 0)
    {
      inflate_1$2.inflateReset(strm);
      status = inflate_1$2.inflate(strm, _flush_mode);
    }

    switch (status) {
      case Z_STREAM_ERROR:
      case Z_DATA_ERROR:
      case Z_NEED_DICT:
      case Z_MEM_ERROR:
        this.onEnd(status);
        this.ended = true;
        return false;
    }

    // Remember real `avail_out` value, because we may patch out buffer content
    // to align utf8 strings boundaries.
    last_avail_out = strm.avail_out;

    if (strm.next_out) {
      if (strm.avail_out === 0 || status === Z_STREAM_END) {

        if (this.options.to === 'string') {

          let next_out_utf8 = strings.utf8border(strm.output, strm.next_out);

          let tail = strm.next_out - next_out_utf8;
          let utf8str = strings.buf2string(strm.output, next_out_utf8);

          // move tail & realign counters
          strm.next_out = tail;
          strm.avail_out = chunkSize - tail;
          if (tail) strm.output.set(strm.output.subarray(next_out_utf8, next_out_utf8 + tail), 0);

          this.onData(utf8str);

        } else {
          this.onData(strm.output.length === strm.next_out ? strm.output : strm.output.subarray(0, strm.next_out));
        }
      }
    }

    // Must repeat iteration if out buffer is full
    if (status === Z_OK && last_avail_out === 0) continue;

    // Finalize if end of stream reached.
    if (status === Z_STREAM_END) {
      status = inflate_1$2.inflateEnd(this.strm);
      this.onEnd(status);
      this.ended = true;
      return true;
    }

    if (strm.avail_in === 0) break;
  }

  return true;
};


/**
 * Inflate#onData(chunk) -> Void
 * - chunk (Uint8Array|String): output data. When string output requested,
 *   each chunk will be string.
 *
 * By default, stores data blocks in `chunks[]` property and glue
 * those in `onEnd`. Override this handler, if you need another behaviour.
 **/
Inflate$1.prototype.onData = function (chunk) {
  this.chunks.push(chunk);
};


/**
 * Inflate#onEnd(status) -> Void
 * - status (Number): inflate status. 0 (Z_OK) on success,
 *   other if not.
 *
 * Called either after you tell inflate that the input stream is
 * complete (Z_FINISH). By default - join collected chunks,
 * free memory and fill `results` / `err` properties.
 **/
Inflate$1.prototype.onEnd = function (status) {
  // On success - join
  if (status === Z_OK) {
    if (this.options.to === 'string') {
      this.result = this.chunks.join('');
    } else {
      this.result = common.flattenChunks(this.chunks);
    }
  }
  this.chunks = [];
  this.err = status;
  this.msg = this.strm.msg;
};


/**
 * inflate(data[, options]) -> Uint8Array|String
 * - data (Uint8Array): input data to decompress.
 * - options (Object): zlib inflate options.
 *
 * Decompress `data` with inflate/ungzip and `options`. Autodetect
 * format via wrapper header by default. That's why we don't provide
 * separate `ungzip` method.
 *
 * Supported options are:
 *
 * - windowBits
 *
 * [http://zlib.net/manual.html#Advanced](http://zlib.net/manual.html#Advanced)
 * for more information.
 *
 * Sugar (options):
 *
 * - `raw` (Boolean) - say that we work with raw stream, if you don't wish to specify
 *   negative windowBits implicitly.
 * - `to` (String) - if equal to 'string', then result will be converted
 *   from utf8 to utf16 (javascript) string. When string output requested,
 *   chunk length can differ from `chunkSize`, depending on content.
 *
 *
 * ##### Example:
 *
 * ```javascript
 * const pako = require('pako');
 * const input = pako.deflate(new Uint8Array([1,2,3,4,5,6,7,8,9]));
 * let output;
 *
 * try {
 *   output = pako.inflate(input);
 * } catch (err) {
 *   console.log(err);
 * }
 * ```
 **/
function inflate$1(input, options) {
  const inflator = new Inflate$1(options);

  inflator.push(input);

  // That will never happens, if you don't cheat with options :)
  if (inflator.err) throw inflator.msg || messages[inflator.err];

  return inflator.result;
}


/**
 * inflateRaw(data[, options]) -> Uint8Array|String
 * - data (Uint8Array): input data to decompress.
 * - options (Object): zlib inflate options.
 *
 * The same as [[inflate]], but creates raw data, without wrapper
 * (header and adler32 crc).
 **/
function inflateRaw$1(input, options) {
  options = options || {};
  options.raw = true;
  return inflate$1(input, options);
}


/**
 * ungzip(data[, options]) -> Uint8Array|String
 * - data (Uint8Array): input data to decompress.
 * - options (Object): zlib inflate options.
 *
 * Just shortcut to [[inflate]], because it autodetects format
 * by header.content. Done for convenience.
 **/


var Inflate_1$1 = Inflate$1;
var inflate_2 = inflate$1;
var inflateRaw_1$1 = inflateRaw$1;
var ungzip$1 = inflate$1;
var constants = constants$2;

var inflate_1$1 = {
	Inflate: Inflate_1$1,
	inflate: inflate_2,
	inflateRaw: inflateRaw_1$1,
	ungzip: ungzip$1,
	constants: constants
};

const { Inflate, inflate, inflateRaw, ungzip } = inflate_1$1;
var Inflate_1 = Inflate;

const pngSignature = [137, 80, 78, 71, 13, 10, 26, 10];
const crcTable = [];
for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
        if (c & 1) {
            c = 0xedb88320 ^ (c >>> 1);
        }
        else {
            c = c >>> 1;
        }
    }
    crcTable[n] = c;
}
const initialCrc = 0xffffffff;
function updateCrc(currentCrc, data, length) {
    let c = currentCrc;
    for (let n = 0; n < length; n++) {
        c = crcTable[(c ^ data[n]) & 0xff] ^ (c >>> 8);
    }
    return c;
}
function crc(data, length) {
    return (updateCrc(initialCrc, data, length) ^ initialCrc) >>> 0;
}

var ColorType;
(function (ColorType) {
    ColorType[ColorType["UNKNOWN"] = -1] = "UNKNOWN";
    ColorType[ColorType["GREYSCALE"] = 0] = "GREYSCALE";
    ColorType[ColorType["TRUECOLOUR"] = 2] = "TRUECOLOUR";
    ColorType[ColorType["INDEXED_COLOUR"] = 3] = "INDEXED_COLOUR";
    ColorType[ColorType["GREYSCALE_ALPHA"] = 4] = "GREYSCALE_ALPHA";
    ColorType[ColorType["TRUECOLOUR_ALPHA"] = 6] = "TRUECOLOUR_ALPHA";
})(ColorType || (ColorType = {}));
var CompressionMethod;
(function (CompressionMethod) {
    CompressionMethod[CompressionMethod["UNKNOWN"] = -1] = "UNKNOWN";
    CompressionMethod[CompressionMethod["DEFLATE"] = 0] = "DEFLATE";
})(CompressionMethod || (CompressionMethod = {}));
var FilterMethod;
(function (FilterMethod) {
    FilterMethod[FilterMethod["UNKNOWN"] = -1] = "UNKNOWN";
    FilterMethod[FilterMethod["ADAPTIVE"] = 0] = "ADAPTIVE";
})(FilterMethod || (FilterMethod = {}));
var InterlaceMethod;
(function (InterlaceMethod) {
    InterlaceMethod[InterlaceMethod["UNKNOWN"] = -1] = "UNKNOWN";
    InterlaceMethod[InterlaceMethod["NO_INTERLACE"] = 0] = "NO_INTERLACE";
    InterlaceMethod[InterlaceMethod["ADAM7"] = 1] = "ADAM7";
})(InterlaceMethod || (InterlaceMethod = {}));

const empty = new Uint8Array(0);
const NULL = '\0';
const uint16 = new Uint16Array([0x00ff]);
const uint8 = new Uint8Array(uint16.buffer);
const osIsLittleEndian = uint8[0] === 0xff;
class PNGDecoder extends IOBuffer {
    constructor(data, options = {}) {
        super(data);
        const { checkCrc = false } = options;
        this._checkCrc = checkCrc;
        this._inflator = new Inflate_1();
        this._png = {
            width: -1,
            height: -1,
            channels: -1,
            data: new Uint8Array(0),
            depth: 1,
            text: {},
        };
        this._end = false;
        this._hasPalette = false;
        this._palette = [];
        this._compressionMethod = CompressionMethod.UNKNOWN;
        this._filterMethod = FilterMethod.UNKNOWN;
        this._interlaceMethod = InterlaceMethod.UNKNOWN;
        this._colorType = -1;
        // PNG is always big endian
        // https://www.w3.org/TR/PNG/#7Integers-and-byte-order
        this.setBigEndian();
    }
    decode() {
        this.decodeSignature();
        while (!this._end) {
            this.decodeChunk();
        }
        this.decodeImage();
        return this._png;
    }
    // https://www.w3.org/TR/PNG/#5PNG-file-signature
    decodeSignature() {
        for (let i = 0; i < pngSignature.length; i++) {
            if (this.readUint8() !== pngSignature[i]) {
                throw new Error(`wrong PNG signature. Byte at ${i} should be ${pngSignature[i]}.`);
            }
        }
    }
    // https://www.w3.org/TR/PNG/#5Chunk-layout
    decodeChunk() {
        const length = this.readUint32();
        const type = this.readChars(4);
        const offset = this.offset;
        switch (type) {
            // 11.2 Critical chunks
            case 'IHDR': // 11.2.2 IHDR Image header
                this.decodeIHDR();
                break;
            case 'PLTE': // 11.2.3 PLTE Palette
                this.decodePLTE(length);
                break;
            case 'IDAT': // 11.2.4 IDAT Image data
                this.decodeIDAT(length);
                break;
            case 'IEND': // 11.2.5 IEND Image trailer
                this._end = true;
                break;
            // 11.3 Ancillary chunks
            case 'tRNS': // 11.3.2.1 tRNS Transparency
                this.decodetRNS(length);
                break;
            case 'tEXt': // 11.3.4.3 tEXt Textual data
                this.decodetEXt(length);
                break;
            case 'pHYs': // 11.3.5.3 pHYs Physical pixel dimensions
                this.decodepHYs();
                break;
            default:
                this.skip(length);
                break;
        }
        if (this.offset - offset !== length) {
            throw new Error(`Length mismatch while decoding chunk ${type}`);
        }
        if (this._checkCrc) {
            const expectedCrc = this.readUint32();
            const crcLength = length + 4; // includes type
            const actualCrc = crc(new Uint8Array(this.buffer, this.byteOffset + this.offset - crcLength - 4, crcLength), crcLength); // "- 4" because we already advanced by reading the CRC
            if (actualCrc !== expectedCrc) {
                throw new Error(`CRC mismatch for chunk ${type}. Expected ${expectedCrc}, found ${actualCrc}`);
            }
        }
        else {
            this.skip(4);
        }
    }
    // https://www.w3.org/TR/PNG/#11IHDR
    decodeIHDR() {
        const image = this._png;
        image.width = this.readUint32();
        image.height = this.readUint32();
        image.depth = checkBitDepth(this.readUint8());
        const colorType = this.readUint8();
        this._colorType = colorType;
        let channels;
        switch (colorType) {
            case ColorType.GREYSCALE:
                channels = 1;
                break;
            case ColorType.TRUECOLOUR:
                channels = 3;
                break;
            case ColorType.INDEXED_COLOUR:
                channels = 1;
                break;
            case ColorType.GREYSCALE_ALPHA:
                channels = 2;
                break;
            case ColorType.TRUECOLOUR_ALPHA:
                channels = 4;
                break;
            default:
                throw new Error(`Unknown color type: ${colorType}`);
        }
        this._png.channels = channels;
        this._compressionMethod = this.readUint8();
        if (this._compressionMethod !== CompressionMethod.DEFLATE) {
            throw new Error(`Unsupported compression method: ${this._compressionMethod}`);
        }
        this._filterMethod = this.readUint8();
        this._interlaceMethod = this.readUint8();
    }
    // https://www.w3.org/TR/PNG/#11PLTE
    decodePLTE(length) {
        if (length % 3 !== 0) {
            throw new RangeError(`PLTE field length must be a multiple of 3. Got ${length}`);
        }
        const l = length / 3;
        this._hasPalette = true;
        const palette = [];
        this._palette = palette;
        for (let i = 0; i < l; i++) {
            palette.push([this.readUint8(), this.readUint8(), this.readUint8()]);
        }
    }
    // https://www.w3.org/TR/PNG/#11IDAT
    decodeIDAT(length) {
        this._inflator.push(new Uint8Array(this.buffer, this.offset + this.byteOffset, length));
        this.skip(length);
    }
    // https://www.w3.org/TR/PNG/#11tRNS
    decodetRNS(length) {
        // TODO: support other color types.
        if (this._colorType === 3) {
            if (length > this._palette.length) {
                throw new Error(`tRNS chunk contains more alpha values than there are palette colors (${length} vs ${this._palette.length})`);
            }
            let i = 0;
            for (; i < length; i++) {
                const alpha = this.readByte();
                this._palette[i].push(alpha);
            }
            for (; i < this._palette.length; i++) {
                this._palette[i].push(255);
            }
        }
    }
    // https://www.w3.org/TR/PNG/#11tEXt
    decodetEXt(length) {
        let keyword = '';
        let char;
        while ((char = this.readChar()) !== NULL) {
            keyword += char;
        }
        this._png.text[keyword] = this.readChars(length - keyword.length - 1);
    }
    // https://www.w3.org/TR/PNG/#11pHYs
    decodepHYs() {
        const ppuX = this.readUint32();
        const ppuY = this.readUint32();
        const unitSpecifier = this.readByte();
        this._png.resolution = { x: ppuX, y: ppuY, unit: unitSpecifier };
    }
    decodeImage() {
        if (this._inflator.err) {
            throw new Error(`Error while decompressing the data: ${this._inflator.err}`);
        }
        const data = this._inflator.result;
        if (this._filterMethod !== FilterMethod.ADAPTIVE) {
            throw new Error(`Filter method ${this._filterMethod} not supported`);
        }
        if (this._interlaceMethod === InterlaceMethod.NO_INTERLACE) {
            this.decodeInterlaceNull(data);
        }
        else {
            throw new Error(`Interlace method ${this._interlaceMethod} not supported`);
        }
    }
    decodeInterlaceNull(data) {
        const height = this._png.height;
        const bytesPerPixel = (this._png.channels * this._png.depth) / 8;
        const bytesPerLine = this._png.width * bytesPerPixel;
        const newData = new Uint8Array(this._png.height * bytesPerLine);
        let prevLine = empty;
        let offset = 0;
        let currentLine;
        let newLine;
        for (let i = 0; i < height; i++) {
            currentLine = data.subarray(offset + 1, offset + 1 + bytesPerLine);
            newLine = newData.subarray(i * bytesPerLine, (i + 1) * bytesPerLine);
            switch (data[offset]) {
                case 0:
                    unfilterNone(currentLine, newLine, bytesPerLine);
                    break;
                case 1:
                    unfilterSub(currentLine, newLine, bytesPerLine, bytesPerPixel);
                    break;
                case 2:
                    unfilterUp(currentLine, newLine, prevLine, bytesPerLine);
                    break;
                case 3:
                    unfilterAverage(currentLine, newLine, prevLine, bytesPerLine, bytesPerPixel);
                    break;
                case 4:
                    unfilterPaeth(currentLine, newLine, prevLine, bytesPerLine, bytesPerPixel);
                    break;
                default:
                    throw new Error(`Unsupported filter: ${data[offset]}`);
            }
            prevLine = newLine;
            offset += bytesPerLine + 1;
        }
        if (this._hasPalette) {
            this._png.palette = this._palette;
        }
        if (this._png.depth === 16) {
            const uint16Data = new Uint16Array(newData.buffer);
            if (osIsLittleEndian) {
                for (let k = 0; k < uint16Data.length; k++) {
                    // PNG is always big endian. Swap the bytes.
                    uint16Data[k] = swap16(uint16Data[k]);
                }
            }
            this._png.data = uint16Data;
        }
        else {
            this._png.data = newData;
        }
    }
}
function unfilterNone(currentLine, newLine, bytesPerLine) {
    for (let i = 0; i < bytesPerLine; i++) {
        newLine[i] = currentLine[i];
    }
}
function unfilterSub(currentLine, newLine, bytesPerLine, bytesPerPixel) {
    let i = 0;
    for (; i < bytesPerPixel; i++) {
        // just copy first bytes
        newLine[i] = currentLine[i];
    }
    for (; i < bytesPerLine; i++) {
        newLine[i] = (currentLine[i] + newLine[i - bytesPerPixel]) & 0xff;
    }
}
function unfilterUp(currentLine, newLine, prevLine, bytesPerLine) {
    let i = 0;
    if (prevLine.length === 0) {
        // just copy bytes for first line
        for (; i < bytesPerLine; i++) {
            newLine[i] = currentLine[i];
        }
    }
    else {
        for (; i < bytesPerLine; i++) {
            newLine[i] = (currentLine[i] + prevLine[i]) & 0xff;
        }
    }
}
function unfilterAverage(currentLine, newLine, prevLine, bytesPerLine, bytesPerPixel) {
    let i = 0;
    if (prevLine.length === 0) {
        for (; i < bytesPerPixel; i++) {
            newLine[i] = currentLine[i];
        }
        for (; i < bytesPerLine; i++) {
            newLine[i] = (currentLine[i] + (newLine[i - bytesPerPixel] >> 1)) & 0xff;
        }
    }
    else {
        for (; i < bytesPerPixel; i++) {
            newLine[i] = (currentLine[i] + (prevLine[i] >> 1)) & 0xff;
        }
        for (; i < bytesPerLine; i++) {
            newLine[i] =
                (currentLine[i] + ((newLine[i - bytesPerPixel] + prevLine[i]) >> 1)) &
                    0xff;
        }
    }
}
function unfilterPaeth(currentLine, newLine, prevLine, bytesPerLine, bytesPerPixel) {
    let i = 0;
    if (prevLine.length === 0) {
        for (; i < bytesPerPixel; i++) {
            newLine[i] = currentLine[i];
        }
        for (; i < bytesPerLine; i++) {
            newLine[i] = (currentLine[i] + newLine[i - bytesPerPixel]) & 0xff;
        }
    }
    else {
        for (; i < bytesPerPixel; i++) {
            newLine[i] = (currentLine[i] + prevLine[i]) & 0xff;
        }
        for (; i < bytesPerLine; i++) {
            newLine[i] =
                (currentLine[i] +
                    paethPredictor(newLine[i - bytesPerPixel], prevLine[i], prevLine[i - bytesPerPixel])) &
                    0xff;
        }
    }
}
function paethPredictor(a, b, c) {
    const p = a + b - c;
    const pa = Math.abs(p - a);
    const pb = Math.abs(p - b);
    const pc = Math.abs(p - c);
    if (pa <= pb && pa <= pc)
        return a;
    else if (pb <= pc)
        return b;
    else
        return c;
}
function swap16(val) {
    return ((val & 0xff) << 8) | ((val >> 8) & 0xff);
}
function checkBitDepth(value) {
    if (value !== 1 &&
        value !== 2 &&
        value !== 4 &&
        value !== 8 &&
        value !== 16) {
        throw new Error(`invalid bit depth: ${value}`);
    }
    return value;
}

var ResolutionUnitSpecifier;
(function (ResolutionUnitSpecifier) {
    /**
     * Unit is unknown
     */
    ResolutionUnitSpecifier[ResolutionUnitSpecifier["UNKNOWN"] = 0] = "UNKNOWN";
    /**
     * Unit is the metre
     */
    ResolutionUnitSpecifier[ResolutionUnitSpecifier["METRE"] = 1] = "METRE";
})(ResolutionUnitSpecifier || (ResolutionUnitSpecifier = {}));

function decodePNG(data, options) {
    const decoder = new PNGDecoder(data, options);
    return decoder.decode();
}

class gltfImage extends GltfObject
{
    constructor(
        uri = undefined,
        type = GL.TEXTURE_2D,
        miplevel = 0,
        bufferView = undefined,
        name = undefined,
        mimeType = ImageMimeType.JPEG,
        image = undefined)
    {
        super();
        this.uri = uri;
        this.bufferView = bufferView;
        this.mimeType = mimeType;
        this.image = image; // javascript image
        this.name = name;
        this.type = type; // nonstandard
        this.miplevel = miplevel; // nonstandard
    }

    resolveRelativePath(basePath)
    {
        if (typeof this.uri === 'string' || this.uri instanceof String)
        {
            if (this.uri.startsWith('./'))
            {
                // Remove preceding './' from URI.
                this.uri = this.uri.substr(2);
            }
            this.uri = basePath + this.uri;
        }
    }

    async load(gltf, additionalFiles = undefined)
    {
        if (this.image !== undefined)
        {
            if (this.mimeType !== ImageMimeType.GLTEXTURE)
            {
                console.error("image has already been loaded");
            }
            return;
        }

        if (!await this.setImageFromBufferView(gltf) &&
            !await this.setImageFromFiles(additionalFiles, gltf) &&
            !await this.setImageFromUri(gltf))
        {
            console.error("Was not able to resolve image with uri '%s'", this.uri);
            return;
        }

        return;
    }

    static loadHTMLImage(url)
    {
        return new Promise( (resolve, reject) => {
            const image = new Image();
            image.addEventListener('load', () => resolve(image) );
            image.addEventListener('error', reject);
            image.src = url;
            image.crossOrigin = "";
        });
    }

    async setImageFromUri(gltf)
    {
        if (this.uri === undefined)
        {
            return false;
        }

        if(this.mimeType === ImageMimeType.KTX2)
        {
            if (gltf.ktxDecoder !== undefined)
            {
                this.image = await gltf.ktxDecoder.loadKtxFromUri(this.uri);
            }
            else
            {
                console.warn('Loading of ktx images failed: KtxDecoder not initalized');
            }
        }
        else if (typeof(Image) !== 'undefined' && (this.mimeType === ImageMimeType.JPEG || this.mimeType === ImageMimeType.PNG))
        {
            this.image = await gltfImage.loadHTMLImage(this.uri).catch( (error) => {
                console.error(error);
            });
        }
        else if(this.mimeType === ImageMimeType.JPEG && this.uri instanceof ArrayBuffer)
        {
            this.image = jpegJs.decode(this.uri, {useTArray: true});
        }
        else if(this.mimeType === ImageMimeType.PNG && this.uri instanceof ArrayBuffer)
        {
            this.image = decodePNG(this.uri);
        }
        else
        {
            console.error("Unsupported image type " + this.mimeType);
            return false;
        }

        return true;
    }

    async setImageFromBufferView(gltf)
    {
        const view = gltf.bufferViews[this.bufferView];
        if (view === undefined)
        {
            return false;
        }

        const buffer = gltf.buffers[view.buffer].buffer;
        const array = new Uint8Array(buffer, view.byteOffset, view.byteLength);
        if (this.mimeType === ImageMimeType.KTX2)
        {
            if (gltf.ktxDecoder !== undefined)
            {
                this.image = await gltf.ktxDecoder.loadKtxFromBuffer(array);
            }
            else
            {
                console.warn('Loading of ktx images failed: KtxDecoder not initalized');
            }
        }
        else if(typeof(Image) !== 'undefined' && (this.mimeType === ImageMimeType.JPEG || this.mimeType === ImageMimeType.PNG))
        {
            const blob = new Blob([array], { "type": this.mimeType });
            const objectURL = URL.createObjectURL(blob);
            this.image = await gltfImage.loadHTMLImage(objectURL).catch( () => {
                console.error("Could not load image from buffer view");
            });
        }
        else if(this.mimeType === ImageMimeType.JPEG)
        {
            this.image = jpegJs.decode(array, {useTArray: true});
        }
        else if(this.mimeType === ImageMimeType.PNG)
        {
            this.image = decodePNG(array);
        }
        else
        {
            console.error("Unsupported image type " + this.mimeType);
            return false;
        }

        return true;
    }

    async setImageFromFiles(files, gltf)
    {
        if (this.uri === undefined || files === undefined)
        {
            return false;
        }

        let foundFile = files.find(function(file)
        {
            const uriName = this.uri.split('\\').pop().split('/').pop();
            if (file.name === uriName)
            {
                return true;
            }
        }, this);

        if (foundFile === undefined)
        {
            return false;
        }

        if(this.mimeType === ImageMimeType.KTX2)
        {
            if (gltf.ktxDecoder !== undefined)
            {
                const data = new Uint8Array(await foundFile.arrayBuffer());
                this.image = await gltf.ktxDecoder.loadKtxFromBuffer(data);
            }
            else
            {
                console.warn('Loading of ktx images failed: KtxDecoder not initalized');
            }
        }
        else if (typeof(Image) !== 'undefined' && (this.mimeType === ImageMimeType.JPEG || this.mimeType === ImageMimeType.PNG))
        {
            const imageData = await AsyncFileReader.readAsDataURL(foundFile).catch( () => {
                console.error("Could not load image with FileReader");
            });
            this.image = await gltfImage.loadHTMLImage(imageData).catch( () => {
                console.error("Could not create image from FileReader image data");
            });
        }
        else
        {
            console.error("Unsupported image type " + this.mimeType);
            return false;
        }


        return true;
    }
}

// https://github.com/KhronosGroup/glTF/blob/khr_ktx2_ibl/extensions/2.0/Khronos/KHR_lights_image_based/schema/imageBasedLight.schema.json

class ImageBasedLight extends GltfObject
{
    constructor()
    {
        super();
        this.rotation = jsToGl([0, 0, 0, 1]);
        this.brightnessFactor = 1;
        this.brightnessOffset = 0;
        this.specularEnvironmentTexture = undefined;
        this.diffuseEnvironmentTexture = undefined;
        this.sheenEnvironmentTexture = undefined;

        // non-gltf
        this.levelCount = 1;
    }

    fromJson(jsonIBL)
    {
        super.fromJson(jsonIBL);

        if(jsonIBL.extensions !== undefined)
        {
            this.fromJsonExtensions(jsonIBL.extensions);
        }
    }

    fromJsonExtensions(extensions)
    {
        if (extensions.KHR_materials_sheen !== undefined)
        {
            this.sheenEnvironmentTexture = extensions.KHR_materials_sheen.sheenEnvironmentTexture;
        }
    }

    initGl(gltf, webGlContext)
    {
        if (this.diffuseEnvironmentTexture !== undefined)
        {
            const textureObject = gltf.textures[this.diffuseEnvironmentTexture];
            textureObject.type = GL.TEXTURE_CUBE_MAP;
        }
        if (this.specularEnvironmentTexture !== undefined)
        {
            const textureObject = gltf.textures[this.specularEnvironmentTexture];
            textureObject.type = GL.TEXTURE_CUBE_MAP;

            const imageObject = gltf.images[textureObject.source];
            this.levelCount = imageObject.image.levelCount;
        }
        if(this.sheenEnvironmentTexture !== undefined)
        {
            const textureObject = gltf.textures[this.sheenEnvironmentTexture];
            textureObject.type = GL.TEXTURE_CUBE_MAP;

            const imageObject = gltf.images[textureObject.source];
            if (this.levelCount !== imageObject.image.levelCount)
            {
                console.error("Specular and sheen do not have same level count");
            }
        }
    }
}

class gltfTexture extends GltfObject
{
    constructor(sampler = undefined, source = undefined, type = GL.TEXTURE_2D)
    {
        super();
        this.sampler = sampler; // index to gltfSampler, default sampler ?
        this.source = source; // index to gltfImage

        // non gltf
        this.glTexture = undefined;
        this.type = type;
        this.initialized = false;
        this.mipLevelCount = 0;
    }

    initGl(gltf, webGlContext)
    {
        if (this.sampler === undefined)
        {
            this.sampler = gltf.samplers.length - 1;
        }

        initGlForMembers(this, gltf, webGlContext);
    }

    fromJson(jsonTexture)
    {
        super.fromJson(jsonTexture);
        if (jsonTexture.extensions !== undefined &&
            jsonTexture.extensions.KHR_texture_basisu !== undefined &&
            jsonTexture.extensions.KHR_texture_basisu.source !== undefined)
        {
            this.source = jsonTexture.extensions.KHR_texture_basisu.source;
        }
    }

    destroy()
    {
        if (this.glTexture !== undefined)
        {
            // TODO: this breaks the dependency direction
            WebGl.context.deleteTexture(this.glTexture);
        }

        this.glTexture = undefined;
    }
}

class gltfTextureInfo
{
    constructor(index = undefined, texCoord = 0, linear = true, samplerName = "", generateMips = true) // linear by default
    {
        this.index = index; // reference to gltfTexture
        this.texCoord = texCoord; // which UV set to use
        this.linear = linear;
        this.samplerName = samplerName;
        this.strength = 1.0; // occlusion
        this.scale = 1.0; // normal
        this.generateMips = generateMips;

        this.extensions = undefined;
    }

    initGl(gltf, webGlContext)
    {
        initGlForMembers(this, gltf, webGlContext);
    }

    fromJson(jsonTextureInfo)
    {
        fromKeys(this, jsonTextureInfo);
    }
}

class gltfMaterial extends GltfObject
{
    constructor()
    {
        super();
        this.name = undefined;
        this.pbrMetallicRoughness = undefined;
        this.normalTexture = undefined;
        this.occlusionTexture = undefined;
        this.emissiveTexture = undefined;
        this.emissiveFactor = fromValues$2(0, 0, 0);
        this.alphaMode = "OPAQUE";
        this.alphaCutoff = 0.5;
        this.doubleSided = false;

        // pbr next extension toggles
        this.hasClearcoat = false;
        this.hasSheen = false;
        this.hasTransmission = false;
        this.hasIOR = false;
        this.hasEmissiveStrength = false;
        this.hasVolume = false;
        this.hasIridescence = false;

        // non gltf properties
        this.type = "unlit";
        this.textures = [];
        this.properties = new Map();
        this.defines = [];
    }

    static createDefault()
    {
        const defaultMaterial = new gltfMaterial();
        defaultMaterial.type = "MR";
        defaultMaterial.name = "Default Material";
        defaultMaterial.defines.push("MATERIAL_METALLICROUGHNESS 1");
        const baseColorFactor = fromValues$1(1, 1, 1, 1);
        const metallicFactor = 1;
        const roughnessFactor = 1;
        defaultMaterial.properties.set("u_BaseColorFactor", baseColorFactor);
        defaultMaterial.properties.set("u_MetallicFactor", metallicFactor);
        defaultMaterial.properties.set("u_RoughnessFactor", roughnessFactor);

        return defaultMaterial;
    }

    getShaderIdentifier()
    {
        switch (this.type)
        {
        default:
        case "SG": // fall through till we sparate shaders
        case "MR": return "pbr.frag";
            //case "SG": return "specular-glossiness.frag" ;
        }
    }

    getDefines(renderingParameters)
    {
        const defines = Array.from(this.defines);

        if (this.hasClearcoat && renderingParameters.enabledExtensions.KHR_materials_clearcoat)
        {
            defines.push("MATERIAL_CLEARCOAT 1");
        }
        if (this.hasSheen && renderingParameters.enabledExtensions.KHR_materials_sheen)
        {
            defines.push("MATERIAL_SHEEN 1");
        }
        if (this.hasTransmission && renderingParameters.enabledExtensions.KHR_materials_transmission)
        {
            defines.push("MATERIAL_TRANSMISSION 1");
        }
        if (this.hasVolume && renderingParameters.enabledExtensions.KHR_materials_volume)
        {
            defines.push("MATERIAL_VOLUME 1");
        }
        if(this.hasIOR && renderingParameters.enabledExtensions.KHR_materials_ior)
        {
            defines.push("MATERIAL_IOR 1");
        }
        if(this.hasSpecular && renderingParameters.enabledExtensions.KHR_materials_specular)
        {
            defines.push("MATERIAL_SPECULAR 1");
        }
        if(this.hasIridescence && renderingParameters.enabledExtensions.KHR_materials_iridescence)
        {
            defines.push("MATERIAL_IRIDESCENCE 1");
        }
        if(this.hasEmissiveStrength && renderingParameters.enabledExtensions.KHR_materials_emissive_strength)
        {
            defines.push("MATERIAL_EMISSIVE_STRENGTH 1");
        }

        return defines;
    }

    getProperties()
    {
        return this.properties;
    }

    getTextures()
    {
        return this.textures;
    }

    parseTextureInfoExtensions(textureInfo, textureKey)
    {
        if(textureInfo.extensions === undefined)
        {
            return;
        }

        if(textureInfo.extensions.KHR_texture_transform !== undefined)
        {
            const uvTransform = textureInfo.extensions.KHR_texture_transform;

            // override uvset
            if(uvTransform.texCoord !== undefined)
            {
                textureInfo.texCoord = uvTransform.texCoord;
            }

            let rotation = create$4();
            let scale = create$4();
            let translation = create$4();

            if(uvTransform.rotation !== undefined)
            {
                const s =  Math.sin(uvTransform.rotation);
                const c =  Math.cos(uvTransform.rotation);

                rotation = jsToGl([
                    c, -s, 0.0,
                    s, c, 0.0,
                    0.0, 0.0, 1.0]);
            }

            if(uvTransform.scale !== undefined)
            {
                scale = jsToGl([
                    uvTransform.scale[0], 0, 0, 
                    0, uvTransform.scale[1], 0, 
                    0, 0, 1
                ]);
            }

            if(uvTransform.offset !== undefined)
            {
                translation = jsToGl([
                    1, 0, 0, 
                    0, 1, 0, 
                    uvTransform.offset[0], uvTransform.offset[1], 1
                ]);
            }

            let uvMatrix = create$4();
            multiply$1(uvMatrix, translation, rotation);
            multiply$1(uvMatrix, uvMatrix, scale);

            this.defines.push("HAS_" + textureKey.toUpperCase() + "_UV_TRANSFORM 1");
            this.properties.set("u_" + textureKey + "UVTransform", uvMatrix);
        }
    }

    initGl(gltf, webGlContext)
    {
        if (this.normalTexture !== undefined)
        {
            this.normalTexture.samplerName = "u_NormalSampler";
            this.parseTextureInfoExtensions(this.normalTexture, "Normal");
            this.textures.push(this.normalTexture);
            this.defines.push("HAS_NORMAL_MAP 1");
            this.properties.set("u_NormalScale", this.normalTexture.scale);
            this.properties.set("u_NormalUVSet", this.normalTexture.texCoord);
        }

        if (this.occlusionTexture !== undefined)
        {
            this.occlusionTexture.samplerName = "u_OcclusionSampler";
            this.parseTextureInfoExtensions(this.occlusionTexture, "Occlusion");
            this.textures.push(this.occlusionTexture);
            this.defines.push("HAS_OCCLUSION_MAP 1");
            this.properties.set("u_OcclusionStrength", this.occlusionTexture.strength);
            this.properties.set("u_OcclusionUVSet", this.occlusionTexture.texCoord);
        }

        this.properties.set("u_EmissiveFactor", this.emissiveFactor);
        if (this.emissiveTexture !== undefined)
        {
            this.emissiveTexture.samplerName = "u_EmissiveSampler";
            this.parseTextureInfoExtensions(this.emissiveTexture, "Emissive");
            this.textures.push(this.emissiveTexture);
            this.defines.push("HAS_EMISSIVE_MAP 1");
            this.properties.set("u_EmissiveUVSet", this.emissiveTexture.texCoord);
        }

        if (this.baseColorTexture !== undefined)
        {
            this.baseColorTexture.samplerName = "u_BaseColorSampler";
            this.parseTextureInfoExtensions(this.baseColorTexture, "BaseColor");
            this.textures.push(this.baseColorTexture);
            this.defines.push("HAS_BASE_COLOR_MAP 1");
            this.properties.set("u_BaseColorUVSet", this.baseColorTexture.texCoord);
        }

        if (this.metallicRoughnessTexture !== undefined)
        {
            this.metallicRoughnessTexture.samplerName = "u_MetallicRoughnessSampler";
            this.parseTextureInfoExtensions(this.metallicRoughnessTexture, "MetallicRoughness");
            this.textures.push(this.metallicRoughnessTexture);
            this.defines.push("HAS_METALLIC_ROUGHNESS_MAP 1");
            this.properties.set("u_MetallicRoughnessUVSet", this.metallicRoughnessTexture.texCoord);
        }

        if (this.diffuseTexture !== undefined)
        {
            this.diffuseTexture.samplerName = "u_DiffuseSampler";
            this.parseTextureInfoExtensions(this.diffuseTexture, "Diffuse");
            this.textures.push(this.diffuseTexture);
            this.defines.push("HAS_DIFFUSE_MAP 1");
            this.properties.set("u_DiffuseUVSet", this.diffuseTexture.texCoord);
        }

        if (this.specularGlossinessTexture !== undefined)
        {
            this.specularGlossinessTexture.samplerName = "u_SpecularGlossinessSampler";
            this.parseTextureInfoExtensions(this.specularGlossinessTexture, "SpecularGlossiness");
            this.textures.push(this.specularGlossinessTexture);
            this.defines.push("HAS_SPECULAR_GLOSSINESS_MAP 1");
            this.properties.set("u_SpecularGlossinessUVSet", this.specularGlossinessTexture.texCoord);
        }

        this.defines.push("ALPHAMODE_OPAQUE 0");
        this.defines.push("ALPHAMODE_MASK 1");
        this.defines.push("ALPHAMODE_BLEND 2");
        if(this.alphaMode === 'MASK') // only set cutoff value for mask material
        {
            this.defines.push("ALPHAMODE ALPHAMODE_MASK");
            this.properties.set("u_AlphaCutoff", this.alphaCutoff);
        }
        else if (this.alphaMode === 'OPAQUE')
        {
            this.defines.push("ALPHAMODE ALPHAMODE_OPAQUE");
        }
        else
        {
            this.defines.push("ALPHAMODE ALPHAMODE_BLEND");
        }

        // if we have SG, we prefer SG (best practice) but if we have neither objects we use MR default values
        if(this.type !== "SG" )
        {
            this.defines.push("MATERIAL_METALLICROUGHNESS 1");
            this.properties.set("u_BaseColorFactor", fromValues$1(1, 1, 1, 1));
            this.properties.set("u_MetallicFactor", 1);
            this.properties.set("u_RoughnessFactor", 1);
        }

        if (this.pbrMetallicRoughness !== undefined && this.type !== "SG")
        {
            if (this.pbrMetallicRoughness.baseColorFactor !== undefined)
            {
                let baseColorFactor = jsToGl(this.pbrMetallicRoughness.baseColorFactor);
                this.properties.set("u_BaseColorFactor", baseColorFactor);
            }

            if (this.pbrMetallicRoughness.metallicFactor !== undefined)
            {
                let metallicFactor = this.pbrMetallicRoughness.metallicFactor;
                this.properties.set("u_MetallicFactor", metallicFactor);
            }

            if (this.pbrMetallicRoughness.roughnessFactor !== undefined)
            {
                let roughnessFactor = this.pbrMetallicRoughness.roughnessFactor;
                this.properties.set("u_RoughnessFactor", roughnessFactor);
            }

        }

        if (this.extensions !== undefined)
        {
            if (this.extensions.KHR_materials_unlit !== undefined)
            {
                this.defines.push("MATERIAL_UNLIT 1");
            }

            if (this.extensions.KHR_materials_pbrSpecularGlossiness !== undefined)
            {
                this.defines.push("MATERIAL_SPECULARGLOSSINESS 1");

                let diffuseFactor = fromValues$1(1, 1, 1, 1);
                let specularFactor = fromValues$2(1, 1, 1);
                let glossinessFactor = 1;

                if (this.extensions.KHR_materials_pbrSpecularGlossiness.diffuseFactor !== undefined)
                {
                    diffuseFactor = jsToGl(this.extensions.KHR_materials_pbrSpecularGlossiness.diffuseFactor);
                }

                if (this.extensions.KHR_materials_pbrSpecularGlossiness.specularFactor !== undefined)
                {
                    specularFactor = jsToGl(this.extensions.KHR_materials_pbrSpecularGlossiness.specularFactor);
                }

                if (this.extensions.KHR_materials_pbrSpecularGlossiness.glossinessFactor !== undefined)
                {
                    glossinessFactor = this.extensions.KHR_materials_pbrSpecularGlossiness.glossinessFactor;
                }

                this.properties.set("u_DiffuseFactor", diffuseFactor);
                this.properties.set("u_SpecularFactor", specularFactor);
                this.properties.set("u_GlossinessFactor", glossinessFactor);
            }

            // Clearcoat is part of the default metallic-roughness shader
            if(this.extensions.KHR_materials_clearcoat !== undefined)
            {
                let clearcoatFactor = 0.0;
                let clearcoatRoughnessFactor = 0.0;

                this.hasClearcoat = true;

                if(this.extensions.KHR_materials_clearcoat.clearcoatFactor !== undefined)
                {
                    clearcoatFactor = this.extensions.KHR_materials_clearcoat.clearcoatFactor;
                }
                if(this.extensions.KHR_materials_clearcoat.clearcoatRoughnessFactor !== undefined)
                {
                    clearcoatRoughnessFactor = this.extensions.KHR_materials_clearcoat.clearcoatRoughnessFactor;
                }

                if (this.clearcoatTexture !== undefined)
                {
                    this.clearcoatTexture.samplerName = "u_ClearcoatSampler";
                    this.parseTextureInfoExtensions(this.clearcoatTexture, "Clearcoat");
                    this.textures.push(this.clearcoatTexture);
                    this.defines.push("HAS_CLEARCOAT_MAP 1");
                    this.properties.set("u_ClearcoatUVSet", this.clearcoatTexture.texCoord);
                }
                if (this.clearcoatRoughnessTexture !== undefined)
                {
                    this.clearcoatRoughnessTexture.samplerName = "u_ClearcoatRoughnessSampler";
                    this.parseTextureInfoExtensions(this.clearcoatRoughnessTexture, "ClearcoatRoughness");
                    this.textures.push(this.clearcoatRoughnessTexture);
                    this.defines.push("HAS_CLEARCOAT_ROUGHNESS_MAP 1");
                    this.properties.set("u_ClearcoatRoughnessUVSet", this.clearcoatRoughnessTexture.texCoord);
                }
                if (this.clearcoatNormalTexture !== undefined)
                {
                    this.clearcoatNormalTexture.samplerName = "u_ClearcoatNormalSampler";
                    this.parseTextureInfoExtensions(this.clearcoatNormalTexture, "ClearcoatNormal");
                    this.textures.push(this.clearcoatNormalTexture);
                    this.defines.push("HAS_CLEARCOAT_NORMAL_MAP 1");
                    this.properties.set("u_ClearcoatNormalUVSet", this.clearcoatNormalTexture.texCoord);
                    this.properties.set("u_ClearcoatNormalScale", this.clearcoatNormalTexture.scale);

                }
                this.properties.set("u_ClearcoatFactor", clearcoatFactor);
                this.properties.set("u_ClearcoatRoughnessFactor", clearcoatRoughnessFactor);
            }

            // Sheen material extension
            // https://github.com/sebavan/glTF/tree/KHR_materials_sheen/extensions/2.0/Khronos/KHR_materials_sheen
            if(this.extensions.KHR_materials_sheen !== undefined)
            {
                let sheenRoughnessFactor = 0.0;
                let sheenColorFactor =  fromValues$2(1.0, 1.0, 1.0);

                this.hasSheen = true;

                if(this.extensions.KHR_materials_sheen.sheenRoughnessFactor !== undefined)
                {
                    sheenRoughnessFactor = this.extensions.KHR_materials_sheen.sheenRoughnessFactor;
                }
                if(this.extensions.KHR_materials_sheen.sheenColorFactor !== undefined)
                {
                    sheenColorFactor = jsToGl(this.extensions.KHR_materials_sheen.sheenColorFactor);
                }
                if (this.sheenRoughnessTexture !== undefined)
                {
                    this.sheenRoughnessTexture.samplerName = "u_SheenRoughnessSampler";
                    this.parseTextureInfoExtensions(this.sheenRoughnessTexture, "SheenRoughness");
                    this.textures.push(this.sheenRoughnessTexture);
                    this.defines.push("HAS_SHEEN_ROUGHNESS_MAP 1");
                    this.properties.set("u_SheenRoughnessUVSet", this.sheenRoughnessTexture.texCoord);
                }
                if (this.sheenColorTexture !== undefined)
                {
                    this.sheenColorTexture.samplerName = "u_SheenColorSampler";
                    this.parseTextureInfoExtensions(this.sheenColorTexture, "SheenColor");
                    this.sheenColorTexture.linear = false;
                    this.textures.push(this.sheenColorTexture);
                    this.defines.push("HAS_SHEEN_COLOR_MAP 1");
                    this.properties.set("u_SheenColorUVSet", this.sheenColorTexture.texCoord);
                }

                this.properties.set("u_SheenRoughnessFactor", sheenRoughnessFactor);
                this.properties.set("u_SheenColorFactor", sheenColorFactor);
            }

            // KHR Extension: Specular
            if (this.extensions.KHR_materials_specular !== undefined)
            {
                this.hasSpecular = true;

                if (this.specularTexture !== undefined)
                {
                    this.specularTexture.samplerName = "u_SpecularSampler";
                    this.parseTextureInfoExtensions(this.specularTexture, "Specular");
                    this.textures.push(this.specularTexture);
                    this.defines.push("HAS_SPECULAR_MAP 1");
                    this.properties.set("u_SpecularUVSet", this.specularTexture.texCoord);
                }

                if (this.specularColorTexture !== undefined)
                {
                    this.specularColorTexture.samplerName = "u_SpecularColorSampler";
                    this.parseTextureInfoExtensions(this.specularColorTexture, "SpecularColor");
                    this.specularColorTexture.linear = false;
                    this.textures.push(this.specularColorTexture);
                    this.defines.push("HAS_SPECULAR_COLOR_MAP 1");
                    this.properties.set("u_SpecularColorUVSet", this.specularColorTexture.texCoord);
                }

                let specularColorFactor = jsToGl(this.extensions.KHR_materials_specular.specularColorFactor ?? [1.0, 1.0, 1.0]);
                let specularFactor = this.extensions.KHR_materials_specular.specularFactor ?? 1.0;

                this.properties.set("u_KHR_materials_specular_specularColorFactor", specularColorFactor);
                this.properties.set("u_KHR_materials_specular_specularFactor", specularFactor);
            }

            // KHR Extension: Emissive strength
            if (this.extensions.KHR_materials_emissive_strength !== undefined)
            {
                this.hasEmissiveStrength = true;

                let emissiveStrength = this.extensions.KHR_materials_emissive_strength.emissiveStrength ?? 1.0;

                this.properties.set("u_EmissiveStrength", emissiveStrength);
            }

            // KHR Extension: Transmission
            if (this.extensions.KHR_materials_transmission !== undefined)
            {
                let transmissionFactor = 0.0;

                this.hasTransmission = true;

                if (transmissionFactor !== undefined)
                {
                    transmissionFactor = this.extensions.KHR_materials_transmission.transmissionFactor;
                }
                if (this.transmissionTexture !== undefined)
                {
                    this.transmissionTexture.samplerName = "u_TransmissionSampler";
                    this.parseTextureInfoExtensions(this.transmissionTexture, "Transmission");
                    this.textures.push(this.transmissionTexture);
                    this.defines.push("HAS_TRANSMISSION_MAP 1");
                    this.properties.set("u_TransmissionUVSet", this.transmissionTexture.texCoord);
                }

                this.properties.set("u_TransmissionFactor", transmissionFactor);
            }

            // KHR Extension: IOR
            //https://github.com/DassaultSystemes-Technology/glTF/tree/KHR_materials_ior/extensions/2.0/Khronos/KHR_materials_ior
            if (this.extensions.KHR_materials_ior !== undefined)
            {
                let ior = 1.5;

                this.hasIOR = true;
                
                if(this.extensions.KHR_materials_ior.ior !== undefined)
                {
                    ior = this.extensions.KHR_materials_ior.ior;
                }

                this.properties.set("u_Ior", ior);
            }

            // KHR Extension: Volume
            if (this.extensions.KHR_materials_volume !== undefined)
            {
                this.hasVolume = true;

                if (this.thicknessTexture !== undefined)
                {
                    this.thicknessTexture.samplerName = "u_ThicknessSampler";
                    this.parseTextureInfoExtensions(this.thicknessTexture, "Thickness");
                    this.textures.push(this.thicknessTexture);
                    this.defines.push("HAS_THICKNESS_MAP 1");
                    this.properties.set("u_ThicknessUVSet", this.thicknessTexture.texCoord);
                }

                let attenuationColor = jsToGl(this.extensions.KHR_materials_volume.attenuationColor ?? [1.0, 1.0, 1.0]);
                let attenuationDistance = this.extensions.KHR_materials_volume.attenuationDistance ?? 0.0;
                let thicknessFactor = this.extensions.KHR_materials_volume.thicknessFactor ?? 0.0;

                this.properties.set("u_AttenuationColor", attenuationColor);
                this.properties.set("u_AttenuationDistance", attenuationDistance);
                this.properties.set("u_ThicknessFactor", thicknessFactor);
            }

            // KHR Extension: Iridescence
            // See https://github.com/ux3d/glTF/tree/extensions/KHR_materials_iridescence/extensions/2.0/Khronos/KHR_materials_iridescence
            if(this.extensions.KHR_materials_iridescence !== undefined)
            {
                this.hasIridescence = true;

                let factor = this.extensions.KHR_materials_iridescence.iridescenceFactor;
                let iridescenceIor = this.extensions.KHR_materials_iridescence.iridescenceIor;
                let thicknessMinimum = this.extensions.KHR_materials_iridescence.iridescenceThicknessMinimum;
                let thicknessMaximum = this.extensions.KHR_materials_iridescence.iridescenceThicknessMaximum;

                if (factor === undefined)
                {
                    factor = 0.0;
                }
                if (iridescenceIor === undefined)
                {
                    iridescenceIor = 1.3;
                }
                if (thicknessMinimum === undefined)
                {
                    thicknessMinimum = 100.0;
                }
                if (thicknessMaximum === undefined)
                {
                    thicknessMaximum = 400.0;
                }

                if (this.iridescenceTexture !== undefined)
                {
                    this.iridescenceTexture.samplerName = "u_IridescenceSampler";
                    this.parseTextureInfoExtensions(this.iridescenceTexture, "Iridescence");
                    this.textures.push(this.iridescenceTexture);
                    this.defines.push("HAS_IRIDESCENCE_MAP 1");
                    this.properties.set("u_IridescenceUVSet", this.iridescenceTexture.texCoord);
                }

                if (this.iridescenceThicknessTexture !== undefined)
                {
                    this.iridescenceThicknessTexture.samplerName = "u_IridescenceThicknessSampler";
                    this.parseTextureInfoExtensions(this.iridescenceThicknessTexture, "IridescenceThickness");
                    this.textures.push(this.iridescenceThicknessTexture);
                    this.defines.push("HAS_IRIDESCENCE_THICKNESS_MAP 1");
                    this.properties.set("u_IridescenceThicknessUVSet", this.iridescenceThicknessTexture.texCoord);

                    // The thickness minimum is only required when there is a thickness texture present.
                    // Because 1.0 is the default value for the thickness, no texture implies that only the
                    // maximum thickness is ever read in the shader.
                    this.properties.set("u_IridescenceThicknessMinimum", thicknessMinimum);
                }

                this.properties.set("u_IridescenceFactor", factor);
                this.properties.set("u_IridescenceIor", iridescenceIor);
                this.properties.set("u_IridescenceThicknessMaximum", thicknessMaximum);
            }
        }

        initGlForMembers(this, gltf, webGlContext);
    }

    fromJson(jsonMaterial)
    {
        super.fromJson(jsonMaterial);

        if (jsonMaterial.emissiveFactor !== undefined)
        {
            this.emissiveFactor = jsToGl(jsonMaterial.emissiveFactor);
        }

        if (jsonMaterial.normalTexture !== undefined)
        {
            const normalTexture = new gltfTextureInfo();
            normalTexture.fromJson(jsonMaterial.normalTexture);
            this.normalTexture = normalTexture;
        }

        if (jsonMaterial.occlusionTexture !== undefined)
        {
            const occlusionTexture = new gltfTextureInfo();
            occlusionTexture.fromJson(jsonMaterial.occlusionTexture);
            this.occlusionTexture = occlusionTexture;
        }

        if (jsonMaterial.emissiveTexture !== undefined)
        {
            const emissiveTexture = new gltfTextureInfo(undefined, 0, false);
            emissiveTexture.fromJson(jsonMaterial.emissiveTexture);
            this.emissiveTexture = emissiveTexture;
        }

        if(jsonMaterial.extensions !== undefined)
        {
            this.fromJsonMaterialExtensions(jsonMaterial.extensions);
        }

        if (jsonMaterial.pbrMetallicRoughness !== undefined && this.type !== "SG")
        {
            this.type = "MR";
            this.fromJsonMetallicRoughness(jsonMaterial.pbrMetallicRoughness);
        }
    }

    fromJsonMaterialExtensions(jsonExtensions)
    {
        if (jsonExtensions.KHR_materials_pbrSpecularGlossiness !== undefined)
        {
            this.type = "SG";
            this.fromJsonSpecularGlossiness(jsonExtensions.KHR_materials_pbrSpecularGlossiness);
        }

        if(jsonExtensions.KHR_materials_unlit !== undefined)
        {
            this.type = "unlit";
        }

        if(jsonExtensions.KHR_materials_clearcoat !== undefined)
        {
            this.fromJsonClearcoat(jsonExtensions.KHR_materials_clearcoat);
        }

        if(jsonExtensions.KHR_materials_sheen !== undefined)
        {
            this.fromJsonSheen(jsonExtensions.KHR_materials_sheen);
        }

        if(jsonExtensions.KHR_materials_transmission !== undefined)
        {
            this.fromJsonTransmission(jsonExtensions.KHR_materials_transmission);
        }

        if(jsonExtensions.KHR_materials_specular !== undefined)
        {
            this.fromJsonSpecular(jsonExtensions.KHR_materials_specular);
        }

        if(jsonExtensions.KHR_materials_volume !== undefined)
        {
            this.fromJsonVolume(jsonExtensions.KHR_materials_volume);
        }

        if(jsonExtensions.KHR_materials_iridescence !== undefined)
        {
            this.fromJsonIridescence(jsonExtensions.KHR_materials_iridescence);
        }
    }

    fromJsonMetallicRoughness(jsonMetallicRoughness)
    {
        if (jsonMetallicRoughness.baseColorTexture !== undefined)
        {
            const baseColorTexture = new gltfTextureInfo(undefined, 0, false);
            baseColorTexture.fromJson(jsonMetallicRoughness.baseColorTexture);
            this.baseColorTexture = baseColorTexture;
        }

        if (jsonMetallicRoughness.metallicRoughnessTexture !== undefined)
        {
            const metallicRoughnessTexture = new gltfTextureInfo();
            metallicRoughnessTexture.fromJson(jsonMetallicRoughness.metallicRoughnessTexture);
            this.metallicRoughnessTexture = metallicRoughnessTexture;
        }
    }

    fromJsonSpecularGlossiness(jsonSpecularGlossiness)
    {
        if (jsonSpecularGlossiness.diffuseTexture !== undefined)
        {
            const diffuseTexture = new gltfTextureInfo(undefined, 0, false);
            diffuseTexture.fromJson(jsonSpecularGlossiness.diffuseTexture);
            this.diffuseTexture = diffuseTexture;
        }

        if (jsonSpecularGlossiness.specularGlossinessTexture !== undefined)
        {
            const specularGlossinessTexture = new gltfTextureInfo(undefined, 0, false);
            specularGlossinessTexture.fromJson(jsonSpecularGlossiness.specularGlossinessTexture);
            this.specularGlossinessTexture = specularGlossinessTexture;
        }
    }

    fromJsonClearcoat(jsonClearcoat)
    {
        if(jsonClearcoat.clearcoatTexture !== undefined)
        {
            const clearcoatTexture = new gltfTextureInfo();
            clearcoatTexture.fromJson(jsonClearcoat.clearcoatTexture);
            this.clearcoatTexture = clearcoatTexture;
        }

        if(jsonClearcoat.clearcoatRoughnessTexture !== undefined)
        {
            const clearcoatRoughnessTexture =  new gltfTextureInfo();
            clearcoatRoughnessTexture.fromJson(jsonClearcoat.clearcoatRoughnessTexture);
            this.clearcoatRoughnessTexture = clearcoatRoughnessTexture;
        }

        if(jsonClearcoat.clearcoatNormalTexture !== undefined)
        {
            const clearcoatNormalTexture =  new gltfTextureInfo();
            clearcoatNormalTexture.fromJson(jsonClearcoat.clearcoatNormalTexture);
            this.clearcoatNormalTexture = clearcoatNormalTexture;
        }
    }

    fromJsonSheen(jsonSheen)
    {
        if(jsonSheen.sheenColorTexture !== undefined)
        {
            const sheenColorTexture = new gltfTextureInfo(undefined, 0, false);
            sheenColorTexture.fromJson(jsonSheen.sheenColorTexture);
            this.sheenColorTexture = sheenColorTexture;
        }
        if(jsonSheen.sheenRoughnessTexture !== undefined)
        {
            const sheenRoughnessTexture = new gltfTextureInfo();
            sheenRoughnessTexture.fromJson(jsonSheen.sheenRoughnessTexture);
            this.sheenRoughnessTexture = sheenRoughnessTexture;
        }
    }

    fromJsonTransmission(jsonTransmission)
    {
        if(jsonTransmission.transmissionTexture !== undefined)
        {
            const transmissionTexture = new gltfTextureInfo();
            transmissionTexture.fromJson(jsonTransmission.transmissionTexture);
            this.transmissionTexture = transmissionTexture;
        }
    }

    fromJsonSpecular(jsonSpecular)
    {
        if(jsonSpecular.specularTexture !== undefined)
        {
            const specularTexture = new gltfTextureInfo();
            specularTexture.fromJson(jsonSpecular.specularTexture);
            this.specularTexture = specularTexture;
        }

        if(jsonSpecular.specularColorTexture !== undefined)
        {
            const specularColorTexture = new gltfTextureInfo();
            specularColorTexture.fromJson(jsonSpecular.specularColorTexture);
            this.specularColorTexture = specularColorTexture;
        }
    }

    fromJsonVolume(jsonVolume)
    {
        if(jsonVolume.thicknessTexture !== undefined)
        {
            const thicknessTexture = new gltfTextureInfo();
            thicknessTexture.fromJson(jsonVolume.thicknessTexture);
            this.thicknessTexture = thicknessTexture;
        }
    }

    fromJsonIridescence(jsonIridescence)
    {
        if(jsonIridescence.iridescenceTexture !== undefined)
        {
            const iridescenceTexture = new gltfTextureInfo();
            iridescenceTexture.fromJson(jsonIridescence.iridescenceTexture);
            this.iridescenceTexture = iridescenceTexture;
        }

        if(jsonIridescence.iridescenceThicknessTexture !== undefined)
        {
            const iridescenceThicknessTexture = new gltfTextureInfo();
            iridescenceThicknessTexture.fromJson(jsonIridescence.iridescenceThicknessTexture);
            this.iridescenceThicknessTexture = iridescenceThicknessTexture;
        }
    }
}

class gltfSampler extends GltfObject
{
    constructor(
        magFilter = GL.LINEAR,
        minFilter = GL.LINEAR_MIPMAP_LINEAR,
        wrapS = GL.REPEAT,
        wrapT = GL.REPEAT)
    {
        super();
        this.magFilter = magFilter;
        this.minFilter = minFilter;
        this.wrapS = wrapS;
        this.wrapT = wrapT;
        this.name = undefined;
    }

    static createDefault()
    {
        return new gltfSampler();
    }
}

class DracoDecoder {

    constructor(dracoLib) {
        if (!DracoDecoder.instance && dracoLib === undefined)
        {
            if (DracoDecoderModule === undefined)
            {
                console.error('Failed to initalize DracoDecoder: draco library undefined');
                return undefined;
            }
            else
            {
                dracoLib = DracoDecoderModule;
            }
        }
        if (!DracoDecoder.instance)
        {
            DracoDecoder.instance = this;
            this.module = null;

            this.initializingPromise = new Promise(resolve => {
                let dracoDecoderType = {};
                dracoDecoderType['onModuleLoaded'] = dracoDecoderModule => {
                    this.module = dracoDecoderModule;
                    resolve();
                };
                dracoLib(dracoDecoderType);
            });
        }
        return DracoDecoder.instance;
    }

    async ready() {
        await this.initializingPromise;
        Object.freeze(DracoDecoder.instance);
    }

}

class gltfPrimitive extends GltfObject
{
    constructor()
    {
        super();
        this.attributes = [];
        this.targets = [];
        this.indices = undefined;
        this.material = undefined;
        this.mode = GL.TRIANGLES;

        // non gltf
        this.glAttributes = [];
        this.morphTargetTextureInfo = undefined;
        this.defines = [];
        this.skip = true;
        this.hasWeights = false;
        this.hasJoints = false;
        this.hasNormals = false;
        this.hasTangents = false;
        this.hasTexcoord = false;
        this.hasColor = false;

        // The primitive centroid is used for depth sorting.
        this.centroid = undefined;
    }

    initGl(gltf, webGlContext)
    {
        // Use the default glTF material.
        if (this.material === undefined)
        {
            this.material = gltf.materials.length - 1;
        }

        initGlForMembers(this, gltf, webGlContext);

        const maxAttributes = webGlContext.getParameter(GL.MAX_VERTEX_ATTRIBS);

        // https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#meshes

        if (this.extensions !== undefined)
        {
            if (this.extensions.KHR_draco_mesh_compression !== undefined)
            {
                const dracoDecoder = new DracoDecoder();
                if (dracoDecoder !== undefined && Object.isFrozen(dracoDecoder))
                {
                    let dracoGeometry = this.decodeDracoBufferToIntermediate(
                        this.extensions.KHR_draco_mesh_compression, gltf);
                    this.copyDataFromDecodedGeometry(gltf, dracoGeometry, this.attributes);
                }
                else
                {
                    console.warn('Failed to load draco compressed mesh: DracoDecoder not initialized');
                }
            }
        }

        // VERTEX ATTRIBUTES
        for (const attribute of Object.keys(this.attributes))
        {
            if(this.glAttributes.length >= maxAttributes)
            {
                console.error("To many vertex attributes for this primitive, skipping " + attribute);
                break;
            }

            const idx = this.attributes[attribute];
            this.glAttributes.push({ attribute: attribute, name: "a_" + attribute.toLowerCase(), accessor: idx });
            this.defines.push(`HAS_${attribute}_${gltf.accessors[idx].type} 1`);
            switch (attribute)
            {
            case "POSITION":
                this.skip = false;
                break;
            case "NORMAL":
                this.hasNormals = true;
                break;
            case "TANGENT":
                this.hasTangents = true;
                break;
            case "TEXCOORD_0":
                this.hasTexcoord = true;
                break;
            case "TEXCOORD_1":
                this.hasTexcoord = true;
                break;
            case "COLOR_0":
                this.hasColor = true;
                break;
            case "JOINTS_0":
                this.hasJoints = true;
                break;
            case "WEIGHTS_0":
                this.hasWeights = true;
                break;
            case "JOINTS_1":
                this.hasJoints = true;
                break;
            case "WEIGHTS_1":
                this.hasWeights = true;
                break;
            default:
                console.log("Unknown attribute: " + attribute);
            }
        }

        // MORPH TARGETS
        if (this.targets !== undefined && this.targets.length > 0)
        {
            const max2DTextureSize = Math.pow(webGlContext.getParameter(GL.MAX_TEXTURE_SIZE), 2);
            const maxTextureArraySize = webGlContext.getParameter(GL.MAX_ARRAY_TEXTURE_LAYERS);
            // Check which attributes are affected by morph targets and 
            // define offsets for the attributes in the morph target texture.
            const attributeOffsets = {};
            let attributeOffset = 0;

            // Gather used attributes from all targets (some targets might
            // use more attributes than others)
            const attributes = Array.from(this.targets.reduce((acc, target) => {
                Object.keys(target).map(val => acc.add(val));
                return acc;
            }, new Set()));

            const vertexCount = gltf.accessors[this.attributes[attributes[0]]].count;
            this.defines.push(`NUM_VERTICIES ${vertexCount}`);
            let targetCount = this.targets.length;
            if (targetCount * attributes.length > maxTextureArraySize)
            {
                targetCount = Math.floor(maxTextureArraySize / attributes.length);
                console.warn(`Morph targets exceed texture size limit. Only ${targetCount} of ${this.targets.length} are used.`);
            }

            for (const attribute of attributes)
            {
                // Add morph target defines
                this.defines.push(`HAS_MORPH_TARGET_${attribute} 1`);
                this.defines.push(`MORPH_TARGET_${attribute}_OFFSET ${attributeOffset}`);
                // Store the attribute offset so that later the 
                // morph target texture can be assembled.
                attributeOffsets[attribute] = attributeOffset;
                attributeOffset += targetCount;
            }
            this.defines.push("HAS_MORPH_TARGETS 1");

            if (vertexCount <= max2DTextureSize) {
                // Allocate the texture buffer. Note that all target attributes must be vec3 types and
                // all must have the same vertex count as the primitives other attributes.
                const width = Math.ceil(Math.sqrt(vertexCount));
                const singleTextureSize = Math.pow(width, 2) * 4;
                const morphTargetTextureArray = new Float32Array(singleTextureSize * targetCount * attributes.length);

                // Now assemble the texture from the accessors.
                for (let i = 0; i < targetCount; ++i)
                {
                    let target = this.targets[i];
                    for (let [attributeName, offsetRef] of Object.entries(attributeOffsets)){
                        if (target[attributeName] != undefined) {
                            const accessor = gltf.accessors[target[attributeName]];
                            const offset = offsetRef * singleTextureSize;
                            if (accessor.componentType != GL.FLOAT && accessor.normalized == false){
                                console.warn("Unsupported component type for morph targets");
                                attributeOffsets[attributeName] = offsetRef + 1;
                                continue;
                            }
                            const data = accessor.getNormalizedDeinterlacedView(gltf);
                            switch(accessor.type)
                            {
                            case "VEC2":
                            case "VEC3":
                            {
                                // Add padding to fit vec2/vec3 into rgba
                                let paddingOffset = 0;
                                let accessorOffset = 0;
                                const componentCount = accessor.getComponentCount(accessor.type);
                                for (let j = 0; j < accessor.count; ++j) {
                                    morphTargetTextureArray.set(data.subarray(accessorOffset, accessorOffset + componentCount), offset + paddingOffset);
                                    paddingOffset += 4;
                                    accessorOffset += componentCount;
                                }
                                break;
                            }
                            case "VEC4":
                                morphTargetTextureArray.set(data, offset);
                                break;
                            default:
                                console.warn("Unsupported attribute type for morph targets");
                                break;
                            }
                        }
                        attributeOffsets[attributeName] = offsetRef + 1;
                    }
                }


                // Add the morph target texture.
                // We have to create a WebGL2 texture as the format of the
                // morph target texture has to be explicitly specified 
                // (gltf image would assume uint8).
                let texture = webGlContext.createTexture();
                webGlContext.bindTexture( webGlContext.TEXTURE_2D_ARRAY, texture);
                // Set texture format and upload data.
                let internalFormat = webGlContext.RGBA32F;
                let format = webGlContext.RGBA;
                let type = webGlContext.FLOAT;
                let data = morphTargetTextureArray;
                webGlContext.texImage3D(
                    webGlContext.TEXTURE_2D_ARRAY,
                    0, //level
                    internalFormat,
                    width,
                    width,
                    targetCount * attributes.length, //Layer count
                    0, //border
                    format,
                    type,
                    data);
                // Ensure mipmapping is disabled and the sampler is configured correctly.
                webGlContext.texParameteri( GL.TEXTURE_2D_ARRAY,  GL.TEXTURE_WRAP_S,  GL.CLAMP_TO_EDGE);
                webGlContext.texParameteri( GL.TEXTURE_2D_ARRAY,  GL.TEXTURE_WRAP_T,  GL.CLAMP_TO_EDGE);
                webGlContext.texParameteri( GL.TEXTURE_2D_ARRAY,  GL.TEXTURE_MIN_FILTER,  GL.NEAREST);
                webGlContext.texParameteri( GL.TEXTURE_2D_ARRAY,  GL.TEXTURE_MAG_FILTER,  GL.NEAREST);
                
                // Now we add the morph target texture as a gltf texture info resource, so that 
                // we can just call webGl.setTexture(..., gltfTextureInfo, ...) in the renderer.
                const morphTargetImage = new gltfImage(
                    undefined, // uri
                    GL.TEXTURE_2D_ARRAY, // type
                    0, // mip level
                    undefined, // buffer view
                    undefined, // name
                    ImageMimeType.GLTEXTURE, // mimeType
                    texture // image
                );
                gltf.images.push(morphTargetImage);

                gltf.samplers.push(new gltfSampler(GL.NEAREST, GL.NEAREST, GL.CLAMP_TO_EDGE, GL.CLAMP_TO_EDGE, undefined));

                const morphTargetTexture = new gltfTexture(
                    gltf.samplers.length - 1,
                    gltf.images.length - 1,
                    GL.TEXTURE_2D_ARRAY);
                // The webgl texture is already initialized -> this flag informs
                // webgl.setTexture about this.
                morphTargetTexture.initialized = true;

                gltf.textures.push(morphTargetTexture);

                this.morphTargetTextureInfo = new gltfTextureInfo(gltf.textures.length - 1, 0, true);
                this.morphTargetTextureInfo.samplerName = "u_MorphTargetsSampler";
                this.morphTargetTextureInfo.generateMips = false;
            } else {
                console.warn("Mesh of Morph targets too big. Cannot apply morphing.");
            }         
        }

        this.computeCentroid(gltf);
    }

    computeCentroid(gltf)
    {
        const positionsAccessor = gltf.accessors[this.attributes.POSITION];
        const positions = positionsAccessor.getNormalizedTypedView(gltf);

        if(this.indices !== undefined)
        {
            // Primitive has indices.

            const indicesAccessor = gltf.accessors[this.indices];

            const indices = indicesAccessor.getTypedView(gltf);

            const acc = new Float32Array(3);

            for(let i = 0; i < indices.length; i++) {
                const offset = 3 * indices[i];
                acc[0] += positions[offset];
                acc[1] += positions[offset + 1];
                acc[2] += positions[offset + 2];
            }

            const centroid = new Float32Array([
                acc[0] / indices.length,
                acc[1] / indices.length,
                acc[2] / indices.length,
            ]);

            this.centroid = centroid;
        }
        else
        {
            // Primitive does not have indices.

            const acc = new Float32Array(3);

            for(let i = 0; i < positions.length; i += 3) {
                acc[0] += positions[i];
                acc[1] += positions[i + 1];
                acc[2] += positions[i + 2];
            }

            const positionVectors = positions.length / 3;

            const centroid = new Float32Array([
                acc[0] / positionVectors,
                acc[1] / positionVectors,
                acc[2] / positionVectors,
            ]);

            this.centroid = centroid;
        }
    }

    getShaderIdentifier()
    {
        return "primitive.vert";
    }

    getDefines()
    {
        return this.defines;
    }

    fromJson(jsonPrimitive)
    {
        super.fromJson(jsonPrimitive);

        if(jsonPrimitive.extensions !== undefined)
        {
            this.fromJsonPrimitiveExtensions(jsonPrimitive.extensions);
        }
    }

    fromJsonPrimitiveExtensions(jsonExtensions)
    {
        if(jsonExtensions.KHR_materials_variants !== undefined)
        {
            this.fromJsonVariants(jsonExtensions.KHR_materials_variants);
        }
    }

    fromJsonVariants(jsonVariants)
    {
        if(jsonVariants.mappings !== undefined)
        {
            this.mappings = jsonVariants.mappings;
        }
    }

    copyDataFromDecodedGeometry(gltf, dracoGeometry, primitiveAttributes)
    {
        // indices
        let indexBuffer = dracoGeometry.index.array;
        if (this.indices !== undefined){
            this.loadBufferIntoGltf(indexBuffer, gltf, this.indices, 34963,
                "index buffer view");
        }

        // Position
        if(dracoGeometry.attributes.POSITION !== undefined)
        {
            let positionBuffer = this.loadArrayIntoArrayBuffer(dracoGeometry.attributes.POSITION.array,
                dracoGeometry.attributes.POSITION.componentType);
            this.loadBufferIntoGltf(positionBuffer, gltf, primitiveAttributes["POSITION"], 34962,
                "position buffer view");
        }

        // Normal
        if(dracoGeometry.attributes.NORMAL !== undefined)
        {
            let normalBuffer = this.loadArrayIntoArrayBuffer(dracoGeometry.attributes.NORMAL.array,
                dracoGeometry.attributes.NORMAL.componentType);
            this.loadBufferIntoGltf(normalBuffer, gltf, primitiveAttributes["NORMAL"], 34962,
                "normal buffer view");
        }

        // TEXCOORD_0
        if(dracoGeometry.attributes.TEXCOORD_0 !== undefined)
        {
            let uvBuffer = this.loadArrayIntoArrayBuffer(dracoGeometry.attributes.TEXCOORD_0.array,
                dracoGeometry.attributes.TEXCOORD_0.componentType);
            this.loadBufferIntoGltf(uvBuffer, gltf, primitiveAttributes["TEXCOORD_0"], 34962,
                "TEXCOORD_0 buffer view");
        }

        // TEXCOORD_1
        if(dracoGeometry.attributes.TEXCOORD_1 !== undefined)
        {
            let uvBuffer = this.loadArrayIntoArrayBuffer(dracoGeometry.attributes.TEXCOORD_1.array,
                dracoGeometry.attributes.TEXCOORD_1.componentType);
            this.loadBufferIntoGltf(uvBuffer, gltf, primitiveAttributes["TEXCOORD_1"], 34962,
                "TEXCOORD_1 buffer view");
        }

        // Tangent
        if(dracoGeometry.attributes.TANGENT !== undefined)
        {
            let tangentBuffer = this.loadArrayIntoArrayBuffer(dracoGeometry.attributes.TANGENT.array,
                dracoGeometry.attributes.TANGENT.componentType);
            this.loadBufferIntoGltf(tangentBuffer, gltf, primitiveAttributes["TANGENT"], 34962,
                "Tangent buffer view");
        }

        // Color
        if(dracoGeometry.attributes.COLOR_0 !== undefined)
        {
            let colorBuffer = this.loadArrayIntoArrayBuffer(dracoGeometry.attributes.COLOR_0.array,
                dracoGeometry.attributes.COLOR_0.componentType);
            this.loadBufferIntoGltf(colorBuffer, gltf, primitiveAttributes["COLOR_0"], 34962,
                "color buffer view");
        }

        // JOINTS_0
        if(dracoGeometry.attributes.JOINTS_0 !== undefined)
        {
            let jointsBuffer = this.loadArrayIntoArrayBuffer(dracoGeometry.attributes.JOINTS_0.array,
                dracoGeometry.attributes.JOINTS_0.componentType);
            this.loadBufferIntoGltf(jointsBuffer, gltf, primitiveAttributes["JOINTS_0"], 34963,
                "JOINTS_0 buffer view");
        }

        // WEIGHTS_0
        if(dracoGeometry.attributes.WEIGHTS_0 !== undefined)
        {
            let weightsBuffer = this.loadArrayIntoArrayBuffer(dracoGeometry.attributes.WEIGHTS_0.array,
                dracoGeometry.attributes.WEIGHTS_0.componentType);
            this.loadBufferIntoGltf(weightsBuffer, gltf, primitiveAttributes["WEIGHTS_0"], 34963,
                "WEIGHTS_0 buffer view");
        }

        // JOINTS_1
        if(dracoGeometry.attributes.JOINTS_1 !== undefined)
        {
            let jointsBuffer = this.loadArrayIntoArrayBuffer(dracoGeometry.attributes.JOINTS_1.array,
                dracoGeometry.attributes.JOINTS_1.componentType);
            this.loadBufferIntoGltf(jointsBuffer, gltf, primitiveAttributes["JOINTS_1"], 34963,
                "JOINTS_1 buffer view");
        }

        // WEIGHTS_1
        if(dracoGeometry.attributes.WEIGHTS_1 !== undefined)
        {
            let weightsBuffer = this.loadArrayIntoArrayBuffer(dracoGeometry.attributes.WEIGHTS_1.array,
                dracoGeometry.attributes.WEIGHTS_1.componentType);
            this.loadBufferIntoGltf(weightsBuffer, gltf, primitiveAttributes["WEIGHTS_1"], 34963,
                "WEIGHTS_1 buffer view");
        }
    }

    loadBufferIntoGltf(buffer, gltf, gltfAccessorIndex, gltfBufferViewTarget, gltfBufferViewName)
    {
        const gltfBufferObj = new gltfBuffer();
        gltfBufferObj.byteLength = buffer.byteLength;
        gltfBufferObj.buffer = buffer;
        gltf.buffers.push(gltfBufferObj);

        const gltfBufferViewObj = new gltfBufferView();
        gltfBufferViewObj.buffer = gltf.buffers.length - 1;
        gltfBufferViewObj.byteLength = buffer.byteLength;
        if(gltfBufferViewName !== undefined)
        {
            gltfBufferViewObj.name = gltfBufferViewName;
        }
        gltfBufferViewObj.target = gltfBufferViewTarget;
        gltf.bufferViews.push(gltfBufferViewObj);

        gltf.accessors[gltfAccessorIndex].byteOffset = 0;
        gltf.accessors[gltfAccessorIndex].bufferView = gltf.bufferViews.length - 1;
    }

    loadArrayIntoArrayBuffer(arrayData, componentType)
    {
        let arrayBuffer;
        switch (componentType)
        {
        case "Int8Array":
            arrayBuffer = new ArrayBuffer(arrayData.length);
            let int8Array = new Int8Array(arrayBuffer);
            int8Array.set(arrayData);
            break;
        case "Uint8Array":
            arrayBuffer = new ArrayBuffer(arrayData.length);
            let uint8Array = new Uint8Array(arrayBuffer);
            uint8Array.set(arrayData);
            break;
        case "Int16Array":
            arrayBuffer = new ArrayBuffer(arrayData.length * 2);
            let int16Array = new Int16Array(arrayBuffer);
            int16Array.set(arrayData);
            break;
        case "Uint16Array":
            arrayBuffer = new ArrayBuffer(arrayData.length * 2);
            let uint16Array = new Uint16Array(arrayBuffer);
            uint16Array.set(arrayData);
            break;
        case "Int32Array":
            arrayBuffer = new ArrayBuffer(arrayData.length * 4);
            let int32Array = new Int32Array(arrayBuffer);
            int32Array.set(arrayData);
            break;
        case "Uint32Array":
            arrayBuffer = new ArrayBuffer(arrayData.length * 4);
            let uint32Array = new Uint32Array(arrayBuffer);
            uint32Array.set(arrayData);
            break;
        default:
        case "Float32Array":
            arrayBuffer = new ArrayBuffer(arrayData.length * 4);
            let floatArray = new Float32Array(arrayBuffer);
            floatArray.set(arrayData);
            break;
        }


        return arrayBuffer;
    }

    decodeDracoBufferToIntermediate(dracoExtension, gltf)
    {
        let dracoBufferViewIDX = dracoExtension.bufferView;

        const origGltfDrBufViewObj = gltf.bufferViews[dracoBufferViewIDX];
        const origGltfDracoBuffer = gltf.buffers[origGltfDrBufViewObj.buffer];

        const totalBuffer = new Int8Array( origGltfDracoBuffer.buffer );
        const actualBuffer = totalBuffer.slice(origGltfDrBufViewObj.byteOffset,
            origGltfDrBufViewObj.byteOffset + origGltfDrBufViewObj.byteLength);

        // decode draco buffer to geometry intermediate
        let dracoDecoder = new DracoDecoder();
        let draco = dracoDecoder.module;
        let decoder = new draco.Decoder();
        let decoderBuffer = new draco.DecoderBuffer();
        decoderBuffer.Init(actualBuffer, origGltfDrBufViewObj.byteLength);
        let geometry = this.decodeGeometry( draco, decoder, decoderBuffer, dracoExtension.attributes, gltf );

        draco.destroy( decoderBuffer );

        return geometry;
    }

    getDracoArrayTypeFromComponentType(componentType)
    {
        switch (componentType)
        {
        case GL.BYTE:
            return "Int8Array";
        case GL.UNSIGNED_BYTE:
            return "Uint8Array";
        case GL.SHORT:
            return "Int16Array";
        case GL.UNSIGNED_SHORT:
            return "Uint16Array";
        case GL.INT:
            return "Int32Array";
        case GL.UNSIGNED_INT:
            return "Uint32Array";
        case GL.FLOAT:
            return "Float32Array";
        default:
            return "Float32Array";
        }
    }

    decodeGeometry(draco, decoder, decoderBuffer, gltfDracoAttributes, gltf) {
        let dracoGeometry;
        let decodingStatus;

        // decode mesh in draco decoder
        let geometryType = decoder.GetEncodedGeometryType( decoderBuffer );
        if ( geometryType === draco.TRIANGULAR_MESH ) {
            dracoGeometry = new draco.Mesh();
            decodingStatus = decoder.DecodeBufferToMesh( decoderBuffer, dracoGeometry );
        }
        else
        {
            throw new Error( 'DRACOLoader: Unexpected geometry type.' );
        }

        if ( ! decodingStatus.ok() || dracoGeometry.ptr === 0 ) {
            throw new Error( 'DRACOLoader: Decoding failed: ' + decodingStatus.error_msg() );
        }

        let geometry = { index: null, attributes: {} };
        let vertexCount = dracoGeometry.num_points();

        // Gather all vertex attributes.
        for(let dracoAttr in gltfDracoAttributes)
        {
            let componentType = GL.BYTE;
            let accessotVertexCount;
            // find gltf accessor for this draco attribute
            for (const [key, value] of Object.entries(this.attributes))
            {
                if(key === dracoAttr)
                {
                    componentType = gltf.accessors[value].componentType;
                    accessotVertexCount = gltf.accessors[value].count;
                    break;
                }
            }

            // check if vertex count matches
            if(vertexCount !== accessotVertexCount)
            {
                throw new Error(`DRACOLoader: Accessor vertex count ${accessotVertexCount} does not match draco decoder vertex count  ${vertexCount}`);
            }
            componentType = this.getDracoArrayTypeFromComponentType(componentType);

            let dracoAttribute = decoder.GetAttributeByUniqueId( dracoGeometry, gltfDracoAttributes[dracoAttr]);
            var tmpObj = this.decodeAttribute( draco, decoder,
                dracoGeometry, dracoAttr, dracoAttribute, componentType);
            geometry.attributes[tmpObj.name] = tmpObj;
        }

        // Add index buffer
        if ( geometryType === draco.TRIANGULAR_MESH ) {

            // Generate mesh faces.
            let numFaces = dracoGeometry.num_faces();
            let numIndices = numFaces * 3;
            let dataSize = numIndices * 4;
            let ptr = draco._malloc( dataSize );
            decoder.GetTrianglesUInt32Array( dracoGeometry, dataSize, ptr );
            let index = new Uint32Array( draco.HEAPU32.buffer, ptr, numIndices ).slice();
            draco._free( ptr );

            geometry.index = { array: index, itemSize: 1 };

        }

        draco.destroy( dracoGeometry );
        return geometry;
    }

    decodeAttribute( draco, decoder, dracoGeometry, attributeName, attribute, attributeType) {
        let numComponents = attribute.num_components();
        let numPoints = dracoGeometry.num_points();
        let numValues = numPoints * numComponents;

        let ptr;
        let array;

        let dataSize;
        switch ( attributeType ) {
        case "Float32Array":
            dataSize = numValues * 4;
            ptr = draco._malloc( dataSize );
            decoder.GetAttributeDataArrayForAllPoints( dracoGeometry, attribute, draco.DT_FLOAT32, dataSize, ptr );
            array = new Float32Array( draco.HEAPF32.buffer, ptr, numValues ).slice();
            draco._free( ptr );
            break;

        case "Int8Array":
            ptr = draco._malloc( numValues );
            decoder.GetAttributeDataArrayForAllPoints( dracoGeometry, attribute, draco.DT_INT8, numValues, ptr );
            array = new Int8Array( draco.HEAP8.buffer, ptr, numValues ).slice();
            draco._free( ptr );
            break;

        case "Int16Array":
            dataSize = numValues * 2;
            ptr = draco._malloc( dataSize );
            decoder.GetAttributeDataArrayForAllPoints( dracoGeometry, attribute, draco.DT_INT16, dataSize, ptr );
            array = new Int16Array( draco.HEAP16.buffer, ptr, numValues ).slice();
            draco._free( ptr );
            break;

        case "Int32Array":
            dataSize = numValues * 4;
            ptr = draco._malloc( dataSize );
            decoder.GetAttributeDataArrayForAllPoints( dracoGeometry, attribute, draco.DT_INT32, dataSize, ptr );
            array = new Int32Array( draco.HEAP32.buffer, ptr, numValues ).slice();
            draco._free( ptr );
            break;

        case "Uint8Array":
            ptr = draco._malloc( numValues );
            decoder.GetAttributeDataArrayForAllPoints( dracoGeometry, attribute, draco.DT_UINT8, numValues, ptr );
            array = new Uint8Array( draco.HEAPU8.buffer, ptr, numValues ).slice();
            draco._free( ptr );
            break;

        case "Uint16Array":
            dataSize = numValues * 2;
            ptr = draco._malloc( dataSize );
            decoder.GetAttributeDataArrayForAllPoints( dracoGeometry, attribute, draco.DT_UINT16, dataSize, ptr );
            array = new Uint16Array( draco.HEAPU16.buffer, ptr, numValues ).slice();
            draco._free( ptr );
            break;

        case "Uint32Array":
            dataSize = numValues * 4;
            ptr = draco._malloc( dataSize );
            decoder.GetAttributeDataArrayForAllPoints( dracoGeometry, attribute, draco.DT_UINT32, dataSize, ptr );
            array = new Uint32Array( draco.HEAPU32.buffer, ptr, numValues ).slice();
            draco._free( ptr );
            break;

        default:
            throw new Error( 'DRACOLoader: Unexpected attribute type.' );
        }

        return {
            name: attributeName,
            array: array,
            itemSize: numComponents,
            componentType: attributeType
        };

    }
}

class gltfMesh extends GltfObject
{
    constructor()
    {
        super();
        this.primitives = [];
        this.name = undefined;
        this.weights = [];

        // non gltf
        this.weightsAnimated = undefined;
    }

    fromJson(jsonMesh)
    {
        super.fromJson(jsonMesh);

        if (jsonMesh.name !== undefined)
        {
            this.name = jsonMesh.name;
        }

        this.primitives = objectsFromJsons(jsonMesh.primitives, gltfPrimitive);

        if(jsonMesh.weights !== undefined)
        {
            this.weights = jsonMesh.weights;
        }
    }

    getWeightsAnimated()
    {
        return this.weightsAnimated !== undefined ? this.weightsAnimated : this.weights;
    }
}

// contain:
// transform
// child indices (reference to scene array of nodes)

class gltfNode extends GltfObject
{
    constructor()
    {
        super();
        this.camera = undefined;
        this.children = [];
        this.matrix = undefined;
        this.rotation = jsToGl([0, 0, 0, 1]);
        this.scale = jsToGl([1, 1, 1]);
        this.translation = jsToGl([0, 0, 0]);
        this.name = undefined;
        this.mesh = undefined;
        this.skin = undefined;

        // non gltf
        this.worldTransform = create$3();
        this.inverseWorldTransform = create$3();
        this.normalMatrix = create$3();
        this.light = undefined;
        this.changed = true;

        this.animationRotation = undefined;
        this.animationTranslation = undefined;
        this.animationScale = undefined;
    }

    initGl()
    {
        if (this.matrix !== undefined)
        {
            this.applyMatrix(this.matrix);
        }
        else
        {
            if (this.scale !== undefined)
            {
                this.scale = jsToGl(this.scale);
            }

            if (this.rotation !== undefined)
            {
                this.rotation = jsToGl(this.rotation);
            }

            if (this.translation !== undefined)
            {
                this.translation = jsToGl(this.translation);
            }
        }
        this.changed = true;
    }

    applyMatrix(matrixData)
    {
        this.matrix = jsToGl(matrixData);

        getScaling(this.scale, this.matrix);

        // To extract a correct rotation, the scaling component must be eliminated.
        const mn = create$3();
        for(const col of [0, 1, 2])
        {
            mn[col] = this.matrix[col] / this.scale[0];
            mn[col + 4] = this.matrix[col + 4] / this.scale[1];
            mn[col + 8] = this.matrix[col + 8] / this.scale[2];
        }
        getRotation(this.rotation, mn);
        normalize(this.rotation, this.rotation);

        getTranslation(this.translation, this.matrix);

        this.changed = true;
    }

    // vec3
    applyTranslationAnimation(translation)
    {
        this.animationTranslation = translation;
        this.changed = true;
    }

    // quat
    applyRotationAnimation(rotation)
    {
        this.animationRotation = rotation;
        this.changed = true;
    }

    // vec3
    applyScaleAnimation(scale)
    {
        this.animationScale = scale;
        this.changed = true;
    }

    resetTransform()
    {
        this.rotation = jsToGl([0, 0, 0, 1]);
        this.scale = jsToGl([1, 1, 1]);
        this.translation = jsToGl([0, 0, 0]);
        this.changed = true;
    }

    getLocalTransform()
    {
        if(this.transform === undefined || this.changed)
        {
            // if no animation is applied and the transform matrix is present use it directly
            if(this.animationTranslation === undefined && this.animationRotation === undefined && this.animationScale === undefined && this.matrix !== undefined) {
                this.transform = clone$1(this.matrix);
            } else {
                this.transform = create$3();
                const translation = this.animationTranslation !== undefined ? this.animationTranslation : this.translation;
                const rotation = this.animationRotation !== undefined ? this.animationRotation : this.rotation;
                const scale = this.animationScale !== undefined ? this.animationScale : this.scale;
                fromRotationTranslationScale(this.transform, rotation, translation, scale);
            }
            this.changed = false;
        }

        return clone$1(this.transform);
    }
}

class gltfScene extends GltfObject
{
    constructor(nodes = [], name = undefined)
    {
        super();
        this.nodes = nodes;
        this.name = name;

        // non gltf
        this.imageBasedLight = undefined;
    }

    initGl(gltf, webGlContext)
    {
        super.initGl(gltf, webGlContext);

        if (this.extensions !== undefined &&
            this.extensions.KHR_lights_image_based !== undefined)
        {
            const index = this.extensions.KHR_lights_image_based.imageBasedLight;
            this.imageBasedLight = gltf.imageBasedLights[index];
        }
    }

    applyTransformHierarchy(gltf, rootTransform = create$3())
    {
        function applyTransform(gltf, node, parentTransform)
        {
            multiply(node.worldTransform, parentTransform, node.getLocalTransform());
            invert(node.inverseWorldTransform, node.worldTransform);
            transpose(node.normalMatrix, node.inverseWorldTransform);

            for (const child of node.children)
            {
                applyTransform(gltf, gltf.nodes[child], node.worldTransform);
            }
        }

        for (const node of this.nodes)
        {
            applyTransform(gltf, gltf.nodes[node], rootTransform);
        }
    }

    gatherNodes(gltf)
    {
        const nodes = [];

        function gatherNode(nodeIndex)
        {
            const node = gltf.nodes[nodeIndex];
            nodes.push(node);

            // recurse into children
            for(const child of node.children)
            {
                gatherNode(child);
            }
        }

        for (const node of this.nodes)
        {
            gatherNode(node);
        }

        return nodes;
    }

    includesNode(gltf, nodeIndex)
    {
        let children = [...this.nodes];
        while(children.length > 0)
        {
            const childIndex = children.pop();

            if (childIndex === nodeIndex)
            {
                return true;
            }

            children = children.concat(gltf.nodes[childIndex].children);
        }

        return false;
    }
}

class gltfAsset extends GltfObject
{
    constructor()
    {
        super();
        this.copyright = undefined;
        this.generator = undefined;
        this.version = undefined;
        this.minVersion = undefined;
    }
}

class gltfAnimationChannel extends GltfObject
{
    constructor()
    {
        super();
        this.target = {node: undefined, path: undefined};
        this.sampler = undefined;
    }
}

const InterpolationPath =
{
    TRANSLATION: "translation",
    ROTATION: "rotation",
    SCALE: "scale",
    WEIGHTS: "weights"
};

class gltfAnimationSampler extends GltfObject
{
    constructor()
    {
        super();
        this.input = undefined;
        this.interpolation = InterpolationModes.LINEAR;
        this.output = undefined;
    }
}

const InterpolationModes =
{
    LINEAR: "LINEAR",
    STEP: "STEP",
    CUBICSPLINE: "CUBICSPLINE"
};

class gltfInterpolator
{
    constructor()
    {
        this.prevKey = 0;
        this.prevT = 0.0;
    }

    slerpQuat(q1, q2, t)
    {
        const qn1 = create();
        const qn2 = create();

        normalize(qn1, q1);
        normalize(qn2, q2);

        const quatResult = create();

        slerp(quatResult, qn1, qn2, t);
        normalize(quatResult, quatResult);

        return quatResult;
    }

    step(prevKey, output, stride)
    {
        const result = new ARRAY_TYPE(stride);

        for(let i = 0; i < stride; ++i)
        {
            result[i] = output[prevKey * stride + i];
        }

        return result;
    }

    linear(prevKey, nextKey, output, t, stride)
    {
        const result = new ARRAY_TYPE(stride);

        for(let i = 0; i < stride; ++i)
        {
            result[i] = output[prevKey * stride + i] * (1-t) + output[nextKey * stride + i] * t;
        }

        return result;
    }

    cubicSpline(prevKey, nextKey, output, keyDelta, t, stride)
    {
        // stride: Count of components (4 in a quaternion).
        // Scale by 3, because each output entry consist of two tangents and one data-point.
        const prevIndex = prevKey * stride * 3;
        const nextIndex = nextKey * stride * 3;
        const A = 0;
        const V = 1 * stride;
        const B = 2 * stride;

        const result = new ARRAY_TYPE(stride);
        const tSq = t ** 2;
        const tCub = t ** 3;

        // We assume that the components in output are laid out like this: in-tangent, point, out-tangent.
        // https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#appendix-c-spline-interpolation
        for(let i = 0; i < stride; ++i)
        {
            const v0 = output[prevIndex + i + V];
            const a = keyDelta * output[nextIndex + i + A];
            const b = keyDelta * output[prevIndex + i + B];
            const v1 = output[nextIndex + i + V];

            result[i] = ((2*tCub - 3*tSq + 1) * v0) + ((tCub - 2*tSq + t) * b) + ((-2*tCub + 3*tSq) * v1) + ((tCub - tSq) * a);
        }

        return result;
    }

    resetKey()
    {
        this.prevKey = 0;
    }

    interpolate(gltf, channel, sampler, t, stride, maxTime)
    {
        if(t === undefined)
        {
            return undefined;
        }

        const input = gltf.accessors[sampler.input].getNormalizedDeinterlacedView(gltf);
        const output = gltf.accessors[sampler.output].getNormalizedDeinterlacedView(gltf);

        if(output.length === stride) // no interpolation for single keyFrame animations
        {
            return jsToGlSlice(output, 0, stride);
        }

        // Wrap t around, so the animation loops.
        // Make sure that t is never earlier than the first keyframe and never later then the last keyframe.
        t = t % maxTime;
        t = clamp(t, input[0], input[input.length - 1]);

        if (this.prevT > t)
        {
            this.prevKey = 0;
        }

        this.prevT = t;

        // Find next keyframe: min{ t of input | t > prevKey }
        let nextKey = null;
        for (let i = this.prevKey; i < input.length; ++i)
        {
            if (t <= input[i])
            {
                nextKey = clamp(i, 1, input.length - 1);
                break;
            }
        }
        this.prevKey = clamp(nextKey - 1, 0, nextKey);

        const keyDelta = input[nextKey] - input[this.prevKey];

        // Normalize t: [t0, t1] -> [0, 1]
        const tn = (t - input[this.prevKey]) / keyDelta;

        if(channel.target.path === InterpolationPath.ROTATION)
        {

            if(InterpolationModes.CUBICSPLINE === sampler.interpolation)
            {
                // GLTF requires cubic spline interpolation for quaternions.
                // https://github.com/KhronosGroup/glTF/issues/1386
                const result = this.cubicSpline(this.prevKey, nextKey, output, keyDelta, tn, 4);
                normalize(result, result);
                return result;
            }
            else if(sampler.interpolation === InterpolationModes.LINEAR)
            {
                const q0 = this.getQuat(output, this.prevKey);
                const q1 = this.getQuat(output, nextKey);
                return this.slerpQuat(q0, q1, tn);
            }
            else if(sampler.interpolation === InterpolationModes.STEP)
            {
                return this.getQuat(output, this.prevKey);
            }

        }

        switch(sampler.interpolation)
        {
        case InterpolationModes.STEP:
            return this.step(this.prevKey, output, stride);
        case InterpolationModes.CUBICSPLINE:
            return this.cubicSpline(this.prevKey, nextKey, output, keyDelta, tn, stride);
        default:
            return this.linear(this.prevKey, nextKey, output, tn, stride);
        }
    }

    getQuat(output, index)
    {
        const x = output[4 * index];
        const y = output[4 * index + 1];
        const z = output[4 * index + 2];
        const w = output[4 * index + 3];
        return fromValues(x, y, z, w);
    }
}

class gltfAnimation extends GltfObject
{
    constructor()
    {
        super();
        this.channels = [];
        this.samplers = [];
        this.name = '';

        // not gltf
        this.interpolators = [];
        this.maxTime = 0;
        this.disjointAnimations = [];
    }

    fromJson(jsonAnimation)
    {
        super.fromJson(jsonAnimation);

        this.channels = objectsFromJsons(jsonAnimation.channels, gltfAnimationChannel);
        this.samplers = objectsFromJsons(jsonAnimation.samplers, gltfAnimationSampler);
        this.name = jsonAnimation.name;

        if(this.channels === undefined)
        {
            console.error("No channel data found for skin");
            return;
        }

        for(let i = 0; i < this.channels.length; ++i)
        {
            this.interpolators.push(new gltfInterpolator());
        }
    }

    // advance the animation, if totalTime is undefined, the animation is deactivated
    advance(gltf, totalTime)
    {
        if(this.channels === undefined)
        {
            return;
        }

        if(this.maxTime == 0)
        {
            for(let i = 0; i < this.channels.length; ++i)
            {
                const channel = this.channels[i];
                const sampler = this.samplers[channel.sampler];
                const input = gltf.accessors[sampler.input].getDeinterlacedView(gltf);
                const max = input[input.length - 1];
                if(max > this.maxTime)
                {
                    this.maxTime = max;
                }
            }
        }

        for(let i = 0; i < this.interpolators.length; ++i)
        {
            const channel = this.channels[i];
            const sampler = this.samplers[channel.sampler];
            const interpolator = this.interpolators[i];

            const node = gltf.nodes[channel.target.node];

            switch(channel.target.path)
            {
            case InterpolationPath.TRANSLATION:
                node.applyTranslationAnimation(interpolator.interpolate(gltf, channel, sampler, totalTime, 3, this.maxTime));
                break;
            case InterpolationPath.ROTATION:
                node.applyRotationAnimation(interpolator.interpolate(gltf, channel, sampler, totalTime, 4, this.maxTime));
                break;
            case InterpolationPath.SCALE:
                node.applyScaleAnimation(interpolator.interpolate(gltf, channel, sampler, totalTime, 3, this.maxTime));
                break;
            case InterpolationPath.WEIGHTS:
            {
                const mesh = gltf.meshes[node.mesh];
                mesh.weightsAnimated = interpolator.interpolate(gltf, channel, sampler, totalTime, mesh.weights.length, this.maxTime);
                break;
            }
            }
        }
    }
}

class gltfSkin extends GltfObject
{
    constructor()
    {
        super();

        this.name = "";
        this.inverseBindMatrices = undefined;
        this.joints = [];
        this.skeleton = undefined;

        // not gltf
        this.jointTextureInfo = undefined;
        this.jointWebGlTexture = undefined;
    }

    initGl(gltf, webGlContext)
    {
        this.jointWebGlTexture = webGlContext.createTexture();
        webGlContext.bindTexture( webGlContext.TEXTURE_2D, this.jointWebGlTexture);

        // Ensure mipmapping is disabled and the sampler is configured correctly.
        webGlContext.texParameteri( GL.TEXTURE_2D,  GL.TEXTURE_WRAP_S,  GL.CLAMP_TO_EDGE);
        webGlContext.texParameteri( GL.TEXTURE_2D,  GL.TEXTURE_WRAP_T,  GL.CLAMP_TO_EDGE);
        webGlContext.texParameteri( GL.TEXTURE_2D,  GL.TEXTURE_WRAP_R,  GL.CLAMP_TO_EDGE);
        webGlContext.texParameteri( GL.TEXTURE_2D,  GL.TEXTURE_MIN_FILTER,  GL.NEAREST);
        webGlContext.texParameteri( GL.TEXTURE_2D,  GL.TEXTURE_MAG_FILTER,  GL.NEAREST);
        
        // Now we add the joints texture as a gltf texture info resource, so that 
        // we can just call webGl.setTexture(..., gltfTextureInfo, ...) in the renderer.
        const jointsImage = new gltfImage(
            undefined, // uri
            GL.TEXTURE_2D, // type
            0, // mip level
            undefined, // buffer view
            undefined, // name
            ImageMimeType.GLTEXTURE, // mimeType
            this.jointWebGlTexture // image
        );
        gltf.images.push(jointsImage);

        gltf.samplers.push(new gltfSampler(GL.NEAREST, GL.NEAREST, GL.CLAMP_TO_EDGE, GL.CLAMP_TO_EDGE, undefined));

        const jointsTexture = new gltfTexture(
            gltf.samplers.length - 1,
            gltf.images.length - 1,
            GL.TEXTURE_2D);
        // The webgl texture is already initialized -> this flag informs
        // webgl.setTexture about this.
        jointsTexture.initialized = true;

        gltf.textures.push(jointsTexture);

        this.jointTextureInfo = new gltfTextureInfo(gltf.textures.length - 1, 0, true);
        this.jointTextureInfo.samplerName = "u_jointsSampler";
        this.jointTextureInfo.generateMips = false;
    }

    computeJoints(gltf, parentNode, webGlContext)
    {
        let ibmAccessor = null;
        if (this.inverseBindMatrices !== undefined) {
            ibmAccessor = gltf.accessors[this.inverseBindMatrices].getDeinterlacedView(gltf);
        }

        this.jointMatrices = [];
        this.jointNormalMatrices = [];

        const width = Math.ceil(Math.sqrt(this.joints.length * 8));
        let textureData = new Float32Array(Math.pow(width, 2) * 4);

        let i = 0;
        for(const joint of this.joints)
        {
            const node = gltf.nodes[joint];

            let jointMatrix = clone$1(node.worldTransform);

            if (ibmAccessor !== null) {
                let ibm = jsToGlSlice(ibmAccessor, i * 16, 16);
                mul(jointMatrix, jointMatrix, ibm);
                mul(jointMatrix, parentNode.inverseWorldTransform, jointMatrix);
            }

            let normalMatrix = create$3();
            invert(normalMatrix, jointMatrix);
            transpose(normalMatrix, normalMatrix);
            
            textureData.set(jointMatrix, i * 32);
            textureData.set(normalMatrix, i * 32 + 16);
            ++i;
        }

        webGlContext.bindTexture( webGlContext.TEXTURE_2D, this.jointWebGlTexture);
        // Set texture format and upload data.
        let internalFormat = webGlContext.RGBA32F;
        let format = webGlContext.RGBA;
        let type = webGlContext.FLOAT;
        let data = textureData;
        webGlContext.texImage2D(
            webGlContext.TEXTURE_2D,
            0, //level
            internalFormat,
            width,
            width,
            0, //border
            format,
            type,
            data);
    }
}

class gltfVariant extends GltfObject
{
    constructor()
    {
        super();
        this.name = undefined;
    }

    fromJson(jsonVariant)
    {
        if(jsonVariant.name !== undefined)
        {
            this.name = jsonVariant.name;
        }
    }
}

class glTF extends GltfObject
{
    constructor(file)
    {
        super();
        this.asset = undefined;
        this.accessors = [];
        this.nodes = [];
        this.scene = undefined; // the default scene to show.
        this.scenes = [];
        this.cameras = [];
        this.lights = [];
        this.imageBasedLights = [];
        this.textures = [];
        this.images = [];
        this.samplers = [];
        this.meshes = [];
        this.buffers = [];
        this.bufferViews = [];
        this.materials = [];
        this.animations = [];
        this.skins = [];
        this.path = file;
    }

    initGl(webGlContext)
    {
        initGlForMembers(this, this, webGlContext);
    }

    fromJson(json)
    {
        super.fromJson(json);

        this.asset = objectFromJson(json.asset, gltfAsset);
        this.cameras = objectsFromJsons(json.cameras, gltfCamera);
        this.accessors = objectsFromJsons(json.accessors, gltfAccessor);
        this.meshes = objectsFromJsons(json.meshes, gltfMesh);
        this.samplers = objectsFromJsons(json.samplers, gltfSampler);
        this.materials = objectsFromJsons(json.materials, gltfMaterial);
        this.buffers = objectsFromJsons(json.buffers, gltfBuffer);
        this.bufferViews = objectsFromJsons(json.bufferViews, gltfBufferView);
        this.scenes = objectsFromJsons(json.scenes, gltfScene);
        this.textures = objectsFromJsons(json.textures, gltfTexture);
        this.nodes = objectsFromJsons(json.nodes, gltfNode);
        this.lights = objectsFromJsons(getJsonLightsFromExtensions(json.extensions), gltfLight);
        this.imageBasedLights = objectsFromJsons(getJsonIBLsFromExtensions(json.extensions), ImageBasedLight);
        this.images = objectsFromJsons(json.images, gltfImage);
        this.animations = objectsFromJsons(json.animations, gltfAnimation);
        this.skins = objectsFromJsons(json.skins, gltfSkin);
        this.variants = objectsFromJsons(getJsonVariantsFromExtension(json.extensions), gltfVariant);
        this.variants = enforceVariantsUniqueness(this.variants);

        this.materials.push(gltfMaterial.createDefault());
        this.samplers.push(gltfSampler.createDefault());

        if (json.scenes !== undefined)
        {
            if (json.scene === undefined && json.scenes.length > 0)
            {
                this.scene = 0;
            }
            else
            {
                this.scene = json.scene;
            }
        }

        this.computeDisjointAnimations();
    }

    // Computes indices of animations which are disjoint and can be played simultaneously.
    computeDisjointAnimations()
    {
        for (let i = 0; i < this.animations.length; i++)
        {
            this.animations[i].disjointAnimations = [];

            for (let k = 0; k < this.animations.length; k++)
            {
                if (i == k)
                {
                    continue;
                }

                let isDisjoint = true;

                for (const iChannel of this.animations[i].channels)
                {
                    for (const kChannel of this.animations[k].channels)
                    {
                        if (iChannel.target.node === kChannel.target.node
                            && iChannel.target.path === kChannel.target.path)
                        {
                            isDisjoint = false;
                            break;
                        }
                    }
                }

                if (isDisjoint)
                {
                    this.animations[i].disjointAnimations.push(k);
                }
            }
        }
    }

    nonDisjointAnimations(animationIndices)
    {
        const animations = this.animations;
        const nonDisjointAnimations = [];

        for (let i = 0; i < animations.length; i++)
        {
            let isDisjoint = true;
            for (const k of animationIndices)
            {
                if (i == k)
                {
                    continue;
                }

                if (!animations[k].disjointAnimations.includes(i))
                {
                    isDisjoint = false;
                }
            }

            if (!isDisjoint)
            {
                nonDisjointAnimations.push(i);
            }
        }

        return nonDisjointAnimations;
    }
}

function getJsonLightsFromExtensions(extensions)
{
    if (extensions === undefined)
    {
        return [];
    }
    if (extensions.KHR_lights_punctual === undefined)
    {
        return [];
    }
    return extensions.KHR_lights_punctual.lights;
}

function getJsonIBLsFromExtensions(extensions)
{
    if (extensions === undefined)
    {
        return [];
    }
    if (extensions.KHR_lights_image_based === undefined)
    {
        return [];
    }
    return extensions.KHR_lights_image_based.imageBasedLights;
}

function getJsonVariantsFromExtension(extensions)
{
    if (extensions === undefined)
    {
        return [];
    }
    if (extensions.KHR_materials_variants === undefined)
    {
        return [];
    }
    return extensions.KHR_materials_variants.variants;
}

function enforceVariantsUniqueness(variants)
{
    for(let i=0;i<variants.length;i++)
    {
        const name = variants[i].name;
        for(let j=i+1;j<variants.length;j++)
        {
            if(variants[j].name == name)
            {
                variants[j].name += "0";  // Add random character to duplicates
            }
        }
    }


    return variants;
}

class GlbParser
{
    constructor(data)
    {
        this.data = data;
        this.glbHeaderInts = 3;
        this.glbChunkHeaderInts = 2;
        this.glbMagic = 0x46546C67;
        this.glbVersion = 2;
        this.jsonChunkType = 0x4E4F534A;
        this.binaryChunkType = 0x004E4942;
    }

    extractGlbData()
    {
        const glbInfo = this.getCheckedGlbInfo();
        if (glbInfo === undefined)
        {
            return undefined;
        }

        let json = undefined;
        let buffers = [];
        const chunkInfos = this.getAllChunkInfos();
        for (let chunkInfo of chunkInfos)
        {
            if (chunkInfo.type == this.jsonChunkType && !json)
            {
                json = this.getJsonFromChunk(chunkInfo);
            }
            else if (chunkInfo.type == this.binaryChunkType)
            {
                buffers.push(this.getBufferFromChunk(chunkInfo));
            }
        }

        return { json: json, buffers: buffers };
    }

    getCheckedGlbInfo()
    {
        const header = new Uint32Array(this.data, 0, this.glbHeaderInts);
        const magic = header[0];
        const version = header[1];
        const length = header[2];

        if (!this.checkEquality(magic, this.glbMagic, "glb magic") ||
            !this.checkEquality(version, this.glbVersion, "glb header version") ||
            !this.checkEquality(length, this.data.byteLength, "glb byte length"))
        {
            return undefined;
        }

        return { "magic": magic, "version": version, "length": length };
    }

    getAllChunkInfos()
    {
        let infos = [];
        let chunkStart = this.glbHeaderInts * 4;
        while (chunkStart < this.data.byteLength)
        {
            const chunkInfo = this.getChunkInfo(chunkStart);
            infos.push(chunkInfo);
            chunkStart += chunkInfo.length + this.glbChunkHeaderInts * 4;
        }
        return infos;
    }

    getChunkInfo(headerStart)
    {
        const header = new Uint32Array(this.data, headerStart, this.glbChunkHeaderInts);
        const chunkStart = headerStart + this.glbChunkHeaderInts * 4;
        const chunkLength = header[0];
        const chunkType = header[1];
        return { "start": chunkStart, "length": chunkLength, "type": chunkType };
    }

    getJsonFromChunk(chunkInfo)
    {
        const chunkLength = chunkInfo.length;
        const jsonStart = (this.glbHeaderInts + this.glbChunkHeaderInts) * 4;
        const jsonSlice = new Uint8Array(this.data, jsonStart, chunkLength);
        const stringBuffer = new TextDecoder("utf-8").decode(jsonSlice);
        return JSON.parse(stringBuffer);
    }

    getBufferFromChunk(chunkInfo)
    {
        return this.data.slice(chunkInfo.start, chunkInfo.start + chunkInfo.length);
    }

    checkEquality(actual, expected, name)
    {
        if (actual == expected)
        {
            return true;
        }

        console.error("Found invalid/unsupported " + name + ", expected: " + expected + ", but was: " + actual);
        return false;
    }
}

class gltfLoader
{
    static async load(gltf, webGlContext, appendix = undefined)
    {
        const buffers = gltfLoader.getBuffers(appendix);
        const additionalFiles = gltfLoader.getAdditionalFiles(appendix);

        const buffersPromise = gltfLoader.loadBuffers(gltf, buffers, additionalFiles);

        await buffersPromise; // images might be stored in the buffers
        const imagesPromise = gltfLoader.loadImages(gltf, additionalFiles);

        return await Promise.all([buffersPromise, imagesPromise])
            .then(() => gltf.initGl(webGlContext));
    }

    static unload(gltf)
    {
        for (let image of gltf.images)
        {
            image.image = undefined;
        }
        gltf.images = [];

        for (let texture of gltf.textures)
        {
            texture.destroy();
        }
        gltf.textures = [];

        for (let accessor of gltf.accessors)
        {
            accessor.destroy();
        }
        gltf.accessors = [];
    }

    static getBuffers(appendix)
    {
        return gltfLoader.getTypedAppendix(appendix, ArrayBuffer);
    }

    static getAdditionalFiles(appendix)
    {
        if(typeof(File) !== 'undefined')
        {
            return gltfLoader.getTypedAppendix(appendix, File);
        }
        else
        {
            return;
        }
    }

    static getTypedAppendix(appendix, Type)
    {
        if (appendix && appendix.length > 0)
        {
            if (appendix[0] instanceof Type)
            {
                return appendix;
            }
        }
    }

    static loadBuffers(gltf, buffers, additionalFiles)
    {
        const promises = [];

        if (buffers !== undefined && buffers[0] !== undefined) //GLB
        {
            //There is only one buffer for the glb binary data 
            //see https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#glb-file-format-specification
            if (buffers.length > 1)
            {
                console.warn("Too many buffer chunks in GLB file. Only one or zero allowed");
            }

            gltf.buffers[0].buffer = buffers[0];
            for (let i = 1; i < gltf.buffers.length; ++i)
            {
                promises.push(gltf.buffers[i].load(gltf, additionalFiles));
            }
        }
        else
        {
            for (const buffer of gltf.buffers)
            {
                promises.push(buffer.load(gltf, additionalFiles));
            }
        }
        return Promise.all(promises);
    }

    static loadImages(gltf, additionalFiles)
    {
        const imagePromises = [];
        for (let image of gltf.images)
        {
            imagePromises.push(image.load(gltf, additionalFiles));
        }
        return Promise.all(imagePromises);
    }
}

var iblFiltering = "precision mediump float;\n#define GLSLIFY 1\n#define MATH_PI 3.1415926535897932384626433832795\nuniform samplerCube uCubeMap;const int cLambertian=0;const int cGGX=1;const int cCharlie=2;uniform float u_roughness;uniform int u_sampleCount;uniform int u_width;uniform float u_lodBias;uniform int u_distribution;uniform int u_currentFace;uniform int u_isGeneratingLUT;in vec2 texCoord;out vec4 fragmentColor;vec3 uvToXYZ(int face,vec2 uv){if(face==0)return vec3(1.f,uv.y,-uv.x);else if(face==1)return vec3(-1.f,uv.y,uv.x);else if(face==2)return vec3(+uv.x,-1.f,+uv.y);else if(face==3)return vec3(+uv.x,1.f,-uv.y);else if(face==4)return vec3(+uv.x,uv.y,1.f);else{return vec3(-uv.x,+uv.y,-1.f);}}vec2 dirToUV(vec3 dir){return vec2(0.5f+0.5f*atan(dir.z,dir.x)/MATH_PI,1.f-acos(dir.y)/MATH_PI);}float saturate(float v){return clamp(v,0.0f,1.0f);}float radicalInverse_VdC(uint bits){bits=(bits<<16u)|(bits>>16u);bits=((bits&0x55555555u)<<1u)|((bits&0xAAAAAAAAu)>>1u);bits=((bits&0x33333333u)<<2u)|((bits&0xCCCCCCCCu)>>2u);bits=((bits&0x0F0F0F0Fu)<<4u)|((bits&0xF0F0F0F0u)>>4u);bits=((bits&0x00FF00FFu)<<8u)|((bits&0xFF00FF00u)>>8u);return float(bits)*2.3283064365386963e-10;}vec2 hammersley2d(int i,int N){return vec2(float(i)/float(N),radicalInverse_VdC(uint(i)));}mat3 generateTBN(vec3 normal){vec3 bitangent=vec3(0.0,1.0,0.0);float NdotUp=dot(normal,vec3(0.0,1.0,0.0));float epsilon=0.0000001;if(1.0-abs(NdotUp)<=epsilon){if(NdotUp>0.0){bitangent=vec3(0.0,0.0,1.0);}else{bitangent=vec3(0.0,0.0,-1.0);}}vec3 tangent=normalize(cross(bitangent,normal));bitangent=cross(normal,tangent);return mat3(tangent,bitangent,normal);}struct MicrofacetDistributionSample{float pdf;float cosTheta;float sinTheta;float phi;};float D_GGX(float NdotH,float roughness){float a=NdotH*roughness;float k=roughness/(1.0-NdotH*NdotH+a*a);return k*k*(1.0/MATH_PI);}MicrofacetDistributionSample GGX(vec2 xi,float roughness){MicrofacetDistributionSample ggx;float alpha=roughness*roughness;ggx.cosTheta=saturate(sqrt((1.0-xi.y)/(1.0+(alpha*alpha-1.0)*xi.y)));ggx.sinTheta=sqrt(1.0-ggx.cosTheta*ggx.cosTheta);ggx.phi=2.0*MATH_PI*xi.x;ggx.pdf=D_GGX(ggx.cosTheta,alpha);ggx.pdf/=4.0;return ggx;}float D_Ashikhmin(float NdotH,float roughness){float alpha=roughness*roughness;float a2=alpha*alpha;float cos2h=NdotH*NdotH;float sin2h=1.0-cos2h;float sin4h=sin2h*sin2h;float cot2=-cos2h/(a2*sin2h);return 1.0/(MATH_PI*(4.0*a2+1.0)*sin4h)*(4.0*exp(cot2)+sin4h);}float D_Charlie(float sheenRoughness,float NdotH){sheenRoughness=max(sheenRoughness,0.000001);float invR=1.0/sheenRoughness;float cos2h=NdotH*NdotH;float sin2h=1.0-cos2h;return(2.0+invR)*pow(sin2h,invR*0.5)/(2.0*MATH_PI);}MicrofacetDistributionSample Charlie(vec2 xi,float roughness){MicrofacetDistributionSample charlie;float alpha=roughness*roughness;charlie.sinTheta=pow(xi.y,alpha/(2.0*alpha+1.0));charlie.cosTheta=sqrt(1.0-charlie.sinTheta*charlie.sinTheta);charlie.phi=2.0*MATH_PI*xi.x;charlie.pdf=D_Charlie(alpha,charlie.cosTheta);charlie.pdf/=4.0;return charlie;}MicrofacetDistributionSample Lambertian(vec2 xi,float roughness){MicrofacetDistributionSample lambertian;lambertian.cosTheta=sqrt(1.0-xi.y);lambertian.sinTheta=sqrt(xi.y);lambertian.phi=2.0*MATH_PI*xi.x;lambertian.pdf=lambertian.cosTheta/MATH_PI;return lambertian;}vec4 getImportanceSample(int sampleIndex,vec3 N,float roughness){vec2 xi=hammersley2d(sampleIndex,u_sampleCount);MicrofacetDistributionSample importanceSample;if(u_distribution==cLambertian){importanceSample=Lambertian(xi,roughness);}else if(u_distribution==cGGX){importanceSample=GGX(xi,roughness);}else if(u_distribution==cCharlie){importanceSample=Charlie(xi,roughness);}vec3 localSpaceDirection=normalize(vec3(importanceSample.sinTheta*cos(importanceSample.phi),importanceSample.sinTheta*sin(importanceSample.phi),importanceSample.cosTheta));mat3 TBN=generateTBN(N);vec3 direction=TBN*localSpaceDirection;return vec4(direction,importanceSample.pdf);}float computeLod(float pdf){float lod=0.5*log2(6.0*float(u_width)*float(u_width)/(float(u_sampleCount)*pdf));return lod;}vec3 filterColor(vec3 N){vec3 color=vec3(0.f);float weight=0.0f;for(int i=0;i<u_sampleCount;++i){vec4 importanceSample=getImportanceSample(i,N,u_roughness);vec3 H=vec3(importanceSample.xyz);float pdf=importanceSample.w;float lod=computeLod(pdf);lod+=u_lodBias;if(u_distribution==cLambertian){vec3 lambertian=textureLod(uCubeMap,H,lod).rgb;color+=lambertian;}else if(u_distribution==cGGX||u_distribution==cCharlie){vec3 V=N;vec3 L=normalize(reflect(-V,H));float NdotL=dot(N,L);if(NdotL>0.0){if(u_roughness==0.0){lod=u_lodBias;}vec3 sampleColor=textureLod(uCubeMap,L,lod).rgb;color+=sampleColor*NdotL;weight+=NdotL;}}}if(weight!=0.0f){color/=weight;}else{color/=float(u_sampleCount);}return color.rgb;}float V_SmithGGXCorrelated(float NoV,float NoL,float roughness){float a2=pow(roughness,4.0);float GGXV=NoL*sqrt(NoV*NoV*(1.0-a2)+a2);float GGXL=NoV*sqrt(NoL*NoL*(1.0-a2)+a2);return 0.5/(GGXV+GGXL);}float V_Ashikhmin(float NdotL,float NdotV){return clamp(1.0/(4.0*(NdotL+NdotV-NdotL*NdotV)),0.0,1.0);}vec3 LUT(float NdotV,float roughness){vec3 V=vec3(sqrt(1.0-NdotV*NdotV),0.0,NdotV);vec3 N=vec3(0.0,0.0,1.0);float A=0.0;float B=0.0;float C=0.0;for(int i=0;i<u_sampleCount;++i){vec4 importanceSample=getImportanceSample(i,N,roughness);vec3 H=importanceSample.xyz;vec3 L=normalize(reflect(-V,H));float NdotL=saturate(L.z);float NdotH=saturate(H.z);float VdotH=saturate(dot(V,H));if(NdotL>0.0){if(u_distribution==cGGX){float V_pdf=V_SmithGGXCorrelated(NdotV,NdotL,roughness)*VdotH*NdotL/NdotH;float Fc=pow(1.0-VdotH,5.0);A+=(1.0-Fc)*V_pdf;B+=Fc*V_pdf;C+=0.0;}if(u_distribution==cCharlie){float sheenDistribution=D_Charlie(roughness,NdotH);float sheenVisibility=V_Ashikhmin(NdotL,NdotV);A+=0.0;B+=0.0;C+=sheenVisibility*sheenDistribution*NdotL*VdotH;}}}return vec3(4.0*A,4.0*B,4.0*2.0*MATH_PI*C)/float(u_sampleCount);}void main(){vec3 color=vec3(0);if(u_isGeneratingLUT==0){vec2 newUV=texCoord;newUV=newUV*2.0-1.0;vec3 scan=uvToXYZ(u_currentFace,newUV);vec3 direction=normalize(scan);direction.y=-direction.y;color=filterColor(direction);}else{color=LUT(texCoord.x,texCoord.y);}fragmentColor=vec4(color,1.0);}"; // eslint-disable-line

var panoramaToCubeMap = "#define MATH_PI 3.1415926535897932384626433832795\n#define MATH_INV_PI (1.0 / MATH_PI)\nprecision highp float;\n#define GLSLIFY 1\nin vec2 texCoord;out vec4 fragmentColor;uniform int u_currentFace;uniform sampler2D u_inputTexture;uniform sampler2D u_panorama;vec3 uvToXYZ(int face,vec2 uv){if(face==0)return vec3(1.f,uv.y,-uv.x);else if(face==1)return vec3(-1.f,uv.y,uv.x);else if(face==2)return vec3(+uv.x,-1.f,+uv.y);else if(face==3)return vec3(+uv.x,1.f,-uv.y);else if(face==4)return vec3(+uv.x,uv.y,1.f);else{return vec3(-uv.x,+uv.y,-1.f);}}vec2 dirToUV(vec3 dir){return vec2(0.5f+0.5f*atan(dir.z,dir.x)/MATH_PI,1.f-acos(dir.y)/MATH_PI);}vec3 panoramaToCubeMap(int face,vec2 texCoord){vec2 texCoordNew=texCoord*2.0-1.0;vec3 scan=uvToXYZ(face,texCoordNew);vec3 direction=normalize(scan);vec2 src=dirToUV(direction);return texture(u_panorama,src).rgb;}void main(void){fragmentColor=vec4(0.0,0.0,0.0,1.0);fragmentColor.rgb=panoramaToCubeMap(u_currentFace,texCoord);}"; // eslint-disable-line

var debugOutput = "precision highp float;\n#define GLSLIFY 1\nin vec2 texCoord;out vec4 fragmentColor;uniform int u_currentFace;uniform samplerCube u_inputTexture;vec3 uvToXYZ(int face,vec2 uv){if(face==0)return vec3(1.f,uv.y,-uv.x);else if(face==1)return vec3(-1.f,uv.y,uv.x);else if(face==2)return vec3(+uv.x,-1.f,+uv.y);else if(face==3)return vec3(+uv.x,1.f,-uv.y);else if(face==4)return vec3(+uv.x,uv.y,1.f);else{return vec3(-uv.x,+uv.y,-1.f);}}void main(void){fragmentColor=vec4(texCoord.x*10.0,0.0,texCoord.y*10.0,1.0);vec2 newUV=texCoord;newUV=newUV*2.0-1.0;vec4 textureColor=vec4(0.0,0.0,0.0,1.0);vec3 direction=normalize(uvToXYZ(u_currentFace,newUV.xy));textureColor=textureLod(u_inputTexture,direction,1.0);if(texCoord.x>0.1){fragmentColor=textureColor;}if(texCoord.y>0.1){fragmentColor=textureColor;}}"; // eslint-disable-line

var fullscreenShader = "precision highp float;\n#define GLSLIFY 1\nout vec2 texCoord;void main(void){float x=float((gl_VertexID&1)<<2);float y=float((gl_VertexID&2)<<1);texCoord.x=x*0.5;texCoord.y=y*0.5;gl_Position=vec4(x-1.0,y-1.0,0,1);}"; // eslint-disable-line

class iblSampler
{
    constructor(view)
    {
        this.gl = view.context;

        this.textureSize = 256;
        this.ggxSampleCount = 1024;
        this.lambertianSampleCount = 2048;
        this.sheenSamplCount = 64;
        this.lodBias = 0.0;
        this.lowestMipLevel = 4;
        this.lutResolution = 1024;

        this.mipmapCount = undefined;

        this.lambertianTextureID = undefined;
        this.ggxTextureID = undefined;
        this.sheenTextureID = undefined;

        this.ggxLutTextureID = undefined;
        this.charlieLutTextureID = undefined;

        this.inputTextureID = undefined;
        this.cubemapTextureID = undefined;
        this.framebuffer = undefined;

        const shaderSources = new Map();

        shaderSources.set("fullscreen.vert", fullscreenShader);
        shaderSources.set("panorama_to_cubemap.frag", panoramaToCubeMap);
        shaderSources.set("ibl_filtering.frag", iblFiltering);
        shaderSources.set("debug.frag", debugOutput);

        this.shaderCache = new ShaderCache(shaderSources, view.renderer.webGl);
    }

    loadTextureHDR(image)
    {
        const texture = this.gl.createTexture();
        this.gl.bindTexture(this.gl.TEXTURE_2D, texture);

        let internalFormat = this.gl.RGB32F;
        let format = this.gl.RGB;
        let type = this.gl.FLOAT;
        let data = undefined;

        if (image.dataFloat instanceof Float32Array && typeof(this.gl.RGB32F) !== 'undefined')
        {
            internalFormat = this.gl.RGB32F;
            format = this.gl.RGB;
            type = this.gl.FLOAT;
            data = image.dataFloat;
        }
        else if (image.dataFloat instanceof Float32Array)
        {
            // workaround for node-gles not supporting RGB32F
            internalFormat = this.gl.RGBA32F;
            format = this.gl.RGBA;
            type = this.gl.FLOAT;

            const numPixels = image.dataFloat.length / 3;
            data = new Float32Array(numPixels * 4);
            for(let i = 0, src = 0, dst = 0; i < numPixels; ++i, src += 3, dst += 4)
            {
                // copy the pixels and pad the alpha channel
                data[dst] = image.dataFloat[src];
                data[dst+1] = image.dataFloat[src+1];
                data[dst+2] = image.dataFloat[src+2];
                data[dst+3] = 0;
            }
        }
        else if (typeof(Image) !== 'undefined' && image instanceof Image)
        {
            internalFormat = this.gl.RGBA;
            format = this.gl.RGBA;
            type = this.gl.UNSIGNED_BYTE;
            data = image;
        }
        else
        {
            console.error("loadTextureHDR failed, unsupported HDR image");
            return;
        }

        this.gl.texImage2D(
            this.gl.TEXTURE_2D,
            0,
            internalFormat,
            image.width,
            image.height,
            0,
            format,
            type,
            data
        );

        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.MIRRORED_REPEAT);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.MIRRORED_REPEAT);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);

        return texture;
    }

    internalFormat()
    {
        return this.use8bit ? this.gl.RGBA8 : this.gl.RGBA32F;
    }

    type()
    {
        return this.use8bit ? this.gl.UNSIGNED_BYTE : this.gl.FLOAT;
    }

    createCubemapTexture(withMipmaps)
    {
        const targetTexture =  this.gl.createTexture();
        this.gl.bindTexture(this.gl.TEXTURE_CUBE_MAP, targetTexture);

        for(let i = 0; i < 6; ++i)
        {
            this.gl.texImage2D(
                this.gl.TEXTURE_CUBE_MAP_POSITIVE_X + i,
                0,
                this.internalFormat(),
                this.textureSize,
                this.textureSize,
                0,
                this.gl.RGBA,
                this.type(),
                null
            );
        }

        if(withMipmaps)
        {
            this.gl.texParameteri(this.gl.TEXTURE_CUBE_MAP, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR_MIPMAP_LINEAR);
        }
        else
        {
            this.gl.texParameteri(this.gl.TEXTURE_CUBE_MAP, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
        }

        this.gl.texParameteri(this.gl.TEXTURE_CUBE_MAP, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_CUBE_MAP, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_CUBE_MAP, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);

        return targetTexture;
    }

    createLutTexture()
    {
        const targetTexture = this.gl.createTexture();
        this.gl.bindTexture(this.gl.TEXTURE_2D, targetTexture);

        this.gl.texImage2D(
            this.gl.TEXTURE_2D,
            0,
            this.internalFormat(),
            this.lutResolution,
            this.lutResolution,
            0,
            this.gl.RGBA,
            this.type(),
            null
        );

        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);

        return targetTexture;
    }

    init(panoramaImage)
    {
        if (!this.gl.getExtension("EXT_color_buffer_float") || !this.gl.getExtension("OES_texture_float_linear"))
        {
            console.warn("Floating point textures are not supported");
            this.use8bit = true;
        }

        this.inputTextureID = this.loadTextureHDR(panoramaImage);

        this.cubemapTextureID = this.createCubemapTexture(true);

        this.framebuffer = this.gl.createFramebuffer();

        this.lambertianTextureID = this.createCubemapTexture(false);
        this.ggxTextureID = this.createCubemapTexture(true);
        this.sheenTextureID = this.createCubemapTexture(true);


        this.gl.bindTexture(this.gl.TEXTURE_CUBE_MAP, this.ggxTextureID);
        this.gl.generateMipmap(this.gl.TEXTURE_CUBE_MAP);

        this.gl.bindTexture(this.gl.TEXTURE_CUBE_MAP, this.sheenTextureID);
        this.gl.generateMipmap(this.gl.TEXTURE_CUBE_MAP);

        this.mipmapLevels = Math.floor(Math.log2(this.textureSize))+1 - this.lowestMipLevel;
    }

    filterAll()
    {
        this.panoramaToCubeMap();
        this.cubeMapToLambertian();
        this.cubeMapToGGX();
        this.cubeMapToSheen();

        this.sampleGGXLut();
        this.sampleCharlieLut();

        this.gl.bindFramebuffer( this.gl.FRAMEBUFFER, null);
    }

    panoramaToCubeMap()
    {
        for(let i = 0; i < 6; ++i)
        {
            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.framebuffer);
            this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_CUBE_MAP_POSITIVE_X + i, this.cubemapTextureID, 0);

            this.gl.bindTexture(this.gl.TEXTURE_CUBE_MAP, this.cubemapTextureID);

            this.gl.viewport(0, 0, this.textureSize, this.textureSize);

            this.gl.clearColor(1.0, 0.0, 0.0, 0.0);
            this.gl.clear(this.gl.COLOR_BUFFER_BIT| this.gl.DEPTH_BUFFER_BIT);

            const vertexHash = this.shaderCache.selectShader("fullscreen.vert", []);
            const fragmentHash = this.shaderCache.selectShader("panorama_to_cubemap.frag", []);

            const shader = this.shaderCache.getShaderProgram(fragmentHash, vertexHash);
            this.gl.useProgram(shader.program);

            //  TEXTURE0 = active.
            this.gl.activeTexture(this.gl.TEXTURE0+0);

            // Bind texture ID to active texture
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.inputTextureID);

            // map shader uniform to texture unit (TEXTURE0)
            const location = this.gl.getUniformLocation(shader.program,"u_panorama");
            this.gl.uniform1i(location, 0); // texture unit 0 (TEXTURE0)

            shader.updateUniform("u_currentFace", i);

            //fullscreen triangle
            this.gl.drawArrays(this.gl.TRIANGLES, 0, 3);
        }

        this.gl.bindTexture(this.gl.TEXTURE_CUBE_MAP, this.cubemapTextureID);
        this.gl.generateMipmap(this.gl.TEXTURE_CUBE_MAP);

    }


    applyFilter(
        distribution,
        roughness,
        targetMipLevel,
        targetTexture,
        sampleCount,
        lodBias = 0.0)
    {
        const currentTextureSize = this.textureSize >> targetMipLevel;

        for(let i = 0; i < 6; ++i)
        {
            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.framebuffer);
            this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_CUBE_MAP_POSITIVE_X + i, targetTexture, targetMipLevel);

            this.gl.bindTexture(this.gl.TEXTURE_CUBE_MAP, targetTexture);

            this.gl.viewport(0, 0, currentTextureSize, currentTextureSize);

            this.gl.clearColor(1.0, 0.0, 0.0, 0.0);
            this.gl.clear(this.gl.COLOR_BUFFER_BIT| this.gl.DEPTH_BUFFER_BIT);

            const vertexHash = this.shaderCache.selectShader("fullscreen.vert", []);
            const fragmentHash = this.shaderCache.selectShader("ibl_filtering.frag", []);

            const shader = this.shaderCache.getShaderProgram(fragmentHash, vertexHash);
            this.gl.useProgram(shader.program);

            //  TEXTURE0 = active.
            this.gl.activeTexture(this.gl.TEXTURE0);

            // Bind texture ID to active texture
            this.gl.bindTexture(this.gl.TEXTURE_CUBE_MAP, this.cubemapTextureID);

            // map shader uniform to texture unit (TEXTURE0)
            const location = this.gl.getUniformLocation(shader.program,"u_cubemapTexture");
            this.gl.uniform1i(location, 0); // texture unit 0

            shader.updateUniform("u_roughness", roughness);
            shader.updateUniform("u_sampleCount", sampleCount);
            shader.updateUniform("u_width", this.textureSize);
            shader.updateUniform("u_lodBias", lodBias);
            shader.updateUniform("u_distribution", distribution);
            shader.updateUniform("u_currentFace", i);
            shader.updateUniform("u_isGeneratingLUT", 0);

            //fullscreen triangle
            this.gl.drawArrays(this.gl.TRIANGLES, 0, 3);
        }

    }

    cubeMapToLambertian()
    {
        this.applyFilter(
            0,
            0.0,
            0,
            this.lambertianTextureID,
            this.lambertianSampleCount);
    }


    cubeMapToGGX()
    {
        for(let currentMipLevel = 0; currentMipLevel <= this.mipmapLevels; ++currentMipLevel)
        {
            const roughness = (currentMipLevel) / (this.mipmapLevels - 1);
            this.applyFilter(
                1,
                roughness,
                currentMipLevel,
                this.ggxTextureID,
                this.ggxSampleCount);
        }
    }

    cubeMapToSheen()
    {
        for(let currentMipLevel = 0; currentMipLevel <= this.mipmapLevels; ++currentMipLevel)
        {
            const roughness = (currentMipLevel) / (this.mipmapLevels - 1);
            this.applyFilter(
                2,
                roughness,
                currentMipLevel,
                this.sheenTextureID,
                this.sheenSamplCount);
        }
    }

    sampleLut(distribution, targetTexture, currentTextureSize)
    {
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.framebuffer);
        this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, targetTexture, 0);

        this.gl.bindTexture(this.gl.TEXTURE_2D, targetTexture);

        this.gl.viewport(0, 0, currentTextureSize, currentTextureSize);

        this.gl.clearColor(1.0, 0.0, 0.0, 0.0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT| this.gl.DEPTH_BUFFER_BIT);

        const vertexHash = this.shaderCache.selectShader("fullscreen.vert", []);
        const fragmentHash = this.shaderCache.selectShader("ibl_filtering.frag", []);

        const shader = this.shaderCache.getShaderProgram(fragmentHash, vertexHash);
        this.gl.useProgram(shader.program);


        //  TEXTURE0 = active.
        this.gl.activeTexture(this.gl.TEXTURE0+0);

        // Bind texture ID to active texture
        this.gl.bindTexture(this.gl.TEXTURE_CUBE_MAP, this.cubemapTextureID);

        // map shader uniform to texture unit (TEXTURE0)
        const location = this.gl.getUniformLocation(shader.program,"u_cubemapTexture");
        this.gl.uniform1i(location, 0); // texture unit 0


        shader.updateUniform("u_roughness", 0.0);
        shader.updateUniform("u_sampleCount", 512);
        shader.updateUniform("u_width", 0.0);
        shader.updateUniform("u_lodBias", 0.0);
        shader.updateUniform("u_distribution", distribution);
        shader.updateUniform("u_currentFace", 0);
        shader.updateUniform("u_isGeneratingLUT", 1);

        //fullscreen triangle
        this.gl.drawArrays(this.gl.TRIANGLES, 0, 3);
    }

    sampleGGXLut()
    {
        this.ggxLutTextureID = this.createLutTexture();
        this.sampleLut(1, this.ggxLutTextureID, this.lutResolution);
    }

    sampleCharlieLut()
    {
        this.charlieLutTextureID = this.createLutTexture();
        this.sampleLut(2, this.charlieLutTextureID, this.lutResolution);
    }

    destroy()
    {
        this.shaderCache.destroy();
    }
}

class KtxDecoder {

    constructor (context, externalKtxlib) {
        this.gl = context;
        this.libktx = null;
        if (context !== undefined)
        {
            if (externalKtxlib === undefined && LIBKTX !== undefined)
            {
                externalKtxlib = LIBKTX;
            }
            if (externalKtxlib !== undefined)
            {
                this.initializied = this.init(context, externalKtxlib);
            }
            else
            {
                console.error('Failed to initalize KTXDecoder: ktx library undefined');
                return undefined;
            }
        }
        else
        {
            console.error('Failed to initalize KTXDecoder: WebGL context undefined');
            return undefined;
        }
    }

    async init(context, externalKtxlib) {
        this.libktx = await externalKtxlib({preinitializedWebGLContext: context});
        this.libktx.GL.makeContextCurrent(this.libktx.GL.createContext(null, { majorVersion: 2.0 }));
    }

    transcode(ktexture) {
        if (ktexture.needsTranscoding) {
            let format;

            let astcSupported = false;
            let etcSupported = false;
            let dxtSupported = false;
            let bptcSupported = false;
            let pvrtcSupported = false;

            astcSupported = !!this.gl.getExtension('WEBGL_compressed_texture_astc');
            etcSupported = !!this.gl.getExtension('WEBGL_compressed_texture_etc1');
            dxtSupported = !!this.gl.getExtension('WEBGL_compressed_texture_s3tc');
            bptcSupported = !!this.gl.getExtension('EXT_texture_compression_bptc');

            pvrtcSupported = !!(this.gl.getExtension('WEBGL_compressed_texture_pvrtc')) || !!(this.gl.getExtension('WEBKIT_WEBGL_compressed_texture_pvrtc'));

            if (astcSupported) {
                format = this.libktx.TranscodeTarget.ASTC_4x4_RGBA;
            } else if (bptcSupported) {
                format = this.libktx.TranscodeTarget.BC7_RGBA;
            } else if (dxtSupported) {
                format = this.libktx.TranscodeTarget.BC1_OR_3;
            } else if (pvrtcSupported) {
                format = this.libktx.TranscodeTarget.PVRTC1_4_RGBA;
            } else if (etcSupported) {
                format = this.libktx.TranscodeTarget.ETC;
            } else {
                format = this.libktx.TranscodeTarget.RGBA8888;
            }
            if (ktexture.transcodeBasis(format, 0) != this.libktx.ErrorCode.SUCCESS) {
                console.warn('Texture transcode failed. See console for details.');
            }
        }
    }

    async loadKtxFromUri(uri) {
        await this.initializied;
        const response = await fetch(uri);
        const data = new Uint8Array(await response.arrayBuffer());
        const texture = new this.libktx.ktxTexture(data);
        this.transcode(texture);
        let uploadResult = texture.glUpload();
        if (uploadResult.texture == null)
        {
            console.error("Could not load KTX data");
            return undefined;
        }
        uploadResult.texture.levels = Math.log2(texture.baseWidth);
        return uploadResult.texture;
    }

    async loadKtxFromBuffer(data) {
        await this.initializied;
        const texture = new this.libktx.ktxTexture(data);
        this.transcode(texture);
        const uploadResult = texture.glUpload();
        if (uploadResult.texture == null)
        {
            console.error("Could not load KTX data");
            return undefined;
        }
        return uploadResult.texture;
    }
}

/**
 * hdrpng.js - Original code from Enki https://enkimute.github.io/hdrpng.js/
 *
 * Refactored and simplified.
 */

function _rgbeToFloat(buffer)
{
    const length = buffer.byteLength >> 2;
    const result = new Float32Array(length * 3);

    for (let i = 0; i < length; i++)
    {
        const s = Math.pow(2, buffer[i * 4 + 3] - (128 + 8));

        result[i * 3] = buffer[i * 4] * s;
        result[i * 3 + 1] = buffer[i * 4 + 1] * s;
        result[i * 3 + 2] = buffer[i * 4 + 2] * s;
    }
    return result;
}

async function loadHDR(buffer)
{
    let header = '';
    let pos = 0;
    const d8 = buffer;
    let format = undefined;
    // read header.
    while (!header.match(/\n\n[^\n]+\n/g)) header += String.fromCharCode(d8[pos++]);
    // check format.
    format = header.match(/FORMAT=(.*)$/m);
    if (format.length < 2)
    {
        return undefined;
    }
    format = format[1];
    if (format != '32-bit_rle_rgbe') return console.warn('unknown format : ' + format), this.onerror();
    // parse resolution
    let rez = header.split(/\n/).reverse();
    if (rez.length < 2)
    {
        return undefined;
    }
    rez = rez[1].split(' ');
    if (rez.length < 4)
    {
        return undefined;
    }
    const width = rez[3] * 1, height = rez[1] * 1;
    // Create image.
    const img = new Uint8Array(width * height * 4);
    let ipos = 0;
    // Read all scanlines
    for (let j = 0; j < height; j++)
    {
        const scanline = [];

        let rgbe = d8.slice(pos, pos += 4);
        const isNewRLE = (rgbe[0] == 2 && rgbe[1] == 2 && rgbe[2] == ((width >> 8) & 0xFF) && rgbe[3] == (width & 0xFF));

        if (isNewRLE && (width >= 8) && (width < 32768))
        {
            for (let i = 0; i < 4; i++)
            {
                let ptr = i * width;
                const ptr_end = (i + 1) * width;
                let buf = undefined;
                let count = undefined;
                while (ptr < ptr_end)
                {
                    buf = d8.slice(pos, pos += 2);
                    if (buf[0] > 128)
                    {
                        count = buf[0] - 128;
                        while (count-- > 0) scanline[ptr++] = buf[1];
                    }
                    else
                    {
                        count = buf[0] - 1;
                        scanline[ptr++] = buf[1];
                        while (count-- > 0) scanline[ptr++] = d8[pos++];
                    }
                }
            }

            for (let i = 0; i < width; i++)
            {
                img[ipos++] = scanline[i + 0 * width];
                img[ipos++] = scanline[i + 1 * width];
                img[ipos++] = scanline[i + 2 * width];
                img[ipos++] = scanline[i + 3 * width];
            }
        }
        else
        {
            pos -= 4;

            for (let i = 0; i < width; i++)
            {
                rgbe = d8.slice(pos, pos += 4);

                img[ipos++] = rgbe[0];
                img[ipos++] = rgbe[1];
                img[ipos++] = rgbe[2];
                img[ipos++] = rgbe[3];
            }
        }
    }

    const imageFloatBuffer = _rgbeToFloat(img);

    return {
        dataFloat: imageFloatBuffer,
        width: width,
        height: height
    };
}

/**
 * ResourceLoader can be used to load resources for the GltfState
 * that are then used to display the loaded data with GltfView
 */
class ResourceLoader
{
    /**
     * ResourceLoader class that provides an interface to load resources into
     * the view. Typically this is created with GltfView.createResourceLoader()
     * You cannot share resource loaders between GltfViews as some of the resources
     * are allocated directly on the WebGl2 Context
     * @param {Object} view the GltfView for which the resources are loaded
     */
    constructor(view)
    {
        this.view = view;
    }

    /**
     * loadGltf asynchroneously and create resources for rendering
     * @param {(String | ArrayBuffer | File)} gltfFile the .gltf or .glb file either as path or as preloaded resource. In node.js environments, only ArrayBuffer types are accepted.
     * @param {File[]} [externalFiles] additional files containing resources that are referenced in the gltf
     * @returns {Promise} a promise that fulfills when the gltf file was loaded
     */
    async loadGltf(gltfFile, externalFiles)
    {
        let isGlb = undefined;
        let buffers = undefined;
        let json = undefined;
        let data = undefined;
        let filename = "";
        if (typeof gltfFile === "string")
        {
            isGlb = getIsGlb(gltfFile);
            let response = await axios.get(gltfFile, { responseType: isGlb ? "arraybuffer" : "json" });
            json = response.data;
            data = response.data;
            filename = gltfFile;
        }
        else if (gltfFile instanceof ArrayBuffer)
        {
            isGlb = externalFiles === undefined;
            if (isGlb)
            {
                data = gltfFile;
            }
            else
            {
                console.error("Only .glb files can be loaded from an array buffer");
            }
        }
        else if (typeof (File) !== 'undefined' && gltfFile instanceof File)
        {
            let fileContent = gltfFile;
            filename = gltfFile.name;
            isGlb = getIsGlb(filename);
            if (isGlb)
            {
                data = await AsyncFileReader.readAsArrayBuffer(fileContent);
            }
            else
            {
                data = await AsyncFileReader.readAsText(fileContent);
                json = JSON.parse(data);
                buffers = externalFiles;
            }
        }
        else
        {
            console.error("Passed invalid type to loadGltf " + typeof (gltfFile));
        }

        if (isGlb)
        {
            const glbParser = new GlbParser(data);
            const glb = glbParser.extractGlbData();
            json = glb.json;
            buffers = glb.buffers;
        }

        const gltf = new glTF(filename);
        gltf.ktxDecoder = this.view.ktxDecoder;
        //Make sure draco decoder instance is ready
        gltf.fromJson(json);

        // because the gltf image paths are not relative
        // to the gltf, we have to resolve all image paths before that
        for (const image of gltf.images)
        {
            image.resolveRelativePath(getContainingFolder(gltf.path));
        }

        await gltfLoader.load(gltf, this.view.context, buffers);

        return gltf;
    }

    /**
     * loadEnvironment asynchroneously, run IBL sampling and create resources for rendering
     * @param {(String | ArrayBuffer | File)} environmentFile the .hdr file either as path or resource
     * @param {Object} [lutFiles] object containing paths or resources for the environment look up textures. Keys are lut_ggx_file, lut_charlie_file and lut_sheen_E_file
     * @returns {Promise} a promise that fulfills when the environment file was loaded
     */
    async loadEnvironment(environmentFile, lutFiles)
    {
        let image = undefined;
        if (typeof environmentFile === "string")
        {
            let response = await axios.get(environmentFile, { responseType: "arraybuffer" });

            image = await loadHDR(new Uint8Array(response.data));
        }
        else if (environmentFile instanceof ArrayBuffer)
        {
            image = await loadHDR(new Uint8Array(environmentFile));
        }
        else if (typeof (File) !== 'undefined' && environmentFile instanceof File)
        {
            const imageData = await AsyncFileReader.readAsArrayBuffer(environmentFile).catch(() =>
            {
                console.error("Could not load image with FileReader");
            });
            image = await loadHDR(new Uint8Array(imageData));
        }
        else
        {
            console.error("Passed invalid type to loadEnvironment " + typeof (gltfFile));
        }
        if (image === undefined)
        {
            return undefined;
        }
        return _loadEnvironmentFromPanorama(image, this.view, lutFiles);
    }

    /**
     * initKtxLib must be called before loading gltf files with ktx2 assets
     * @param {Object} [externalKtxLib] external ktx library (for example from a CDN)
     */
    initKtxLib(externalKtxLib)
    {
        this.view.ktxDecoder = new KtxDecoder(this.view.context, externalKtxLib);
    }

    /**
     * initDracoLib must be called before loading gltf files with draco meshes
     * @param {*} [externalDracoLib] external draco library (for example from a CDN)
     */
    async initDracoLib(externalDracoLib)
    {
        const dracoDecoder = new DracoDecoder(externalDracoLib);
        if (dracoDecoder !== undefined)
        {
            await dracoDecoder.ready();
        }
    }
}

async function _loadEnvironmentFromPanorama(imageHDR, view, luts)
{
    // The environment uses the same type of samplers, textures and images as used in the glTF class
    // so we just use it as a template
    const environment = new glTF();

    //
    // Prepare samplers.
    //

    let samplerIdx = environment.samplers.length;

    environment.samplers.push(new gltfSampler(GL.LINEAR, GL.LINEAR, GL.CLAMP_TO_EDGE, GL.CLAMP_TO_EDGE, "DiffuseCubeMapSampler"));
    const diffuseCubeSamplerIdx = samplerIdx++;

    environment.samplers.push(new gltfSampler(GL.LINEAR, GL.LINEAR_MIPMAP_LINEAR, GL.CLAMP_TO_EDGE, GL.CLAMP_TO_EDGE, "SpecularCubeMapSampler"));
    const specularCubeSamplerIdx = samplerIdx++;

    environment.samplers.push(new gltfSampler(GL.LINEAR, GL.LINEAR_MIPMAP_LINEAR, GL.CLAMP_TO_EDGE, GL.CLAMP_TO_EDGE, "SheenCubeMapSampler"));
    const sheenCubeSamplerIdx = samplerIdx++;

    environment.samplers.push(new gltfSampler(GL.LINEAR, GL.LINEAR, GL.CLAMP_TO_EDGE, GL.CLAMP_TO_EDGE, "LUTSampler"));
    const lutSamplerIdx = samplerIdx++;

    //
    // Prepare images and textures.
    //

    let imageIdx = environment.images.length;

    let environmentFiltering = new iblSampler(view);

    environmentFiltering.init(imageHDR);
    environmentFiltering.filterAll();

    // Diffuse

    const diffuseGltfImage = new gltfImage(
        undefined,
        GL.TEXTURE_CUBE_MAP,
        0,
        undefined,
        "Diffuse",
        ImageMimeType.GLTEXTURE,
        environmentFiltering.lambertianTextureID
    );

    environment.images.push(diffuseGltfImage);

    const diffuseTexture = new gltfTexture(
        diffuseCubeSamplerIdx,
        [imageIdx++],
        GL.TEXTURE_CUBE_MAP);
    diffuseTexture.initialized = true; // iblsampler has already initialized the texture

    environment.textures.push(diffuseTexture);

    environment.diffuseEnvMap = new gltfTextureInfo(environment.textures.length - 1, 0, true);
    environment.diffuseEnvMap.generateMips = false;



    // Specular
    const specularGltfImage = new gltfImage(
        undefined,
        GL.TEXTURE_CUBE_MAP,
        0,
        undefined,
        "Specular",
        ImageMimeType.GLTEXTURE,
        environmentFiltering.ggxTextureID
    );

    environment.images.push(specularGltfImage);

    const specularTexture = new gltfTexture(
        specularCubeSamplerIdx,
        [imageIdx++],
        GL.TEXTURE_CUBE_MAP);
    specularTexture.initialized = true; // iblsampler has already initialized the texture

    environment.textures.push(specularTexture);

    environment.specularEnvMap = new gltfTextureInfo(environment.textures.length - 1, 0, true);
    environment.specularEnvMap.generateMips = false;


    // Sheen
    const sheenGltfImage = new gltfImage(
        undefined,
        GL.TEXTURE_CUBE_MAP,
        0,
        undefined,
        "Sheen",
        ImageMimeType.GLTEXTURE,
        environmentFiltering.sheenTextureID
    );

    environment.images.push(sheenGltfImage);

    const sheenTexture = new gltfTexture(
        sheenCubeSamplerIdx,
        [imageIdx++],
        GL.TEXTURE_CUBE_MAP);
    sheenTexture.initialized = true; // iblsampler has already initialized the texture

    environment.textures.push(sheenTexture);

    environment.sheenEnvMap = new gltfTextureInfo(environment.textures.length - 1, 0, true);
    environment.sheenEnvMap.generateMips = false;

    /*
        // Diffuse

        const lambertian = new gltfImage(filteredEnvironmentsDirectoryPath + "/lambertian/diffuse.ktx2", GL.TEXTURE_CUBE_MAP);
        lambertian.mimeType = ImageMimeType.KTX2;
        environment.images.push(lambertian);
        environment.textures.push(new gltfTexture(diffuseCubeSamplerIdx, [imageIdx++], GL.TEXTURE_CUBE_MAP));
        environment.diffuseEnvMap = new gltfTextureInfo(environment.textures.length - 1, 0, true);
        environment.diffuseEnvMap.generateMips = false;

        // Specular

        const specular = new gltfImage(filteredEnvironmentsDirectoryPath + "/ggx/specular.ktx2", GL.TEXTURE_CUBE_MAP);
        specular.mimeType = ImageMimeType.KTX2;
        environment.images.push(specular);
        environment.textures.push(new gltfTexture(specularCubeSamplerIdx, [imageIdx++], GL.TEXTURE_CUBE_MAP));
        environment.specularEnvMap = new gltfTextureInfo(environment.textures.length - 1, 0, true);
        environment.specularEnvMap.generateMips = false;

        const specularImage = environment.images[environment.textures[environment.textures.length - 1].source];

        // Sheen

        const sheen = new gltfImage(filteredEnvironmentsDirectoryPath + "/charlie/sheen.ktx2", GL.TEXTURE_CUBE_MAP);
        sheen.mimeType = ImageMimeType.KTX2;
        environment.images.push(sheen);
        environment.textures.push(new gltfTexture(sheenCubeSamplerIdx, [imageIdx++], GL.TEXTURE_CUBE_MAP));
        environment.sheenEnvMap = new gltfTextureInfo(environment.textures.length - 1, 0, true);
        environment.sheenEnvMap.generateMips = false;*/

    //
    // Look Up Tables.
    //

    // GGX

    if (luts === undefined)
    {
        luts = {
            lut_sheen_E_file: "assets/images/lut_sheen_E.png",
        };
    }

    environment.images.push(new gltfImage(
        undefined, 
        GL.TEXTURE_2D, 
        0, 
        undefined, 
        undefined, 
        ImageMimeType.GLTEXTURE, 
        environmentFiltering.ggxLutTextureID));
    const lutTexture = new gltfTexture(lutSamplerIdx, [imageIdx++], GL.TEXTURE_2D);
    lutTexture.initialized = true; // iblsampler has already initialized the texture
    environment.textures.push(lutTexture);

    environment.lut = new gltfTextureInfo(environment.textures.length - 1, 0 , true);
    environment.lut.generateMips = false;

    // Sheen
    // Charlie
    environment.images.push(new gltfImage(
        undefined, 
        GL.TEXTURE_2D, 
        0, 
        undefined, 
        undefined, 
        ImageMimeType.GLTEXTURE, 
        environmentFiltering.charlieLutTextureID));
    const charlieLut = new gltfTexture(lutSamplerIdx, [imageIdx++], GL.TEXTURE_2D);
    charlieLut.initialized = true; // iblsampler has already initialized the texture
    environment.textures.push(charlieLut);

    environment.sheenLUT = new gltfTextureInfo(environment.textures.length - 1, 0, true);
    environment.sheenLUT.generateMips = false;

    // Sheen E LUT

    environment.images.push(new gltfImage(luts.lut_sheen_E_file, GL.TEXTURE_2D, 0, undefined, undefined, ImageMimeType.PNG));
    const sheenELut = new gltfTexture(lutSamplerIdx, [imageIdx++], GL.TEXTURE_2D);
    sheenELut.initialized = true; // iblsampler has already initialized the texture
    environment.textures.push(sheenELut);

    environment.sheenELUT = new gltfTextureInfo(environment.textures.length - 1);
    environment.sheenELUT.generateMips = false;

    await gltfLoader.loadImages(environment);

    environment.initGl(view.context);

    environment.mipCount = environmentFiltering.mipmapLevels;

    return environment;
}

/**
 * GltfView represents a view on a gltf, e.g. in a canvas
 */
class GltfView
{
    /**
     * GltfView representing one WebGl 2.0 context or in other words one
     * 3D rendering of the Gltf.
     * You can create multiple views for example when multiple canvases should
     * be shown on the same webpage.
     * @param {*} context WebGl 2.0 context. Get it from a canvas with `canvas.getContext("webgl2")`
     */
    constructor(context)
    {
        this.context = context;
        this.renderer = new gltfRenderer(this.context);
    }

    /**
     * createState constructs a new GltfState for the GltfView. The resources
     * referenced in a gltf state can directly be stored as resources on the WebGL
     * context of GltfView, therefore GltfStates cannot not be shared between
     * GltfViews.
     * @returns {GltfState} GltfState
     */
    createState()
    {
        return new GltfState(this);
    }

    /**
     * createResourceLoader creates a resource loader with which glTFs and
     * environments can be loaded for the view
     * @param {Object} [externalDracoLib] optional object of an external Draco library, e.g. from a CDN
     * @param {Object} [externalKtxLib] optional object of an external KTX library, e.g. from a CDN
     * @returns {ResourceLoader} ResourceLoader
     */
    createResourceLoader(externalDracoLib = undefined, externalKtxLib = undefined)
    {
        let resourceLoader = new ResourceLoader(this);
        resourceLoader.initKtxLib(externalKtxLib);
        resourceLoader.initDracoLib(externalDracoLib);
        return resourceLoader;
    }

    /**
     * renderFrame to the context's default frame buffer
     * Call this function in the javascript animation update loop for continuous rendering to a canvas
     * @param {*} state GltfState that is be used for rendering
     * @param {*} width of the viewport
     * @param {*} height of the viewport
     */
    renderFrame(state, width, height)
    {
        this.renderer.init(state);
        this._animate(state);

        this.renderer.resize(width, height);

        this.renderer.clearFrame(state.renderingParameters.clearColor);

        if(state.gltf === undefined)
        {
            return;
        }

        const scene = state.gltf.scenes[state.sceneIndex];

        if(scene === undefined)
        {
            return;
        }

        scene.applyTransformHierarchy(state.gltf);

        this.renderer.drawScene(state, scene);
    }

    /**
     * gatherStatistics collects information about the GltfState such as the number of
     * rendered meshes or triangles
     * @param {*} state GltfState about which the statistics should be collected
     * @returns {Object} an object containing statistics information
     */
    gatherStatistics(state)
    {
        if(state.gltf === undefined)
        {
            return;
        }

        // gather information from the active scene
        const scene = state.gltf.scenes[state.sceneIndex];
        if (scene === undefined)
        {
            return {
                meshCount: 0,
                faceCount: 0,
                opaqueMaterialsCount: 0,
                transparentMaterialsCount: 0};
        }
        const nodes = scene.gatherNodes(state.gltf);
        const activeMeshes = nodes.filter(node => node.mesh !== undefined).map(node => state.gltf.meshes[node.mesh]);
        const activePrimitives = activeMeshes
            .reduce((acc, mesh) => acc.concat(mesh.primitives), [])
            .filter(primitive => primitive.material !== undefined);
        const activeMaterials = [... new Set(activePrimitives.map(primitive => state.gltf.materials[primitive.material]))];
        const opaqueMaterials = activeMaterials.filter(material => material.alphaMode !== "BLEND");
        const transparentMaterials = activeMaterials.filter(material => material.alphaMode === "BLEND");
        const faceCount = activePrimitives
            .map(primitive => {
                let verticesCount = 0;
                if(primitive.indices !== undefined)
                {
                    verticesCount = state.gltf.accessors[primitive.indices].count;
                }
                if (verticesCount === 0)
                {
                    return 0;
                }

                // convert vertex count to point, line or triangle count
                switch (primitive.mode) {
                case GL.POINTS:
                    return verticesCount;
                case GL.LINES:
                    return verticesCount / 2;
                case GL.LINE_LOOP:
                    return verticesCount;
                case GL.LINE_STRIP:
                    return verticesCount - 1;
                case GL.TRIANGLES:
                    return verticesCount / 3;
                case GL.TRIANGLE_STRIP:
                case GL.TRIANGLE_FAN:
                    return verticesCount - 2;
                }
            })
            .reduce((acc, faceCount) => acc += faceCount);

        // assemble statistics object
        return {
            meshCount: activeMeshes.length,
            faceCount: faceCount,
            opaqueMaterialsCount: opaqueMaterials.length,
            transparentMaterialsCount: transparentMaterials.length
        };
    }

    _animate(state)
    {
        if(state.gltf === undefined)
        {
            return;
        }

        if(state.gltf.animations !== undefined && state.animationIndices !== undefined)
        {
            const disabledAnimations = state.gltf.animations.filter( (anim, index) => {
                return false === state.animationIndices.includes(index);
            });

            for(const disabledAnimation of disabledAnimations)
            {
                disabledAnimation.advance(state.gltf, undefined);
            }

            const t = state.animationTimer.elapsedSec();

            const animations = state.animationIndices.map(index => {
                return state.gltf.animations[index];
            }).filter(animation => animation !== undefined);

            for(const animation of animations)
            {
                animation.advance(state.gltf, t);
            }
        }
    }
}

/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const t$2=window,e$6=t$2.ShadowRoot&&(void 0===t$2.ShadyCSS||t$2.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,s$5=Symbol(),n$7=new WeakMap;class o$5{constructor(t,e,n){if(this._$cssResult$=!0,n!==s$5)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=t,this.t=e;}get styleSheet(){let t=this.o;const s=this.t;if(e$6&&void 0===t){const e=void 0!==s&&1===s.length;e&&(t=n$7.get(s)),void 0===t&&((this.o=t=new CSSStyleSheet).replaceSync(this.cssText),e&&n$7.set(s,t));}return t}toString(){return this.cssText}}const r$4=t=>new o$5("string"==typeof t?t:t+"",void 0,s$5),S$2=(s,n)=>{e$6?s.adoptedStyleSheets=n.map((t=>t instanceof CSSStyleSheet?t:t.styleSheet)):n.forEach((e=>{const n=document.createElement("style"),o=t$2.litNonce;void 0!==o&&n.setAttribute("nonce",o),n.textContent=e.cssText,s.appendChild(n);}));},c$2=e$6?t=>t:t=>t instanceof CSSStyleSheet?(t=>{let e="";for(const s of t.cssRules)e+=s.cssText;return r$4(e)})(t):t;

/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */var s$4;const e$5=window,r$3=e$5.trustedTypes,h$2=r$3?r$3.emptyScript:"",o$4=e$5.reactiveElementPolyfillSupport,n$6={toAttribute(t,i){switch(i){case Boolean:t=t?h$2:null;break;case Object:case Array:t=null==t?t:JSON.stringify(t);}return t},fromAttribute(t,i){let s=t;switch(i){case Boolean:s=null!==t;break;case Number:s=null===t?null:Number(t);break;case Object:case Array:try{s=JSON.parse(t);}catch(t){s=null;}}return s}},a$2=(t,i)=>i!==t&&(i==i||t==t),l$3={attribute:!0,type:String,converter:n$6,reflect:!1,hasChanged:a$2},d$2="finalized";class u$2 extends HTMLElement{constructor(){super(),this._$Ei=new Map,this.isUpdatePending=!1,this.hasUpdated=!1,this._$El=null,this._$Eu();}static addInitializer(t){var i;this.finalize(),(null!==(i=this.h)&&void 0!==i?i:this.h=[]).push(t);}static get observedAttributes(){this.finalize();const t=[];return this.elementProperties.forEach(((i,s)=>{const e=this._$Ep(s,i);void 0!==e&&(this._$Ev.set(e,s),t.push(e));})),t}static createProperty(t,i=l$3){if(i.state&&(i.attribute=!1),this.finalize(),this.elementProperties.set(t,i),!i.noAccessor&&!this.prototype.hasOwnProperty(t)){const s="symbol"==typeof t?Symbol():"__"+t,e=this.getPropertyDescriptor(t,s,i);void 0!==e&&Object.defineProperty(this.prototype,t,e);}}static getPropertyDescriptor(t,i,s){return {get(){return this[i]},set(e){const r=this[t];this[i]=e,this.requestUpdate(t,r,s);},configurable:!0,enumerable:!0}}static getPropertyOptions(t){return this.elementProperties.get(t)||l$3}static finalize(){if(this.hasOwnProperty(d$2))return !1;this[d$2]=!0;const t=Object.getPrototypeOf(this);if(t.finalize(),void 0!==t.h&&(this.h=[...t.h]),this.elementProperties=new Map(t.elementProperties),this._$Ev=new Map,this.hasOwnProperty("properties")){const t=this.properties,i=[...Object.getOwnPropertyNames(t),...Object.getOwnPropertySymbols(t)];for(const s of i)this.createProperty(s,t[s]);}return this.elementStyles=this.finalizeStyles(this.styles),!0}static finalizeStyles(i){const s=[];if(Array.isArray(i)){const e=new Set(i.flat(1/0).reverse());for(const i of e)s.unshift(c$2(i));}else void 0!==i&&s.push(c$2(i));return s}static _$Ep(t,i){const s=i.attribute;return !1===s?void 0:"string"==typeof s?s:"string"==typeof t?t.toLowerCase():void 0}_$Eu(){var t;this._$E_=new Promise((t=>this.enableUpdating=t)),this._$AL=new Map,this._$Eg(),this.requestUpdate(),null===(t=this.constructor.h)||void 0===t||t.forEach((t=>t(this)));}addController(t){var i,s;(null!==(i=this._$ES)&&void 0!==i?i:this._$ES=[]).push(t),void 0!==this.renderRoot&&this.isConnected&&(null===(s=t.hostConnected)||void 0===s||s.call(t));}removeController(t){var i;null===(i=this._$ES)||void 0===i||i.splice(this._$ES.indexOf(t)>>>0,1);}_$Eg(){this.constructor.elementProperties.forEach(((t,i)=>{this.hasOwnProperty(i)&&(this._$Ei.set(i,this[i]),delete this[i]);}));}createRenderRoot(){var t;const s=null!==(t=this.shadowRoot)&&void 0!==t?t:this.attachShadow(this.constructor.shadowRootOptions);return S$2(s,this.constructor.elementStyles),s}connectedCallback(){var t;void 0===this.renderRoot&&(this.renderRoot=this.createRenderRoot()),this.enableUpdating(!0),null===(t=this._$ES)||void 0===t||t.forEach((t=>{var i;return null===(i=t.hostConnected)||void 0===i?void 0:i.call(t)}));}enableUpdating(t){}disconnectedCallback(){var t;null===(t=this._$ES)||void 0===t||t.forEach((t=>{var i;return null===(i=t.hostDisconnected)||void 0===i?void 0:i.call(t)}));}attributeChangedCallback(t,i,s){this._$AK(t,s);}_$EO(t,i,s=l$3){var e;const r=this.constructor._$Ep(t,s);if(void 0!==r&&!0===s.reflect){const h=(void 0!==(null===(e=s.converter)||void 0===e?void 0:e.toAttribute)?s.converter:n$6).toAttribute(i,s.type);this._$El=t,null==h?this.removeAttribute(r):this.setAttribute(r,h),this._$El=null;}}_$AK(t,i){var s;const e=this.constructor,r=e._$Ev.get(t);if(void 0!==r&&this._$El!==r){const t=e.getPropertyOptions(r),h="function"==typeof t.converter?{fromAttribute:t.converter}:void 0!==(null===(s=t.converter)||void 0===s?void 0:s.fromAttribute)?t.converter:n$6;this._$El=r,this[r]=h.fromAttribute(i,t.type),this._$El=null;}}requestUpdate(t,i,s){let e=!0;void 0!==t&&(((s=s||this.constructor.getPropertyOptions(t)).hasChanged||a$2)(this[t],i)?(this._$AL.has(t)||this._$AL.set(t,i),!0===s.reflect&&this._$El!==t&&(void 0===this._$EC&&(this._$EC=new Map),this._$EC.set(t,s))):e=!1),!this.isUpdatePending&&e&&(this._$E_=this._$Ej());}async _$Ej(){this.isUpdatePending=!0;try{await this._$E_;}catch(t){Promise.reject(t);}const t=this.scheduleUpdate();return null!=t&&await t,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){var t;if(!this.isUpdatePending)return;this.hasUpdated,this._$Ei&&(this._$Ei.forEach(((t,i)=>this[i]=t)),this._$Ei=void 0);let i=!1;const s=this._$AL;try{i=this.shouldUpdate(s),i?(this.willUpdate(s),null===(t=this._$ES)||void 0===t||t.forEach((t=>{var i;return null===(i=t.hostUpdate)||void 0===i?void 0:i.call(t)})),this.update(s)):this._$Ek();}catch(t){throw i=!1,this._$Ek(),t}i&&this._$AE(s);}willUpdate(t){}_$AE(t){var i;null===(i=this._$ES)||void 0===i||i.forEach((t=>{var i;return null===(i=t.hostUpdated)||void 0===i?void 0:i.call(t)})),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(t)),this.updated(t);}_$Ek(){this._$AL=new Map,this.isUpdatePending=!1;}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$E_}shouldUpdate(t){return !0}update(t){void 0!==this._$EC&&(this._$EC.forEach(((t,i)=>this._$EO(i,this[i],t))),this._$EC=void 0),this._$Ek();}updated(t){}firstUpdated(t){}}u$2[d$2]=!0,u$2.elementProperties=new Map,u$2.elementStyles=[],u$2.shadowRootOptions={mode:"open"},null==o$4||o$4({ReactiveElement:u$2}),(null!==(s$4=e$5.reactiveElementVersions)&&void 0!==s$4?s$4:e$5.reactiveElementVersions=[]).push("1.6.3");

/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
var t$1;const i$2=window,s$3=i$2.trustedTypes,e$4=s$3?s$3.createPolicy("lit-html",{createHTML:t=>t}):void 0,o$3="$lit$",n$5=`lit$${(Math.random()+"").slice(9)}$`,l$2="?"+n$5,h$1=`<${l$2}>`,r$2=document,u$1=()=>r$2.createComment(""),d$1=t=>null===t||"object"!=typeof t&&"function"!=typeof t,c$1=Array.isArray,v=t=>c$1(t)||"function"==typeof(null==t?void 0:t[Symbol.iterator]),a$1="[ \t\n\f\r]",f=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,_=/-->/g,m=/>/g,p=RegExp(`>|${a$1}(?:([^\\s"'>=/]+)(${a$1}*=${a$1}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`,"g"),g=/'/g,$=/"/g,y=/^(?:script|style|textarea|title)$/i,w=t=>(i,...s)=>({_$litType$:t,strings:i,values:s}),x=w(1),T=Symbol.for("lit-noChange"),A=Symbol.for("lit-nothing"),E=new WeakMap,C=r$2.createTreeWalker(r$2,129,null,!1);function P(t,i){if(!Array.isArray(t)||!t.hasOwnProperty("raw"))throw Error("invalid template strings array");return void 0!==e$4?e$4.createHTML(i):i}const V=(t,i)=>{const s=t.length-1,e=[];let l,r=2===i?"<svg>":"",u=f;for(let i=0;i<s;i++){const s=t[i];let d,c,v=-1,a=0;for(;a<s.length&&(u.lastIndex=a,c=u.exec(s),null!==c);)a=u.lastIndex,u===f?"!--"===c[1]?u=_:void 0!==c[1]?u=m:void 0!==c[2]?(y.test(c[2])&&(l=RegExp("</"+c[2],"g")),u=p):void 0!==c[3]&&(u=p):u===p?">"===c[0]?(u=null!=l?l:f,v=-1):void 0===c[1]?v=-2:(v=u.lastIndex-c[2].length,d=c[1],u=void 0===c[3]?p:'"'===c[3]?$:g):u===$||u===g?u=p:u===_||u===m?u=f:(u=p,l=void 0);const w=u===p&&t[i+1].startsWith("/>")?" ":"";r+=u===f?s+h$1:v>=0?(e.push(d),s.slice(0,v)+o$3+s.slice(v)+n$5+w):s+n$5+(-2===v?(e.push(void 0),i):w);}return [P(t,r+(t[s]||"<?>")+(2===i?"</svg>":"")),e]};class N{constructor({strings:t,_$litType$:i},e){let h;this.parts=[];let r=0,d=0;const c=t.length-1,v=this.parts,[a,f]=V(t,i);if(this.el=N.createElement(a,e),C.currentNode=this.el.content,2===i){const t=this.el.content,i=t.firstChild;i.remove(),t.append(...i.childNodes);}for(;null!==(h=C.nextNode())&&v.length<c;){if(1===h.nodeType){if(h.hasAttributes()){const t=[];for(const i of h.getAttributeNames())if(i.endsWith(o$3)||i.startsWith(n$5)){const s=f[d++];if(t.push(i),void 0!==s){const t=h.getAttribute(s.toLowerCase()+o$3).split(n$5),i=/([.?@])?(.*)/.exec(s);v.push({type:1,index:r,name:i[2],strings:t,ctor:"."===i[1]?H:"?"===i[1]?L:"@"===i[1]?z:k});}else v.push({type:6,index:r});}for(const i of t)h.removeAttribute(i);}if(y.test(h.tagName)){const t=h.textContent.split(n$5),i=t.length-1;if(i>0){h.textContent=s$3?s$3.emptyScript:"";for(let s=0;s<i;s++)h.append(t[s],u$1()),C.nextNode(),v.push({type:2,index:++r});h.append(t[i],u$1());}}}else if(8===h.nodeType)if(h.data===l$2)v.push({type:2,index:r});else {let t=-1;for(;-1!==(t=h.data.indexOf(n$5,t+1));)v.push({type:7,index:r}),t+=n$5.length-1;}r++;}}static createElement(t,i){const s=r$2.createElement("template");return s.innerHTML=t,s}}function S$1(t,i,s=t,e){var o,n,l,h;if(i===T)return i;let r=void 0!==e?null===(o=s._$Co)||void 0===o?void 0:o[e]:s._$Cl;const u=d$1(i)?void 0:i._$litDirective$;return (null==r?void 0:r.constructor)!==u&&(null===(n=null==r?void 0:r._$AO)||void 0===n||n.call(r,!1),void 0===u?r=void 0:(r=new u(t),r._$AT(t,s,e)),void 0!==e?(null!==(l=(h=s)._$Co)&&void 0!==l?l:h._$Co=[])[e]=r:s._$Cl=r),void 0!==r&&(i=S$1(t,r._$AS(t,i.values),r,e)),i}class M{constructor(t,i){this._$AV=[],this._$AN=void 0,this._$AD=t,this._$AM=i;}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(t){var i;const{el:{content:s},parts:e}=this._$AD,o=(null!==(i=null==t?void 0:t.creationScope)&&void 0!==i?i:r$2).importNode(s,!0);C.currentNode=o;let n=C.nextNode(),l=0,h=0,u=e[0];for(;void 0!==u;){if(l===u.index){let i;2===u.type?i=new R(n,n.nextSibling,this,t):1===u.type?i=new u.ctor(n,u.name,u.strings,this,t):6===u.type&&(i=new Z(n,this,t)),this._$AV.push(i),u=e[++h];}l!==(null==u?void 0:u.index)&&(n=C.nextNode(),l++);}return C.currentNode=r$2,o}v(t){let i=0;for(const s of this._$AV)void 0!==s&&(void 0!==s.strings?(s._$AI(t,s,i),i+=s.strings.length-2):s._$AI(t[i])),i++;}}class R{constructor(t,i,s,e){var o;this.type=2,this._$AH=A,this._$AN=void 0,this._$AA=t,this._$AB=i,this._$AM=s,this.options=e,this._$Cp=null===(o=null==e?void 0:e.isConnected)||void 0===o||o;}get _$AU(){var t,i;return null!==(i=null===(t=this._$AM)||void 0===t?void 0:t._$AU)&&void 0!==i?i:this._$Cp}get parentNode(){let t=this._$AA.parentNode;const i=this._$AM;return void 0!==i&&11===(null==t?void 0:t.nodeType)&&(t=i.parentNode),t}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(t,i=this){t=S$1(this,t,i),d$1(t)?t===A||null==t||""===t?(this._$AH!==A&&this._$AR(),this._$AH=A):t!==this._$AH&&t!==T&&this._(t):void 0!==t._$litType$?this.g(t):void 0!==t.nodeType?this.$(t):v(t)?this.T(t):this._(t);}k(t){return this._$AA.parentNode.insertBefore(t,this._$AB)}$(t){this._$AH!==t&&(this._$AR(),this._$AH=this.k(t));}_(t){this._$AH!==A&&d$1(this._$AH)?this._$AA.nextSibling.data=t:this.$(r$2.createTextNode(t)),this._$AH=t;}g(t){var i;const{values:s,_$litType$:e}=t,o="number"==typeof e?this._$AC(t):(void 0===e.el&&(e.el=N.createElement(P(e.h,e.h[0]),this.options)),e);if((null===(i=this._$AH)||void 0===i?void 0:i._$AD)===o)this._$AH.v(s);else {const t=new M(o,this),i=t.u(this.options);t.v(s),this.$(i),this._$AH=t;}}_$AC(t){let i=E.get(t.strings);return void 0===i&&E.set(t.strings,i=new N(t)),i}T(t){c$1(this._$AH)||(this._$AH=[],this._$AR());const i=this._$AH;let s,e=0;for(const o of t)e===i.length?i.push(s=new R(this.k(u$1()),this.k(u$1()),this,this.options)):s=i[e],s._$AI(o),e++;e<i.length&&(this._$AR(s&&s._$AB.nextSibling,e),i.length=e);}_$AR(t=this._$AA.nextSibling,i){var s;for(null===(s=this._$AP)||void 0===s||s.call(this,!1,!0,i);t&&t!==this._$AB;){const i=t.nextSibling;t.remove(),t=i;}}setConnected(t){var i;void 0===this._$AM&&(this._$Cp=t,null===(i=this._$AP)||void 0===i||i.call(this,t));}}class k{constructor(t,i,s,e,o){this.type=1,this._$AH=A,this._$AN=void 0,this.element=t,this.name=i,this._$AM=e,this.options=o,s.length>2||""!==s[0]||""!==s[1]?(this._$AH=Array(s.length-1).fill(new String),this.strings=s):this._$AH=A;}get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}_$AI(t,i=this,s,e){const o=this.strings;let n=!1;if(void 0===o)t=S$1(this,t,i,0),n=!d$1(t)||t!==this._$AH&&t!==T,n&&(this._$AH=t);else {const e=t;let l,h;for(t=o[0],l=0;l<o.length-1;l++)h=S$1(this,e[s+l],i,l),h===T&&(h=this._$AH[l]),n||(n=!d$1(h)||h!==this._$AH[l]),h===A?t=A:t!==A&&(t+=(null!=h?h:"")+o[l+1]),this._$AH[l]=h;}n&&!e&&this.j(t);}j(t){t===A?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,null!=t?t:"");}}class H extends k{constructor(){super(...arguments),this.type=3;}j(t){this.element[this.name]=t===A?void 0:t;}}const I=s$3?s$3.emptyScript:"";class L extends k{constructor(){super(...arguments),this.type=4;}j(t){t&&t!==A?this.element.setAttribute(this.name,I):this.element.removeAttribute(this.name);}}class z extends k{constructor(t,i,s,e,o){super(t,i,s,e,o),this.type=5;}_$AI(t,i=this){var s;if((t=null!==(s=S$1(this,t,i,0))&&void 0!==s?s:A)===T)return;const e=this._$AH,o=t===A&&e!==A||t.capture!==e.capture||t.once!==e.once||t.passive!==e.passive,n=t!==A&&(e===A||o);o&&this.element.removeEventListener(this.name,this,e),n&&this.element.addEventListener(this.name,this,t),this._$AH=t;}handleEvent(t){var i,s;"function"==typeof this._$AH?this._$AH.call(null!==(s=null===(i=this.options)||void 0===i?void 0:i.host)&&void 0!==s?s:this.element,t):this._$AH.handleEvent(t);}}class Z{constructor(t,i,s){this.element=t,this.type=6,this._$AN=void 0,this._$AM=i,this.options=s;}get _$AU(){return this._$AM._$AU}_$AI(t){S$1(this,t);}}const B=i$2.litHtmlPolyfillSupport;null==B||B(N,R),(null!==(t$1=i$2.litHtmlVersions)&&void 0!==t$1?t$1:i$2.litHtmlVersions=[]).push("2.8.0");const D=(t,i,s)=>{var e,o;const n=null!==(e=null==s?void 0:s.renderBefore)&&void 0!==e?e:i;let l=n._$litPart$;if(void 0===l){const t=null!==(o=null==s?void 0:s.renderBefore)&&void 0!==o?o:null;n._$litPart$=l=new R(i.insertBefore(u$1(),t),t,void 0,null!=s?s:{});}return l._$AI(t),l};

/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const t=window,e$3=t.ShadowRoot&&(void 0===t.ShadyCSS||t.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,s$2=Symbol(),n$4=new WeakMap;class o$2{constructor(t,e,n){if(this._$cssResult$=!0,n!==s$2)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=t,this.t=e;}get styleSheet(){let t=this.o;const s=this.t;if(e$3&&void 0===t){const e=void 0!==s&&1===s.length;e&&(t=n$4.get(s)),void 0===t&&((this.o=t=new CSSStyleSheet).replaceSync(this.cssText),e&&n$4.set(s,t));}return t}toString(){return this.cssText}}const r$1=t=>new o$2("string"==typeof t?t:t+"",void 0,s$2),i$1=(t,...e)=>{const n=1===t.length?t[0]:e.reduce(((e,s,n)=>e+(t=>{if(!0===t._$cssResult$)return t.cssText;if("number"==typeof t)return t;throw Error("Value passed to 'css' function must be a 'css' function result: "+t+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(s)+t[n+1]),t[0]);return new o$2(n,t,s$2)},S=(s,n)=>{e$3?s.adoptedStyleSheets=n.map((t=>t instanceof CSSStyleSheet?t:t.styleSheet)):n.forEach((e=>{const n=document.createElement("style"),o=t.litNonce;void 0!==o&&n.setAttribute("nonce",o),n.textContent=e.cssText,s.appendChild(n);}));},c=e$3?t=>t:t=>t instanceof CSSStyleSheet?(t=>{let e="";for(const s of t.cssRules)e+=s.cssText;return r$1(e)})(t):t;

/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */var s$1;const e$2=window,r=e$2.trustedTypes,h=r?r.emptyScript:"",o$1=e$2.reactiveElementPolyfillSupport,n$3={toAttribute(t,i){switch(i){case Boolean:t=t?h:null;break;case Object:case Array:t=null==t?t:JSON.stringify(t);}return t},fromAttribute(t,i){let s=t;switch(i){case Boolean:s=null!==t;break;case Number:s=null===t?null:Number(t);break;case Object:case Array:try{s=JSON.parse(t);}catch(t){s=null;}}return s}},a=(t,i)=>i!==t&&(i==i||t==t),l$1={attribute:!0,type:String,converter:n$3,reflect:!1,hasChanged:a},d="finalized";class u extends HTMLElement{constructor(){super(),this._$Ei=new Map,this.isUpdatePending=!1,this.hasUpdated=!1,this._$El=null,this._$Eu();}static addInitializer(t){var i;this.finalize(),(null!==(i=this.h)&&void 0!==i?i:this.h=[]).push(t);}static get observedAttributes(){this.finalize();const t=[];return this.elementProperties.forEach(((i,s)=>{const e=this._$Ep(s,i);void 0!==e&&(this._$Ev.set(e,s),t.push(e));})),t}static createProperty(t,i=l$1){if(i.state&&(i.attribute=!1),this.finalize(),this.elementProperties.set(t,i),!i.noAccessor&&!this.prototype.hasOwnProperty(t)){const s="symbol"==typeof t?Symbol():"__"+t,e=this.getPropertyDescriptor(t,s,i);void 0!==e&&Object.defineProperty(this.prototype,t,e);}}static getPropertyDescriptor(t,i,s){return {get(){return this[i]},set(e){const r=this[t];this[i]=e,this.requestUpdate(t,r,s);},configurable:!0,enumerable:!0}}static getPropertyOptions(t){return this.elementProperties.get(t)||l$1}static finalize(){if(this.hasOwnProperty(d))return !1;this[d]=!0;const t=Object.getPrototypeOf(this);if(t.finalize(),void 0!==t.h&&(this.h=[...t.h]),this.elementProperties=new Map(t.elementProperties),this._$Ev=new Map,this.hasOwnProperty("properties")){const t=this.properties,i=[...Object.getOwnPropertyNames(t),...Object.getOwnPropertySymbols(t)];for(const s of i)this.createProperty(s,t[s]);}return this.elementStyles=this.finalizeStyles(this.styles),!0}static finalizeStyles(i){const s=[];if(Array.isArray(i)){const e=new Set(i.flat(1/0).reverse());for(const i of e)s.unshift(c(i));}else void 0!==i&&s.push(c(i));return s}static _$Ep(t,i){const s=i.attribute;return !1===s?void 0:"string"==typeof s?s:"string"==typeof t?t.toLowerCase():void 0}_$Eu(){var t;this._$E_=new Promise((t=>this.enableUpdating=t)),this._$AL=new Map,this._$Eg(),this.requestUpdate(),null===(t=this.constructor.h)||void 0===t||t.forEach((t=>t(this)));}addController(t){var i,s;(null!==(i=this._$ES)&&void 0!==i?i:this._$ES=[]).push(t),void 0!==this.renderRoot&&this.isConnected&&(null===(s=t.hostConnected)||void 0===s||s.call(t));}removeController(t){var i;null===(i=this._$ES)||void 0===i||i.splice(this._$ES.indexOf(t)>>>0,1);}_$Eg(){this.constructor.elementProperties.forEach(((t,i)=>{this.hasOwnProperty(i)&&(this._$Ei.set(i,this[i]),delete this[i]);}));}createRenderRoot(){var t;const s=null!==(t=this.shadowRoot)&&void 0!==t?t:this.attachShadow(this.constructor.shadowRootOptions);return S(s,this.constructor.elementStyles),s}connectedCallback(){var t;void 0===this.renderRoot&&(this.renderRoot=this.createRenderRoot()),this.enableUpdating(!0),null===(t=this._$ES)||void 0===t||t.forEach((t=>{var i;return null===(i=t.hostConnected)||void 0===i?void 0:i.call(t)}));}enableUpdating(t){}disconnectedCallback(){var t;null===(t=this._$ES)||void 0===t||t.forEach((t=>{var i;return null===(i=t.hostDisconnected)||void 0===i?void 0:i.call(t)}));}attributeChangedCallback(t,i,s){this._$AK(t,s);}_$EO(t,i,s=l$1){var e;const r=this.constructor._$Ep(t,s);if(void 0!==r&&!0===s.reflect){const h=(void 0!==(null===(e=s.converter)||void 0===e?void 0:e.toAttribute)?s.converter:n$3).toAttribute(i,s.type);this._$El=t,null==h?this.removeAttribute(r):this.setAttribute(r,h),this._$El=null;}}_$AK(t,i){var s;const e=this.constructor,r=e._$Ev.get(t);if(void 0!==r&&this._$El!==r){const t=e.getPropertyOptions(r),h="function"==typeof t.converter?{fromAttribute:t.converter}:void 0!==(null===(s=t.converter)||void 0===s?void 0:s.fromAttribute)?t.converter:n$3;this._$El=r,this[r]=h.fromAttribute(i,t.type),this._$El=null;}}requestUpdate(t,i,s){let e=!0;void 0!==t&&(((s=s||this.constructor.getPropertyOptions(t)).hasChanged||a)(this[t],i)?(this._$AL.has(t)||this._$AL.set(t,i),!0===s.reflect&&this._$El!==t&&(void 0===this._$EC&&(this._$EC=new Map),this._$EC.set(t,s))):e=!1),!this.isUpdatePending&&e&&(this._$E_=this._$Ej());}async _$Ej(){this.isUpdatePending=!0;try{await this._$E_;}catch(t){Promise.reject(t);}const t=this.scheduleUpdate();return null!=t&&await t,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){var t;if(!this.isUpdatePending)return;this.hasUpdated,this._$Ei&&(this._$Ei.forEach(((t,i)=>this[i]=t)),this._$Ei=void 0);let i=!1;const s=this._$AL;try{i=this.shouldUpdate(s),i?(this.willUpdate(s),null===(t=this._$ES)||void 0===t||t.forEach((t=>{var i;return null===(i=t.hostUpdate)||void 0===i?void 0:i.call(t)})),this.update(s)):this._$Ek();}catch(t){throw i=!1,this._$Ek(),t}i&&this._$AE(s);}willUpdate(t){}_$AE(t){var i;null===(i=this._$ES)||void 0===i||i.forEach((t=>{var i;return null===(i=t.hostUpdated)||void 0===i?void 0:i.call(t)})),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(t)),this.updated(t);}_$Ek(){this._$AL=new Map,this.isUpdatePending=!1;}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$E_}shouldUpdate(t){return !0}update(t){void 0!==this._$EC&&(this._$EC.forEach(((t,i)=>this._$EO(i,this[i],t))),this._$EC=void 0),this._$Ek();}updated(t){}firstUpdated(t){}}u[d]=!0,u.elementProperties=new Map,u.elementStyles=[],u.shadowRootOptions={mode:"open"},null==o$1||o$1({ReactiveElement:u}),(null!==(s$1=e$2.reactiveElementVersions)&&void 0!==s$1?s$1:e$2.reactiveElementVersions=[]).push("1.6.3");

/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */var l,o;class s extends u{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0;}createRenderRoot(){var t,e;const i=super.createRenderRoot();return null!==(t=(e=this.renderOptions).renderBefore)&&void 0!==t||(e.renderBefore=i.firstChild),i}update(t){const i=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(t),this._$Do=D(i,this.renderRoot,this.renderOptions);}connectedCallback(){var t;super.connectedCallback(),null===(t=this._$Do)||void 0===t||t.setConnected(!0);}disconnectedCallback(){var t;super.disconnectedCallback(),null===(t=this._$Do)||void 0===t||t.setConnected(!1);}render(){return T}}s.finalized=!0,s._$litElement$=!0,null===(l=globalThis.litElementHydrateSupport)||void 0===l||l.call(globalThis,{LitElement:s});const n$2=globalThis.litElementPolyfillSupport;null==n$2||n$2({LitElement:s});(null!==(o=globalThis.litElementVersions)&&void 0!==o?o:globalThis.litElementVersions=[]).push("3.3.3");

/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const e$1=e=>n=>"function"==typeof n?((e,n)=>(customElements.define(e,n),n))(e,n):((e,n)=>{const{kind:t,elements:s}=n;return {kind:t,elements:s,finisher(n){customElements.define(e,n);}}})(e,n);

/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const i=(i,e)=>"method"===e.kind&&e.descriptor&&!("value"in e.descriptor)?{...e,finisher(n){n.createProperty(e.key,i);}}:{kind:"field",key:Symbol(),placement:"own",descriptor:{},originalKey:e.key,initializer(){"function"==typeof e.initializer&&(this[e.key]=e.initializer.call(this));},finisher(n){n.createProperty(e.key,i);}},e=(i,e,n)=>{e.constructor.createProperty(n,i);};function n$1(n){return (t,o)=>void 0!==o?e(n,t,o):i(n,t)}

/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */var n;null!=(null===(n=window.HTMLSlotElement)||void 0===n?void 0:n.prototype.assignedElements)?(o,n)=>o.assignedElements(n):(o,n)=>o.assignedNodes(n).filter((o=>o.nodeType===Node.ELEMENT_NODE));

var __decorate = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof undefined === "function") r = undefined(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var _a;
const $updateScenario = Symbol('updateScenario');
const $updateSize = Symbol('updateSize');
const $canvas = Symbol('canvas');
const $view = Symbol('view');
const $state = Symbol('state');
const $resourceLoader = Symbol('resourceLoader');
const $degToRadians = Symbol('degToRadians');
let GltfSampleViewer = class GltfSampleViewer extends s {
    constructor() {
        super(...arguments);
        this.scenario = null;
        this[_a] = null;
    }
    static get styles() {
        return i$1 `
:host {
 display: block;
}
`;
    }
    render() {
        return x `<canvas id="canvas"></canvas>`;
    }
    updated(changedProperties) {
        super.updated(changedProperties);
        this[$updateSize]();
        if (changedProperties.has('scenario') && this.scenario != null) {
            this[$updateScenario](this.scenario);
        }
    }
    async [(_a = $canvas, $updateScenario)](scenario) {
        if (this[$view] == null) {
            this[$canvas] = this.shadowRoot.querySelector('canvas');
            this[$view] = new GltfView(this[$canvas].getContext('webgl2', { alpha: true, antialias: true }));
            this[$state] = this[$view].createState();
            this[$resourceLoader] = this[$view].createResourceLoader();
        }
        this[$updateSize]();
        this[$state].gltf = await this[$resourceLoader].loadGltf(scenario.model);
        const defaultScene = this[$state].gltf.scene;
        this[$state].sceneIndex = defaultScene === undefined ? 0 : defaultScene;
        const scene = this[$state].gltf.scenes[this[$state].sceneIndex];
        scene.applyTransformHierarchy(this[$state].gltf);
        const { target, orbit, verticalFoV } = scenario;
        const camera = this[$state].userCamera;
        camera.setVerticalFoV(this[$degToRadians](verticalFoV));
        camera.fitViewToScene(this[$state].gltf, this[$state].sceneIndex);
        const yaw = this[$degToRadians](orbit.theta);
        const pitch = this[$degToRadians]((orbit.phi - 90));
        camera.setRotation(yaw, pitch);
        camera.setDistanceFromTarget(orbit.radius, [target.x, target.y, target.z]);
        this[$state].renderingParameters.clearColor = [0, 0, 0, 0];
        const luts = {
            lut_ggx_file: '../../../node_modules/@khronosgroup/gltf-viewer/dist/assets/lut_ggx.png',
            lut_charlie_file: '../../../node_modules/@khronosgroup/gltf-viewer/dist/assets/lut_charlie.png',
            lut_sheen_E_file: '../../../node_modules/@khronosgroup/gltf-viewer/dist/assets/lut_sheen_E.png'
        };
        this[$state].renderingParameters.environmentRotation = 0;
        this[$state].environment =
            await this[$resourceLoader].loadEnvironment(scenario.lighting, luts);
        this[$state].renderingParameters.renderEnvironmentMap =
            scenario.renderSkybox;
        this[$state].renderingParameters.blurEnvironmentMap = false;
        this[$state].renderingParameters.toneMap =
            GltfState.ToneMaps.ACES_HILL_EXPOSURE_BOOST;
        this[$view].renderFrame(this[$state], this[$canvas].width, this[$canvas].height);
        requestAnimationFrame(() => {
            this.dispatchEvent(
            // This notifies the framework that the model is visible and the
            // screenshot can be taken
            new CustomEvent('model-visibility', { detail: { visible: true } }));
        });
    }
    [$updateSize]() {
        if (this[$canvas] == null || this.scenario == null) {
            return;
        }
        const canvas = this[$canvas];
        const { dimensions } = this.scenario;
        const dpr = window.devicePixelRatio;
        const width = dimensions.width * dpr;
        const height = dimensions.height * dpr;
        canvas.width = width;
        canvas.height = height;
        canvas.style.width = `${dimensions.width}px`;
        canvas.style.height = `${dimensions.height}px`;
        const aspect = width / height;
        const camera = this[$state].userCamera;
        camera.aspectRatio = aspect;
    }
    [$degToRadians](degree) {
        return Math.PI * (degree / 180);
    }
};
__decorate([
    n$1({ type: Object })
], GltfSampleViewer.prototype, "scenario", void 0);
GltfSampleViewer = __decorate([
    e$1('gltf-sample-viewer')
], GltfSampleViewer);

export { GltfSampleViewer };
//# sourceMappingURL=gltf-sample-viewer.js.map
