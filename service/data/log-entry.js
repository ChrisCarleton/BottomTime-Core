import moment from 'moment';
import mongoose from './database';

const logEntrySchema = mongoose.Schema({
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

export default mongoose.model('LogEntry', logEntrySchema);

export function assignLogEntry(entity, newLogEntry) {
	entity.entryTime = newLogEntry.entryTime;
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
	delete clean._id;
	delete clean.__v;
	clean.entryTime = moment(entry.entryTime).utc().toISOString();
	return clean;
}
