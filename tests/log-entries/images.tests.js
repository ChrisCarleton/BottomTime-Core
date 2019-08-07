import { App } from '../../service/server';
import config from '../../service/config';
import createFakeAccount from '../util/create-fake-account';
import { expect } from 'chai';
import fakeLogEntry, { toLogEntry } from '../util/fake-log-entry';
import fakeLogEntryImage, { toLogEntryImage } from '../util/fake-log-entry-image';
import fakeMongoId from '../util/fake-mongo-id';
import fs from 'fs';
import LogEntry from '../../service/data/log-entry';
import LogEntryImage from '../../service/data/log-entry-images';
import moment from 'moment';
import path from 'path';
import request from 'supertest';
import Session from '../../service/data/session';
import sinon from 'sinon';
import storage from '../../service/storage';
import User from '../../service/data/user';
import url from 'url';

const ImagePaths = [
	path.resolve(__dirname, '../assets/diver.jpg'),
	path.resolve(__dirname, '../assets/diver-thumb.jpg'),
	path.resolve(__dirname, '../assets/turtle.jpg'),
	path.resolve(__dirname, '../assets/reef.jpg')
];

const ImageSize = 122739;
const ThumbnailSize = 5768;

function imagesRoute(username, logEntryId) {
	return `/users/${ username }/logs/${ logEntryId }/images`;
}

function imageRoute(username, logEntryId, imageId) {
	return `${ imagesRoute(username, logEntryId) }/${ imageId }`;
}

function downloadRoute(username, logEntryId, imageId, thumbnail = false) {
	return `${ imageRoute(username, logEntryId, imageId) }/${ thumbnail ? 'thumbnail' : 'image' }`;
}

