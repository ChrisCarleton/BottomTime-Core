import { badRequest } from '../utils/error-response';
import config from '../config';
import crypto from 'crypto';
import fs from 'fs';
import LogEntryImage from '../data/log-entry-images';
import moment from 'moment';
import multi from 'multi-write-stream';
import path from 'path';
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

export function ListImages(req, res) {
	res.sendStatus(501);
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
	const checksumStream = crypto.createHash('sha256');

	let imagePath = null;
	let imageExtension = null;
	let thumbnailPath = null;

	req.busboy.on('file', (fieldname, stream, filename) => {
		if (fieldname !== 'image') {
			return stream.resume();
		}

		try {
			// We need to split the file stream up across several other streams
			const parsedPath = path.parse(filename);
			imageExtension = parsedPath.ext;
			imagePath = path.resolve(ImageDir, `${ uploadId }${ parsedPath.ext }`);
			thumbnailPath = path.resolve(ImageDir, `${ uploadId }-thumb${ parsedPath.ext }`);

			const imageFile = fs.createWriteStream(imagePath);

			// Save the file and compute the checksum at the same time.
			const multiStream = multi([
				imageFile,
				checksumStream
			]);

			stream.pipe(multiStream);
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
			await sharp(imagePath)
				.resize(150, 150)
				.toFile(thumbnailPath);

			const metadata = new LogEntryImage({
				checksum: checksumStream.digest('hex'),
				extension: imageExtension,
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
					Key: path.join(
						'images',
						req.account.username,
						`${ metadata.checksum }${ metadata.extension }`
					),
					Body: fs.createReadStream(imagePath)
				}).promise(),
				storage.upload({
					Bucket: config.mediaBucket,
					Key: path.join(
						'images',
						req.account.username,
						`${ metadata.checksum }-thumb${ metadata.extension }`
					),
					Body: fs.createReadStream(thumbnailPath)
				}).promise()
			]);
			res.json(metadata.toCleanJSON());
		} catch (err) {
			console.error(err);
			process.exit(1);
			res.status(500).json(err);
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
	res.sendStatus(501);
}

export function UpdateImageDetails(req, res) {
	res.sendStatus(501);
}

export function DeleteImage(req, res) {
	res.sendStatus(501);
}
