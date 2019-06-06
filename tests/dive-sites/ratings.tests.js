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
import Session from '../../service/data/session';
import sinon from 'sinon';
import User from '../../service/data/user';
import { UsernameRegex } from '../../service/validation/common';

const diveSiteFake = fakeDiveSite();

let userAccount = null;
let adminAccount = null;
let diveSite = null;
let ratings = null;
let stub = null;

function ratingsUrl() {
	return `/diveSites/${ diveSite.id }/ratings`;
}

function ratingUrl(ratingId) {
	return `${ ratingsUrl() }/${ ratingId }`;
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
		diveSite = toDiveSite(diveSiteFake);
		[ userAccount, adminAccount ] = await Promise.all([
			createFakeAccount(),
			createFakeAccount('admin'),
			diveSite.save()
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
			Session.deleteMany({}),
			User.deleteMany({})
		]);
	});

	describe('GET /diveSites/:siteId/ratings', () => {
		before(async () => {
			ratings = new Array(450);
			for (let i = 0; i < ratings.length; i++) {
				ratings[i] = toDiveSiteRating(fakeDiveSiteRating());
				ratings[i].diveSite = diveSite._id;
			}
			diveSite.ratings = ratings.map(r => r._id);

			await Promise.all([
				DiveSiteRating.insertMany(ratings),
				diveSite.save()
			]);
		});

		after(async () => {
			diveSite.ratings = null;
			await Promise.all([
				diveSite.save(),
				DiveSiteRating.deleteMany({})
			]);
		});

		it('Returns dive site ratings', async () => {
			const { body } = await request(App)
				.get(ratingsUrl())
				.expect(200);

			expect(body).to.be.an('array').and.have.a.lengthOf(200);
			body.forEach(rating => validateRating(rating));
			expect(body).to.be.descendingBy('date');
		});

		it('Will return the correct number of ratings', async () => {
			const count = 40;
			const { body } = await request(App)
				.get(ratingsUrl())
				.query({ count })
				.expect(200);

			expect(body).to.be.an('array').and.have.a.lengthOf(count);
			body.forEach(rating => validateRating(rating));
		});

		it('Will skip over records if requested (pagination)', async () => {
			const count = 40;
			const responses = await Promise.all([
				request(App)
					.get(ratingsUrl())
					.query({ count })
					.expect(200),
				request(App)
					.get(ratingsUrl())
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
						.get(ratingsUrl())
						.query({ count, sortBy, sortOrder })
						.expect(200);

					expect(body).to.be.an('array').and.have.a.lengthOf(count);
					expect(body).to.be.sortedBy(sortBy, { descending: sortOrder === 'desc' });
				});
			});
		});

		it('Will return 400 if query sting is invalid', async () => {
			const { body } = await request(App)
				.get(ratingsUrl())
				.query({ valid: false })
				.expect(400);

			expect(body).isBadRequest;
		});

		it('Will return 404 if the dive site does not exist', async () => {
			const { body } = await request(App)
				.get(`/diveSites/${ fakeMongoId() }/ratings`)
				.expect(404);

			expect(body).isNotFound;
		});

		it('Will return 500 if a server error occurs', async () => {
			stub = sinon.stub(DiveSiteRating.prototype, 'toCleanJSON');
			stub.throws(new Error('nope'));

			const { body } = await request(App)
				.get(ratingsUrl())
				.expect(500);

			expect(body).isServerError;
		});
	});

	describe('POST /diveSites/:siteId/ratings', () => {
		afterEach(async () => {
			await DiveSiteRating.deleteMany({});
		});

		it('Will create a new dive site rating', async () => {
			const fake = fakeDiveSiteRating();
			const { body } = await request(App)
				.post(ratingsUrl())
				.set(...userAccount.authHeader)
				.send(fake)
				.expect(200);

			validateRating(body);
			expect(body.ratingId).to.exist;

			const entity = await DiveSiteRating.findById(body.ratingId);
			const result = await request(App)
				.get(ratingsUrl())
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
				.post(ratingsUrl())
				.set(...userAccount.authHeader)
				.send(fake)
				.expect(400);

			expect(body).isBadRequest;
		});

		it('Will return 400 if message body is missing', async () => {
			const { body } = await request(App)
				.post(ratingsUrl())
				.set(...userAccount.authHeader)
				.expect(400);

			expect(body).isBadRequest;
		});

		it('Will return 401 if the user is not authenticated', async () => {
			const fake = fakeDiveSiteRating();
			const { body } = await request(App)
				.post(ratingsUrl())
				.send(fake)
				.expect(401);

			expect(body).isUnauthorized;
		});

		it('Will return 404 if the dive site does not exist', async () => {
			const fake = fakeDiveSiteRating();
			const { body } = await request(App)
				.post(`/diveSites/${ fakeMongoId() }/ratings`)
				.set(...userAccount.authHeader)
				.send(fake)
				.expect(404);

			expect(body).isNotFound;
		});

		it('Will return 500 if a server error occurs', async () => {
			const fake = fakeDiveSiteRating();
			stub = sinon.stub(DiveSiteRating.prototype, 'toCleanJSON');
			stub.throws(new Error('nope'));

			const { body } = await request(App)
				.post(ratingsUrl())
				.set(...userAccount.authHeader)
				.send(fake)
				.expect(500);

			expect(body).isServerError;
		});
	});

	describe('GET /diveSites/:siteId/ratings/:ratingId', () => {

	});

	describe('PUT /diveSites/:siteId/ratings/:ratingId', () => {

	});

	describe('DELETE /diveSites/:siteId/ratings/:ratingId', () => {

	});
});
