import { App } from '../../service/server';
import config from '../../service/config';
import createFakeAccount from '../util/create-fake-account';
import { expect } from 'chai';
import fakeLogEntry, { toLogEntry } from '../util/fake-log-entry';
import fakeLogEntryImage, { toLogEntryImage } from '../util/fake-log-entry-image';
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
import fakeMongoId from '../util/fake-mongo-id';

const ImagePaths = [
	path.resolve(__dirname, '../assets/diver.jpg'),
	path.resolve(__dirname, '../assets/diver-thumb.jpg')
];

function imagesRoute(user, logEntry) {
	return `/users/${ user.username }/logs/${ logEntry.id }/images`;
}

function imageRoute(user, logEntry, imageId) {
	return `/users/${ user.username }/logs/${ logEntry.id }/images/${ imageId }`;
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

		console.log('finished:', result);
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
				.get(imagesRoute(friendsOnlyAccount.user, friendsOnlyLogEntry))
				.set(...friendsOnlyAccount.authHeader)
				.expect(200);

			expect(body).to.be.an('array').and.to.have.a.lengthOf(70);

			body.forEach(img => {
				validateImageMetadata(img);
			});
		});

		it('Will return 404 if username is not found', async () => {
			const { body } = await request(App)
				.get(`/users/mystery_user/logs/${ friendsOnlyLogEntry.id }/images`)
				.set(...friendsOnlyAccount.authHeader)
				.expect(404);

			expect(body).to.be.a.notFoundResponse;
		});

		it('Will return 404 if log entry is not found', async () => {
			const { body } = await request(App)
				.get(`/users/${ friendsOnlyAccount.user.username }/logs/${ fakeMongoId() }/images`)
				.set(...friendsOnlyAccount.authHeader)
				.expect(404);

			expect(body).to.be.a.notFoundResponse;
		});

		it('Will return 500 if a server error occurs', async () => {
			stub = sinon.stub(LogEntryImage.prototype, 'toCleanJSON');
			stub.throws(new Error('nope'));

			const { body } = await request(App)
				.get(imagesRoute(friendsOnlyAccount.user, friendsOnlyLogEntry))
				.set(...friendsOnlyAccount.authHeader)
				.expect(500);

			expect(body).to.be.a.serverErrorResponse;
		});
	});

	describe('POST /users/:userName/logs/:logId/images', () => {
		afterEach(async () => {
			const { Contents } = await storage
				.listObjectsV2({ Bucket: config.mediaBucket })
				.promise();

			await storage.deleteObjects({
				Bucket: config.mediaBucket,
				Delete: {
					Objects: Contents.map(obj => ({ Key: obj.Key }))
				}
			});
		});

		it('Will post a new image to the log entry along with a thumbnail', async () => {
			const title = 'Diver at Surface';
			const description = 'He looks very wet';
			const timestamp = new Date().toISOString();
			const lat = 43.3588333;
			const lon = -80.0207417;

			const { body } = await request(App)
				.post(imagesRoute(friendsOnlyAccount.user, friendsOnlyLogEntry))
				.field('title', title)
				.field('description', description)
				.field('timestamp', timestamp)
				.field('lat', lat)
				.field('lon', lon)
				.attach('image', ImagePaths[0])
				.expect(200);

			// Correct response from API.
			expect(body).to.exist;
			expect(body.imageId).to.exist;
			expect(body.title).to.equal(title);
			expect(body.description).to.equal(description);
			expect(body.timestamp).to.equal(timestamp);
			expect(body.location).to.eql({ lat, lon });

			// Image metadata saved to database.
			const saved = await LogEntryImage.findById(body.imageId);
			expect(saved).to.exist;
			expect(saved.contentType).to.equal('image/jpeg');
			expect(saved.logEntry.toString()).to.equal(friendsOnlyLogEntry.id);

			// Image and thumbnail stored in S3.
			const [ image, thumbnail ] = await Promise.all([
				storage.headObject({ Bucket: config.mediaBucket, Key: saved.awsS3Key }).promise(),
				storage.headObject({ Bucket: config.mediaBucket, Key: saved.awsS3ThumbKey }).promise()
			]);

			expect(image).to.exist;
			expect(image.ContentLength).to.equal(445394);

			expect(thumbnail).to.exist;
			expect(thumbnail.ContentLength).to.equal(5732);
		});

		it('Will detect a duplicate image and map it appropriately', async () => {

		});

		it('Will attempt to scrape metadata from the image if form fields are omitted', async () => {

		});

		it('Will return 400 if there is a problem with the request form', async () => {

		});

		it('Will return 400 if the image is missing', async () => {
			const { body } = await request(App)
				.post(imagesRoute(friendsOnlyAccount.user, friendsOnlyLogEntry))
				.field('title', 'Lol')
				.expect(400);

			expect(body).to.be.a.badRequestResponse;
		});

		it('Will return 400 if the request body is empty', async () => {
			const { body } = await request(App)
				.post(imagesRoute(friendsOnlyAccount.user, friendsOnlyLogEntry))
				.expect(400);

			expect(body).to.be.a.badRequestResponse;
		});

		it('Will return 400 if the image is too large', async () => {

		});

		it('Will return 400 if the image cannot be read', async () => {

		});

		it('Will return 401 if user is unauthenticated', async () => {

		});

		it('Will return 403 if user does not own the log book', async () => {

		});

		it('Will allow administrators to post images to other users\' log entries', async () => {

		});

		it('Will return 404 if user is not found', async () => {

		});

		it('Will return 404 if log entry is not found', async () => {

		});

		it('Will return 500 if a server error occurs', async () => {

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
				.get(imageRoute(friendsOnlyAccount.user, friendsOnlyLogEntry, imageMetadata.id))
				.set(...friendsOnlyAccount.authHeader)
				.expect(200);

			expect(body).to.eql(imageMetadata.toCleanJSON());
		});

		it('Will return 404 if the user cannot be found', async () => {
			const { body } = await request(App)
				.get(`/users/not_a_user/logs/${ friendsOnlyLogEntry.id }/images/${ imageMetadata.id }`)
				.set(...friendsOnlyAccount.authHeader)
				.expect(404);

			expect(body).to.be.a.notFoundResponse;
		});

		it('Will return 404 if the log entry cannot be found', async () => {
			const fakeId = fakeMongoId();
			const { body } = await request(App)
				.get(`/users/${ friendsOnlyAccount.user.username }/logs/${ fakeId }/images/${ imageMetadata.id }`)
				.set(...friendsOnlyAccount.authHeader)
				.expect(404);

			expect(body).to.be.a.notFoundResponse;
		});

		it('Will return 404 if the image cannot be found', async () => {
			const fakeId = fakeMongoId();
			const { body } = await request(App)
				.get(`/users/${ friendsOnlyAccount.user.username }/logs/${ friendsOnlyLogEntry.id }/images/${ fakeId }`)
				.set(...friendsOnlyAccount.authHeader)
				.expect(404);

			expect(body).to.be.a.notFoundResponse;
		});

		it('Will return 500 if a server error occurs', async () => {
			stub = sinon.stub(LogEntryImage, 'findOne');
			stub.rejects(new Error('nope'));

			const { body } = await request(App)
				.get(imageRoute(friendsOnlyAccount.user, friendsOnlyLogEntry, imageMetadata.id))
				.set(...friendsOnlyAccount.authHeader)
				.expect(500);

			expect(body).to.be.a.serverErrorResponse;
		});
	});

	describe('PUT /users/:userName/logs/:logId/images/:imageId', () => {
		it('Will update the image metadata and return the results', async () => {

		});

		it('Will return 400 if the request body is invalid', async () => {

		});

		it('Will return 400 if the request body is missing', async () => {

		});

		it('Will return 404 if the user cannot be found', async () => {

		});

		it('Will return 404 if the log entry cannot be found', async () => {

		});

		it('Will return 404 if the image cannot be found', async () => {

		});

		it('Will return 500 if a server error occurs', async () => {

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
				.delete(imageRoute(friendsOnlyAccount.user, friendsOnlyLogEntry, imageMetadata.id))
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
				.delete(imageRoute(friendsOnlyAccount.user, friendsOnlyLogEntry, imageMetadata.id))
				.expect(401);

			expect(body).to.be.a.unauthorizedResponse;
		});

		it('Will return 403 if the user does not own the log entry', async () => {
			const { body } = await request(App)
				.delete(imageRoute(friendsOnlyAccount.user, friendsOnlyLogEntry, imageMetadata.id))
				.set(...publicAccount.authHeader)
				.expect(403);

			expect(body).to.be.a.forbiddenResponse;
		});

		it('Will allow administrators to delete other users\' images', async () => {
			await request(App)
				.delete(imageRoute(friendsOnlyAccount.user, friendsOnlyLogEntry, imageMetadata.id))
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
				.delete(`/users/not_a_user/logs/${ friendsOnlyLogEntry.id }/images/${ imageMetadata.id }`)
				.set(...friendsOnlyAccount.authHeader)
				.expect(404);

			expect(body).to.be.a.notFoundResponse;
		});

		it('Will return 404 if the log entry cannot be found', async () => {
			const fakeId = fakeMongoId();
			const { body } = await request(App)
				.delete(`/users/${ friendsOnlyAccount.user.username }/logs/${ fakeId }/images/${ imageMetadata.id }`)
				.set(...friendsOnlyAccount.authHeader)
				.expect(404);

			expect(body).to.be.a.notFoundResponse;
		});

		it('Will return 404 if the image cannot be found', async () => {
			const fakeId = fakeMongoId();
			const { body } = await request(App)
				.delete(`/users/${ publicAccount.user.username }/logs/${ publicLogEntry.id }/images/${ fakeId }`)
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
				.delete(imageRoute(friendsOnlyAccount.user, friendsOnlyLogEntry, imageMetadata.id))
				.set(...friendsOnlyAccount.authHeader)
				.expect(500);

			expect(body).to.be.a.serverErrorResponse;
		});
	});

	[ 'image', 'thumbnail' ].forEach(imageType => {
		describe(`GET /users/:userName/logs/:logId/images/:imageId/${ imageType }`, () => {
			it('Will redirect to the correct URL', async () => {

			});

			it('Will return 401 if user is not authenticated and log book is not public', async () => {

			});

			it('Will return 403 if user does not have access to the log book', async () => {

			});

			it('Will return 404 if username is not found', async () => {

			});

			it('Will return 404 if log entry is not found', async () => {

			});

			it('Will return 404 if image ID is not found', async () => {

			});

			it('Will return 500 if a server error occurs', async () => {

			});
		});
	});
});
