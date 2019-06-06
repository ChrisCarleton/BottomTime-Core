import _ from 'lodash';
import mongoose from './database';

const siteRatingSchema = mongoose.Schema({
	user: {
		type: String,
		required: true,
		index: true
	},
	diveSite: {
		type: mongoose.SchemaTypes.ObjectId,
		ref: 'Site'
	},
	date: {
		type: Date,
		required: true,
		index: true
	},
	rating: {
		type: Number,
		required: true,
		index: true
	},
	comments: String
});

siteRatingSchema.methods.toCleanJSON = function () {
	const clean = {
		ratingId: this.id,
		..._.pick(this, [
			'user',
			'date',
			'rating',
			'comments'
		])
	};

	return clean;
};

export default mongoose.model('SiteRating', siteRatingSchema);
