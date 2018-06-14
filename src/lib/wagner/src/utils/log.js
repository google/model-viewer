'use strict';

module.exports = function log() {
  console.log( Array.prototype.slice.call( arguments ).join( ' ' ) );
};