/* @flow */
import { omit, find, map } from 'lodash';
import { pick } from './helpers';

type AlgoliasearchClientIndex = {
  clearIndex: () => Promise<*>,
  addObject: ({}) => Promise<*>,
  saveObject: ({ objectID: string }) => Promise<*>,
  setSettings: ({}, { forwardToReplicas: boolean }) => Promise<*>,
  search: ({ query: string }) => Promise<*>,
  deleteObject: string => Promise<*>,
};

export default function createAlgoliaMongooseModel({
  index,
  attributesToIndex: originalAttributesToIndex,
  fieldName,
  populateSubfields,
}: {
  index: AlgoliasearchClientIndex,
  attributesToIndex: string[],
  fieldName: string,
  populateSubfields?: { path: string, select: string }[],
}) {
  const attributesToIndex = originalAttributesToIndex.concat(
    (populateSubfields && populateSubfields.map(subfield => subfield.path)) ||
      []
  );
  class AlgoliaMongooseModel {
    // properties comming from mongoose model after `.loadClass()`
    _id: MongoId;
    // _algoliaObjectID: string;
    collection: { update: ({ _id: MongoId }, {}) => Promise<*> };
    toJSON: () => JSON;
    populate: () => Promise<*>;

    static schema: { obj: {} };
    static find: ({}, ?{}) => Promise<*>;
    static update: ({}, {}) => Promise<*>;

    // * clears algolia index
    // * removes `_algoliaObjectID` from documents
    static async clearAlgoliaIndex() {
      await index.clearIndex();
      await this.collection.updateMany(
        { [fieldName]: { $exists: true } },
        { $set: { [fieldName]: null } }
      );
    }

    // * clears algolia index
    // * push collection to algolia index
    static async syncWithAlgolia({ force }: { force: boolean } = {}) {
      if (force) await this.clearAlgoliaIndex();

      let query = this.find({ [fieldName]: { $eq: null } });
      if (populateSubfields) {
        query = query.populate(populateSubfields);
      }
      const docs = await query.lean()
      const { objectIDs } = await index.addObjects(
        docs.map(doc => pick(doc, attributesToIndex))
      );

      return await this.bulkWrite(
        docs.map((doc, i) => ({
          updateOne: {
            filter: { _id: doc._id },
            update: {
              $set: {
                [fieldName]: objectIDs[i],
              },
            },
          },
        }))
      );
    }

    // * set one or more settings of the algolia index
    static setAlgoliaIndexSettings(settings: {}, forwardToReplicas: boolean) {
      return index.setSettings(settings, { forwardToReplicas });
    }

    // * search the index
    static async algoliaSearch({
      query,
      params,
      populate,
    }: {
      query: string,
      params: ?{},
      populate: boolean,
    }) {
      const searchParams = { ...params, query };
      const data = await index.search(searchParams);

      // * populate hits with content from mongodb
      if (populate) {
        // find objects into mongodb matching `objectID` from Algolia search
        const hitsFromMongoose = await this.find({
          [fieldName]: { $in: map(data.hits, 'objectID') },
        }).lean();

        // add additional data from mongodb into Algolia hits
        const populatedHits = data.hits.map(hit => {
          const ogHit = find(hitsFromMongoose, {
            [fieldName]: hit.objectID,
          });

          return omit(
            {
              ...(ogHit ? ogHit : {}),
              ...hit,
            },
            [fieldName]
          );
        });

        data.hits = populatedHits;
      }

      return data;
    }

    async prepareObject() {
      let objectToAdd = this.toJSON();
      if (populateSubfields) {
        objectToAdd = await this.populate(populateSubfields).lean();
      }
      return pick(objectToAdd, attributesToIndex);
    }

    // * push new document to algolia
    // * update document with `_algoliaObjectID`
    async addObjectToAlgolia() {
      const objectToAdd = await this.prepareObject();
      const { objectID } = await index.addObject(objectToAdd);

      this.collection.updateOne(
        { _id: this._id },
        { $set: { [fieldName]: objectID } }
      );
    }

    // * update object into algolia index
    async updateObjectToAlgolia() {
      const objectToAdd = await this.prepareObject();
      await index.saveObject({ ...objectToAdd, objectID: this[fieldName] });
    }

    // * delete object from algolia index
    async deleteObjectFromAlgolia() {
      await index.deleteObject(this[fieldName]);
    }

    // * schema.post('save')
    postSaveHook() {
      if (this[fieldName]) {
        this.updateObjectToAlgolia();
      } else {
        this.addObjectToAlgolia();
      }
    }

    // * schema.post('update')
    postUpdateHook() {
      if (this[fieldName]) {
        this.updateObjectToAlgolia();
      }
    }

    // * schema.post('remove')
    postRemoveHook() {
      if (this[fieldName]) {
        this.deleteObjectFromAlgolia();
      }
    }
  }

  return AlgoliaMongooseModel;
}
