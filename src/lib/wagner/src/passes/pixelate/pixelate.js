'use strict';

var THREE = require('three');
var Pass = require('../../Pass');
var vertex = require('../../shaders/vertex/basic.glsl');
var fragment = require('./pixelate-fs.glsl');

function Pixelate(options) {
  Pass.call(this);
  this.setShader(vertex, fragment);
  this.params.amount = 320;
}

module.exports = Pixelate;

Pixelate.prototype = Object.create(Pass.prototype);
Pixelate.prototype.constructor = Pixelate;


Pixelate.prototype.run = function(composer) {

  this.shader.uniforms.amount.value = this.params.amount;

  composer.pass(this.shader);
};
