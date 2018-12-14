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
