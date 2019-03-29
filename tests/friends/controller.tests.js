import _ from 'lodash';
import { App } from '../../service/server';
import createFakeAccount from '../util/create-fake-account';
import { ErrorIds } from '../../service/utils/error-response';
import { expect } from 'chai';
import fakeUser from '../util/fake-user';
import Friend from '../../service/data/friend';
import request from 'supertest';
import Session from '../../service/data/session';
import sinon from 'sinon';
import User from '../../service/data/user';

describe('Friends controller', () => {
	const friends = _.sortBy(
		[
			new User(fakeUser()),
			new User(fakeUser()),
			new User(fakeUser())
		],
		u => u.username
	);
	let user = null;
	let stub = null;

	before(async () => {
		user = await createFakeAccount();
		await Promise.all(friends.map(f => f.save()));
	});

	afterEach(async () => {
		if (stub) {
			stub.restore();
			stub = null;
		}
		await Friend.deleteMany({});
	});

	after(async () => {
		await Promise.all([
			Session.deleteMany({}),
			User.deleteMany({})
		]);
	});

	describe('GET /users/:username/friends', () => {
		let friendAssociations = null;

		async function createFriendAssociations() {
			friendAssociations = [
				new Friend({
					user: user.user.username,
					friend: friends[0].username,
					approved: true,
					approvedOn: new Date()
				}),
				new Friend({
					user: user.user.username,
					friend: friends[1].username,
					approved: true,
					approvedOn: new Date()
				}),
				new Friend({
					user: user.user.username,
					friend: friends[2].username,
					approved: false,
					requestedOn: new Date()
				})
			];
			await Promise.all(friendAssociations.map(fa => fa.save()));
		}

		it('Will list a user\'s friends by default', async () => {
			await createFriendAssociations();
			const response = await request(App)
				.get(`/users/${ user.user.username }/friends`)
				.set(...user.authHeader)
				.expect(200);

			const results = response.body;
			expect(results).to.have.length(2);
			expect(results[0].user).to.equal(user.user.username);
			expect(results[0].friend).to.equal(friends[0].username);
			expect(results[0].approved).to.be.true;
			expect(results[0].approvedOn).to.exist;

			expect(results[1].user).to.equal(user.user.username);
			expect(results[1].friend).to.equal(friends[1].username);
			expect(results[1].approved).to.be.true;
			expect(results[1].approvedOn).to.exist;
		});

		it('Will list a user\'s friends if requested', async () => {
			await createFriendAssociations();
			const response = await request(App)
				.get(`/users/${ user.user.username }/friends`)
				.query({ type: 'friends' })
				.set(...user.authHeader)
				.expect(200);

			const results = response.body;
			expect(results).to.have.length(2);
			expect(results[0].user).to.equal(user.user.username);
			expect(results[0].friend).to.equal(friends[0].username);
			expect(results[0].approved).to.be.true;
			expect(results[0].approvedOn).to.exist;

			expect(results[1].user).to.equal(user.user.username);
			expect(results[1].friend).to.equal(friends[1].username);
			expect(results[1].approved).to.be.true;
			expect(results[1].approvedOn).to.exist;
		});

		it('Will list a user\'s friend requests if requested', async () => {
			await createFriendAssociations();
			const response = await request(App)
				.get(`/users/${ user.user.username }/friends`)
				.query({ type: 'requests' })
				.set(...user.authHeader)
				.expect(200);

			const results = response.body;
			expect(results).to.have.length(1);
			expect(results[0].user).to.equal(user.user.username);
			expect(results[0].friend).to.equal(friends[2].username);
			expect(results[0].approved).to.be.false;
			expect(results[0].approvedOn).to.not.exist;
			expect(results[0].requestedOn).to.exist;
		});

		it('Will list a both a user\'s friends and friend requests if requested', async () => {
			await createFriendAssociations();
			const response = await request(App)
				.get(`/users/${ user.user.username }/friends`)
				.query({ type: 'both' })
				.set(...user.authHeader)
				.expect(200);

			const results = response.body;
			expect(results).to.have.length(3);
			expect(results[0].user).to.equal(user.user.username);
			expect(results[0].friend).to.equal(friends[0].username);
			expect(results[0].approved).to.be.true;
			expect(results[0].approvedOn).to.exist;

			expect(results[1].user).to.equal(user.user.username);
			expect(results[1].friend).to.equal(friends[1].username);
			expect(results[1].approved).to.be.true;
			expect(results[1].approvedOn).to.exist;

			expect(results[2].user).to.equal(user.user.username);
			expect(results[2].friend).to.equal(friends[2].username);
			expect(results[2].approved).to.be.false;
			expect(results[2].approvedOn).to.not.exist;
			expect(results[2].requestedOn).to.exist;
		});

		it('Will return an empty array if user has no friends', async () => {
			const response = await request(App)
				.get(`/users/${ user.user.username }/friends`)
				.query({ type: 'friends' })
				.set(...user.authHeader)
				.expect(200);

			const results = response.body;
			expect(results).to.be.an('array');
			expect(results).to.be.empty;
		});

		it('Will return 400 if type parameter is invalid', async () => {
			const response = await request(App)
				.get(`/users/${ user.user.username }/friends`)
				.query({ type: 'lol' })
				.set(...user.authHeader)
				.expect(400);

			expect(response.body.errorId).to.equal(ErrorIds.badRequest);
			expect(response.body.status).to.equal(400);
			expect(response.body.details).to.exist;
		});

		it('Will return 500 if a server error occurs', async () => {
			stub = sinon.stub(Friend, 'getFriendsForUser');
			stub.rejects('nope');

			const response = await request(App)
				.get(`/users/${ user.user.username }/friends`)
				.set(...user.authHeader)
				.expect(500);

			expect(response.body.errorId).to.equal(ErrorIds.serverError);
			expect(response.body.logId).to.exist;
			expect(response.body.status).to.equal(500);
		});
	});

	describe('DEL /users/:username/friends/:friendName', () => {
		it('Will delete the requested friend', async () => {
			const friend = new Friend({
				user: user.user.username,
				friend: friends[0].username,
				approved: true,
				approvedOn: new Date()
			});

			await friend.save();

			await request(App)
				.del(`/users/${ user.user.username }/friends/${ friends[0].username }`)
				.set(...user.authHeader)
				.expect(204);

			const result = await Friend.findOne({
				user: user.user.username,
				friend: friends[0].username
			});
			expect(result).to.be.null;
		});

		it('Will return 204 even if there is nothing to delete', async () => {
			await request(App)
				.delete(`/users/${ user.user.username }/friends/${ friends[1].username }`)
				.set(...user.authHeader)
				.expect(204);
		});

		it('Will return 500 if a server error occurs', async () => {
			stub = sinon.stub(Friend, 'findOneAndDelete');
			stub.rejects('nope');

			const { body } = await request(App)
				.delete(`/users/${ user.user.username }/friends/${ friends[1].username }`)
				.set(...user.authHeader)
				.expect(500);

			expect(body).to.exist;
			expect(body.errorId).to.equal(ErrorIds.serverError);
			expect(body.logId).to.exist;
			expect(body.status).to.equal(500);
		});
	});
});
