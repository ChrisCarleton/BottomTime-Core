import moment from 'moment';
import mongoose from './database';

const logEntrySchema = mongoose.Schema({
	userId: {
		type: mongoose.Schema.Types.ObjectId,
		required: true,
		index: true
	},
	diveNumber: Number,
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
	surfaceInterval: Number,
	maxDepth: Number,
	averageDepth: Number,
	air: {
		in: Number,
		out: Number,
		doubles: Boolean,
		volume: Number,
		volumeUnit: String,
		material: String,
		oxygen: Number,
		helium: Number
	},
	decoStops: [
		{
			depth: Number,
			duration: Number
		}
	],
	weight: {
		amount: Number,
		correctness: String,
		trim: String
	},
	temperature: {
		surface: Number,
		water: Number,
		thermoclines: [ Number ]
	},
	tags: [ String ],
	comments: String
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
	entity.diveNumber = newLogEntry.diveNumber;
	entity.bottomTime = newLogEntry.bottomTime;
	entity.totalTime = newLogEntry.totalTime;
	entity.location = newLogEntry.location;
	entity.site = newLogEntry.site;
	entity.surfaceInterval = newLogEntry.surfaceInterval;
	entity.averageDepth = newLogEntry.averageDepth;
	entity.maxDepth = newLogEntry.maxDepth;
	entity.gps = newLogEntry.gps;
	entity.weight = newLogEntry.weight;
	entity.air = newLogEntry.air;
	entity.temperature = newLogEntry.temperature;
	entity.tags = newLogEntry.tags;
	entity.comments = newLogEntry.comments;
	entity.decoStops = newLogEntry.decoStops;
}
