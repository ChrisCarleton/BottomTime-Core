import mongoose from './database';

const logEntrySchema = mongoose.Schema({
	entryTime: Date,
	location: String,
	site: String,
	gps:{
		latitude: Number,
		longitude: Number
	},
	bottomTime: Number,
	totalTime: Number,
	maxDepth: Number,
	averageDepth: Number
});

export default mongoose.model('LogEntry', logEntrySchema);
