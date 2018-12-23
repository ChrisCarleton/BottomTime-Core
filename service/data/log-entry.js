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

export function cleanUpLogEntry(entry) {
	const clean = { entryId: entry.id, ...entry.toJSON() };
	/* eslint-disable no-underscore-dangle */
	delete clean._id;
	delete clean.__v;
	delete clean.userId;
	/* eslint-enable no-underscore-dangle */
	clean.entryTime = moment(entry.entryTime).utc().toISOString();
	return clean;
}
