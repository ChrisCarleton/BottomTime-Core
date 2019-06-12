import { App } from '../../service/server';
import createFakeAccount from '../util/create-fake-account';
import { ErrorIds } from '../../service/utils/error-response';
import { expect } from 'chai';
import faker from 'faker';
import fakeUser from '../util/fake-user';
import { Login } from '../../service/controllers/auth.controller';
import request from 'supertest';
import Session from '../../service/data/session';
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
			expect(res.body.user).to.eql(User.cleanUpUser(user));

			res = await request(App)
				.get('/auth/me')
				.set('Authorization', `Bearer ${ res.body.token }`)
				.expect(200);
			expect(res.body).to.eql(User.cleanUpUser(user));
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

		it('Will return 409 if the e-mail address is already taken', async () => {
			// This can happen if a user signs in using an outside OAuth provider
			// which attempts to create a new account but the e-mail from the OAuth provider
			// is already registered to an existing account.
			let code = 0;
			let message = null;
			const req = {
				user: 'email-taken',
				logError: () => {} // eslint-disable-line no-empty-function
			};
			const res = {
				status: status => {
					code = status;
					return {
						json: m => {
							message = m;
						}
					};
				}
			};

			await Login(req, res);
			expect(code).to.equal(409);
			expect(message).to.exist;
			expect(message.status).to.equal(409);
			expect(message.fieldName).to.equal('email');
			expect(message.errorId).to.equal(ErrorIds.conflict);
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
			const user = await createFakeAccount();
			const result = await request(App)
				.get('/auth/me')
				.set(...user.authHeader)
				.expect(200);
			expect(result.body).to.eql(User.cleanUpUser(user.user));
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
