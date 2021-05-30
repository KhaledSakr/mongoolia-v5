"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = createAlgoliaMongooseModel;

var _lodash = require("lodash");

var _helpers = require("./helpers");

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; var ownKeys = Object.keys(source); if (typeof Object.getOwnPropertySymbols === 'function') { ownKeys = ownKeys.concat(Object.getOwnPropertySymbols(source).filter(function (sym) { return Object.getOwnPropertyDescriptor(source, sym).enumerable; })); } ownKeys.forEach(function (key) { _defineProperty(target, key, source[key]); }); } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

function createAlgoliaMongooseModel({
  index,
  attributesToIndex: originalAttributesToIndex,
  fieldName,
  populateSubfields
}) {
  const attributesToIndex = originalAttributesToIndex.concat(populateSubfields && populateSubfields.map(subfield => subfield.path) || []);

  class AlgoliaMongooseModel {
    // properties comming from mongoose model after `.loadClass()`
    // _algoliaObjectID: string;
    // * clears algolia index
    // * removes `_algoliaObjectID` from documents
    static clearAlgoliaIndex() {
      var _this = this;

      return _asyncToGenerator(function* () {
        yield index.clearIndex();
        yield _this.collection.updateMany({
          [fieldName]: {
            $exists: true
          }
        }, {
          $set: {
            [fieldName]: null
          }
        });
      })();
    } // * clears algolia index
    // * push collection to algolia index


    static syncWithAlgolia({
      force
    } = {}) {
      var _this2 = this;

      return _asyncToGenerator(function* () {
        if (force) yield _this2.clearAlgoliaIndex();

        let query = _this2.find({
          [fieldName]: {
            $eq: null
          }
        });

        if (populateSubfields) {
          query = query.populate(populateSubfields);
        }

        const docs = yield query.lean();

        const _ref = yield index.addObjects(docs.map(doc => (0, _helpers.pick)(doc, attributesToIndex))),
              objectIDs = _ref.objectIDs;

        return yield _this2.bulkWrite(docs.map((doc, i) => ({
          updateOne: {
            filter: {
              _id: doc._id
            },
            update: {
              $set: {
                [fieldName]: objectIDs[i]
              }
            }
          }
        })));
      })();
    } // * set one or more settings of the algolia index


    static setAlgoliaIndexSettings(settings, forwardToReplicas) {
      return index.setSettings(settings, {
        forwardToReplicas
      });
    } // * search the index


    static algoliaSearch({
      query,
      params,
      populate
    }) {
      var _this3 = this;

      return _asyncToGenerator(function* () {
        const searchParams = _objectSpread({}, params, {
          query
        });

        const data = yield index.search(searchParams); // * populate hits with content from mongodb

        if (populate) {
          // find objects into mongodb matching `objectID` from Algolia search
          const hitsFromMongoose = yield _this3.find({
            [fieldName]: {
              $in: (0, _lodash.map)(data.hits, 'objectID')
            }
          }).lean(); // add additional data from mongodb into Algolia hits

          const populatedHits = data.hits.map(hit => {
            const ogHit = (0, _lodash.find)(hitsFromMongoose, {
              [fieldName]: hit.objectID
            });
            return (0, _lodash.omit)(_objectSpread({}, ogHit ? ogHit : {}, hit), [fieldName]);
          });
          data.hits = populatedHits;
        }

        return data;
      })();
    }

    prepareObject() {
      var _this4 = this;

      return _asyncToGenerator(function* () {
        if (populateSubfields) {
          yield _this4.populate(populateSubfields).execPopulate();
        }

        let objectToAdd = _this4.toJSON();

        return (0, _helpers.pick)(objectToAdd, attributesToIndex);
      })();
    } // * push new document to algolia
    // * update document with `_algoliaObjectID`


    addObjectToAlgolia() {
      var _this5 = this;

      return _asyncToGenerator(function* () {
        const objectToAdd = yield _this5.prepareObject();

        const _ref2 = yield index.addObject(objectToAdd),
              objectID = _ref2.objectID;

        _this5.collection.updateOne({
          _id: _this5._id
        }, {
          $set: {
            [fieldName]: objectID
          }
        });
      })();
    } // * update object into algolia index


    updateObjectToAlgolia() {
      var _this6 = this;

      return _asyncToGenerator(function* () {
        const objectToAdd = yield _this6.prepareObject();
        yield index.saveObject(_objectSpread({}, objectToAdd, {
          objectID: _this6[fieldName]
        }));
      })();
    } // * delete object from algolia index


    deleteObjectFromAlgolia() {
      var _this7 = this;

      return _asyncToGenerator(function* () {
        yield index.deleteObject(_this7[fieldName]);
      })();
    } // * schema.post('save')


    postSaveHook() {
      if (this[fieldName]) {
        this.updateObjectToAlgolia();
      } else {
        this.addObjectToAlgolia();
      }
    } // * schema.post('update')


    postUpdateHook() {
      if (this[fieldName]) {
        this.updateObjectToAlgolia();
      }
    } // * schema.post('remove')


    postRemoveHook() {
      if (this[fieldName]) {
        this.deleteObjectFromAlgolia();
      }
    }

  }

  return AlgoliaMongooseModel;
}