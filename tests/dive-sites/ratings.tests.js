import { App } from '../../service/server';
import createFakeAccount from '../util/create-fake-account';
import DiveSite from '../../service/data/sites';
import DiveSiteRating from '../../service/data/site-ratings';
import { expect } from 'chai';
import fakeDiveSite, { toDiveSite } from '../util/fake-dive-site';
import fakeDiveSiteRating, { toDiveSiteRating } from '../util/fake-dive-site-rating';
import fakeMongoId from '../util/fake-mongo-id';
import moment from 'moment';
import request from 'supertest';
import sinon from 'sinon';
import User from '../../service/data/user';
import { UsernameRegex } from '../../service/validation/common';

let userAccount = null;
let adminAccount = null;
let stub = null;

function ratingsUrl(diveSite) {
	return `/diveSites/${ diveSite.id }/ratings`;
}

function ratingUrl(diveSite, rating) {
	return `${ ratingsUrl(diveSite) }/${ rating.id }`;
}

function validateRating(rating) {
	const date = moment(rating.date);
	expect(rating).to.exist;
	expect(rating.user).to.match(UsernameRegex);
	expect(rating.rating).to.be.at.least(1).and.at.most(5);
	expect(rating.comments).to.be.a('string');
	expect(date.isValid()).to.be.true;
}