function validateImageMetadata(img) {
	expect(img.imageId).to.match(/^[0-9a-f]{24}$/);
	expect(img.title).to.exist;
	expect(img.description).to.exist;
	expect(moment(img.timestamp).isValid()).to.be.true;
	expect(img.location.lon).to.be.a('number');
	expect(img.location.lat).to.be.a('number');
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

describe('Log Entry Images', () => {
	let adminAccount = null;
	let publicAccount = null;
	let friendsOnlyAccount = null;

	let publicLogEntry = null;
	let friendsOnlyLogEntry = null;

	let stub = null;

	before(async () => {
		[ adminAccount, publicAccount, friendsOnlyAccount ] = await Promise.all([
			createFakeAccount('admin'),
			createFakeAccount('user', 'public'),
			createFakeAccount('user', 'friends-only')
		]);

		publicLogEntry = toLogEntry(fakeLogEntry(publicAccount.user.id));
		friendsOnlyLogEntry = toLogEntry(fakeLogEntry(friendsOnlyAccount.user.id));
		await LogEntry.insertMany([ publicLogEntry, friendsOnlyLogEntry ]);
	});

	afterEach(() => {
		if (stub) {
			stub.restore();
			stub = null;
		}
	});

	after(async () => {
		await Promise.all([
			LogEntry.deleteMany({}),
			LogEntryImage.deleteMany({}),
			User.deleteMany({}),
			Session.deleteMany({})
		]);
	});

	describe('GET /users/:userName/logs/:logId/images', () => {
		const fakes = new Array(100);
		const entities = new Array(100);

		before(async () => {
			for (let i = 0; i < 70; i++) {
				fakes[i] = fakeLogEntryImage();
				entities[i] = toLogEntryImage(fakes[i], friendsOnlyLogEntry.id);
			}

			for (let i = 70; i < 100; i++) {
				fakes[i] = fakeLogEntryImage();
				entities[i] = toLogEntryImage(fakes[i], publicLogEntry.id);
			}

			await LogEntryImage.insertMany(entities);
		});

		after(async () => {
			await LogEntryImage.deleteMany({});
		});

		it('Will retrieve a list of images for the specified log entry', async () => {
			const { body } = await request(App)
				.get(imagesRoute(friendsOnlyAccount.user.username, friendsOnlyLogEntry.id))
				.set(...friendsOnlyAccount.authHeader)
				.expect(200);

			expect(body).to.be.an('array').and.to.have.a.lengthOf(70);

			body.forEach(img => {
				validateImageMetadata(img);
			});
		});

		it('Will return 404 if username is not found', async () => {
			const { body } = await request(App)
				.get(imagesRoute('mystery_user', friendsOnlyLogEntry.id))
				.set(...friendsOnlyAccount.authHeader)
				.expect(404);

			expect(body).to.be.a.notFoundResponse;
		});

		it('Will return 404 if log entry is not found', async () => {
			const { body } = await request(App)
				.get(imagesRoute(friendsOnlyAccount.user.username, fakeMongoId()))
				.set(...friendsOnlyAccount.authHeader)
				.expect(404);

			expect(body).to.be.a.notFoundResponse;
		});

		it('Will return 500 if a server error occurs', async () => {
			stub = sinon.stub(LogEntryImage.prototype, 'toCleanJSON');
			stub.throws(new Error('nope'));

			const { body } = await request(App)
				.get(imagesRoute(friendsOnlyAccount.user.username, friendsOnlyLogEntry.id))
				.set(...friendsOnlyAccount.authHeader)
				.expect(500);

			expect(body).to.be.a.serverErrorResponse;
		});
	});

	describe('POST /users/:userName/logs/:logId/images', () => {
		const Title = 'Diver at Surface';
		const Description = 'He looks very wet';
		const Timestamp = new Date().toISOString();
		const Lat = 43.3588333;
		const Lon = -80.0207417;

		afterEach(async () => {
			const { Contents } = await storage
				.listObjectsV2({ Bucket: config.mediaBucket })
				.promise();

			await Promise.all([
				// TODO: Figure out why the deleteObjects call doesn't work.
				// storage.deleteObjects({
				// 	Bucket: config.mediaBucket,
				// 	Delete: {
				// 		Objects: Contents.map(obj => ({ Key: obj.Key }))
				// 	}
				// }).promise(),
				...Contents.map(obj => storage.deleteObject({
					Bucket: config.mediaBucket,
					Key: obj.Key
				}).promise()),
				LogEntryImage.deleteMany({})
			]);
		});

		it('Will post a new image to the log entry along with a thumbnail', async () => {
			const { body } = await request(App)
				.post(imagesRoute(friendsOnlyAccount.user.username, friendsOnlyLogEntry.id))
				.set(...friendsOnlyAccount.authHeader)
				.field('title', Title)
				.field('description', Description)
				.field('timestamp', Timestamp)
				.field('lat', Lat)
				.field('lon', Lon)
				.attach('image', ImagePaths[0])
				.expect(200);

			// Correct response from API.
			expect(body).to.exist;
			expect(body.imageId).to.exist;
			expect(body.title).to.equal(Title);
			expect(body.description).to.equal(Description);
			expect(body.timestamp).to.equal(Timestamp);
			expect(body.location).to.eql({ lat: Lat, lon: Lon });

			// Image metadata saved to database.
			const saved = await LogEntryImage.findById(body.imageId);
			expect(saved).to.exist;
			expect(saved.contentType).to.equal('image/jpeg');
			expect(saved.logEntry.toString()).to.equal(friendsOnlyLogEntry.id);
			expect(saved.title).to.equal(Title);
			expect(saved.description).to.equal(Description);
			expect(saved.location).to.eql([ Lon, Lat ]);
			expect(saved.timestamp.toISOString()).to.equal(Timestamp);
			expect(saved.logEntry).to.eql(friendsOnlyLogEntry._id);

			// Image and thumbnail stored in S3.
			const [ image, thumbnail ] = await Promise.all([
				storage.headObject({ Bucket: config.mediaBucket, Key: saved.awsS3Key }).promise(),
				storage.headObject({ Bucket: config.mediaBucket, Key: saved.awsS3ThumbKey }).promise()
			]);

			expect(image).to.exist;
			expect(image.ContentLength).to.equal(ImageSize);

			expect(thumbnail).to.exist;
			expect(thumbnail.ContentLength).to.equal(ThumbnailSize);
		});

		it('Will derive title from filename if missing', async () => {
			const expectedTitle = 'turtle';
			const { body } = await request(App)
				.post(imagesRoute(friendsOnlyAccount.user.username, friendsOnlyLogEntry.id))
				.set(...friendsOnlyAccount.authHeader)
				.attach('image', ImagePaths[2])
				.expect(200);

			// Correct response from API.
			expect(body).to.exist;
			expect(body.imageId).to.exist;
			expect(body.title).to.equal(expectedTitle);

			// Image metadata saved to database.
			const saved = await LogEntryImage.findById(body.imageId);
			expect(saved).to.exist;
			expect(saved.contentType).to.equal('image/jpeg');
			expect(saved.logEntry.toString()).to.equal(friendsOnlyLogEntry.id);
			expect(saved.title).to.equal(expectedTitle);
		});

		it('Will return 400 if there is a problem with the request form', async () => {
			const { body } = await request(App)
				.post(imagesRoute(friendsOnlyAccount.user.username, friendsOnlyLogEntry.id))
				.set(...friendsOnlyAccount.authHeader)
				.field('title', Title)
				.field('description', Description)
				.field('timestamp', 'Yesterday')
				.field('lat', 'north')
				.field('lon', Lon)
				.attach('image', ImagePaths[0])
				.expect(400);

			expect(body).to.be.a.badRequestResponse;
		});

		it('Will return 400 if the image is missing', async () => {
			const { body } = await request(App)
				.post(imagesRoute(friendsOnlyAccount.user.username, friendsOnlyLogEntry.id))
				.set(...friendsOnlyAccount.authHeader)
				.field('title', 'Lol')
				.expect(400);

			expect(body).to.be.a.badRequestResponse;
		});

		it('Will return 400 if the request body is empty', async () => {
			const { body } = await request(App)
				.post(imagesRoute(friendsOnlyAccount.user.username, friendsOnlyLogEntry.id))
				.set(...friendsOnlyAccount.authHeader)
				.expect(400);

			expect(body).to.be.a.badRequestResponse;
		});

		it('Will return 400 if the image is too large', async () => {
			const { body } = await request(App)
				.post(imagesRoute(friendsOnlyAccount.user.username, friendsOnlyLogEntry.id))
				.set(...friendsOnlyAccount.authHeader)
				.field('title', Title)
				.field('description', Description)
				.field('timestamp', Timestamp)
				.field('lat', Lat)
				.field('lon', Lon)
				.attach('image', ImagePaths[3])
				.expect(400);

			expect(body).to.be.a.badRequestResponse;
		});

		it('Will return 400 if the image cannot be read', async () => {
			const { body } = await request(App)
				.post(imagesRoute(friendsOnlyAccount.user.username, friendsOnlyLogEntry.id))
				.set(...friendsOnlyAccount.authHeader)
				.field('title', Title)
				.field('description', Description)
				.field('timestamp', Timestamp)
				.field('lat', Lat)
				.field('lon', Lon)
				.attach('image', path.resolve(__dirname, 'searching.tests.js'))
				.expect(400);

			expect(body).to.be.a.badRequestResponse;
		});

		it('Will return 400 if another file is provided under an invalid field name', async () => {
			const { body } = await request(App)
				.post(imagesRoute(friendsOnlyAccount.user.username, friendsOnlyLogEntry.id))
				.set(...friendsOnlyAccount.authHeader)
				.field('title', Title)
				.field('description', Description)
				.field('timestamp', Timestamp)
				.field('lat', Lat)
				.field('lon', Lon)
				.attach('image', ImagePaths[0])
				.attach('not_image', ImagePaths[1])
				.expect(400);

			expect(body).to.be.a.badRequestResponse;
		});

		it('Will return 401 if user is unauthenticated', async () => {
			const { body } = await request(App)
				.post(imagesRoute(friendsOnlyAccount.user.username, friendsOnlyLogEntry.id))
				.field('title', Title)
				.field('description', Description)
				.field('timestamp', Timestamp)
				.field('lat', Lat)
				.field('lon', Lon)
				.attach('image', ImagePaths[0])
				.expect(401);

			expect(body).to.be.an.unauthorizedResponse;
		});

		it('Will return 403 if user does not own the log book', async () => {
			const { body } = await request(App)
				.post(imagesRoute(publicAccount.user.username, publicLogEntry.id))
				.set(...friendsOnlyAccount.authHeader)
				.field('title', Title)
				.field('description', Description)
				.field('timestamp', Timestamp)
				.field('lat', Lat)
				.field('lon', Lon)
				.attach('image', ImagePaths[0])
				.expect(403);

			expect(body).to.be.a.forbiddenResponse;
		});

		it('Will allow administrators to post images to other users\' log entries', async () => {
			const title = 'An Admin Was Here';
			const { body } = await request(App)
				.post(imagesRoute(friendsOnlyAccount.user.username, friendsOnlyLogEntry.id))
				.set(...adminAccount.authHeader)
				.field('title', title)
				.field('description', Description)
				.field('timestamp', Timestamp)
				.field('lat', Lat)
				.field('lon', Lon)
				.attach('image', ImagePaths[0])
				.expect(200);

			// Correct response from API.
			expect(body).to.exist;
			expect(body.imageId).to.exist;
			expect(body.title).to.equal(title);
			expect(body.description).to.equal(Description);
			expect(body.timestamp).to.equal(Timestamp);
			expect(body.location).to.eql({ lat: Lat, lon: Lon });

			// Image metadata saved to database.
			const saved = await LogEntryImage.findById(body.imageId);
			expect(saved).to.exist;
			expect(saved.contentType).to.equal('image/jpeg');
			expect(saved.logEntry.toString()).to.equal(friendsOnlyLogEntry.id);
			expect(saved.title).to.equal(title);
			expect(saved.description).to.equal(Description);
			expect(saved.location).to.eql([ Lon, Lat ]);
			expect(saved.timestamp.toISOString()).to.equal(Timestamp);
			expect(saved.logEntry).to.eql(friendsOnlyLogEntry._id);

			// Image and thumbnail stored in S3.
			const [ image, thumbnail ] = await Promise.all([
				storage.headObject({ Bucket: config.mediaBucket, Key: saved.awsS3Key }).promise(),
				storage.headObject({ Bucket: config.mediaBucket, Key: saved.awsS3ThumbKey }).promise()
			]);

			expect(image).to.exist;
			expect(image.ContentLength).to.equal(ImageSize);

			expect(thumbnail).to.exist;
			expect(thumbnail.ContentLength).to.equal(ThumbnailSize);
		});

		it('Will return 404 if user is not found', async () => {
			const { body } = await request(App)
				.post(imagesRoute('fake_user', friendsOnlyLogEntry.id))
				.set(...friendsOnlyAccount.authHeader)
				.field('title', Title)
				.field('description', Description)
				.field('timestamp', Timestamp)
				.field('lat', Lat)
				.field('lon', Lon)
				.attach('image', ImagePaths[0])
				.expect(404);

			expect(body).to.be.a.notFoundResponse;
		});

		it('Will return 404 if log entry is not found', async () => {
			const { body } = await request(App)
				.post(imagesRoute(friendsOnlyAccount.user.username, fakeMongoId()))
				.set(...friendsOnlyAccount.authHeader)
				.field('title', Title)
				.field('description', Description)
				.field('timestamp', Timestamp)
				.field('lat', Lat)
				.field('lon', Lon)
				.attach('image', ImagePaths[0])
				.expect(404);

			expect(body).to.be.a.notFoundResponse;
		});

		it('Will return 409 if the S3 image key is already in use', async () => {
			const title = 'Cannot Be Duplicated';
			await request(App)
				.post(imagesRoute(friendsOnlyAccount.user.username, friendsOnlyLogEntry.id))
				.set(...friendsOnlyAccount.authHeader)
				.field('title', title)
				.field('description', Description)
				.field('timestamp', Timestamp)
				.field('lat', Lat)
				.field('lon', Lon)
				.attach('image', ImagePaths[0])
				.expect(200);

			const { body } = await request(App)
				.post(imagesRoute(friendsOnlyAccount.user.username, friendsOnlyLogEntry.id))
				.set(...friendsOnlyAccount.authHeader)
				.field('title', title)
				.field('description', Description)
				.field('timestamp', Timestamp)
				.field('lat', Lat)
				.field('lon', Lon)
				.attach('image', ImagePaths[0])
				.expect(409);

			expect(body).to.be.a.conflictResponse;
		});

		it('Will return 500 if a server error occurs', async () => {
			stub = sinon.stub(storage, 'upload');
			stub.returns({
				promise: () => Promise.reject(new Error('nope'))
			});

			const { body } = await request(App)
				.post(imagesRoute(friendsOnlyAccount.user.username, friendsOnlyLogEntry.id))
				.set(...friendsOnlyAccount.authHeader)
				.field('title', 'Gonna Fail')
				.field('description', Description)
				.field('timestamp', Timestamp)
				.field('lat', Lat)
				.field('lon', Lon)
				.attach('image', ImagePaths[0])
				.expect(500);

			expect(body).to.be.a.serverErrorResponse;
		});
	});

	describe('GET /users/:userName/logs/:logId/images/:imageId', () => {
		let imageMetadata = null;

		before(async () => {
			imageMetadata = toLogEntryImage(fakeLogEntryImage(), friendsOnlyLogEntry.id);
			await imageMetadata.save();
		});

		after(async () => {
			await imageMetadata.remove();
		});

		it('Will return image metadata', async () => {
			const { body } = await request(App)
				.get(imageRoute(friendsOnlyAccount.user.username, friendsOnlyLogEntry.id, imageMetadata.id))
				.set(...friendsOnlyAccount.authHeader)
				.expect(200);

			expect(body).to.eql(imageMetadata.toCleanJSON());
		});

		it('Will return 404 if the user cannot be found', async () => {
			const { body } = await request(App)
				.get(imageRoute('not_a_user', friendsOnlyLogEntry.id, imageMetadata.id))
				.set(...friendsOnlyAccount.authHeader)
				.expect(404);

			expect(body).to.be.a.notFoundResponse;
		});

		it('Will return 404 if the log entry cannot be found', async () => {
			const { body } = await request(App)
				.get(imageRoute(friendsOnlyAccount.user.username, fakeMongoId(), imageMetadata.id))
				.set(...friendsOnlyAccount.authHeader)
				.expect(404);

			expect(body).to.be.a.notFoundResponse;
		});

		it('Will return 404 if the image cannot be found', async () => {
			const { body } = await request(App)
				.get(imageRoute(friendsOnlyAccount.user.username, friendsOnlyLogEntry.id, fakeMongoId()))
				.set(...friendsOnlyAccount.authHeader)
				.expect(404);

			expect(body).to.be.a.notFoundResponse;
		});

		it('Will return 500 if a server error occurs', async () => {
			stub = sinon.stub(LogEntryImage, 'findOne');
			stub.rejects(new Error('nope'));

			const { body } = await request(App)
				.get(imageRoute(friendsOnlyAccount.user.username, friendsOnlyLogEntry.id, imageMetadata.id))
				.set(...friendsOnlyAccount.authHeader)
				.expect(500);

			expect(body).to.be.a.serverErrorResponse;
		});
	});

	describe('PUT /users/:userName/logs/:logId/images/:imageId', () => {
		let imageMetadata = null;

		before(async () => {
			imageMetadata = toLogEntryImage(fakeLogEntryImage(), friendsOnlyLogEntry.id);
			await imageMetadata.save();
		});

		after(async () => {
			await imageMetadata.remove();
		});

		it('Will update the image metadata and return the results', async () => {
			const update = fakeLogEntryImage();
			const { body } = await request(App)
				.put(imageRoute(friendsOnlyAccount.user.username, friendsOnlyLogEntry.id, imageMetadata.id))
				.set(...friendsOnlyAccount.authHeader)
				.send(update)
				.expect(200);

			const json = (await LogEntryImage.findById(imageMetadata._id)).toCleanJSON();
			update.imageId = json.imageId;
			expect(json).to.eql(body);
			expect(json).to.eql(update);
		});

		it('Will return 400 if the request body is invalid', async () => {
			const update = fakeLogEntryImage();
			update.timestamp = 'yesterday';

			const { body } = await request(App)
				.put(imageRoute(friendsOnlyAccount.user.username, friendsOnlyLogEntry.id, imageMetadata.id))
				.set(...friendsOnlyAccount.authHeader)
				.send(update)
				.expect(400);

			expect(body).to.be.a.badRequestResponse;
		});

		it('Will return 401 if user is not authenticated', async () => {
			const { body } = await request(App)
				.put(imageRoute(friendsOnlyAccount.user.username, friendsOnlyLogEntry.id, imageMetadata.id))
				.expect(401);

			expect(body).to.be.an.unauthorizedResponse;
		});

		it('Will return 403 if user does not own the log book entry', async () => {
			const { body } = await request(App)
				.put(imageRoute(friendsOnlyAccount.user.username, friendsOnlyLogEntry.id, imageMetadata.id))
				.set(...publicAccount.authHeader)
				.expect(403);

			expect(body).to.be.a.forbiddenResponse;
		});

		it('Will allow administrators to update other users\' entries', async () => {
			const update = fakeLogEntryImage();
			const { body } = await request(App)
				.put(imageRoute(friendsOnlyAccount.user.username, friendsOnlyLogEntry.id, imageMetadata.id))
				.set(...adminAccount.authHeader)
				.send(update)
				.expect(200);

			const json = (await LogEntryImage.findById(imageMetadata._id)).toCleanJSON();
			update.imageId = json.imageId;
			expect(json).to.eql(body);
			expect(json).to.eql(update);
		});

		it('Will return 404 if the user cannot be found', async () => {
			const update = fakeLogEntryImage();
			const { body } = await request(App)
				.put(imageRoute('fake_user', friendsOnlyLogEntry.id, imageMetadata.id))
				.set(...friendsOnlyAccount.authHeader)
				.send(update)
				.expect(404);

			expect(body).to.be.a.notFoundResponse;
		});

		it('Will return 404 if the log entry cannot be found', async () => {
			const update = fakeLogEntryImage();
			const { body } = await request(App)
				.put(imageRoute(friendsOnlyAccount.user.username, fakeMongoId(), imageMetadata.id))
				.set(...friendsOnlyAccount.authHeader)
				.send(update)
				.expect(404);

			expect(body).to.be.a.notFoundResponse;
		});

		it('Will return 404 if the image cannot be found', async () => {
			const update = fakeLogEntryImage();
			const { body } = await request(App)
				.put(imageRoute(friendsOnlyAccount.user.username, friendsOnlyLogEntry.id, fakeMongoId()))
				.set(...friendsOnlyAccount.authHeader)
				.send(update)
				.expect(404);

			expect(body).to.be.a.notFoundResponse;
		});

		it('Will return 500 if a server error occurs', async () => {
			stub = sinon.stub(LogEntryImage.prototype, 'save');
			stub.rejects(new Error('nope'));

			const update = fakeLogEntryImage();
			const { body } = await request(App)
				.put(imageRoute(friendsOnlyAccount.user.username, friendsOnlyLogEntry.id, imageMetadata.id))
				.set(...friendsOnlyAccount.authHeader)
				.send(update)
				.expect(500);

			expect(body).to.be.a.serverErrorResponse;
		});
	});

	describe('DELETE /users/:userName/logs/:logId/images/:imageId', () => {
		let imageMetadata = null;

		beforeEach(async () => {
			imageMetadata = toLogEntryImage(fakeLogEntryImage(), friendsOnlyLogEntry.id);

			await Promise.all([
				imageMetadata.save(),
				storage.upload({
					Bucket: config.mediaBucket,
					Key: imageMetadata.awsS3Key,
					Body: fs.createReadStream(ImagePaths[0]),
					ContentType: 'image/jpeg'
				}).promise(),
				storage.upload({
					Bucket: config.mediaBucket,
					Key: imageMetadata.awsS3ThumbKey,
					Body: fs.createReadStream(ImagePaths[1]),
					ContentType: 'image/jpeg'
				}).promise()
			]);
		});

		afterEach(async () => {
			if (stub) {
				stub.restore();
				stub = null;
			}

			await Promise.all([
				imageMetadata.remove(),
				storage.deleteObject({
					Bucket: config.mediaBucket,
					Key: imageMetadata.awsS3Key
				}).promise(),
				storage.deleteObject({
					Bucket: config.mediaBucket,
					Key: imageMetadata.awsS3ThumbKey
				}).promise()
			]);
		});

		it('Will delete the entry, image, and thumbnail image', async () => {
			await request(App)
				.delete(imageRoute(friendsOnlyAccount.user.username, friendsOnlyLogEntry.id, imageMetadata.id))
				.set(...friendsOnlyAccount.authHeader)
				.expect(200);

			const [ metadata, image, thumbnail ] = await Promise.all([
				LogEntryImage.findById(imageMetadata.id),
				headObject(imageMetadata.awsS3Key),
				headObject(imageMetadata.awsS3ThumbKey)
			]);
			expect(metadata).to.be.null;
			expect(image).to.be.null;
			expect(thumbnail).to.be.null;
		});

		it('Will return 401 if the user is not authenticated', async () => {
			const { body } = await request(App)
				.delete(imageRoute(friendsOnlyAccount.user.username, friendsOnlyLogEntry.id, imageMetadata.id))
				.expect(401);

			expect(body).to.be.a.unauthorizedResponse;
		});

		it('Will return 403 if the user does not own the log entry', async () => {
			const { body } = await request(App)
				.delete(imageRoute(friendsOnlyAccount.user.username, friendsOnlyLogEntry.id, imageMetadata.id))
				.set(...publicAccount.authHeader)
				.expect(403);

			expect(body).to.be.a.forbiddenResponse;
		});

		it('Will allow administrators to delete other users\' images', async () => {
			await request(App)
				.delete(imageRoute(friendsOnlyAccount.user.username, friendsOnlyLogEntry.id, imageMetadata.id))
				.set(...adminAccount.authHeader)
				.expect(200);

			const [ metadata, image, thumbnail ] = await Promise.all([
				LogEntryImage.findById(imageMetadata.id),
				headObject(imageMetadata.awsS3Key),
				headObject(imageMetadata.awsS3ThumbKey)
			]);
			expect(metadata).to.be.null;
			expect(image).to.be.null;
			expect(thumbnail).to.be.null;
		});

		it('Will return 404 if the user cannot be found', async () => {
			const { body } = await request(App)
				.delete(imageRoute('not_a_user', friendsOnlyLogEntry.id, imageMetadata.id))
				.set(...friendsOnlyAccount.authHeader)
				.expect(404);

			expect(body).to.be.a.notFoundResponse;
		});

		it('Will return 404 if the log entry cannot be found', async () => {
			const { body } = await request(App)
				.delete(imageRoute(friendsOnlyAccount.user.username, fakeMongoId(), imageMetadata.id))
				.set(...friendsOnlyAccount.authHeader)
				.expect(404);

			expect(body).to.be.a.notFoundResponse;
		});

		it('Will return 404 if the image cannot be found', async () => {
			const { body } = await request(App)
				.delete(imageRoute(publicAccount.user.username, publicLogEntry.id, fakeMongoId()))
				.set(...publicAccount.authHeader)
				.expect(404);

			expect(body).to.be.a.notFoundResponse;
		});

		it('Will return 500 if a server error occurs', async () => {
			stub = sinon.stub(storage, 'deleteObject');
			stub.returns({
				promise: () => Promise.reject(new Error('nope'))
			});

			const { body } = await request(App)
				.delete(imageRoute(friendsOnlyAccount.user.username, friendsOnlyLogEntry.id, imageMetadata.id))
				.set(...friendsOnlyAccount.authHeader)
				.expect(500);

			expect(body).to.be.a.serverErrorResponse;
		});
	});

	[ 'image', 'thumbnail' ].forEach(imageType => {
		describe(`GET /users/:userName/logs/:logId/images/:imageId/${ imageType }`, () => {
			let imageMetadata = null;
			let route = null;

			before(async () => {
				imageMetadata = toLogEntryImage(fakeLogEntryImage(), friendsOnlyLogEntry.id);
				await Promise.all([
					imageMetadata.save(),
					storage.upload({
						Bucket: config.mediaBucket,
						Key: imageMetadata.awsS3Key,
						Body: fs.createReadStream(ImagePaths[0]),
						ContentType: 'image/jpeg'
					}).promise(),
					storage.upload({
						Bucket: config.mediaBucket,
						Key: imageMetadata.awsS3ThumbKey,
						Body: fs.createReadStream(ImagePaths[1]),
						ContentType: 'image/jpeg'
					}).promise()
				]);
				route = downloadRoute(
					friendsOnlyAccount.user.username,
					friendsOnlyLogEntry.id,
					imageMetadata.id,
					imageType === 'thumbnail'
				);
			});

			after(async () => {
				await Promise.all([
					imageMetadata.remove(),
					storage.deleteObject({
						Bucket: config.mediaBucket,
						Key: imageMetadata.awsS3Key
					}).promise(),
					storage.deleteObject({
						Bucket: config.mediaBucket,
						Key: imageMetadata.awsS3ThumbKey
					}).promise()
				]);
			});

			it('Will redirect to the correct URL', async () => {
				const { header } = await request(App)
					.get(route)
					.set(...friendsOnlyAccount.authHeader)
					.expect(302);

				expect(header.location).to.exist;

				const parsedUrl = url.parse(header.location);
				expect(parsedUrl.host).to.equal(url.parse(config.s3Endpoint).host);
				expect(decodeURIComponent(parsedUrl.pathname)).to.equal(path.join(
					'/',
					config.mediaBucket,
					imageType === 'image'
						? imageMetadata.awsS3Key
						: imageMetadata.awsS3ThumbKey)
				);
			});

			it('Will return 403 if user is not authenticated and log book is not public', async () => {
				const { body } = await request(App)
					.get(route)
					.expect(403);

				expect(body).to.be.an.forbiddenResponse;
			});

			it('Will return 403 if user does not have access to the log book', async () => {
				const { body } = await request(App)
					.get(route)
					.set(...publicAccount.authHeader)
					.expect(403);

				expect(body).to.be.an.forbiddenResponse;
			});

			it('Will return 404 if username is not found', async () => {
				const { body } = await request(App)
					.get(downloadRoute(
						'johndoe',
						friendsOnlyLogEntry.id,
						imageMetadata.id,
						imageType === 'thumbnail'
					))
					.set(...friendsOnlyAccount.authHeader)
					.expect(404);

				expect(body).to.be.a.notFoundResponse;
			});

			it('Will return 404 if log entry is not found', async () => {
				const { body } = await request(App)
					.get(downloadRoute(
						friendsOnlyAccount.user.username,
						fakeMongoId(),
						imageMetadata.id,
						imageType === 'thumbnail'
					))
					.set(...friendsOnlyAccount.authHeader)
					.expect(404);

				expect(body).to.be.a.notFoundResponse;
			});

			it('Will return 404 if image ID is not found', async () => {
				const { body } = await request(App)
					.get(downloadRoute(
						friendsOnlyAccount.user.username,
						friendsOnlyLogEntry.id,
						fakeMongoId(),
						imageType === 'thumbnail'
					))
					.set(...friendsOnlyAccount.authHeader)
					.expect(404);

				expect(body).to.be.a.notFoundResponse;
			});

			it('Will return 500 if a server error occurs', async () => {
				stub = sinon.stub(storage, 'getSignedUrl');
				stub.callsFake((op, params, cb) => {
					cb(new Error('nope'));
				});

				const { body } = await request(App)
					.get(route)
					.set(...friendsOnlyAccount.authHeader)
					.expect(500);

				expect(body).to.be.a.serverErrorResponse;
			});
		});
	});
});
