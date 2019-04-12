import mongoose from './database';

const sessionSchema = new mongoose.Schema({
	username: {
		type: String,
		index: true,
		required: true
	},
	expires: {
		type: Date,
		index: true,
		sparse: true
	},
	device: String
});

export default mongoose.model('Session', sessionSchema);
