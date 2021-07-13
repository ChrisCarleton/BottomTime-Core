import _ from 'lodash';
import { App } from '../../service/server';
import createFakeAccount from '../util/create-fake-account';
import { ErrorIds } from '../../service/utils/error-response';
import { expect } from 'chai';
import fakeUser from '../util/fake-user';
import moment from 'moment';
import request from 'supertest';
import searchUtils from '../../service/utils/search-utils';
import sinon from 'sinon';
import User from '../../service/data/user';

function toSearchResult(user) {
	const result = {
		createdAt: moment(user.createdAt).utc().toISOString(),
		..._.pick(user, [
			'username',
			'email',
			'role',
			'isLockedOut',
			'logsVisibility',
			'firstName',
			'lastName'
		])
	};

	return result;
}

describe('User searching', () => {
	const users = new Array(198);
	let adminUser = null;
	let regularUser = null;
	let stub = null;

	before(async () => {
		await User.deleteMany({});
		await User.esSynchronize();

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

		await User.esSynchronize();
	});

	afterEach(() => {
		if (stub) {
			stub.restore();
			stub = null;
		}
	});

	after(async () => {
		await User.deleteMany({});
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
			const count = 50;
			const { body } = await request(App)
				.get('/users')
				.set(...adminUser.authHeader)
				.query({ count })
				.expect(200);

			expect(body).to.be.an('array').and.have.a.lengthOf(count);
			expect(body).to.be.descendingBy('score');
		});

		[
			'relevance',
			'created'
			// TODO: Fix this: 'username'
		].forEach(sortBy => {
			[ 'asc', 'desc' ].forEach(sortOrder => {
				it(`Can return results sorted by ${ sortBy } (${ sortOrder })`, async () => {
					const count = 25;
					const { body } = await request(App)
						.get('/users')
						.set(...adminUser.authHeader)
						.query({ count, sortBy, sortOrder })
						.expect(200);

					let sortProperty = 'score';
					switch (sortBy) {
					case 'username':
						sortProperty = 'username';
						break;

					case 'created':
						sortProperty = 'createdAt';
						break;

					default:
					}

					expect(body).to.be.an('array').and.have.a.lengthOf(count);
					expect(body).to.be.sortedBy(sortProperty, { descending: sortOrder === 'desc' });
				});
			});
		});

		it('Can load additional pages of information', async () => {
			const count = 50;
			const sortBy = 'username';
			const sortOrder = 'desc';
			const firstResponse = await request(App)
				.get('/users')
				.set(...adminUser.authHeader)
				.query({ count, sortBy, sortOrder })
				.expect(200);

			const secondResponse = await request(App)
				.get('/users')
				.set(...adminUser.authHeader)
				.query({ count, skip: count, sortBy, sortOrder })
				.expect(200);

			const results = [ ...firstResponse.body, ...secondResponse.body ];
			expect(results).to.have.a.lengthOf(count * 2);
			expect(results).to.be.descendingBy('username');
		});

		it('Can perform a text search for a username', async () => {
			const { body } = await request(App)
				.get('/users')
				.set(...adminUser.authHeader)
				.query({
					query: users[61].username
				})
				.expect(200);

			expect(body).to.be.an('array');
			expect(body[0]).to.eql({
				...toSearchResult(users[61]),
				score: body[0].score
			});
		});

		it('Can perform a text search for an e-mail address', async () => {
			const { body } = await request(App)
				.get('/users')
				.set(...adminUser.authHeader)
				.query({
					query: users[61].email
				})
				.expect(200);

			expect(body).to.be.an('array');
			expect(body[0]).to.eql({
				...toSearchResult(users[61]),
				score: body[0].score
			});
		});

		[ true, false ].forEach(isLockedOut => {
			it(`Can filter on isLockedOut === ${ isLockedOut }`, async () => {
				const { body } = await request(App)
					.get('/users')
					.set(...adminUser.authHeader)
					.query({
						count: 200,
						lockedOut: isLockedOut
					})
					.expect(200);

				expect(body.length).to.be.at.least(1);
				body.forEach(user => {
					expect(user.isLockedOut).to.equal(isLockedOut);
				});
			});
		});

		[ 'user', 'admin' ].forEach(role => {
			it(`Can filter on role === ${ role }`, async () => {
				const { body } = await request(App)
					.get('/users')
					.set(...adminUser.authHeader)
					.query({
						count: 200,
						role
					})
					.expect(200);

				expect(body.length).to.be.at.least(1);
				body.forEach(user => {
					expect(user.role).to.equal(role);
				});
			});
		});

		[ 'private', 'friends-only', 'public' ].forEach(logsVisibility => {
			it(`Can filter on logsVisibility === ${ logsVisibility }`, async () => {
				const { body } = await request(App)
					.get('/users')
					.set(...adminUser.authHeader)
					.query({
						count: 200,
						logsVisibility
					})
					.expect(200);

				expect(body).to.be.an('array');
				body.forEach(user => {
					expect(user.logsVisibility).to.equal(logsVisibility);
				});
			});
		});

		it('Returns 400 if query string is malformed', async () => {
			const { body } = await request(App)
				.get('/users')
				.set(...adminUser.authHeader)
				.query({ sortBy: 'favouriteIceCream' })
				.expect(400);

			expect(body).to.be.a.badRequestResponse;
		});

		it('Returns 500 if a server error occurs while performing search', async () => {
			stub = sinon.stub(searchUtils, 'getBaseQuery');
			stub.throws(new Error('nope'));

			const { body } = await request(App)
				.get('/users')
				.set(...adminUser.authHeader)
				.expect(500);

			expect(body).to.be.a.serverErrorResponse;
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
			expect(result.createdAt).to.equal(moment(users[0].createdAt).toISOString());
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
			expect(result.createdAt).to.equal(moment(users[0].createdAt).toISOString());
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

	// describe('Auto-complete search', () => {
	// 	it('Can search for a partial username', async () => {
	// 		const { body } = await request(App)
	// 			.get('/users')
	// 			.set(...adminUser.authHeader)
	// 			.query({
	// 				count: 15,
	// 				autocomplete: `${ users[61].username.substr(0, users[61].username.length - 4) }*`
	// 			})
	// 			.expect(200);

	// 		expect(body).to.be.an('array').and.not.be.empty;
	// 		body.forEach(r => delete r.score);
	// 		expect(body).to.contain(toSearchResult(users[61]));
	// 	});

	// 	it.skip('Can search for a partial e-mail address', async () => {
	// 		// TODO: Find a safe way to do this.
	// 	});
	// });
});