describe('Dive Site Ratings', () => {
	before(async () => {
		[ userAccount, adminAccount ] = await Promise.all([
			createFakeAccount(),
			createFakeAccount('admin')
		]);
	});

	afterEach(() => {
		if (stub) {
			stub.restore();
			stub = null;
		}
	});

	after(async () => {
		await Promise.all([
			DiveSite.deleteMany({}),
			DiveSiteRating.deleteMany({}),
			User.deleteMany({})
		]);
	});

	describe('GET /diveSites/:siteId/ratings', () => {
		const diveSite = toDiveSite(fakeDiveSite());
		const ratings = new Array(450);

		before(async () => {
			for (let i = 0; i < ratings.length; i++) {
				ratings[i] = toDiveSiteRating(fakeDiveSiteRating(), diveSite._id);
			}

			await Promise.all([
				DiveSiteRating.insertMany(ratings),
				diveSite.save()
			]);
		});

		after(async () => {
			await Promise.all([
				diveSite.remove(),
				DiveSiteRating.deleteMany({})
			]);
		});

		it('Returns dive site ratings', async () => {
			const { body } = await request(App)
				.get(ratingsUrl(diveSite))
				.expect(200);

			expect(body).to.be.an('array').and.have.a.lengthOf(200);
			body.forEach(rating => validateRating(rating));
			expect(body).to.be.descendingBy('date');
		});

		it('Will return the correct number of ratings', async () => {
			const count = 40;
			const { body } = await request(App)
				.get(ratingsUrl(diveSite))
				.query({ count })
				.expect(200);

			expect(body).to.be.an('array').and.have.a.lengthOf(count);
			body.forEach(rating => validateRating(rating));
		});

		it('Will skip over records if requested (pagination)', async () => {
			const count = 40;
			const responses = await Promise.all([
				request(App)
					.get(ratingsUrl(diveSite))
					.query({ count })
					.expect(200),
				request(App)
					.get(ratingsUrl(diveSite))
					.query({ count, skip: count })
					.expect(200)
			]);

			expect(responses[0].body).to.be.an('array').and.have.a.lengthOf(count);
			expect(responses[1].body).to.be.an('array').and.have.a.lengthOf(count);
			expect([ ...responses[0].body, ...responses[1].body ]).to.be.descendingBy('date');
		});

		[ 'date', 'rating' ].forEach(sortBy => {
			[ 'asc', 'desc' ].forEach(sortOrder => {
				it(`Can return ratings ordered by ${ sortBy } (${ sortOrder })`, async () => {
					const count = 40;
					const { body } = await request(App)
						.get(ratingsUrl(diveSite))
						.query({ count, sortBy, sortOrder })
						.expect(200);

					expect(body).to.be.an('array').and.have.a.lengthOf(count);
					expect(body).to.be.sortedBy(sortBy, { descending: sortOrder === 'desc' });
				});
			});
		});

		it('Will return 400 if query sting is invalid', async () => {
			const { body } = await request(App)
				.get(ratingsUrl(diveSite))
				.query({ valid: false })
				.expect(400);

			expect(body).to.be.a.badRequestResponse;
		});

		it('Will return 404 if the dive site does not exist', async () => {
			const { body } = await request(App)
				.get(`/diveSites/${ fakeMongoId() }/ratings`)
				.expect(404);

			expect(body).to.be.a.notFoundResponse;
		});

		it('Will return 500 if a server error occurs', async () => {
			stub = sinon.stub(DiveSiteRating.prototype, 'toCleanJSON');
			stub.throws(new Error('nope'));

			const { body } = await request(App)
				.get(ratingsUrl(diveSite))
				.expect(500);

			expect(body).to.be.a.serverErrorResponse;
		});
	});

	describe('POST /diveSites/:siteId/ratings', () => {
		const diveSite = toDiveSite(fakeDiveSite());

		before(async () => {
			await diveSite.save();
		});

		after(async () => {
			await Promise.all([
				diveSite.remove(),
				DiveSiteRating.deleteMany({})
			]);
		});

		it('Will create a new dive site rating', async () => {
			const fake = fakeDiveSiteRating();
			const { body } = await request(App)
				.post(ratingsUrl(diveSite))
				.set(...userAccount.authHeader)
				.send(fake)
				.expect(200);

			validateRating(body);
			expect(body.ratingId).to.exist;

			const entity = await DiveSiteRating.findById(body.ratingId);
			const result = await request(App)
				.get(ratingsUrl(diveSite))
				.expect(200);

			expect(result.body[0]).to.exist;
			expect(entity.diveSite.toString()).to.equal(diveSite.id);
			expect(result.body[0]).to.eql(entity.toCleanJSON());
		});

		it('Will return 400 if message body is invalid', async () => {
			const fake = {
				comments: 'This is totally invalid',
				extraField: true
			};

			const { body } = await request(App)
				.post(ratingsUrl(diveSite))
				.set(...userAccount.authHeader)
				.send(fake)
				.expect(400);

			expect(body).to.be.a.badRequestResponse;
		});

		it('Will return 400 if message body is missing', async () => {
			const { body } = await request(App)
				.post(ratingsUrl(diveSite))
				.set(...userAccount.authHeader)
				.expect(400);

			expect(body).to.be.a.badRequestResponse;
		});

		it('Will return 401 if the user is not authenticated', async () => {
			const fake = fakeDiveSiteRating();
			const { body } = await request(App)
				.post(ratingsUrl(diveSite))
				.send(fake)
				.expect(401);

			expect(body).to.be.a.unauthorizedResponse;
		});

		it('Will return 404 if the dive site does not exist', async () => {
			const fake = fakeDiveSiteRating();
			const { body } = await request(App)
				.post(`/diveSites/${ fakeMongoId() }/ratings`)
				.set(...userAccount.authHeader)
				.send(fake)
				.expect(404);

			expect(body).to.be.a.notFoundResponse;
		});

		it('Will return 500 if a server error occurs', async () => {
			const fake = fakeDiveSiteRating();
			stub = sinon.stub(DiveSiteRating.prototype, 'toCleanJSON');
			stub.throws(new Error('nope'));

			const { body } = await request(App)
				.post(ratingsUrl(diveSite))
				.set(...userAccount.authHeader)
				.send(fake)
				.expect(500);

			expect(body).to.be.a.serverErrorResponse;
		});
	});

	describe('GET /diveSites/:siteId/ratings/:ratingId', () => {
		const diveSite = toDiveSite(fakeDiveSite());
		const rating = toDiveSiteRating(fakeDiveSiteRating(), diveSite._id);

		before(async () => {
			await Promise.all([
				diveSite.save(),
				rating.save()
			]);
		});

		after(async () => {
			await Promise.all([
				diveSite.remove(),
				rating.remove()
			]);
		});

		it('Will retrieve a single dive site rating', async () => {
			const { body } = await request(App)
				.get(ratingUrl(diveSite, rating))
				.expect(200);

			expect(body).to.eql(rating.toCleanJSON());
		});

		it('Will return 404 if the dive site is not found', async () => {
			const { body } = await request(App)
				.get(`/diveSites/${ fakeMongoId() }/ratings/${ rating.id }`)
				.expect(404);

			expect(body).to.be.a.notFoundResponse;
		});

		it('Will return 404 if the dive site rating is not found', async () => {
			const { body } = await request(App)
				.get(`/diveSites/${ diveSite.id }/ratings/${ fakeMongoId() }`)
				.expect(404);

			expect(body).to.be.a.notFoundResponse;
		});

		it('Will return 500 if a server error occurs', async () => {
			stub = sinon.stub(DiveSiteRating, 'findOne');
			stub.rejects('nope');

			const { body } = await request(App)
				.get(ratingUrl(diveSite, rating))
				.expect(500);

			expect(body).to.be.a.serverErrorResponse;
		});
	});

	describe('PUT /diveSites/:siteId/ratings/:ratingId', () => {
		let diveSite = null;
		let myRating = null;
		let otherRating = null;

		before(async () => {
			diveSite = toDiveSite(fakeDiveSite());
			myRating = toDiveSiteRating(
				fakeDiveSiteRating(),
				diveSite._id,
				userAccount.user.username
			);
			otherRating = toDiveSiteRating(
				fakeDiveSiteRating(),
				diveSite._id
			);

			await Promise.all([
				diveSite.save(),
				myRating.save(),
				otherRating.save()
			]);
		});

		after(async () => {
			await Promise.all([
				diveSite.remove(),
				myRating.remove(),
				otherRating.remove()
			]);
		});

		it('Will update dive site rating', async () => {
			const fake = fakeDiveSiteRating();
			await request(App)
				.put(ratingUrl(diveSite, myRating))
				.set(...userAccount.authHeader)
				.send(fake)
				.expect(204);

			myRating = await DiveSiteRating.findById(myRating.id);
			fake.ratingId = myRating.id;
			fake.user = userAccount.user.username;
			fake.date = moment(myRating.date).utc().toISOString();

			expect(myRating.diveSite.toString()).to.equal(diveSite.id);
			expect(myRating.toCleanJSON()).to.eql(fake);
		});

		it('Will return 400 if the request body is invalid', async () => {
			const fake = {
				invalid: 'yup',
				rating: 77
			};
			const { body } = await request(App)
				.put(ratingUrl(diveSite, myRating))
				.set(...userAccount.authHeader)
				.send(fake)
				.expect(400);

			expect(body).to.be.a.badRequestResponse;
		});

		it('Will return 400 if the request body is empty', async () => {
			const { body } = await request(App)
				.put(ratingUrl(diveSite, myRating))
				.set(...userAccount.authHeader)
				.expect(400);

			expect(body).to.be.a.badRequestResponse;
		});

		it('Will return 401 if user is not authenticated', async () => {
			const fake = fakeDiveSiteRating();
			const { body } = await request(App)
				.put(ratingUrl(diveSite, myRating))
				.send(fake)
				.expect(401);

			expect(body).to.be.an.unauthorizedResponse;
		});

		it('Will return 403 if the user does not own the dive site rating', async () => {
			const fake = fakeDiveSiteRating();
			const { body } = await request(App)
				.put(ratingUrl(diveSite, otherRating))
				.set(...userAccount.authHeader)
				.send(fake)
				.expect(403);

			expect(body).to.be.a.forbiddenResponse;
		});

		it('Administrators can update other users\' dive site ratings', async () => {
			const fake = fakeDiveSiteRating();
			await request(App)
				.put(ratingUrl(diveSite, myRating))
				.set(...adminAccount.authHeader)
				.send(fake)
				.expect(204);

			myRating = await DiveSiteRating.findById(myRating.id);
			fake.ratingId = myRating.id;
			fake.user = userAccount.user.username;
			fake.date = moment(myRating.date).utc().toISOString();

			expect(myRating.diveSite.toString()).to.equal(diveSite.id);
			expect(myRating.toCleanJSON()).to.eql(fake);
		});

		it('Will return 404 if the dive site does not exist', async () => {
			const fake = fakeDiveSiteRating();
			const { body } = await request(App)
				.put(`/diveSites/${ fakeMongoId() }/ratings/${ myRating.id }`)
				.set(...userAccount.authHeader)
				.send(fake)
				.expect(404);

			expect(body).to.be.a.notFoundResponse;
		});

		it('Will return 404 if the dive site rating does not exist', async () => {
			const fake = fakeDiveSiteRating();
			const { body } = await request(App)
				.put(`/diveSites/${ diveSite.id }/ratings/${ fakeMongoId() }`)
				.set(...userAccount.authHeader)
				.send(fake)
				.expect(404);

			expect(body).to.be.a.notFoundResponse;
		});

		it('Will return 500 if a server error occurs', async () => {
			stub = sinon.stub(DiveSiteRating.prototype, 'save');
			stub.rejects('nope');

			const fake = fakeDiveSiteRating();
			const { body } = await request(App)
				.put(ratingUrl(diveSite, myRating))
				.set(...userAccount.authHeader)
				.send(fake)
				.expect(500);

			expect(body).to.be.a.serverErrorResponse;
		});
	});

	describe('DELETE /diveSites/:siteId/ratings/:ratingId', () => {
		let diveSite = null;
		let myRating = null;
		let myOtherRating = null;
		let otherRating = null;

		beforeEach(async () => {
			diveSite = toDiveSite(fakeDiveSite());
			myRating = toDiveSiteRating(
				fakeDiveSiteRating(),
				diveSite._id,
				userAccount.user.username
			);
			myOtherRating = toDiveSiteRating(
				fakeDiveSiteRating(),
				diveSite._id,
				userAccount.user.username
			);
			otherRating = toDiveSiteRating(
				fakeDiveSiteRating(),
				diveSite._id
			);

			await Promise.all([
				diveSite.save(),
				myRating.save(),
				myOtherRating.save(),
				otherRating.save()
			]);
		});

		afterEach(async () => {
			if (stub) {
				stub.restore();
				stub = null;
			}

			await Promise.all([
				diveSite.remove(),
				myOtherRating.remove(),
				otherRating.remove()
			]);

			if (myRating) {
				await myRating.remove();
			}
		});

		it('Will delete a dive site rating', async () => {
			await request(App)
				.delete(ratingUrl(diveSite, myRating))
				.set(...userAccount.authHeader)
				.expect(204);

			[ diveSite, myRating ] = await Promise.all([
				DiveSite.findById(diveSite.id),
				DiveSiteRating.findById(myRating.id)
			]);

			expect(myRating).to.be.null;
			expect(diveSite.avgRating).to.be.a('number');
		});

		it('Will return 401 if user is not authenticated', async () => {
			const { body } = await request(App)
				.delete(ratingUrl(diveSite, myRating))
				.expect(401);

			expect(body).to.be.an.unauthorizedResponse;
		});

		it('Will return 403 if user does not own the dive site rating', async () => {
			const { body } = await request(App)
				.delete(ratingUrl(diveSite, otherRating))
				.set(...userAccount.authHeader)
				.expect(403);

			expect(body).to.be.a.forbiddenResponse;
		});

		it('Administrators can delete other users\' dive site ratings', async () => {
			await request(App)
				.delete(ratingUrl(diveSite, myRating))
				.set(...adminAccount.authHeader)
				.expect(204);

			[ diveSite, myRating ] = await Promise.all([
				DiveSite.findById(diveSite.id),
				DiveSiteRating.findById(myRating.id)
			]);

			expect(myRating).to.be.null;
			expect(diveSite.avgRating).to.be.a('number');
		});

		it('Will return 404 if the dive site does not exist', async () => {
			const { body } = await request(App)
				.delete(`/diveSites/${ fakeMongoId() }/ratings/${ myRating.id }`)
				.set(...userAccount.authHeader)
				.expect(404);

			expect(body).to.be.a.notFoundResponse;
		});

		it('Will return 404 if the dive site rating does not exist', async () => {
			const { body } = await request(App)
				.delete(`/diveSites/${ diveSite.id }/ratings/${ fakeMongoId() }`)
				.set(...userAccount.authHeader)
				.expect(404);

			expect(body).to.be.a.notFoundResponse;
		});

		it('Will return 500 if a server error occurs', async () => {
			stub = sinon.stub(DiveSiteRating.prototype, 'remove');
			stub.rejects('nope');

			const { body } = await request(App)
				.delete(ratingUrl(diveSite, myRating))
				.set(...userAccount.authHeader)
				.expect(500);

			expect(body).to.be.a.serverErrorResponse;
		});
	});
});
