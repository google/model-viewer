'use strict';

var THREE = require('three');
var Pass = require('../../Pass');
var vertex = require('../../shaders/vertex/basic.glsl');
var fragment = require('./noise-fs.glsl');

function Noise(options) {

  	Pass.call(this);

  	options = options || {};

  	this.setShader(vertex, fragment);

  	this.params.amount = options.amount || 0.1;
  	this.params.speed = options.speed || 0;

}

module.exports = Noise;

Noise.prototype = Object.create(Pass.prototype);
Noise.prototype.constructor = Noise;


Noise.prototype.run = function(composer) {

  this.shader.uniforms.amount.value = this.params.amount;
  this.shader.uniforms.speed.value = this.params.speed;

  composer.pass(this.shader);
};
