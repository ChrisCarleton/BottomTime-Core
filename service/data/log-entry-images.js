import moment from 'moment';
import mongoose from './database';

const logEntryImagesSchema = mongoose.Schema({
	contentType: {
		type: String,
		required: true
	},
	awsS3Key: {
		type: String,
		required: true,
		unique: true
	},
	awsS3ThumbKey: {
		type: String,
		required: true,
		unique: true
	},
	logEntry: {
		type: mongoose.SchemaTypes.ObjectId,
		ref: 'LogEntry',
		indexed: true,
		required: true
	},
	title: String,
	description: String,
	location: {
		type: [ Number ],
		index: '2dsphere'
	},
	timestamp: Date
});

logEntryImagesSchema.methods.toCleanJSON = function () {
	const json = {
		imageId: this.id,
		title: this.title,
		description: this.description
	};

	if (this.timestamp) {
		json.timestamp = moment(this.timestamp).utc().toISOString();
	}

	if (this.location) {
		json.location = {
			lon: this.location[0],
			lat: this.location[1]
		};
	}

	return json;
};

logEntryImagesSchema.methods.assign = function (entity) {
	this.title = entity.title;
	this.description = entity.description;

	if (entity.timestamp) {
		this.timestamp = moment(entity.timestamp).toDate();
	} else {
		this.timestamp = null;
	}

	if (entity.location) {
		this.location = [
			entity.location.lon,
			entity.location.lat
		];
	} else {
		this.location = null;
	}
};

// logEntryImagesSchema.methods.getImageUrl = function () {
// 	const { checksum, extension } = this;
// 	return new Promise((resolve, reject) => {
// 		storage.getSignedUrl(
// 			'getObject', {
// 				Bucket: config.mediaBucket,
// 				Key: `${ checksum }.${ extension }`,
// 				Expires: 7200
// 			}, (err, url) => {
// 				if (err) {
// 					return reject(err);
// 				}

// 				resolve(url);
// 			});
// 	});
// };

// logEntryImagesSchema.methods.getThumbnailUrl = function () {
// 	const { checksum, extension } = this;
// 	return new Promise((resolve, reject) => {
// 		storage.getSignedUrl(
// 			'getObject', {
// 				Bucket: config.mediaBucket,
// 				Key: `${ checksum }-thumb.${ extension }`,
// 				Expires: 7200
// 			}, (err, url) => {
// 				if (err) {
// 					return reject(err);
// 				}

// 				resolve(url);
// 			});
// 	});
// };

export default mongoose.model('LogEntryImage', logEntryImagesSchema);
