import { App } from '../../service/server';
import createFakeAccount from '../util/create-fake-account';
import { ErrorIds } from '../../service/utils/error-response';
import { expect } from 'chai';
import faker from 'faker';
import fakeUser from '../util/fake-user';
import request from 'supertest';
import sinon from 'sinon';
import User from '../../service/data/user';

describe('Auth Controller', () => {

	let stub = null;

	afterEach(async () => {
		if (stub) {
			stub.restore();
			stub = null;
		}

		await User.deleteMany({});
	});

	describe('POST /auth/login', () => {

		it('Authenticates a user when username and password are correct', async () => {
			const password = faker.internet.password(12, false);
			const fake = fakeUser(password);
			const user = new User(fake);

			await user.save();

			const agent = request.agent(App);
			let res = await agent
				.post('/auth/login')
				.send({
					username: fake.username,
					password
				})
				.expect(200);
			expect(res.body).to.eql(user.getFullAccountJSON());

			res = await agent
				.get('/auth/me')
				.expect(200);
			expect(res.body).to.eql(user.getFullAccountJSON());
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

			const { body } = await request(App)
				.post('/auth/login')
				.send({
					username: fake.username,
					password
				})
				.expect(500);

			expect(body).to.be.a.serverErrorResponse;
		});

	});

	describe('GET /auth/me', () => {
		it('Returns anonymous user information if user is not authenticated', async () => {
			const res = await request(App)
				.get('/auth/me')
				.expect(200);
			expect(res.body).to.eql(User.cleanUpUser(null));
		});

		it('Returns user information for authenticated users', async () => {
			const account = await createFakeAccount();
			const result = await request(App)
				.get('/auth/me')
				.set(...account.authHeader)
				.expect(200);
			expect(result.body).to.eql(account.user.getFullAccountJSON());
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

			const { body } = await request(App)
				.get('/auth/me')
				.set(...account.authHeader)
				.expect(200);

			expect(body.username).to.equal('Anonymous_User');
		});

		it('Does nothing if there is no session', async () => {
			await request(App)
				.post('/auth/logout')
				.expect(204);
		});
	});

	describe('POST /auth/resetPassword', () => {
		it('Will return 400 if request body is missing', async () => {

		});

		it('Will return 400 if email field is missing', async () => {

		});

		it('Will return 400 if email address is empty', async () => {

		});

		it('Will return 400 if email address is invalid', async () => {

		});

		it('Will return 204 if email address does not match a user account', async () => {

		});

		it('Will return 204, create a token, and send an email if email address matches an account', async () => {

		});

		it('Will return 500 if something goes wrong', async () => {

		});
	});
});
