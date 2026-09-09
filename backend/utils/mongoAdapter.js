const { getModel } = require('../models/mongodb');

/**
 * MongoDB Adapter - Provides Firestore-compatible API for MongoDB/Mongoose
 * This allows controllers to use the same syntax for both Firestore and MongoDB
 */

class MongoDocumentReference {
    constructor(model, docId, query = {}) {
        this.model = model;
        this.docId = docId;
        this.query = query;
    }

    async get() {
        try {
            let doc;
            if (this.docId) {
                // Find by _id or userId field
                doc = await this.model.findOne({
                    $or: [
                        { _id: this.docId },
                        { userId: this.docId },
                        { salesmanId: this.docId }
                    ],
                    ...this.query
                });
            } else {
                doc = await this.model.findOne(this.query);
            }

            return {
                exists: !!doc,
                id: doc?._id?.toString() || this.docId,
                data: () => {
                    if (!doc) return null;
                    const data = doc.toObject();
                    delete data._id;
                    delete data.__v;
                    return data;
                }
            };
        } catch (error) {
            console.error('MongoDocumentReference.get error:', error);
            throw error;
        }
    }

    async set(data) {
        try {
            const updateData = { ...data };

            if (this.docId) {
                // Try to find and update, or create with specific ID
                const result = await this.model.findOneAndUpdate(
                    {
                        $or: [
                            { _id: this.docId },
                            { userId: this.docId },
                            { salesmanId: this.docId }
                        ],
                        ...this.query
                    },
                    { $set: updateData },
                    { upsert: true, new: true, setDefaultsOnInsert: true }
                );
                return result;
            } else {
                const newDoc = new this.model({ ...this.query, ...updateData });
                return await newDoc.save();
            }
        } catch (error) {
            console.error('MongoDocumentReference.set error:', error);
            throw error;
        }
    }

    async update(data) {
        try {
            const updateData = { ...data };

            const result = await this.model.findOneAndUpdate(
                {
                    $or: [
                        { _id: this.docId },
                        { userId: this.docId },
                        { salesmanId: this.docId }
                    ],
                    ...this.query
                },
                { $set: updateData },
                { new: true }
            );

            if (!result) {
                throw new Error('Document not found for update');
            }
            return result;
        } catch (error) {
            console.error('MongoDocumentReference.update error:', error);
            throw error;
        }
    }

    async delete() {
        try {
            await this.model.deleteOne({
                $or: [
                    { _id: this.docId },
                    { userId: this.docId },
                    { salesmanId: this.docId }
                ],
                ...this.query
            });
        } catch (error) {
            console.error('MongoDocumentReference.delete error:', error);
            throw error;
        }
    }

    collection(subCollection) {
        // For nested collections in MongoDB, we just return a new collection reference
        // Subcollections are handled via query filters (ownerId, subuserId, etc.)
        return new MongoCollectionReference(getModel(subCollection), this.query);
    }
}

class MongoCollectionReference {
    constructor(model, baseQuery = {}) {
        this.model = model;
        this.baseQuery = baseQuery;
        this.queryBuilder = null;
    }

    doc(docId) {
        return new MongoDocumentReference(this.model, docId, this.baseQuery);
    }

    where(field, operator, value) {
        if (!this.queryBuilder) {
            this.queryBuilder = this.model.find(this.baseQuery);
        }

        switch (operator) {
            case '==':
                this.queryBuilder = this.queryBuilder.where(field).equals(value);
                break;
            case '!=':
                this.queryBuilder = this.queryBuilder.where(field).ne(value);
                break;
            case '>':
                this.queryBuilder = this.queryBuilder.where(field).gt(value);
                break;
            case '>=':
                this.queryBuilder = this.queryBuilder.where(field).gte(value);
                break;
            case '<':
                this.queryBuilder = this.queryBuilder.where(field).lt(value);
                break;
            case '<=':
                this.queryBuilder = this.queryBuilder.where(field).lte(value);
                break;
            case 'in':
                this.queryBuilder = this.queryBuilder.where(field).in(value);
                break;
            default:
                this.queryBuilder = this.queryBuilder.where(field).equals(value);
        }

        return this;
    }

    orderBy(field, direction = 'asc') {
        if (!this.queryBuilder) {
            this.queryBuilder = this.model.find(this.baseQuery);
        }
        const sortDir = direction === 'desc' ? -1 : 1;
        this.queryBuilder = this.queryBuilder.sort({ [field]: sortDir });
        return this;
    }

    limit(count) {
        if (!this.queryBuilder) {
            this.queryBuilder = this.model.find(this.baseQuery);
        }
        this.queryBuilder = this.queryBuilder.limit(count);
        return this;
    }

    async get() {
        try {
            const query = this.queryBuilder || this.model.find(this.baseQuery);
            const docs = await query.exec();

            return {
                empty: docs.length === 0,
                size: docs.length,
                docs: docs.map(doc => ({
                    id: doc._id.toString(),
                    exists: true,
                    data: () => {
                        const data = doc.toObject();
                        delete data._id;
                        delete data.__v;
                        return data;
                    }
                }))
            };
        } catch (error) {
            console.error('MongoCollectionReference.get error:', error);
            throw error;
        }
    }

    async add(data) {
        try {
            const newDoc = new this.model({ ...this.baseQuery, ...data });
            const saved = await newDoc.save();
            return {
                id: saved._id.toString()
            };
        } catch (error) {
            console.error('MongoCollectionReference.add error:', error);
            throw error;
        }
    }
}

/**
 * MongoDB Batch Operations
 */
class MongoBatch {
    constructor() {
        this.operations = [];
    }

    set(docRef, data) {
        this.operations.push({
            type: 'set',
            docRef,
            data
        });
    }

    update(docRef, data) {
        this.operations.push({
            type: 'update',
            docRef,
            data
        });
    }

    delete(docRef) {
        this.operations.push({
            type: 'delete',
            docRef
        });
    }

    async commit() {
        try {
            for (const op of this.operations) {
                switch (op.type) {
                    case 'set':
                        await op.docRef.set(op.data);
                        break;
                    case 'update':
                        await op.docRef.update(op.data);
                        break;
                    case 'delete':
                        await op.docRef.delete();
                        break;
                }
            }
            this.operations = [];
        } catch (error) {
            console.error('MongoBatch.commit error:', error);
            throw error;
        }
    }
}

/**
 * MongoDB FieldValue for special operations
 */
class MongoFieldValue {
    static increment(amount = 1) {
        return { $inc: amount };
    }

    static serverTimestamp() {
        return new Date().toISOString();
    }
}

module.exports = {
    MongoCollectionReference,
    MongoDocumentReference,
    MongoBatch,
    MongoFieldValue
};
