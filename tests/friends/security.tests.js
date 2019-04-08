import { App } from '../../service/server';
import createFakeAccount from '../util/create-fake-account';
import fakeUser from '../util/fake-user';
import { ErrorIds } from '../../service/utils/error-response';
import { expect } from 'chai';
import faker from 'faker';
import Friend from '../../service/data/friend';
import request from 'supertest';
import Session from '../../service/data/session';
import User from '../../service/data/user';

function expect403Response(response) {
	const { body } = response;
	expect(body).to.exist;
	expect(body.status).to.equal(403);
	expect(body.errorId).to.equal(ErrorIds.forbidden);
}

describe('Friends API Security', () => {

	let privateUser = null;
	let friendsOnlyUser = null;
	let publicUser = null;
	let admin = null;
	let friends = null;

	before(async () => {
		[ privateUser, friendsOnlyUser, publicUser, admin ] = await Promise.all([
			createFakeAccount('user', 'private'),
			createFakeAccount('user', 'friends-only'),
			createFakeAccount('user', 'public'),
			createFakeAccount('admin')
		]);

		friends = new Array(3).fill(null).map(() => new User(fakeUser()));
		await User.insertMany(friends);
	});

	after(async () => {
		await Promise.all([
			Friend.deleteMany({}),
			Session.deleteMany({}),
			User.deleteMany({})
		]);
	});

	describe('GET /users/:username/friends', () => {

		beforeEach(async () => {
			const relations = [];
			friends.forEach(f => {
				[ privateUser, friendsOnlyUser, publicUser ].forEach(u => {
					relations.push(new Friend({
						user: u.user.username,
						friend: f.username,
						approved: true,
						requestedOn: faker.date.recent(60),
						evaluatedOn: faker.date.recent(60)
					}));
				});
			});
			await Friend.insertMany(relations);
		});

		afterEach(async () => {
			await Friend.deleteMany({});
		});

		it('Anonymous users cannot request private users\' friends', async () => {
			const response = await request(App)
				.get(`/users/${ privateUser.user.username }/friends`)
				.expect(403);
			expect403Response(response);
		});

		it('Anonymous users cannot request friends-only users\' friends', async () => {
			const response = await request(App)
				.get(`/users/${ friendsOnlyUser.user.username }/friends`)
				.expect(403);
			expect403Response(response);
		});

		it('Anonymous users can request public users\' friends', async () => {
			const response = await request(App)
				.get(`/users/${ publicUser.user.username }/friends`)
				.expect(200);

			expect(response.body).to.be.an('array');
			expect(response.body).to.have.lengthOf(friends.length);
		});

		it('Users cannot request private users\' friends if not friended', async () => {
			const response = await request(App)
				.get(`/users/${ privateUser.user.username }/friends`)
				.set(...publicUser.authHeader)
				.expect(403);
			expect403Response(response);
		});

		it('Users cannot request private users\' friends if friended', async () => {
			const relation = new Friend({
				user: privateUser.user.username,
				friend: publicUser.user.username,
				approved: true
			});
			await relation.save();

			const response = await request(App)
				.get(`/users/${ privateUser.user.username }/friends`)
				.set(...publicUser.authHeader)
				.expect(403);
			expect403Response(response);
		});

		it('Users cannot request friends-only users\'s friends if not friended', async () => {
			const response = await request(App)
				.get(`/users/${ friendsOnlyUser.user.username }/friends`)
				.set(...publicUser.authHeader)
				.expect(403);
			expect403Response(response);
		});

		it('Users can request friends-only users\' friends if friended', async () => {
			const relation = new Friend({
				user: friendsOnlyUser.user.username,
				friend: publicUser.user.username,
				approved: true
			});
			await relation.save();

			const response = await request(App)
				.get(`/users/${ friendsOnlyUser.user.username }/friends`)
				.set(...publicUser.authHeader)
				.expect(200);

			expect(response.body).to.be.an('array');
			expect(response.body).to.have.lengthOf(friends.length + 1);
		});

		it('Users can request public users\'s friends if not friended', async () => {
			const response = await request(App)
				.get(`/users/${ publicUser.user.username }/friends`)
				.set(...privateUser.authHeader)
				.expect(200);

			expect(response.body).to.be.an('array');
			expect(response.body).to.have.lengthOf(friends.length);
		});

		it('Users can request public users\' friends if friended', async () => {
			const relation = new Friend({
				user: publicUser.user.username,
				friend: privateUser.user.username,
				approved: true
			});
			await relation.save();

			const response = await request(App)
				.get(`/users/${ publicUser.user.username }/friends`)
				.set(...privateUser.authHeader)
				.expect(200);

			expect(response.body).to.be.an('array');
			expect(response.body).to.have.lengthOf(friends.length + 1);
		});

		it('Admins can request private users\' friends', async () => {
			const response = await request(App)
				.get(`/users/${ privateUser.user.username }/friends`)
				.set(...admin.authHeader)
				.expect(200);

			expect(response.body).to.be.an('array');
			expect(response.body).to.have.lengthOf(friends.length);
		});

		it('Admins can request friends-only users\' friends', async () => {
			const response = await request(App)
				.get(`/users/${ friendsOnlyUser.user.username }/friends`)
				.set(...admin.authHeader)
				.expect(200);

			expect(response.body).to.be.an('array');
			expect(response.body).to.have.lengthOf(friends.length);
		});

		it('Admins can request public users\' friends', async () => {
			const response = await request(App)
				.get(`/users/${ publicUser.user.username }/friends`)
				.set(...admin.authHeader)
				.expect(200);

			expect(response.body).to.be.an('array');
			expect(response.body).to.have.lengthOf(friends.length);
		});
	});
});
