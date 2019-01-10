import moment from 'moment';
import mongoose from './database';

const logEntrySchema = mongoose.Schema({
	userId: {
		type: mongoose.Schema.Types.ObjectId,
		required: true,
		index: true
	},
	entryTime: {
		type: Date,
		required: true,
		index: true
	},
	location: String,
	site: String,
	gps: {
		latitude: Number,
		longitude: Number
	},
	bottomTime: Number,
	totalTime: Number,
	maxDepth: Number,
	averageDepth: Number,
	weight: {
		amount: Number
	}
});

logEntrySchema.statics.searchByUser = function (userId, options, done) {
	return this.find({ userId, ...options }, done);
};

logEntrySchema.methods.toCleanJSON = function () {
	const clean = { entryId: this.id, ...this.toJSON() };
	/* eslint-disable no-underscore-dangle */
	delete clean._id;
	delete clean.__v;
	/* eslint-enable no-underscore-dangle */
	delete clean.userId;
	clean.entryTime = moment(this.entryTime).utc().toISOString();
	return clean;
};

export default mongoose.model('LogEntry', logEntrySchema);

export function assignLogEntry(entity, newLogEntry) {
	entity.entryTime = moment(newLogEntry.entryTime).utc().toDate();
	entity.bottomTime = newLogEntry.bottomTime;
	entity.totalTime = newLogEntry.totalTime;
	entity.location = newLogEntry.location;
	entity.site = newLogEntry.site;
	entity.averageDepth = newLogEntry.averageDepth;
	entity.maxDepth = newLogEntry.maxDepth;
	entity.gps = newLogEntry.gps;
	entity.weight = newLogEntry.weight;
}
