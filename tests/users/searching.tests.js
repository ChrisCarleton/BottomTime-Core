import _ from 'lodash';
import { App } from '../../service/server';
import createFakeAccount from '../util/create-fake-account';
import { ErrorIds } from '../../service/utils/error-response';
import { expect } from 'chai';
import fakeUser from '../util/fake-user';
import moment from 'moment';
import request from 'supertest';
import Session from '../../service/data/session';
import sinon from 'sinon';
import User from '../../service/data/user';

describe('User searching', () => {
	let adminUser = null;
	let regularUser = null;
	let users = new Array(198);
	let expectedUsers = null;
	let stub = null;

	before(async () => {
		[ adminUser, regularUser ] = await Promise.all([
			createFakeAccount('admin'),
			createFakeAccount()
		]);

		for (let i = 0; i < users.length; i++) {
			users[i] = new User(fakeUser());
		}
		await User.insertMany(users);

		users.push(adminUser.user);
		users.push(regularUser.user);
		users = _.sortBy(users, [ 'username' ]);
		expectedUsers = users.map(u => {
			const json = _.pick(u, [
				'username',
				'email',
				'role',
				'isLockedOut'
			]);
			json.hasPassword = typeof u.passwordHash === 'string';
			json.createdAt = moment(u.createdAt).toISOString();
			json.isAnonymous = false;

			return json;
		});
	});

	afterEach(() => {
		if (stub) {
			stub.restore();
			stub = null;
		}
	});

	after(async () => {
		await Promise.all([
			Session.deleteMany({}),
			User.deleteMany({})
		]);
	});

	describe('As the Anonymous User', () => {
		it('Anonymous users receive a 401 error', async () => {
			const response = await request(App)
				.get('/users')
				.expect(401);

			const result = response.body;
			expect(result).to.exist;
			expect(result.status).to.equal(401);
			expect(result.errorId).to.equal(ErrorIds.notAuthorized);
		});
	});

	describe('As administrator', () => {
		it('Gets a page of users', async () => {
			const response = await request(App)
				.get('/users')
				.set(...adminUser.authHeader)
				.query({ count: 50 })
				.expect(200);

			const results = response.body;
			const expected = expectedUsers.slice(0, 50);
			expect(results).to.be.an('array').and.have.a.lengthOf(50);
			for (let i = 0; i < results.length; i++) {
				expect(expected[i]).to.eql(results[i]);
			}
		});

		it('Can sort by username in descending order', async () => {
			const response = await request(App)
				.get('/users')
				.set(...adminUser.authHeader)
				.query({
					count: 50,
					sortBy: 'username',
					sortOrder: 'desc'
				})
				.expect(200);

			const results = response.body;
			const expected = _.orderBy(expectedUsers.slice(expectedUsers.length - 50), 'username', 'desc');
			expect(results).to.be.an('array').and.have.a.lengthOf(50);
			for (let i = 0; i < results.length; i++) {
				expect(expected[i]).to.eql(results[i], `Failed ${ i }`);
			}
		});

		it('Can load additional pages of information in ascending order', async () => {
			const response = await request(App)
				.get('/users')
				.set(...adminUser.authHeader)
				.query({
					count: 50,
					lastSeen: expectedUsers[49].username
				})
				.expect(200);

			const results = response.body;
			const expected = expectedUsers.slice(50, 100);
			expect(results).to.be.an('array').and.have.a.lengthOf(50);
			for (let i = 0; i < results.length; i++) {
				expect(expected[i]).to.eql(results[i]);
			}
		});

		it('Can load additional pages of information in descending order', async () => {
			const response = await request(App)
				.get('/users')
				.set(...adminUser.authHeader)
				.query({
					count: 50,
					sortBy: 'username',
					sortOrder: 'desc',
					lastSeen: expectedUsers[expectedUsers.length - 50].username
				})
				.expect(200);

			const results = response.body;
			const expected = _.orderBy(
				expectedUsers.slice(expectedUsers.length - 100, expectedUsers.length - 50),
				'username',
				'desc');
			expect(results).to.be.an('array').and.have.a.lengthOf(50);
			for (let i = 0; i < results.length; i++) {
				expect(expected[i]).to.eql(results[i]);
			}
		});

		it('Can search for a username', async () => {
			const response = await request(App)
				.get('/users')
				.set(...adminUser.authHeader)
				.query({
					query: expectedUsers[61].username
				})
				.expect(200);

			expect(response.body).to.be.an('array').and.to.have.a.lengthOf(1);
			const [ result ] = response.body;
			expect(expectedUsers[61]).to.eql(result);
		});

		it('Can search for an e-mail address', async () => {
			const response = await request(App)
				.get('/users')
				.set(...adminUser.authHeader)
				.query({
					query: expectedUsers[61].email
				})
				.expect(200);

			expect(response.body).to.be.an('array').and.to.have.a.lengthOf(1);
			const [ result ] = response.body;
			expect(expectedUsers[61]).to.eql(result);
		});

		it.skip('Can search for a partial username', async () => {
			// TODO: Find a safe way to do this.
		});

		it.skip('Can search for a partial e-mail address', async () => {
			// TODO: Find a safe way to do this.
		});

		it('Returns 400 if query string is malformed', async () => {
			const response = await request(App)
				.get('/users')
				.set(...adminUser.authHeader)
				.query({ sortBy: 'favouriteIceCream' })
				.expect(400);

			const result = response.body;
			expect(result).to.exist;
			expect(result.errorId).to.equal(ErrorIds.badRequest);
			expect(result.status).to.equal(400);
		});

		it('Returns 500 if a server error occurs while performing search', async () => {
			stub = sinon.stub(User.prototype, 'getAccountJSON');
			stub.throws(new Error('nope'));

			const response = await request(App)
				.get('/users')
				.set(...adminUser.authHeader)
				.expect(500);

			const result = response.body;
			expect(result).to.exist;
			expect(result.errorId).to.equal(ErrorIds.serverError);
			expect(result.status).to.equal(500);
			expect(result.logId).to.exist;
		});
	});

	describe('As a regular user', () => {
		it('Returns a result if a username matches', async () => {
			const response = await request(App)
				.get('/users')
				.set(...regularUser.authHeader)
				.query({ query: users[0].username.toUpperCase() })
				.expect(200);

			const [ result ] = response.body;
			expect(result).to.exist;
			expect(result.username).to.equal(users[0].username);
			expect(result.email).to.not.exist;
			expect(result.memberSince).to.equal(moment(users[0].createdAt).toISOString());
		});

		it('Returns a result if e-mail address matches', async () => {
			const response = await request(App)
				.get('/users')
				.set(...regularUser.authHeader)
				.query({ query: users[0].email.toUpperCase() })
				.expect(200);

			const [ result ] = response.body;
			expect(result).to.exist;
			expect(result.username).to.equal(users[0].username);
			expect(result.email).to.equal(users[0].email);
			expect(result.memberSince).to.equal(moment(users[0].createdAt).toISOString());
		});

		it('Returns an empty array if nothing matches', async () => {
			const response = await request(App)
				.get('/users')
				.set(...regularUser.authHeader)
				.query({ query: 'lol.i.dunno' })
				.expect(200);

			expect(response.body).to.be.an('array').and.be.empty;
		});

		it('Returns 400 if query parameter is missing', async () => {
			const response = await request(App)
				.get('/users')
				.set(...regularUser.authHeader)
				.expect(400);

			const result = response.body;
			expect(result).to.exist;
			expect(result.errorId).to.equal(ErrorIds.badRequest);
			expect(result.status).to.equal(400);
		});

		it('Returns 400 if query parameter is invalid', async () => {
			const response = await request(App)
				.get('/users')
				.set(...regularUser.authHeader)
				.query({ query: 'wat? This can\'t be right!!' })
				.expect(400);

			const result = response.body;
			expect(result).to.exist;
			expect(result.errorId).to.equal(ErrorIds.badRequest);
			expect(result.status).to.equal(400);
		});

		it('Returns 500 if a server error occurs', async () => {
			stub = sinon.stub(User, 'find');
			stub.rejects('nope');

			const response = await request(App)
				.get('/users')
				.set(...regularUser.authHeader)
				.query({ query: users[0].email })
				.expect(500);

			const result = response.body;
			expect(result).to.exist;
			expect(result.errorId).to.equal(ErrorIds.serverError);
			expect(result.status).to.equal(500);
			expect(result.logId).to.exist;
		});
	});
});
