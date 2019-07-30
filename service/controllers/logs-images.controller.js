import { badRequest, serverError, notFound } from '../utils/error-response';
import config from '../config';
import fs from 'fs';
import LogEntryImage from '../data/log-entry-images';
import mime from 'mime-types';
import moment from 'moment';
import path from 'path';
import slug from 'slug';
import sharp from 'sharp';
import uuid from 'uuid/v4';
import storage from '../storage';

const ImageDir = path.resolve(config.tempDir, 'media/images/');

function safeDeleteFile(filePath, logError) {
	return new Promise(resolve => {
		fs.unlink(filePath, err => {
			if (err) {
				logError(`Failed to delete file "${ filePath }"`, err);
			}

			resolve();
		});
	});
}

export async function ListImages(req, res) {
	try {
		const results = await LogEntryImage.find({
			logEntry: req.logEntry._id
		});

		res.json(results.map(r => r.toCleanJSON()));
	} catch (err) {
		const logId = req.logError(`Failed to list images for log entry ${ req.params.logId }`, err);
		serverError(res, logId);
	}
}

export function AddImage(req, res) {
	if (!req.busboy) {
		return badRequest(
			'Unable to complete request. Form was empty.',
			'Expected multi-part form submission with an attached image file. See API documentation for details.',
			res
		);
	}

	const uploadId = uuid();
	const imageInfo = {};

	let imagePath = null;
	let thumbnailPath = null;
	let imageExtension = null;
	let imageFileName = null;
	let mimeType = null;

	req.busboy.on('file', (fieldname, stream, filename) => {
		if (fieldname !== 'image') {
			return stream.resume();
		}

		try {
			// We need to split the file stream up across several other streams
			const parsedPath = path.parse(filename);
			imageExtension = parsedPath.ext;
			imageFileName = parsedPath.name;
			mimeType = mime.lookup(imageExtension);
			imagePath = path.resolve(ImageDir, `${ uploadId }${ parsedPath.ext }`);
			thumbnailPath = path.resolve(ImageDir, `${ uploadId }-thumb${ parsedPath.ext }`);

			const imageFile = fs.createWriteStream(imagePath);
			stream.pipe(imageFile);
		} catch (err) {
			req.logError('An error occured processing the file stream', err);
		}
	});

	req.busboy.on('error', err => {
		req.logError('An error occured processing the file stream', err);
	});

	req.busboy.on('field', (key, value) => {
		imageInfo[key] = value;
	});

	req.busboy.on('finish', async () => {
		if (!imagePath) {
			return badRequest(
				'Missing image file.',
				'An image file must be provided with this request. See API documentation for details.',
				res
			);
		}

		try {
			const fileSlug = slug(imageInfo.title || imageFileName, { lower: true });
			const imageKey = path.join(
				req.account.username,
				req.logEntry.id,
				'images',
				`${ fileSlug }${ imageExtension }`
			);
			const thumbnailKey = path.join(
				req.account.username,
				req.logEntry.id,
				'images',
				`${ fileSlug }-thumb${ imageExtension }`
			);

			await sharp(imagePath)
				.resize(150, 150)
				.toFile(thumbnailPath);

			const metadata = new LogEntryImage({
				awsS3Key: imageKey,
				awsS3ThumbKey: thumbnailKey,
				contentType: mimeType,
				logEntry: req.logEntry._id,
				title: imageInfo.title,
				description: imageInfo.description
			});

			if (imageInfo.timestamp) {
				metadata.timestamp = moment(imageInfo.timestamp).toDate();
			}

			if (imageInfo.lat && imageInfo.lon) {
				metadata.location = [
					parseFloat(imageInfo.lon),
					parseFloat(imageInfo.lat)
				];
			}

			await Promise.all([
				metadata.save(),
				storage.upload({
					Bucket: config.mediaBucket,
					Key: imageKey,
					Body: fs.createReadStream(imagePath),
					ContentType: mimeType
				}).promise(),
				storage.upload({
					Bucket: config.mediaBucket,
					Key: thumbnailKey,
					Body: fs.createReadStream(thumbnailPath),
					ContentType: mimeType
				}).promise()
			]);
			res.json(metadata.toCleanJSON());
		} catch (err) {
			const logId = req.logError('Failed to add image to log entry', err);
			serverError(res, logId);
		} finally {
			// Clean up temp files.
			await Promise.all([
				safeDeleteFile(imagePath),
				safeDeleteFile(thumbnailPath)
			]);
		}
	});

	req.pipe(req.busboy);
}

export function GetImageDetails(req, res) {
	res.json(req.imageMetadata.toCleanJSON());
}

export function UpdateImageDetails(req, res) {
	res.sendStatus(501);
}

export async function DeleteImage(req, res) {
	try {
		await Promise.all([
			storage.deleteObject({
				Bucket: config.mediaBucket,
				Key: req.imageMetadata.awsS3Key
			}).promise(),
			storage.deleteObject({
				Bucket: config.mediaBucket,
				Key: req.imageMetadata.awsS3ThumbKey
			}).promise()
		]);
		await req.imageMetadata.remove();
		res.sendStatus(200);
	} catch (err) {
		const logId = req.logError(`Failed to delete image with ID ${ req.params.imageId }.`, err);
		serverError(res, logId);
	}
}

export async function RetrieveLogEntryImage(req, res, next) {
	try {
		req.imageMetadata = await LogEntryImage.findOne({
			_id: req.params.imageId,
			logEntry: req.params.logId
		});

		if (!req.imageMetadata) {
			return notFound(req, res);
		}

		return next();
	} catch (err) {
		const logId = req.logError(
			`Failed to retrieve image metadata for image with ID ${ req.params.imageId }`,
			err);
		return serverError(res, logId);
	}
}

export async function DownloadImage(req, res) {
	try {
		const signedUrl = req.params.imageType === 'image'
			? await req.imageMetadata.getImageUrl()
			: await req.imageMetadata.getThumbnailUrl();
		res.redirect(302, signedUrl);
	} catch (err) {
		const logId = req.logError(
			`Failed to get signed URL for image with ID ${ req.params.imageId }.`,
			err
		);
		serverError(res, logId);
	}
}
