'use strict';

var THREE = require('three');
var Pass = require('../../Pass');
var vertex = require('../../shaders/vertex/basic.glsl');
var fragment = require('./motion-blur-fs.glsl');

function MotionBlur(options) {

  Pass.call(this);
  this.setShader(vertex, fragment);

  this.params.velocityFactor = 1;

  this.params.tDepth = new THREE.Texture(1,1)

  this.params.viewProjectionInverseMatrix = new THREE.Matrix4()
  this.params.previousViewProjectionMatrix = new THREE.Matrix4()

}

module.exports = MotionBlur;

MotionBlur.prototype = Object.create(Pass.prototype);

MotionBlur.prototype.constructor = MotionBlur;

MotionBlur.prototype.run = function(composer) {

  this.shader.uniforms.velocityFactor.value = this.params.velocityFactor;

  this.shader.uniforms.viewProjectionInverseMatrix.value = this.params.viewProjectionInverseMatrix;
  this.shader.uniforms.previousViewProjectionMatrix.value = this.params.previousViewProjectionMatrix;
  this.shader.uniforms.tDepth.value = this.params.tDepth;

  composer.pass(this.shader);

};
