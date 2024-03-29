import { badRequest, conflict, notFound, serverError } from '../utils/error-response';
import config from '../config';
import fs from 'fs';
import { ImageMetadataSchema } from '../validation/log-entry-image';
import LogEntryImage from '../data/log-entry-images';
import moment from 'moment';
import path from 'path';
import sharp from 'sharp';
import slug from 'slug';
import storage from '../storage';
import { v4 as uuid } from 'uuid';

const ImageDir = path.resolve(config.tempDir, 'media/images/');
const ImageMimeTypeRegex = /^image\/(jpeg|png|tiff)$/i;
const DefaultStorageClass = 'STANDARD';

function safeDeleteFile(filePath, logError) {
	if (!filePath) {
		return Promise.resolve();
	}

	return new Promise(resolve => {
		fs.unlink(filePath, err => {
			if (err) {
				logError(`Failed to delete file "${ filePath }"`, err);
			}

			resolve();
		});
	});
}

async function headObject(key) {
	try {
		const result = await storage.headObject({
			Bucket: config.mediaBucket,
			Key: key
		}).promise();

		return result;
	} catch (err) {
		if (err.code === 'NotFound') {
			return null;
		}

		throw err;
	}
}

function validateImageUpload(res, imagePath, imageInfo) {
	if (!imagePath) {
		badRequest(
			'Missing image file.',
			'An image file must be provided with this request. See API documentation for details.',
			res
		);
		return false;
	}

	const { error } = ImageMetadataSchema.validate(imageInfo);
	if (error) {
		badRequest(
			'Unable to add image. Metadata validation failed',
			error,
			res
		);
		return false;
	}

	return true;
}

async function imageUploadHasConflict(res, imageKey, thumbnailKey) {
	const [ imageHead, thumbHead ] = await Promise.all([
		headObject(imageKey),
		headObject(thumbnailKey)
	]);

	if (imageHead || thumbHead) {
		conflict(
			res,
			'title',
			'Image key already exists. Please choose another title and try again.'
		);
		return true;
	}

	return false;
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
	let failed = false;

	req.log.debug(`Enforcing max file size: ${ config.maxImageFileSize } bytes.`);
	req.busboy.on('file', (fieldname, stream, filename, encoding, fileType) => {
		if (fieldname !== 'image') {
			badRequest(
				`Invalid file field provided: ${ filename }.`,
				'The attached image must appear under the field name "image".',
				res
			);
			failed = true;
			return stream.resume();
		}

		if (!ImageMimeTypeRegex.test(fileType)) {
			badRequest(
				`Invalid file type submitted: ${ fileType }.`,
				'The attached image file must be in one of the following formats: .JPG, .PNG, or .TIFF.',
				res
			);
			failed = true;
			return stream.resume();
		}

		stream.on('limit', () => {
			// File exceeded size limit. Abort and return an error.
			req.log.info('Uploaded image was rejected because the file was too large.');
			badRequest(
				'Provided image file was too large.',
				`Maximum file size is ${ config.maxImageFileSize } bytes. `
					+ 'Try reducing image quality or resizing and then re-attempt the upload.',
				res
			);
			failed = true;
		});

		try {
			const parsedPath = path.parse(filename);
			imageExtension = parsedPath.ext;
			imageFileName = parsedPath.name;
			mimeType = fileType;
			imagePath = path.resolve(ImageDir, `${ uploadId }${ parsedPath.ext }`);
			thumbnailPath = path.resolve(ImageDir, `${ uploadId }-thumb${ parsedPath.ext }`);

			const imageFile = fs.createWriteStream(imagePath);
			stream.pipe(imageFile);
		} catch (err) {
			const logId = req.logError('An error occured processing the file stream', err);
			serverError(res, logId);
			failed = true;
		}
	});

	req.busboy.on('error', err => {
		const logId = req.logError('An error occured processing the file stream', err);
		serverError(res, logId);
		failed = true;
	});

	req.busboy.on('field', (key, value) => {
		if (key === 'lat' || key === 'lon') {
			imageInfo.location = imageInfo.location || {};
			imageInfo.location[key] = value;
		} else {
			imageInfo[key] = value;
		}
	});

	req.busboy.on('finish', async () => {
		try {
			if (failed || !validateImageUpload(res, imagePath, imageInfo)) {
				return;
			}

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

			if (await imageUploadHasConflict(res, imageKey, thumbnailKey)) {
				return;
			}

			await sharp(imagePath)
				.resize(150, 150)
				.toFile(thumbnailPath);

			const metadata = new LogEntryImage({
				awsS3Key: imageKey,
				awsS3ThumbKey: thumbnailKey,
				contentType: mimeType,
				logEntry: req.logEntry._id,
				title: imageInfo.title || fileSlug,
				description: imageInfo.description
			});

			if (imageInfo.timestamp) {
				metadata.timestamp = moment(imageInfo.timestamp).toDate();
			}

			if (imageInfo.location) {
				metadata.location = [
					parseFloat(imageInfo.location.lon),
					parseFloat(imageInfo.location.lat)
				];
			}

			await Promise.all([
				storage.upload({
					Bucket: config.mediaBucket,
					Key: imageKey,
					Body: fs.createReadStream(imagePath),
					ContentType: mimeType,
					StorageClass: DefaultStorageClass
				}).promise(),
				storage.upload({
					Bucket: config.mediaBucket,
					Key: thumbnailKey,
					Body: fs.createReadStream(thumbnailPath),
					ContentType: mimeType,
					StorageClass: DefaultStorageClass
				}).promise()
			]);
			await metadata.save();

			res.json(metadata.toCleanJSON());
		} catch (err) {
			const logId = req.logError('Failed to add image to log entry', err);
			serverError(res, logId);
		} finally {
			// Clean up temp files.
			await Promise.all([
				safeDeleteFile(imagePath, req.logError),
				safeDeleteFile(thumbnailPath, req.logError)
			]);
		}
	});

	req.pipe(req.busboy);
}

export function GetImageDetails(req, res) {
	res.json(req.imageMetadata.toCleanJSON());
}

export async function UpdateImageDetails(req, res) {
	const { error } = ImageMetadataSchema.validate(req.body);
	if (error) {
		return badRequest(
			'Unable to update image metadata because validation failed',
			error,
			res);
	}

	try {
		req.imageMetadata.assign(req.body || {});
		await req.imageMetadata.save();
		res.json(req.imageMetadata.toCleanJSON());
	} catch (err) {
		const logId = req.logError(
			`Failed to update image metadata for image with ID ${ req.params.imageId }`,
			err);
		serverError(res, logId);
	}
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
