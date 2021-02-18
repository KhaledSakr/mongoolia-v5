"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _lodash = require("lodash");

var _algoliasearch = _interopRequireDefault(require("algoliasearch"));

var _algoliaMongooseModel = _interopRequireDefault(require("./algolia-mongoose-model"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/* eslint no-console: 0 */
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
  schema.post('findOneAndUpdate', doc => doc.postUpdateHook()); // Must pass new: true to findOneAndUpdate options

  schema.post('remove', doc => doc.postRemoveHook());
};

var _default = mongoolia;
exports.default = _default;