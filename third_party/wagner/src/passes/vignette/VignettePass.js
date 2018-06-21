'use strict';

var Pass = require('../../Pass');
var vertex = require('../../shaders/vertex/basic.glsl');
var fragment = require('./vignette-fs.glsl');

function VignettePass(boost, reduction) {
  Pass.call(this);

  this.setShader(vertex, fragment);

  this.params.boost = boost || 2;
  this.params.reduction = reduction || 2;
}

module.exports = VignettePass;

VignettePass.prototype = Object.create(Pass.prototype);
VignettePass.prototype.constructor = VignettePass;

VignettePass.prototype.run = function(composer) {
  this.shader.uniforms.boost.value = this.params.boost;
  this.shader.uniforms.reduction.value = this.params.reduction;
  composer.pass(this.shader);
};
