import mongoose from './database';

const sessionSchema = mongoose.Schema({
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
