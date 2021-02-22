"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _lodash = require("lodash");

var _algoliasearch = _interopRequireDefault(require("algoliasearch"));

var _algoliaMongooseModel = _interopRequireDefault(require("./algolia-mongoose-model"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

const validateOpts = options => {
  const requiredKeys = ['appId', 'apiKey', 'indexName'];
  requiredKeys.forEach(key => {
    if (!options[key]) throw new Error(`Missing option key: ${key}`);
  });
};

const mongoolia = function mongoolia(schema, options) {
  validateOpts(options);
  const appId = options.appId,
        apiKey = options.apiKey,
        indexName = options.indexName,
        _options$fieldName = options.fieldName,
        fieldName = _options$fieldName === void 0 ? '_algoliaObjectID' : _options$fieldName; // add new Algolia objectID field

  schema.add({
    [fieldName]: {
      type: String,
      required: false,
      select: true
    }
  }); // initialize Algolia client

  const client = (0, _algoliasearch.default)(appId, apiKey);
  const index = client.initIndex(indexName); // apply AlgoliaIndex class

  const attributesToIndex = (0, _lodash.reduce)(schema.obj, (results, val, key) => val.algoliaIndex ? [...results, key] : results, []);
  schema.loadClass((0, _algoliaMongooseModel.default)({
    index,
    attributesToIndex,
    fieldName
  })); // register hooks

  schema.post('save', doc => doc.postSaveHook());
  schema.post('update', doc => doc.postUpdateHook());
  schema.post('remove', doc => doc.postRemoveHook());
  schema.post('findOneAndUpdate',
  /*#__PURE__*/
  function () {
    var _ref = _asyncToGenerator(function* (data) {
      const doc = yield this.model.findById(data._id);

      if (doc) {
        doc.postUpdateHook();
      }
    });

    return function (_x) {
      return _ref.apply(this, arguments);
    };
  }());
};

var _default = mongoolia;
exports.default = _default;