import { App } from '../../service/server';
import { ErrorIds } from '../../service/utils/error-response';
import { expect } from 'chai';
import faker from 'faker';
import fakeUser from '../util/fake-user';
import generateAuthHeader from '../util/generate-auth-header';
import request from 'supertest';
import sinon from 'sinon';
import User, { cleanUpUser } from '../../service/data/user';

describe('Auth Controller', () => {

	let stub = null;

	afterEach(done => {
		if (stub) {
			stub.restore();
			stub = null;
		}

		User.deleteMany({}, done);
	});

	describe('POST /auth/login', () => {

		it('Authenticates a user when username and password are correct', async () => {
			const password = faker.internet.password(12, false);
			const fake = fakeUser(password);
			const user = new User(fake);

			await user.save();
			const res = await request(App)
				.post('/auth/login')
				.send({
					username: fake.username,
					password
				})
				.expect(200);
			expect(res.body.token).to.exist;
			expect(res.body.user).to.eql(cleanUpUser(user));
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
			const fake = fakeUser();
			const user = new User(fake);
			await user.save();

			const result = await request(App)
				.get('/auth/me')
				.set(...generateAuthHeader(fake.username))
				.expect(200);
			expect(result.body).to.eql(cleanUpUser(user));
		});

		it('Returns Unauthorized if there is a problem accessing the database', async () => {
			const fake = fakeUser();
			const user = new User(fake);
			await user.save();

			stub = sinon.stub(User, 'findOne');
			stub.rejects('nope');

			await request(App)
				.get('/auth/me')
				.set(...generateAuthHeader(user.username))
				.expect(401);
		});
	});

	describe('POST /logout', () => {
		it('Kills an existing session', async () => {
			const fake = fakeUser();
			const user = new User(fake);

			await user.save();
			await request(App)
				.post('/auth/logout')
				.set(...generateAuthHeader(fake.username))
				.expect(204);

			const res = await request(App).get('/auth/me').expect(200);
			expect(res.body).to.eql(cleanUpUser(null));
		});

		it('Does nothing if there is no session', async () => {
			await request(App)
				.post('/auth/logout')
				.expect(204);
		});
	});
});
