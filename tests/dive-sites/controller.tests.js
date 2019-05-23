import { App } from '../../service/server';
import createFakeAccount from '../util/create-fake-account';
import { ErrorIds } from '../../service/utils/error-response';
import { expect } from 'chai';
import fakeDiveSite, { toDiveSite } from '../util/fake-dive-site';
import fakeMongoId from '../util/fake-mongo-id';
import DiveSite from '../../service/data/sites';
import request from 'supertest';
import Session from '../../service/data/session';
import sinon from 'sinon';
import User from '../../service/data/user';

let userAccount = null;
let adminAccount = null;
let stub = null;

describe('Dive sites controller', () => {
	before(async () => {
		userAccount = await createFakeAccount();
		adminAccount = await createFakeAccount('admin');
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
			Session.deleteMany({}),
			User.deleteMany({})
		]);
	});

	describe('GET /diveSites', () => {

	});

	describe('POST /diveSites', () => {

	});

	describe('GET /diveSites/:siteId', () => {
		after(async () => {
			await DiveSite.deleteMany({});
		});

		it('Will retrieve the requested dive site', async () => {
			const fake = fakeDiveSite();
			const diveSite = toDiveSite(fake);
			await diveSite.save();

			const { body } = await request(App)
				.get(`/diveSites/${ diveSite.id }`)
				.expect(200);

			fake.siteId = diveSite.id;
			expect(body).to.eql(fake);
		});

		it('Returns 404 if dive site is not found', async () => {
			const { body } = await request(App)
				.get(`/diveSites/${ fakeMongoId() }`)
				.expect(404);

			expect(body.status).to.equal(404);
			expect(body.errorId).to.equal(ErrorIds.notFound);
		});

		it('Returns 500 if a server error occurs', async () => {
			stub = sinon.stub(DiveSite, 'findById');
			stub.rejects('nope');

			const { body } = await request(App)
				.get(`/diveSites/${ fakeMongoId() }`)
				.expect(500);

			expect(body.status).to.equal(500);
			expect(body.errorId).to.equal(ErrorIds.serverError);
			expect(body.logId).to.exist;
		});
	});

	describe('PUT /diveSites/:siteId', () => {

	});

	describe('DELETE /diveSites/:siteId', () => {
		afterEach(async () => {
			await DiveSite.deleteMany({});
		});

		it('Will successfully delete dive sites', async () => {
			const fake = fakeDiveSite(userAccount.user.username);
			const diveSite = toDiveSite(fake);
			await diveSite.save();

			await request(App)
				.delete(`/diveSites/${ diveSite.id }`)
				.set(...userAccount.authHeader)
				.expect(204);

			const result = await DiveSite.findById(diveSite.id);
			expect(result).to.be.null;
		});

		it('Will return 401 if user is not authenticated', async () => {
			const fake = fakeDiveSite(userAccount.user.username);
			const diveSite = toDiveSite(fake);
			await diveSite.save();

			const { body } = await request(App)
				.delete(`/diveSites/${ diveSite.id }`)
				.expect(401);

			expect(body.status).to.equal(401);
			expect(body.errorId).to.equal(ErrorIds.notAuthorized);

			const result = await DiveSite.findById(diveSite.id);
			expect(result).to.exist;
		});

		it('Will return 403 if user does not own the dive site entry', async () => {
			const fake = fakeDiveSite();
			const diveSite = toDiveSite(fake);
			await diveSite.save();

			const { body } = await request(App)
				.delete(`/diveSites/${ diveSite.id }`)
				.set(...userAccount.authHeader)
				.expect(403);

			expect(body.status).to.equal(403);
			expect(body.errorId).to.equal(ErrorIds.forbidden);

			const result = await DiveSite.findById(diveSite.id);
			expect(result).to.exist;
		});

		it('Will allow administrators to delete other users\' dive site entries', async () => {
			const fake = fakeDiveSite(userAccount.user.username);
			const diveSite = toDiveSite(fake);
			await diveSite.save();

			await request(App)
				.delete(`/diveSites/${ diveSite.id }`)
				.set(...adminAccount.authHeader)
				.expect(204);

			const result = await DiveSite.findById(diveSite.id);
			expect(result).to.be.null;
		});

		it('Will return 404 if the dive site is not found', async () => {
			const { body } = await request(App)
				.delete(`/diveSites/${ fakeMongoId() }`)
				.set(...userAccount.authHeader)
				.expect(404);

			expect(body.status).to.equal(404);
			expect(body.errorId).to.equal(ErrorIds.notFound);
		});

		it('Will return 500 if a server error occurs', async () => {
			const fake = fakeDiveSite(userAccount.user.username);
			const diveSite = toDiveSite(fake);
			await diveSite.save();

			stub = sinon.stub(DiveSite, 'findByIdAndDelete');
			stub.rejects('nope');

			const { body } = await request(App)
				.delete(`/diveSites/${ diveSite.id }`)
				.set(...userAccount.authHeader)
				.expect(500);

			expect(body.status).to.equal(500);
			expect(body.errorId).to.equal(ErrorIds.serverError);
			expect(body.logId).to.exist;
		});
	});
});
