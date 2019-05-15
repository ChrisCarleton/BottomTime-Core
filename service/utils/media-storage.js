import config from '../config';
import storage from '../storage';

const Bucket = config.mediaBucket;

export default {
	uploadImage: async (stream, key, mimeType) => {
		const upload = await storage.upload({
			Bucket,
			Key: key,
			Body: stream,
			ContentType: mimeType
		}).promise();

		return upload;
	},

	deleteImage: async key => {

	},

	// Links expire after 15 minutes
	getLinkToImage: async key => {
		const url = await storage.getSignedUrl('getObject', {
			Bucket,
			Key: key,
			Expires: 900
		}).promise();

		return url;
	}
};
