'use strict';

var THREE = require('three');
var Pass = require('../../Pass');
var vertex = require('../../shaders/vertex/basic.glsl');
var fragment = require('./symetric-fs.glsl');

function Symetric(options) {
  Pass.call(this);
  this.setShader(vertex, fragment);

  this.params.xReverse = false;
	this.params.yReverse = false;
	this.params.xMirror = false;
	this.params.yMirror = false;
	this.params.mirrorCenter = new THREE.Vector2( 0.5, 0.5);
	this.params.angle = 0;
}

module.exports = Symetric;

Symetric.prototype = Object.create(Pass.prototype);
Symetric.prototype.constructor = Symetric;


Symetric.prototype.run = function(composer) {

  this.shader.uniforms.xReverse.value = this.params.xReverse;
  this.shader.uniforms.yReverse.value = this.params.yReverse;
  this.shader.uniforms.xMirror.value = this.params.xMirror;
  this.shader.uniforms.yMirror.value = this.params.yMirror;
  this.shader.uniforms.mirrorCenter.value = this.params.mirrorCenter;
  this.shader.uniforms.angle.value = this.params.angle;

  composer.pass(this.shader);
};
