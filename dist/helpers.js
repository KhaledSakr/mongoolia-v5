"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.pick = void 0;

var _lodash = require("lodash");

function _toArray(arr) { return _arrayWithHoles(arr) || _iterableToArray(arr) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance"); }

function _iterableToArray(iter) { if (Symbol.iterator in Object(iter) || Object.prototype.toString.call(iter) === "[object Arguments]") return Array.from(iter); }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

const pickByPath = (obj, path) => {
  if (!obj || !path || typeof obj !== 'object') {
    return obj;
  }

  const _path$split = path.split('.'),
        _path$split2 = _toArray(_path$split),
        firstPath = _path$split2[0],
        rest = _path$split2.slice(1);

  return Array.isArray(obj) ? obj.map(item => pickByPath(item, firstPath)) : Object.fromEntries(Object.entries(obj).filter(([key]) => key === firstPath).map(([key, value]) => [key, pickByPath(value, rest.join('.'))]));
};

const pick = (obj, paths) => {
  return (0, _lodash.merge)(...paths.map(path => pickByPath(obj, path)));
};

exports.pick = pick;