import { App } from '../../service/server';
import { ErrorIds } from '../../service/utils/error-response';
import { expect } from 'chai';
import fakeUser from '../util/fake-user';
import moment from 'moment';
import request from 'supertest';
import sinon from 'sinon';
import User from '../../service/data/user';

describe('Search user tests', () => {
	const users = [];
	let stub = null;

	before(async () => {
		users.push(new User(fakeUser()));
		await users[0].save();
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

	it('Returns a result if a username matches', async () => {
		const response = await request(App)
			.get('/search/users')
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
			.get('/search/users')
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
			.get('/search/users')
			.query({ query: 'lol.i.dunno' })
			.expect(200);

		expect(response.body).to.be.an('array').and.be.empty;
	});

	it('Returns 400 if query parameter is missing', async () => {
		const response = await request(App)
			.get('/search/users')
			.expect(400);

		const result = response.body;
		expect(result).to.exist;
		expect(result.errorId).to.equal(ErrorIds.badRequest);
		expect(result.status).to.equal(400);
	});

	it('Returns 400 if query parameter is invalid', async () => {
		const response = await request(App)
			.get('/search/users')
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
			.get('/search/users')
			.query({ query: users[0].email })
			.expect(500);

		const result = response.body;
		expect(result).to.exist;
		expect(result.errorId).to.equal(ErrorIds.serverError);
		expect(result.status).to.equal(500);
		expect(result.logId).to.exist;
	});
});
