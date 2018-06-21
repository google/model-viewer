'use strict';

function ShadersPool() {
  this.availableShaders = [];
}

module.exports = ShadersPool;

ShadersPool.prototype.getPasses = function(passItems) {
  var pass;
  var passes = [];

  this.availableShaders.forEach(function(availableShader) {
    availableShader.used = false;
  });

  if (passItems) {
    passItems.forEach(function(passItem) {
      if (passItem.enabled) {
        pass = this.getShaderFromPool(passItem.shaderName);
        if (passItem.params) {
          pass.params = this.extendParams(pass.params, passItem.params);
        }
        passes.push(pass);
      }
    }.bind(this));
  }

  return passes;
};

ShadersPool.prototype.getShaderFromPool = function(shaderName) {
  var pass;
  var shaderItem;

  for (var i = this.availableShaders.length - 1; i >= 0; i--) {
    shaderItem = this.availableShaders[i];
    if (!shaderItem.used && shaderItem.name === shaderName) {
      shaderItem.used = true;
      pass = shaderItem.pass;
      break;
    }
  }

  if (!pass) {
    throw new Error('This Shader is not available in pool');
  }

  return pass;
};


ShadersPool.prototype.extendParams = function(target, source) {

  // TODO do it with extends or equivalent package
  
  var obj = {};
  for (var i = 0, il = arguments.length, key; i < il; i++) {
    for (key in arguments[i]) {
      if (arguments[i].hasOwnProperty(key)) {
        obj[key] = arguments[i][key];
      }
    }
  }
  return obj;
};
