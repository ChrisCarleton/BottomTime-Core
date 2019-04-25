import _ from 'lodash';
import { App } from '../../service/server';
import createFakeAccount from '../util/create-fake-account';
import config from '../../service/config';
import { ErrorIds } from '../../service/utils/error-response';
import { expect } from 'chai';
import faker from 'faker';
import fakeUser from '../util/fake-user';
import Friend from '../../service/data/friend';
import generateAuthHeader from '../util/generate-auth-header';
import mailer from '../../service/mail/mailer';
import moment from 'moment';
import mongoose from 'mongoose';
import request from 'supertest';
import Session from '../../service/data/session';
import sinon from 'sinon';
import templates from '../../service/mail/templates';
import User from '../../service/data/user';

describe('Friends controller', () => {
	const friends = _.sortBy(
		[
			new User(fakeUser()),
			new User(fakeUser()),
			new User(fakeUser()),
			new User(fakeUser()),
			new User(fakeUser()),
			new User(fakeUser())
		],
		u => u.username
	);
	const friendData = {};
	let user = null;
	let admin = null;
	let stub = null;
	let mailerSpy = null;
	let templateSpy = null;

	before(async () => {
		user = await createFakeAccount();
		admin = await createFakeAccount('admin');
		await User.insertMany(friends);

		friends.forEach(f => {
			const data = _.pick(
				f,
				[
					'username',
					'firstName',
					'lastName',
					'logsVisibility'
				]
			);
			data.memberSince = moment(f.createdAt).toISOString();
			friendData[f.username] = data;
		});
	});

	afterEach(async () => {
		if (stub) {
			stub.restore();
			stub = null;
		}
		if (mailerSpy) {
			mailerSpy.restore();
			mailerSpy = null;
		}
		if (templateSpy) {
			templateSpy.restore();
			templateSpy = null;
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
					requestedOn: new Date(),
					evaluatedOn: new Date()
				}),
				new Friend({
					user: user.user.username,
					friend: friends[1].username,
					approved: true,
					requestedOn: new Date(),
					evaluatedOn: new Date()
				}),
				new Friend({
					user: friends[1].username,
					friend: user.user.username,
					approved: true,
					requestedOn: new Date(),
					evaluatedOn: new Date()
				}),
				new Friend({
					user: user.user.username,
					friend: friends[2].username,
					approved: false,
					requestedOn: new Date(),
					evaluatedOn: new Date()
				}),
				new Friend({
					user: user.user.username,
					friend: friends[3].username,
					requestedOn: new Date()
				}),
				new Friend({
					user: friends[4].username,
					friend: user.user.username,
					requestedOn: new Date()
				}),
				new Friend({
					user: friends[5].username,
					friend: user.user.username,
					approved: false,
					requestedOn: new Date(),
					evaluatedOn: new Date()
				})
			];
			await Friend.insertMany(friendAssociations);
		}

		it('Will list a user\'s friends by default', async () => {
			await createFriendAssociations();
			const response = await request(App)
				.get(`/users/${ user.user.username }/friends`)
				.set(...user.authHeader)
				.expect(200);

			const results = response.body;
			expect(results).to.have.length(2);
			expect(results).to.deep.include({
				...friendAssociations[0].toCleanJSON(),
				friendData: friendData[friendAssociations[0].friend]
			});
			expect(results).to.deep.include({
				...friendAssociations[1].toCleanJSON(),
				friendData: friendData[friendAssociations[1].friend]
			});
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
			expect(results).to.deep.include({
				...friendAssociations[0].toCleanJSON(),
				friendData: friendData[friendAssociations[0].friend]
			});
			expect(results).to.deep.include({
				...friendAssociations[1].toCleanJSON(),
				friendData: friendData[friendAssociations[1].friend]
			});
		});

		it('Will list a user\'s incoming friend requests if requested', async () => {
			await createFriendAssociations();
			const response = await request(App)
				.get(`/users/${ user.user.username }/friends`)
				.query({ type: 'requests-incoming' })
				.set(...user.authHeader)
				.expect(200);

			const results = response.body;
			expect(results).to.have.length(1);
			expect(results).to.deep.include({
				...friendAssociations[5].toCleanJSON(),
				friendData: friendData[friendAssociations[5].user]
			});
		});

		it('Will list a user\'s outgoing friend requests if requested', async () => {
			await createFriendAssociations();
			const response = await request(App)
				.get(`/users/${ user.user.username }/friends`)
				.query({ type: 'requests-outgoing' })
				.set(...user.authHeader)
				.expect(200);

			const results = response.body;
			expect(results).to.have.length(2);
			expect(results).to.deep.include({
				...friendAssociations[3].toCleanJSON(),
				friendData: friendData[friendAssociations[3].friend]
			});
			expect(results).to.deep.include({
				...friendAssociations[4].toCleanJSON(),
				friendData: friendData[friendAssociations[4].friend]
			});
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
			await createFriendAssociations();
			stub = sinon.stub(Friend.prototype, 'toCleanJSON');
			stub.throws(new Error('lol'));

			const response = await request(App)
				.get(`/users/${ user.user.username }/friends`)
				.set(...user.authHeader)
				.expect(500);

			expect(response.body.errorId).to.equal(ErrorIds.serverError);
			expect(response.body.logId).to.exist;
			expect(response.body.status).to.equal(500);
		});
	});

	describe('PUT /users/:username/friends/:friendName', () => {
		it('Will create a friend request', async () => {
			templateSpy = sinon.spy(templates, 'NewFriendRequestEmail');
			mailerSpy = sinon.spy(mailer, 'sendMail');

			await request(App)
				.put(`/users/${ user.user.username }/friends/${ friends[0].username }`)
				.set(...user.authHeader)
				.expect(204);

			const friendRequest = await Friend.findOne({
				user: user.user.username,
				friend: friends[0].username
			});
			expect(friendRequest).to.exist;
			expect(friendRequest.requestedOn).to.exist;
			expect(friendRequest.approved).to.not.exist;

			expect(mailerSpy.called).to.be.true;
			expect(templateSpy.called).to.be.true;

			const [ userFriendlyName, friendUsername, friendFriendlyName ]
				= templateSpy.getCall(0).args;
			expect(userFriendlyName).to.equal(`${ user.user.firstName } ${ user.user.lastName }`);
			expect(friendUsername).to.equal(friends[0].username);
			expect(friendFriendlyName).to.equal(friends[0].firstName);

			const [ mailOptions ] = mailerSpy.getCall(0).args;
			expect(mailOptions.to).to.equal(friends[0].email);
			expect(mailOptions.from).to.not.exist;
			expect(mailOptions.subject).to.equal('Dive Buddy Request');
			expect(mailOptions.html).to.exist;
		});

		it('Admins will create a bi-lateral friendship', async () => {
			templateSpy = sinon.spy(templates, 'NewFriendRequestEmail');
			mailerSpy = sinon.spy(mailer, 'sendMail');

			await request(App)
				.put(`/users/${ user.user.username }/friends/${ friends[0].username }`)
				.set(...admin.authHeader)
				.expect(204);

			const friendRequests = await Promise.all([
				Friend.findOne({
					user: user.user.username,
					friend: friends[0].username
				}),
				Friend.findOne({
					user: friends[0].username,
					friend: user.user.username
				})
			]);
			expect(friendRequests[0]).to.exist;
			expect(friendRequests[0].requestedOn).to.exist;
			expect(friendRequests[0].approved).to.be.true;
			expect(friendRequests[0].evaluatedOn).to.exist;
			expect(friendRequests[1]).to.exist;
			expect(friendRequests[1].requestedOn).to.exist;
			expect(friendRequests[1].approved).to.be.true;
			expect(friendRequests[1].evaluatedOn).to.exist;

			expect(mailerSpy.called).to.be.false;
			expect(templateSpy.called).to.be.false;
		});

		it('Will return 400 if friend limit is exceeded', async () => {
			templateSpy = sinon.spy(templates, 'NewFriendRequestEmail');
			mailerSpy = sinon.spy(mailer, 'sendMail');

			const relations = new Array(config.friendLimit)
				.fill(null)
				.map(() => new Friend({
					user: user.user.username,
					friend: faker.internet.userName(),
					approved: true,
					requestedOn: new Date(),
					evaluatedOn: new Date()
				}));
			await Friend.insertMany(relations);

			await request(App)
				.put(`/users/${ user.user.username }/friends/${ friends[0].username }`)
				.set(...user.authHeader)
				.expect(400);

			const friendRequest = await Friend.findOne({
				user: user.user.username,
				friend: friends[0].username
			});

			expect(friendRequest).to.not.exist;
			expect(mailerSpy.called).to.be.false;
			expect(templateSpy.called).to.be.false;
		});

		it('Will return 409 if friend request already exists', async () => {
			const friendRequest = new Friend({
				user: user.user.username,
				friend: friends[0].username,
				requestedOn: new Date()
			});

			await friendRequest.save();

			templateSpy = sinon.spy(templates, 'NewFriendRequestEmail');
			mailerSpy = sinon.spy(mailer, 'sendMail');

			await request(App)
				.put(`/users/${ user.user.username }/friends/${ friends[0].username }`)
				.set(...user.authHeader)
				.expect(409);

			expect(mailerSpy.called).to.be.false;
			expect(templateSpy.called).to.be.false;
		});

		it('Will return a 409 if a reciprocal friend request already exists', async () => {
			const friendRequest = new Friend({
				friend: user.user.username,
				user: friends[0].username,
				requestedOn: new Date()
			});

			await friendRequest.save();

			templateSpy = sinon.spy(templates, 'NewFriendRequestEmail');
			mailerSpy = sinon.spy(mailer, 'sendMail');

			await request(App)
				.put(`/users/${ user.user.username }/friends/${ friends[0].username }`)
				.set(...user.authHeader)
				.expect(409);

			expect(mailerSpy.called).to.be.false;
			expect(templateSpy.called).to.be.false;
		});

		it('Will simply replace a previously-rejected request', async () => {
			templateSpy = sinon.spy(templates, 'NewFriendRequestEmail');
			mailerSpy = sinon.spy(mailer, 'sendMail');

			let friendRequest = new Friend({
				user: user.user.username,
				friend: friends[0].username,
				approved: false,
				requestedOn: new Date(),
				evaluatedOn: new Date()
			});
			await friendRequest.save();
			const expectedId = friendRequest.id;

			await request(App)
				.put(`/users/${ user.user.username }/friends/${ friends[0].username }`)
				.set(...user.authHeader)
				.expect(204);

			friendRequest = await Friend.findOne({
				user: user.user.username,
				friend: friends[0].username
			});
			expect(friendRequest).to.exist;
			expect(friendRequest.id).to.equal(expectedId);
			expect(friendRequest.requestedOn).to.exist;
			expect(friendRequest.approved).to.not.exist;

			expect(mailerSpy.called).to.be.true;
			expect(templateSpy.called).to.be.true;

			const [ userFriendlyName, friendUsername, friendFriendlyName ]
				= templateSpy.getCall(0).args;
			expect(userFriendlyName).to.equal(`${ user.user.firstName } ${ user.user.lastName }`);
			expect(friendUsername).to.equal(friends[0].username);
			expect(friendFriendlyName).to.equal(friends[0].firstName);

			const [ mailOptions ] = mailerSpy.getCall(0).args;
			expect(mailOptions.to).to.equal(friends[0].email);
			expect(mailOptions.from).to.not.exist;
			expect(mailOptions.subject).to.equal('Dive Buddy Request');
			expect(mailOptions.html).to.exist;
		});

		it('Will return 404 if user does not exist', async () => {
			const response = await request(App)
				.put(`/users/no.such.user/friends/${ friends[0].username }`)
				.set(...user.authHeader)
				.expect(404);
			const { body } = response;

			expect(body.errorId).to.equal(ErrorIds.notFound);
			expect(body.status).to.equal(404);
		});

		it('Will return 404 if friend does not exist', async () => {
			const response = await request(App)
				.put(`/users/${ user.user.username }/friends/no.such.user`)
				.set(...user.authHeader)
				.expect(404);
			const { body } = response;

			expect(body.errorId).to.equal(ErrorIds.notFound);
			expect(body.status).to.equal(404);
		});

		it('Will return 500 if the friend request cannot be saved', async () => {
			stub = sinon.stub(mongoose.Model.prototype, 'save');
			stub.rejects('nope');

			const response = await request(App)
				.put(`/users/${ user.user.username }/friends/${ friends[0].username }`)
				.set(...user.authHeader)
				.expect(500);
			const { body } = response;

			expect(body.errorId).to.equal(ErrorIds.serverError);
			expect(body.status).to.equal(500);
			expect(body.logId).to.exist;
		});

		it('Will succeed even if the e-mail cannot be sent', async () => {
			stub = sinon.stub(mailer, 'sendMail');
			stub.rejects('nope');

			await request(App)
				.put(`/users/${ user.user.username }/friends/${ friends[0].username }`)
				.set(...user.authHeader)
				.expect(204);
		});
	});

	describe('POST /users/:username/friends/:friendName/approve', () => {

		let friendAuthHeader = null;

		before(async () => {
			friendAuthHeader = await generateAuthHeader(friends[0].username);
		});

		it('Will approve a friend request and send a notification email', async () => {
			const friendRequest = new Friend({
				user: user.user.username,
				friend: friends[0].username,
				requestedOn: new Date()
			});
			await friendRequest.save();

			mailerSpy = sinon.spy(mailer, 'sendMail');
			templateSpy = sinon.spy(templates, 'ApproveFriendRequestEmail');

			await request(App)
				.post(`/users/${ user.user.username }/friends/${ friends[0].username }/approve`)
				.set(...friendAuthHeader)
				.expect(204);

			const result = await Friend.findOne({
				user: user.user.username,
				friend: friends[0].username
			});
			expect(result).to.exist;
			expect(result.approved).to.be.true;
			expect(result.evaluatedOn).to.exist;

			expect(mailerSpy.called).to.be.true;
			expect(templateSpy.called).to.be.true;

			const [ userFriendlyName, friendUsername, friendFriendlyName ]
				= templateSpy.getCall(0).args;
			expect(userFriendlyName).to.equal(user.user.firstName);
			expect(friendUsername).to.equal(friends[0].username);
			expect(friendFriendlyName).to.equal(`${ friends[0].firstName } ${ friends[0].lastName }`);

			const [ mailOptions ] = mailerSpy.getCall(0).args;
			expect(mailOptions.to).to.equal(user.user.email);
			expect(mailOptions.from).to.not.exist;
			expect(mailOptions.subject).to.equal('Dive Buddy Request Accepted');
			expect(mailOptions.html).to.exist;
		});

		it('Will also create a reciprocal friendship', async () => {
			const friendRequest = new Friend({
				user: user.user.username,
				friend: friends[0].username,
				requestedOn: new Date()
			});
			await friendRequest.save();

			await request(App)
				.post(`/users/${ user.user.username }/friends/${ friends[0].username }/approve`)
				.set(...friendAuthHeader)
				.expect(204);

			const result = await Friend.findOne({
				friend: user.user.username,
				user: friends[0].username
			});
			expect(result).to.exist;
			expect(result.approved).to.be.true;
			expect(result.evaluatedOn).to.exist;
		});

		it('Will return 400 if the request has already been approved', async () => {
			const friendRequest = new Friend({
				user: user.user.username,
				friend: friends[0].username,
				approved: true,
				requestedOn: new Date(),
				evaluatedOn: new Date()
			});
			await friendRequest.save();

			mailerSpy = sinon.spy(mailer, 'sendMail');
			templateSpy = sinon.spy(templates, 'ApproveFriendRequestEmail');

			await request(App)
				.post(`/users/${ user.user.username }/friends/${ friends[0].username }/approve`)
				.set(...friendAuthHeader)
				.expect(400);

			expect(mailerSpy.called).to.be.false;
			expect(templateSpy.called).to.be.false;
		});

		it('Will return 400 if the request has already been rejected', async () => {
			const friendRequest = new Friend({
				user: user.user.username,
				friend: friends[0].username,
				approved: false,
				requestedOn: new Date(),
				evaluatedOn: new Date()
			});
			await friendRequest.save();

			mailerSpy = sinon.spy(mailer, 'sendMail');
			templateSpy = sinon.spy(templates, 'ApproveFriendRequestEmail');

			await request(App)
				.post(`/users/${ user.user.username }/friends/${ friends[0].username }/approve`)
				.set(...friendAuthHeader)
				.expect(400);

			expect(mailerSpy.called).to.be.false;
			expect(templateSpy.called).to.be.false;
		});

		it('Will return 400 if request body is invalid', async () => {
			const friendRequest = new Friend({
				user: user.user.username,
				friend: friends[0].username,
				requestedOn: new Date()
			});
			await friendRequest.save();

			mailerSpy = sinon.spy(mailer, 'sendMail');
			templateSpy = sinon.spy(templates, 'ApproveFriendRequestEmail');

			await request(App)
				.post(`/users/${ user.user.username }/friends/${ friends[0].username }/approve`)
				.set(...friendAuthHeader)
				.send({ lol: 'wat' })
				.expect(400);

			expect(mailerSpy.called).to.be.false;
			expect(templateSpy.called).to.be.false;
		});

		it('Will return 404 if user does not exist', async () => {
			const friendRequest = new Friend({
				user: user.user.username,
				friend: friends[0].username,
				requestedOn: new Date()
			});
			await friendRequest.save();

			mailerSpy = sinon.spy(mailer, 'sendMail');
			templateSpy = sinon.spy(templates, 'ApproveFriendRequestEmail');

			const response = await request(App)
				.post(`/users/no.such.user/friends/${ friends[0].username }/approve`)
				.set(...friendAuthHeader)
				.expect(404);

			const { body } = response;
			expect(body.errorId).to.equal(ErrorIds.notFound);
			expect(body.status).to.equal(404);

			expect(mailerSpy.called).to.be.false;
			expect(templateSpy.called).to.be.false;
		});

		it('Will return 404 if friend does not exist', async () => {
			const friendRequest = new Friend({
				user: user.user.username,
				friend: friends[0].username,
				requestedOn: new Date()
			});
			await friendRequest.save();

			mailerSpy = sinon.spy(mailer, 'sendMail');
			templateSpy = sinon.spy(templates, 'ApproveFriendRequestEmail');

			const response = await request(App)
				.post(`/users/${ user.user.username }/friends/no.such.user/approve`)
				.set(...friendAuthHeader)
				.expect(404);

			const { body } = response;
			expect(body.errorId).to.equal(ErrorIds.notFound);
			expect(body.status).to.equal(404);

			expect(mailerSpy.called).to.be.false;
			expect(templateSpy.called).to.be.false;
		});

		it('Will return 404 if the friend request does not exist', async () => {
			mailerSpy = sinon.spy(mailer, 'sendMail');
			templateSpy = sinon.spy(templates, 'ApproveFriendRequestEmail');

			const response = await request(App)
				.post(`/users/${ user.user.username }/friends/${ friends[0].username }/approve`)
				.set(...friendAuthHeader)
				.expect(404);

			const { body } = response;
			expect(body.errorId).to.equal(ErrorIds.notFound);
			expect(body.status).to.equal(404);

			expect(mailerSpy.called).to.be.false;
			expect(templateSpy.called).to.be.false;
		});

		it('Will return 500 if an error occurs approving the request', async () => {
			const friendRequest = new Friend({
				user: user.user.username,
				friend: friends[0].username,
				requestedOn: new Date()
			});
			await friendRequest.save();

			stub = sinon.stub(mongoose.Model.prototype, 'save');
			stub.rejects('nope');

			const response = await request(App)
				.post(`/users/${ user.user.username }/friends/${ friends[0].username }/approve`)
				.set(...friendAuthHeader)
				.expect(500);

			const { body } = response;
			expect(body.errorId).to.equal(ErrorIds.serverError);
			expect(body.status).to.equal(500);
			expect(body.logId).to.exist;
		});

		it('Will succeed even if the notification e-mail cannot be sent', async () => {
			const friendRequest = new Friend({
				user: user.user.username,
				friend: friends[0].username,
				requestedOn: new Date()
			});
			await friendRequest.save();

			stub = sinon.stub(mailer, 'sendMail');
			stub.rejects('nope');

			await request(App)
				.post(`/users/${ user.user.username }/friends/${ friends[0].username }/approve`)
				.set(...friendAuthHeader)
				.expect(204);

			const result = await Friend.findOne({
				user: user.user.username,
				friend: friends[0].username
			});
			expect(result).to.exist;
			expect(result.approved).to.be.true;
			expect(result.evaluatedOn).to.exist;
		});
	});

	describe('POST /users/:username/friends/:friendName/reject', () => {
		let friendAuthHeader = null;

		before(async () => {
			friendAuthHeader = await generateAuthHeader(friends[0].username);
		});

		it('Will reject a friend request and send a notification email', async () => {
			const expectedReason = 'New phone. Who dis?';
			const friendRequest = new Friend({
				user: user.user.username,
				friend: friends[0].username,
				requestedOn: new Date()
			});
			await friendRequest.save();

			mailerSpy = sinon.spy(mailer, 'sendMail');
			templateSpy = sinon.spy(templates, 'RejectFriendRequestEmail');

			await request(App)
				.post(`/users/${ user.user.username }/friends/${ friends[0].username }/reject`)
				.set(...friendAuthHeader)
				.send({ reason: expectedReason })
				.expect(204);

			const result = await Friend.findOne({
				user: user.user.username,
				friend: friends[0].username
			});
			expect(result).to.exist;
			expect(result.approved).to.be.false;
			expect(result.evaluatedOn).to.exist;

			expect(mailerSpy.called).to.be.true;
			expect(templateSpy.called).to.be.true;

			const [ userFriendlyName, friendFriendlyName, reason ]
				= templateSpy.getCall(0).args;
			expect(userFriendlyName).to.equal(user.user.firstName);
			expect(friendFriendlyName).to.equal(`${ friends[0].firstName } ${ friends[0].lastName }`);
			expect(reason).to.equal(expectedReason);

			const [ mailOptions ] = mailerSpy.getCall(0).args;
			expect(mailOptions.to).to.equal(user.user.email);
			expect(mailOptions.from).to.not.exist;
			expect(mailOptions.subject).to.equal('Dive Buddy Request Rejected');
			expect(mailOptions.html).to.exist;
		});

		it('Will return 400 if the request has already been approved', async () => {
			const friendRequest = new Friend({
				user: user.user.username,
				friend: friends[0].username,
				approved: true,
				requestedOn: new Date(),
				evaluatedOn: new Date()
			});
			await friendRequest.save();

			mailerSpy = sinon.spy(mailer, 'sendMail');
			templateSpy = sinon.spy(templates, 'RejectFriendRequestEmail');

			await request(App)
				.post(`/users/${ user.user.username }/friends/${ friends[0].username }/reject`)
				.set(...friendAuthHeader)
				.expect(400);

			expect(mailerSpy.called).to.be.false;
			expect(templateSpy.called).to.be.false;
		});

		it('Will return 400 if the request has already been rejected', async () => {
			const friendRequest = new Friend({
				user: user.user.username,
				friend: friends[0].username,
				approved: false,
				requestedOn: new Date(),
				evaluatedOn: new Date()
			});
			await friendRequest.save();

			mailerSpy = sinon.spy(mailer, 'sendMail');
			templateSpy = sinon.spy(templates, 'RejectFriendRequestEmail');

			await request(App)
				.post(`/users/${ user.user.username }/friends/${ friends[0].username }/reject`)
				.set(...friendAuthHeader)
				.expect(400);

			expect(mailerSpy.called).to.be.false;
			expect(templateSpy.called).to.be.false;
		});

		it('Will return 400 if request body is invalid', async () => {
			const friendRequest = new Friend({
				user: user.user.username,
				friend: friends[0].username,
				requestedOn: new Date()
			});
			await friendRequest.save();

			mailerSpy = sinon.spy(mailer, 'sendMail');
			templateSpy = sinon.spy(templates, 'RejectFriendRequestEmail');

			await request(App)
				.post(`/users/${ user.user.username }/friends/${ friends[0].username }/reject`)
				.set(...friendAuthHeader)
				.send({ lol: 'wat' })
				.expect(400);

			expect(mailerSpy.called).to.be.false;
			expect(templateSpy.called).to.be.false;
		});

		it('Will return 404 if user does not exist', async () => {
			const friendRequest = new Friend({
				user: user.user.username,
				friend: friends[0].username,
				requestedOn: new Date()
			});
			await friendRequest.save();

			mailerSpy = sinon.spy(mailer, 'sendMail');
			templateSpy = sinon.spy(templates, 'RejectFriendRequestEmail');

			const response = await request(App)
				.post(`/users/no.such.user/friends/${ friends[0].username }/reject`)
				.set(...friendAuthHeader)
				.expect(404);

			const { body } = response;
			expect(body.errorId).to.equal(ErrorIds.notFound);
			expect(body.status).to.equal(404);

			expect(mailerSpy.called).to.be.false;
			expect(templateSpy.called).to.be.false;
		});

		it('Will return 404 if friend does not exist', async () => {
			const friendRequest = new Friend({
				user: user.user.username,
				friend: friends[0].username,
				requestedOn: new Date()
			});
			await friendRequest.save();

			mailerSpy = sinon.spy(mailer, 'sendMail');
			templateSpy = sinon.spy(templates, 'RejectFriendRequestEmail');

			const response = await request(App)
				.post(`/users/${ user.user.username }/friends/no.such.user/reject`)
				.set(...friendAuthHeader)
				.expect(404);

			const { body } = response;
			expect(body.errorId).to.equal(ErrorIds.notFound);
			expect(body.status).to.equal(404);

			expect(mailerSpy.called).to.be.false;
			expect(templateSpy.called).to.be.false;
		});

		it('Will return 404 if the friend request does not exist', async () => {
			mailerSpy = sinon.spy(mailer, 'sendMail');
			templateSpy = sinon.spy(templates, 'RejectFriendRequestEmail');

			const response = await request(App)
				.post(`/users/${ user.user.username }/friends/${ friends[0].username }/reject`)
				.set(...friendAuthHeader)
				.expect(404);

			const { body } = response;
			expect(body.errorId).to.equal(ErrorIds.notFound);
			expect(body.status).to.equal(404);

			expect(mailerSpy.called).to.be.false;
			expect(templateSpy.called).to.be.false;
		});

		it('Will return 500 if an error occurs approving the request', async () => {
			const friendRequest = new Friend({
				user: user.user.username,
				friend: friends[0].username,
				requestedOn: new Date()
			});
			await friendRequest.save();

			stub = sinon.stub(mongoose.Model.prototype, 'save');
			stub.rejects('nope');

			const response = await request(App)
				.post(`/users/${ user.user.username }/friends/${ friends[0].username }/reject`)
				.set(...friendAuthHeader)
				.expect(500);

			const { body } = response;
			expect(body.errorId).to.equal(ErrorIds.serverError);
			expect(body.status).to.equal(500);
			expect(body.logId).to.exist;
		});

		it('Will succeed even if the notification e-mail cannot be sent', async () => {
			const friendRequest = new Friend({
				user: user.user.username,
				friend: friends[0].username,
				requestedOn: new Date()
			});
			await friendRequest.save();

			stub = sinon.stub(mailer, 'sendMail');
			stub.rejects('nope');

			await request(App)
				.post(`/users/${ user.user.username }/friends/${ friends[0].username }/reject`)
				.set(...friendAuthHeader)
				.expect(204);

			const result = await Friend.findOne({
				user: user.user.username,
				friend: friends[0].username
			});
			expect(result).to.exist;
			expect(result.approved).to.be.false;
			expect(result.evaluatedOn).to.exist;
		});
	});

	describe('DEL /users/:username/friends/:friendName', () => {
		it('Will delete the requested friend', async () => {
			const friend = new Friend({
				user: user.user.username,
				friend: friends[0].username,
				approved: true,
				evaluatedOn: new Date()
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

	describe('DELETE /users/:username/friends', () => {
		it('Will delete friend records', async () => {
			const records = friends.map(f => new Friend({
				user: user.user.username,
				friend: f.username,
				approved: true,
				requestedOn: new Date(),
				evaluatedOn: new Date()
			}));
			await Friend.insertMany(records);

			await request(App)
				.del(`/users/${ user.user.username }/friends`)
				.set(...user.authHeader)
				.send(friends.map(f => f.username))
				.expect(204);

			const results = await Friend.find({ user: user.user.username });
			expect(results).to.be.empty;
		});

		it('Will succeed even if not all friend records exist', async () => {
			const records = friends.slice(0, 2).map(f => new Friend({
				user: user.user.username,
				friend: f.username,
				approved: true,
				requestedOn: new Date(),
				evaluatedOn: new Date()
			}));
			await Friend.insertMany(records);

			await request(App)
				.del(`/users/${ user.user.username }/friends`)
				.set(...user.authHeader)
				.send(friends.map(f => f.username))
				.expect(204);

			const results = await Friend.find({ user: user.user.username });
			expect(results).to.have.length(0);
		});

		it('Returns 400 if request body is malformed', async () => {
			const records = friends.map(f => new Friend({
				user: user.user.username,
				friend: f.username,
				approved: true,
				requestedOn: new Date(),
				evaluatedOn: new Date()
			}));
			await Friend.insertMany(records);

			const requestArray = friends.map(f => f.username);
			requestArray[1] = 42;
			const { body } = await request(App)
				.del(`/users/${ user.user.username }/friends`)
				.set(...user.authHeader)
				.send(requestArray)
				.expect(400);

			expect(body.status).to.equal(400);
			expect(body.errorId).to.equal(ErrorIds.badRequest);

			const results = await Friend.find({ user: user.user.username });
			expect(results).to.have.length(friends.length);
		});

		it('Returns 404 if the user specified in the route does not exist', async () => {
			const { body } = await request(App)
				.del('/users/not.a.user/friends')
				.set(...user.authHeader)
				.send(friends.map(f => f.username))
				.expect(404);

			expect(body.status).to.equal(404);
			expect(body.errorId).to.equal(ErrorIds.notFound);
		});

		it('Returns 500 if a server error occurs', async () => {
			stub = sinon.stub(Friend, 'deleteMany');
			stub.rejects('nope');

			const records = friends.map(f => new Friend({
				user: user.user.username,
				friend: f.username,
				approved: true,
				requestedOn: new Date(),
				evaluatedOn: new Date()
			}));
			await Friend.insertMany(records);

			const { body } = await request(App)
				.del(`/users/${ user.user.username }/friends`)
				.set(...user.authHeader)
				.send(friends.map(f => f.username))
				.expect(500);

			expect(body.status).to.equal(500);
			expect(body.errorId).to.equal(ErrorIds.serverError);
			expect(body.logId).to.exist;

			const results = await Friend.find({ user: user.user.username });
			expect(results).to.have.length(friends.length);
		});
	});
});
