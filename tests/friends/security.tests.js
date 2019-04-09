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

function expect401Response(response) {
	const { body } = response;
	expect(body).to.exist;
	expect(body.status).to.equal(401);
	expect(body.errorId).to.equal(ErrorIds.notAuthorized);
}

describe('Friends API Security', () => {

	let privateUser = null;
	let friendsOnlyUser = null;
	let publicUser = null;
	let admin = null;
	let friends = null;

	async function friendEveryone() {
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
	}

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

		beforeEach(friendEveryone);

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

	describe('DELETE /users/:username/friends', () => {
		beforeEach(friendEveryone);

		afterEach(async () => {
			await Friend.deleteMany({});
		});

		it('Anonymous users cannot delete friends', async () => {
			const response = await request(App)
				.del(`/users/${ publicUser.user.username }/friends`)
				.send([ friends[0].username, friends[1].username ])
				.expect(401);
			expect401Response(response);
		});

		it('Users cannot delete other users\' friends', async () => {
			const response = await request(App)
				.del(`/users/${ publicUser.user.username }/friends`)
				.set(...privateUser.authHeader)
				.send([ friends[0].username, friends[1].username ])
				.expect(403);
			expect403Response(response);
		});

		it('Users cannot delete other users\' friends if friended', async () => {
			const relation = new Friend({
				user: publicUser.user.username,
				friend: privateUser.user.username,
				approved: true,
				requestedOn: new Date(),
				evaluatedOn: new Date()
			});
			await relation.save();

			const response = await request(App)
				.del(`/users/${ publicUser.user.username }/friends`)
				.set(...privateUser.authHeader)
				.send([ friends[0].username, friends[1].username ])
				.expect(403);
			expect403Response(response);
		});

		it('Admins can delete other users\' friends', async () => {
			await request(App)
				.del(`/users/${ publicUser.user.username }/friends`)
				.set(...admin.authHeader)
				.send([ friends[0].username, friends[1].username ])
				.expect(204);

			const results = await Friend.find({ user: publicUser.user.username });
			expect(results).to.have.lengthOf(1);
		});
	});

	describe('DELETE /users/:username/friends/:friendName', () => {
		beforeEach(friendEveryone);

		afterEach(async () => {
			await Friend.deleteMany({});
		});

		it('Anonymous users cannot delete friends', async () => {
			const response = await request(App)
				.del(`/users/${ publicUser.user.username }/friends/${ friends[0].username }`)
				.expect(401);
			expect401Response(response);
		});

		it('Users cannot delete other users\' friends', async () => {
			const response = await request(App)
				.del(`/users/${ publicUser.user.username }/friends/${ friends[0].username }`)
				.set(...privateUser.authHeader)
				.expect(403);
			expect403Response(response);
		});

		it('Users cannot delete other users\' friends if friended', async () => {
			const relation = new Friend({
				user: publicUser.user.username,
				friend: privateUser.user.username,
				approved: true,
				requestedOn: new Date(),
				evaluatedOn: new Date()
			});
			await relation.save();

			const response = await request(App)
				.del(`/users/${ publicUser.user.username }/friends/${ friends[0].username }`)
				.set(...privateUser.authHeader)
				.expect(403);
			expect403Response(response);
		});

		it('Admins can delete other users\' friends', async () => {
			await request(App)
				.del(`/users/${ publicUser.user.username }/friends/${ friends[0].username }`)
				.set(...admin.authHeader)
				.expect(204);

			const result = await Friend.findOne({
				user: publicUser.user.username,
				friend: friends[0].username
			});
			expect(result).to.be.null;
		});
	});

	describe('PUT /users/:username/friends/:friendName', () => {
		afterEach(async () => {
			await Friend.deleteMany({});
		});

		it('Anonymous users cannot create friend requests', async () => {
			const response = await request(App)
				.put(`/users/${ publicUser.user.username }/friends/${ privateUser.user.username }`)
				.expect(401);
			expect401Response(response);
		});

		[
			{ type: 'private', to: () => privateUser, from: () => publicUser },
			{ type: 'friends-only', to: () => friendsOnlyUser, from: () => privateUser },
			{ type: 'public', to: () => publicUser, from: () => privateUser }
		].forEach(t =>
			it(`Users can create friend requests for "${ t.type }" users`, async () => {
				await request(App)
					.put(`/users/${ t.from().user.username }/friends/${ t.to().user.username }`)
					.set(...t.from().authHeader)
					.expect(204);

				const friendRequest = await Friend.findOne({
					user: t.from().user.username,
					friend: t.to().user.username
				});
				expect(friendRequest).to.exist;
			})
		);

		[
			{ type: 'private', to: () => privateUser, from: () => publicUser },
			{ type: 'friends-only', to: () => friendsOnlyUser, from: () => privateUser },
			{ type: 'public', to: () => publicUser, from: () => privateUser }
		].forEach(t =>
			it(`Users cannot create friend requests from "${ t.type }" users to themselves`, async () => {
				const response = await request(App)
					.put(`/users/${ t.to().user.username }/friends/${ t.from().user.username }`)
					.set(...t.from().authHeader)
					.expect(403);
				expect403Response(response);

				const friendRequest = await Friend.findOne({
					user: t.to().user.username,
					friend: t.from().user.username
				});
				expect(friendRequest).to.not.exist;
			})
		);

		it('Users cannot request to be friends with themselves', async () => {
			const response = await request(App)
				.put(`/users/${ privateUser.user.username }/friends/${ privateUser.user.username }`)
				.set(...privateUser.authHeader)
				.expect(400);
			const { body } = response;
			expect(body).to.exist;
			expect(body.status).to.equal(400);
			expect(body.errorId).to.equal(ErrorIds.badRequest);
		});
	});

	describe('POST /users/:username/friends/:friendName/[approve/reject]', () => {
		afterEach(async () => {
			await Friend.deleteMany({});
		});

		[ 'approve', 'reject' ].forEach(t => {
			it(`Anonymous users cannot ${ t } friend requests`, async () => {
				const friendRequest = new Friend({
					user: friendsOnlyUser.user.username,
					friend: publicUser.user.username,
					requestedOn: new Date()
				});
				await friendRequest.save();

				const response = await request(App)
					.post(`/users/${ friendsOnlyUser.user.username }/friends/${ publicUser.user.username }/${ t }`)
					.send({ reason: 'For the lulz.' })
					.expect(401);
				expect401Response(response);
			});

			it(`Users cannot ${ t } friend requests for other users`, async () => {
				const friendRequest = new Friend({
					user: friendsOnlyUser.user.username,
					friend: publicUser.user.username,
					requestedOn: new Date()
				});
				await friendRequest.save();

				const response = await request(App)
					.post(`/users/${ friendsOnlyUser.user.username }/friends/${ publicUser.user.username }/${ t }`)
					.send({ reason: 'For the lulz.' })
					.set(...privateUser.authHeader)
					.expect(403);
				expect403Response(response);
			});

			it(`Users cannot ${ t } their own friend requests`, async () => {
				const friendRequest = new Friend({
					user: friendsOnlyUser.user.username,
					friend: publicUser.user.username,
					requestedOn: new Date()
				});
				await friendRequest.save();

				const response = await request(App)
					.post(`/users/${ friendsOnlyUser.user.username }/friends/${ publicUser.user.username }/${ t }`)
					.send({ reason: 'For the lulz.' })
					.set(...friendsOnlyUser.authHeader)
					.expect(403);
				expect403Response(response);
			});

			it(`Admins cannot ${ t } friend requests for other users`, async () => {
				const friendRequest = new Friend({
					user: friendsOnlyUser.user.username,
					friend: publicUser.user.username,
					requestedOn: new Date()
				});
				await friendRequest.save();

				const response = await request(App)
					.post(`/users/${ friendsOnlyUser.user.username }/friends/${ publicUser.user.username }/${ t }`)
					.send({ reason: 'For the lulz.' })
					.set(...admin.authHeader)
					.expect(403);
				expect403Response(response);
			});
		});
	});
});
