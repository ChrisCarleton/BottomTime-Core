import mongoose from './database';

const sessionSchema = mongoose.Schema({
	username: {
		type: String,
		index: true
	},
	expires: {
		type: Number,
		index: true
	},
	device: String
});

export default mongoose.model('Session', sessionSchema);
