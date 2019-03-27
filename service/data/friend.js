import mongoose from './database';

const friendSchema = mongoose.Schema({
	user: {
		type: String,
		required: true,
		index: true
	},
	friend: {
		type: String,
		required: true,
		index: true
	},
	approved: {
		type: Boolean,
		required: true
	},
	requestedOn: Date,
	approvedOn: Date
});

friendSchema.statics.getFriendsForUser = function (username, approved, done) {
	const query = {
		user: username
	};

	if (typeof (approved) === 'boolean') {
		query.approved = approved;
	}

	return this
		.find(query, done)
		.sort('friend')
		.exec();
};

friendSchema.methods.toCleanJSON = function () {
	const clean = this.toJSON();
	delete clean._id;
	delete clean.__v;
	return clean;
};

export default mongoose.model('Friend', friendSchema);
