import { App } from '../../service/server';
import createFakeAccount from '../util/create-fake-account';
import { ErrorIds } from '../../service/utils/error-response';
import { expect } from 'chai';
import faker from 'faker';
import fakeUser from '../util/fake-user';
import request from 'supertest';
import Session from '../../service/data/session';
import sinon from 'sinon';
import User, { cleanUpUser } from '../../service/data/user';

describe('Auth Controller', () => {

	let stub = null;

	afterEach(async () => {
		if (stub) {
			stub.restore();
			stub = null;
		}

		await User.deleteMany({});
		await Session.deleteMany({});
	});

	describe('POST /auth/login', () => {

		it('Authenticates a user when username and password are correct', async () => {
			const password = faker.internet.password(12, false);
			const fake = fakeUser(password);
			const user = new User(fake);

			await user.save();
			let res = await request(App)
				.post('/auth/login')
				.send({
					username: fake.username,
					password
				})
				.expect(200);
			expect(res.body.token).to.exist;
			expect(res.body.user).to.eql(cleanUpUser(user));

			res = await request(App)
				.get('/auth/me')
				.set('Authorization', `Bearer ${ res.body.token }`)
				.expect(200);
			expect(res.body).to.eql(cleanUpUser(user));
		});

		it('Fails when user cannot be found', async () => {
			const password = faker.internet.password(12, false);
			const fake = fakeUser(password);

			const res = await request(App)
				.post('/auth/login')
				.send({
					username: fake.username,
					password
				})
				.expect(401);
			expect(res.status).to.equal(401);
			expect(res.body.status).to.equal(401);
			expect(res.body.errorId).to.equal(ErrorIds.notAuthorized);
		});

		it('Fails when password is incorrect', async () => {
			const password = faker.internet.password(12, false);
			const fake = fakeUser(password);
			const user = new User(fake);

			await user.save();
			const res = await request(App)
				.post('/auth/login')
				.send({
					username: fake.username,
					password: 'Wr0ng.P@ss3rd'
				})
				.expect(401);
			expect(res.body.status).to.equal(401);
			expect(res.body.errorId).to.equal(ErrorIds.notAuthorized);
		});

		it('Returns Bad Request if validation fails', async () => {
			const res = await request(App)
				.post('/auth/login')
				.send({
					user: 'wat?',
					password: 53,
					lol: 'not valid'
				})
				.expect(400);
			expect(res.status).to.equal(400);
			expect(res.body.status).to.equal(400);
			expect(res.body.errorId).to.equal(ErrorIds.badRequest);
		});

		it('Returns Server Error if something goes wrong in the database', async () => {
			const password = faker.internet.password(12, false);
			const fake = fakeUser(password);

			stub = sinon.stub(User, 'findOne');
			stub.rejects('nope');

			const res = await request(App)
				.post('/auth/login')
				.send({
					username: fake.username,
					password
				})
				.expect(500);
			expect(res.body.status).to.equal(500);
			expect(res.body.errorId).to.equal(ErrorIds.serverError);
			expect(res.body.logId).to.exist;
		});
	});

	describe('GET /auth/me', () => {
		it('Returns anonymous user information if user is not authenticated', async () => {
			const res = await request(App)
				.get('/auth/me')
				.expect(200);
			expect(res.body).to.eql(cleanUpUser(null));
		});

		it('Returns user information for authenticated users', async () => {
			const user = await createFakeAccount();
			const result = await request(App)
				.get('/auth/me')
				.set(...user.authHeader)
				.expect(200);
			expect(result.body).to.eql(cleanUpUser(user.user));
		});

		it('Returns Server Error if there is a problem accessing the database', async () => {
			const user = await createFakeAccount();

			stub = sinon.stub(User, 'findOne');
			stub.rejects('nope');

			await request(App)
				.get('/auth/me')
				.set(...user.authHeader)
				.expect(500);
		});
	});

	describe('POST /logout', () => {
		it('Kills an existing session', async () => {
			const account = await createFakeAccount();

			await request(App)
				.post('/auth/logout')
				.set(...account.authHeader)
				.expect(204);

			await request(App)
				.get('/auth/me')
				.set(...account.authHeader)
				.expect(401);
		});

		it('Does nothing if there is no session', async () => {
			await request(App)
				.post('/auth/logout')
				.expect(204);
		});

		it('Returns Server Error if something goes wrong', async () => {
			const account = await createFakeAccount();

			stub = sinon.stub(Session, 'deleteOne');
			stub.rejects('nope');

			await request(App)
				.post('/auth/logout')
				.set(...account.authHeader)
				.expect(500);
		});
	});
});
