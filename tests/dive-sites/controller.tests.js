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
		let fake = null;
		let diveSite = null;

		beforeEach(async () => {
			fake = fakeDiveSite(userAccount.user.username);
			diveSite = toDiveSite(fake);
			await diveSite.save();
			delete fake.owner;
		});

		afterEach(async () => {
			await DiveSite.deleteMany({});
		});

		it('Will successfully update a dive site', async () => {
			fake = fakeDiveSite();
			delete fake.owner;

			await request(App)
				.put(`/diveSites/${ diveSite.id }`)
				.set(...userAccount.authHeader)
				.send(fake)
				.expect(204);

			const result = await DiveSite.findById(diveSite.id);
			expect(result).to.exist;
			expect(result.toCleanJSON()).to.eql({
				...fake,
				owner: userAccount.user.username,
				siteId: diveSite.id
			});
		});

		it('Will return 400 if validation fails', async () => {
			fake = fakeDiveSite();
			fake.name = null;
			fake.description = 77;

			const { body } = await request(App)
				.put(`/diveSites/${ diveSite.id }`)
				.set(...userAccount.authHeader)
				.send(fake)
				.expect(400);

			expect(body.status).to.equal(400);
			expect(body.errorId).to.equal(ErrorIds.badRequest);
		});

		it('Will return 401 if user is not authenticated', async () => {
			const { body } = await request(App)
				.put(`/diveSites/${ diveSite.id }`)
				.send(fake)
				.expect(401);

			expect(body.status).to.equal(401);
			expect(body.errorId).to.equal(ErrorIds.notAuthorized);
		});

		it('Will return 403 if user attempts to update another user\'s site entry', async () => {
			const otherFake = fakeDiveSite();
			const otherDiveSite = toDiveSite(otherFake);
			await otherDiveSite.save();

			const { body } = await request(App)
				.put(`/diveSites/${ otherDiveSite.id }`)
				.set(...userAccount.authHeader)
				.send(fake)
				.expect(403);

			expect(body.status).to.equal(403);
			expect(body.errorId).to.equal(ErrorIds.forbidden);
		});

		it('Will allow administrators to update other user\'s site info', async () => {
			fake = fakeDiveSite();
			delete fake.owner;

			await request(App)
				.put(`/diveSites/${ diveSite.id }`)
				.set(...adminAccount.authHeader)
				.send(fake)
				.expect(204);

			const result = await DiveSite.findById(diveSite.id);
			expect(result).to.exist;
			expect(result.toCleanJSON()).to.eql({
				...fake,
				owner: userAccount.user.username,
				siteId: diveSite.id
			});
		});

		it('Will return 404 if site entry does not exist', async () => {
			const { body } = await request(App)
				.put(`/diveSites/${ fakeMongoId() }`)
				.set(...userAccount.authHeader)
				.send(fake)
				.expect(404);

			expect(body.status).to.equal(404);
			expect(body.errorId).to.equal(ErrorIds.notFound);
		});

		it('Will return 500 if a server error occurs', async () => {
			stub = sinon.stub(DiveSite.prototype, 'save');
			stub.rejects('nope');

			const { body } = await request(App)
				.put(`/diveSites/${ diveSite.id }`)
				.set(...userAccount.authHeader)
				.send(fake)
				.expect(500);

			expect(body.status).to.equal(500);
			expect(body.errorId).to.equal(ErrorIds.serverError);
			expect(body.logId).to.exist;
		});
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
