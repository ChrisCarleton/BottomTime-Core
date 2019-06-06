import _ from 'lodash';
import moment from 'moment';
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
			'rating',
			'comments'
		]),
		date: moment(this.date).utc().toISOString()
	};

	return clean;
};

export default mongoose.model('SiteRating', siteRatingSchema);
