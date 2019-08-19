import _ from 'lodash';
import { App } from '../../service/server';
import createFakeAccount from '../util/create-fake-account';
import { ErrorIds } from '../../service/utils/error-response';
import { expect } from 'chai';
import fakeMongoId from '../util/fake-mongo-id';
import fakeTank from '../util/fake-tank';
import mongoose from 'mongoose';
import request from 'supertest';
import sinon from 'sinon';
import Tank from '../../service/data/tanks';
import tankProperties from '../../service/utils/tank-properties';
import User from '../../service/data/user';

const DefaultTanks = Object.keys(tankProperties).map(key => ({
	name: key,
	...tankProperties[key]
}));

describe('Tanks Controller', () => {
	let account = null;
	let stub = null;

	before(async () => {
		account = await createFakeAccount();
		await Tank.deleteMany({});
	});

	afterEach(async () => {
		if (stub) {
			stub.restore();
			stub = null;
		}

		await Tank.deleteMany({});
	});

	after(async () => {
		await User.deleteMany({});
	});

	describe('GET /tanks', () => {
		it('Will return only the default tanks if the user has not created any', async () => {
			const response = await request(App)
				.get('/tanks')
				.set(...account.authHeader)
				.expect(200);

			const results = response.body;
			expect(results).to.be.an('array').and.have.a.lengthOf(DefaultTanks.length);
			expect(results).to.eql(DefaultTanks);
		});

		it('Will return the list of tanks available to the current user', async () => {
			let customTanks = Array(5);
			for (let i = 0; i < customTanks.length; i++) {
				customTanks[i] = new Tank(fakeTank(account.user.id));
			}
			await Tank.insertMany(customTanks);
			customTanks = _.sortBy(customTanks, 'name');

			const response = await request(App)
				.get('/tanks')
				.set(...account.authHeader)
				.expect(200);

			const results = response.body;
			expect(results).to.be.an('array').and.have.a.lengthOf(DefaultTanks.length + customTanks.length);
			expect(results).to.eql(customTanks.map(t => t.toCleanJSON()).concat(DefaultTanks));
		});

		it('Will override the default tanks if the user has created one in the same name', async () => {
			let customTanks = Array(5);
			for (let i = 0; i < customTanks.length; i++) {
				customTanks[i] = new Tank(fakeTank(account.user.id));
			}
			customTanks[0].name = DefaultTanks[0].name;
			customTanks[1].name = DefaultTanks[1].name;
			await Tank.insertMany(customTanks);
			customTanks = _.sortBy(customTanks, 'name');

			const response = await request(App)
				.get('/tanks')
				.set(...account.authHeader)
				.expect(200);

			const results = response.body;
			expect(results).to.be.an('array').and.have.a.lengthOf(
				DefaultTanks.length - 2 + customTanks.length
			);
			expect(results).to.eql(customTanks.map(t => t.toCleanJSON()).concat(DefaultTanks.slice(2)));
		});

		it('Will return the system default tanks if user is anonymous', async () => {
			const response = await request(App)
				.get('/tanks')
				.expect(200);

			const results = response.body;
			expect(results).to.be.an('array').and.have.a.lengthOf(DefaultTanks.length);
			expect(results).to.eql(DefaultTanks);
		});

		it('Will return 500 if a server error occurs', async () => {
			const customTanks = Array(5);
			for (let i = 0; i < customTanks.length; i++) {
				customTanks[i] = fakeTank(account.user.id);
			}
			await Tank.insertMany(customTanks.map(t => new Tank(t)));

			stub = sinon.stub(Tank.prototype, 'toCleanJSON');
			stub.throws(new Error('Nope'));

			const response = await request(App)
				.get('/tanks')
				.set(...account.authHeader)
				.expect(500);

			expect(response.body.status).to.equal(500);
			expect(response.body.errorId).to.equal(ErrorIds.serverError);
			expect(response.body.logId).to.exist;
		});
	});

	describe('POST /tanks', () => {
		it('Will create a new tank profile and return the tankId', async () => {
			const newProfile = fakeTank();

			const { body } = await request(App)
				.post('/tanks')
				.set(...account.authHeader)
				.send(newProfile)
				.expect(200);

			expect(body).to.exist;
			expect(body.tankId).to.exist;
			expect(body).to.eql({
				...newProfile,
				tankId: body.tankId,
				isCustom: true
			});
		});

		it('Will return 400 if the tank profile fails validation', async () => {
			const newProfile = fakeTank();
			newProfile.size = '12L';

			const { body } = await request(App)
				.post('/tanks')
				.set(...account.authHeader)
				.send(newProfile)
				.expect(400);

			expect(body).to.exist;
			expect(body.errorId).to.equal(ErrorIds.badRequest);
			expect(body.status).to.equal(400);
		});

		it('Will return 401 if the user is not authenticated', async () => {
			const newProfile = fakeTank();

			const { body } = await request(App)
				.post('/tanks')
				.send(newProfile)
				.expect(401);

			expect(body).to.exist;
			expect(body.errorId).to.equal(ErrorIds.notAuthorized);
			expect(body.status).to.equal(401);
		});

		it('Will return 403 if the user has exceeded the limit of 50 custom tank profiles', async () => {
			const existingProfiles = new Array(50);
			for (let i = 0; i < existingProfiles.length; i++) {
				existingProfiles[i] = new Tank(fakeTank(account.user.id));
			}
			await Tank.insertMany(existingProfiles);

			const newProfile = fakeTank();
			const { body } = await request(App)
				.post('/tanks')
				.set(...account.authHeader)
				.send(newProfile)
				.expect(403);

			expect(body).to.exist;
			expect(body.errorId).to.equal(ErrorIds.forbidden);
			expect(body.status).to.equal(403);
		});

		it('Will return 409 when creating a tank profile with a name that has already been used', async () => {
			const existingProfile = new Tank(fakeTank(account.user.id));
			await existingProfile.save();

			const newProfile = fakeTank();
			newProfile.name = existingProfile.name;

			const { body } = await request(App)
				.post('/tanks')
				.set(...account.authHeader)
				.send(newProfile)
				.expect(409);

			expect(body).to.exist;
			expect(body.fieldName).to.equal('name');
			expect(body.errorId).to.equal(ErrorIds.conflict);
			expect(body.status).to.equal(409);
		});

		it('Will return 500 if a server error occurs', async () => {
			stub = sinon.stub(Tank.prototype, 'save');
			stub.rejects('nope');

			const newProfile = fakeTank();
			const { body } = await request(App)
				.post('/tanks')
				.set(...account.authHeader)
				.send(newProfile)
				.expect(500);

			expect(body).to.exist;
			expect(body.errorId).to.equal(ErrorIds.serverError);
			expect(body.status).to.equal(500);
			expect(body.logId).to.exist;
		});
	});

	describe('PUT /tanks/:tankId', () => {
		let tankProfile = null;

		beforeEach(async () => {
			tankProfile = new Tank(fakeTank(account.user.id));
			await tankProfile.save();
		});

		it('Will update an existing tank profile', async () => {
			const update = fakeTank();

			await request(App)
				.put(`/tanks/${ tankProfile.id }`)
				.set(...account.authHeader)
				.send(update)
				.expect(204);

			const expected = {
				...update,
				tankId: tankProfile.id,
				isCustom: true
			};
			const result = await Tank.findById(tankProfile.id);
			expect(result.toCleanJSON()).to.eql(expected);
		});

		it('Will return 400 if tank profile validation fails', async () => {
			const update = fakeTank();
			update.workingPressure = '300bar';

			const { body } = await request(App)
				.put(`/tanks/${ tankProfile.id }`)
				.set(...account.authHeader)
				.send(update)
				.expect(400);

			expect(body).to.exist;
			expect(body.errorId).to.equal(ErrorIds.badRequest);
			expect(body.status).to.equal(400);
		});

		it('Will return 401 if user is unauthenticated', async () => {
			const update = fakeTank();
			const { body } = await request(App)
				.put(`/tanks/${ tankProfile.id }`)
				.send(update)
				.expect(401);

			expect(body).to.exist;
			expect(body.errorId).to.equal(ErrorIds.notAuthorized);
			expect(body.status).to.equal(401);
		});

		it('Will return 404 if the tank profile belongs to another user', async () => {
			const otherUsersTank = new Tank(fakeTank(fakeMongoId()));
			await otherUsersTank.save();

			const update = fakeTank();
			const { body } = await request(App)
				.put(`/tanks/${ otherUsersTank.id }`)
				.set(...account.authHeader)
				.send(update)
				.expect(404);

			expect(body).to.exist;
			expect(body.errorId).to.equal(ErrorIds.notFound);
			expect(body.status).to.equal(404);
		});

		it('Will return 409 if the tank profile is renamed and the new name is taken', async () => {
			const otherTank = new Tank(fakeTank(account.user.id));
			await otherTank.save();

			const update = fakeTank();
			update.name = otherTank.name;

			const { body } = await request(App)
				.put(`/tanks/${ tankProfile.id }`)
				.set(...account.authHeader)
				.send(update)
				.expect(409);

			expect(body).to.exist;
			expect(body.fieldName).to.equal('name');
			expect(body.errorId).to.equal(ErrorIds.conflict);
			expect(body.status).to.equal(409);
		});

		it('Will allow different users to have tank profiles with the same name', async () => {
			const otherTank = new Tank(fakeTank(fakeMongoId()));
			await otherTank.save();

			const update = fakeTank();
			update.name = otherTank.name;

			await request(App)
				.put(`/tanks/${ tankProfile.id }`)
				.set(...account.authHeader)
				.send(update)
				.expect(204);

			const expected = {
				...update,
				tankId: tankProfile.id,
				isCustom: true
			};
			const result = await Tank.findById(tankProfile.id);
			expect(result.toCleanJSON()).to.eql(expected);
		});

		it('Will return 404 if the tank profile is not found', async () => {
			const update = fakeTank();
			const { body } = await request(App)
				.put(`/tanks/${ fakeMongoId() }`)
				.set(...account.authHeader)
				.send(update)
				.expect(404);

			expect(body).to.exist;
			expect(body.errorId).to.equal(ErrorIds.notFound);
			expect(body.status).to.equal(404);
		});

		it('Will return 500 if a server error occurs', async () => {
			stub = sinon.stub(Tank.prototype, 'save');
			stub.rejects('Nope');

			const update = fakeTank();

			const { body } = await request(App)
				.put(`/tanks/${ tankProfile.id }`)
				.set(...account.authHeader)
				.send(update)
				.expect(500);

			expect(body).to.exist;
			expect(body.errorId).to.equal(ErrorIds.serverError);
			expect(body.status).to.equal(500);
			expect(body.logId).to.exist;
		});
	});

	describe('DELETE /tanks/:tankId', () => {
		it('Will delete the indicated tank profile', async () => {
			const tankProfile = new Tank(fakeTank(account.user.id));
			await tankProfile.save();

			await request(App)
				.del(`/tanks/${ tankProfile.id }`)
				.set(...account.authHeader)
				.expect(204);

			const result = await Tank.findById(tankProfile._id);
			expect(result).to.not.exist;
		});

		it('Will return 401 if the user is not authenticated', async () => {
			const tankProfile = new Tank(fakeTank(account.user.id));
			await tankProfile.save();

			const { body } = await request(App)
				.del(`/tanks/${ tankProfile.id }`)
				.expect(401);

			expect(body).to.exist;
			expect(body.errorId).to.equal(ErrorIds.notAuthorized);
			expect(body.status).to.equal(401);
		});

		it('Will return 404 if the tank profile does not exist', async () => {
			const { body } = await request(App)
				.del(`/tanks/${ fakeMongoId() }`)
				.set(...account.authHeader)
				.expect(404);

			expect(body).to.exist;
			expect(body.errorId).to.equal(ErrorIds.notFound);
			expect(body.status).to.equal(404);
		});

		it('Will return 404 if the tank profile belongs to another user', async () => {
			const tankProfile = new Tank(fakeTank(fakeMongoId()));
			await tankProfile.save();

			const { body } = await request(App)
				.del(`/tanks/${ tankProfile.id }`)
				.set(...account.authHeader)
				.expect(404);

			expect(body).to.exist;
			expect(body.errorId).to.equal(ErrorIds.notFound);
			expect(body.status).to.equal(404);
		});

		it('Will return 500 if a server error occurs', async () => {
			stub = sinon.stub(mongoose.Model, 'findOneAndDelete');
			stub.rejects('nope');

			const tankProfile = new Tank(fakeTank(account.user.id));
			await tankProfile.save();

			const { body } = await request(App)
				.del(`/tanks/${ tankProfile.id }`)
				.set(...account.authHeader)
				.expect(500);

			expect(body).to.exist;
			expect(body.errorId).to.equal(ErrorIds.serverError);
			expect(body.status).to.equal(500);
			expect(body.logId).to.exist;
		});
	});
});
