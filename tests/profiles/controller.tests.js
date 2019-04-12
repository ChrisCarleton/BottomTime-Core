import _ from 'lodash';
import { App } from '../../service/server';
import createFakeAccount from '../util/create-fake-account';
import { ErrorIds } from '../../service/utils/error-response';
import { expect } from 'chai';
import fakeLogDocument from '../util/fake-log-document';
import fakeLogEntry from '../util/fake-log-entry';
import fakeProfile from '../util/fake-profile';
import Friend from '../../service/data/friend';
import moment from 'moment';
import mongoose from 'mongoose';
import request from 'supertest';
import Session from '../../service/data/session';
import sinon from 'sinon';
import User from '../../service/data/user';

const expectedKeys = [
	'memberSince',
	'logsVisibility',
	'firstName',
	'lastName',
	'location',
	'occupation',
	'gender',
	'birthdate',
	'typeOfDiver',
	'startedDiving',
	'certificationLevel',
	'certificationAgencies',
	'specialties',
	'about',
	'divesLogged',
	'bottomTimeLogged',
	'readOnly'
];

function compareProfiles(result, user) {
	expect(result.memberSince).to.equal(moment(user.createdAt).utc().toISOString());
	expect(result.logsVisibility).to.equal(user.logsVisibility);
	expect(result.firstName).to.equal(user.firstName);
	expect(result.lastName).to.equal(user.lastName);
	expect(result.location).to.equal(user.location);
	expect(result.occupation).to.equal(user.occupation);
	expect(result.gender).to.equal(user.gender);
	if (result.birthdate) {
		expect(result.birthdate).to.equal(
			moment(user.birthdate).format('YYYY-MM-DD')
		);
	} else {
		expect(user.birthdate).to.not.exist;
	}
	expect(result.typeOfDiver).to.equal(user.typeOfDiver);
	expect(result.startedDiving).to.equal(user.startedDiving);
	expect(result.certificationLevel).to.equal(user.certificationLevel);
	expect(result.certificationAgencies).to.equal(user.certificationAgencies);
	expect(result.specialties).to.equal(user.specialties);
	expect(result.about).to.equal(user.about);
}

describe('Profiles Controller', () => {

	let privateUser = null;
	let friendsOnlyUser = null;
	let publicUser = null;
	let adminUser = null;
	let stub = null;

	const logEntries = new Array(20);

	before(async () => {
		privateUser = await createFakeAccount('user', 'private');
		friendsOnlyUser = await createFakeAccount('user', 'friends-only');
		publicUser = await createFakeAccount('user', 'public');
		adminUser = await createFakeAccount('admin');

		for (let i = 0; i < logEntries.length; i++) {
			logEntries[i] = fakeLogEntry(publicUser.user.id);
		}

		await Promise.all(_.map(logEntries, e => fakeLogDocument(e).save()));
	});

	afterEach(() => {
		if (stub) {
			stub.restore();
			stub = null;
		}
	});

	after(async () => {
		await Promise.all([
			User.deleteMany({}),
			Session.deleteMany({}),
			Session.deleteMany({})
		]);
	});

	describe('GET /users/:username/profile', () => {
		afterEach(async () => {
			await Friend.deleteMany({});
		});

		it('Will return the user\'s profile', async () => {
			const result = await request(App)
				.get(`/users/${ privateUser.user.username }/profile`)
				.set(...privateUser.authHeader)
				.expect(200);
			expect(result.body).to.exist;
			expect(result.body).to.have.keys(expectedKeys);
			expect(result.body.readOnly).to.be.false;
			compareProfiles(result.body, privateUser.user);
		});

		it('Will return public profile', async () => {
			const result = await request(App)
				.get(`/users/${ publicUser.user.username }/profile`)
				.set(...privateUser.authHeader)
				.expect(200);
			expect(result.body).to.exist;
			expect(result.body.readOnly).to.be.true;
			expect(result.body).to.have.keys(expectedKeys);
			compareProfiles(result.body, publicUser.user);
		});

		it('Will return friends-only profile if friended', async () => {
			const relations = [
				new Friend({
					user: friendsOnlyUser.user.username,
					friend: privateUser.user.username,
					approved: true
				}),
				new Friend({
					user: privateUser.user.username,
					friend: friendsOnlyUser.user.username,
					approved: true
				})
			];
			await Friend.insertMany(relations);

			const result = await request(App)
				.get(`/users/${ friendsOnlyUser.user.username }/profile`)
				.set(...privateUser.authHeader)
				.expect(200);
			expect(result.body).to.exist;
			expect(result.body.readOnly).to.be.true;
			expect(result.body).to.have.keys(expectedKeys);
			compareProfiles(result.body, friendsOnlyUser.user);
		});

		it('Will not return friends-only profile if not friended', async () => {
			const result = await request(App)
				.get(`/users/${ friendsOnlyUser.user.username }/profile`)
				.set(...privateUser.authHeader)
				.expect(403);
			expect(result.body.status).to.equal(403);
			expect(result.body.errorId).to.equal(ErrorIds.forbidden);
		});

		it('Will not return private profile', async () => {
			const result = await request(App)
				.get(`/users/${ privateUser.user.username }/profile`)
				.set(...friendsOnlyUser.authHeader)
				.expect(403);
			expect(result.body.status).to.equal(403);
			expect(result.body.errorId).to.equal(ErrorIds.forbidden);
		});

		it('Admins can view public profiles', async () => {
			const result = await request(App)
				.get(`/users/${ publicUser.user.username }/profile`)
				.set(...adminUser.authHeader)
				.expect(200);
			expect(result.body).to.exist;
			expect(result.body.readOnly).to.false;
			expect(result.body).to.have.keys(expectedKeys);
			compareProfiles(result.body, publicUser.user);
		});

		it('Admins can view friends-only profiles when friended', async () => {
			const relations = [
				new Friend({
					user: adminUser.user.username,
					friend: friendsOnlyUser.user.username,
					approved: true
				}),
				new Friend({
					user: friendsOnlyUser.user.username,
					friend: adminUser.user.username,
					approved: true
				})
			];
			await Friend.insertMany(relations);

			const result = await request(App)
				.get(`/users/${ friendsOnlyUser.user.username }/profile`)
				.set(...adminUser.authHeader)
				.expect(200);
			expect(result.body).to.exist;
			expect(result.body.readOnly).to.false;
			expect(result.body).to.have.keys(expectedKeys);
			compareProfiles(result.body, friendsOnlyUser.user);
		});

		it('Admins can view friends-only profiles when not friended', async () => {
			const result = await request(App)
				.get(`/users/${ friendsOnlyUser.user.username }/profile`)
				.set(...adminUser.authHeader)
				.expect(200);
			expect(result.body).to.exist;
			expect(result.body.readOnly).to.false;
			expect(result.body).to.have.keys(expectedKeys);
			compareProfiles(result.body, friendsOnlyUser.user);
		});

		it('Admins can view private profiles', async () => {
			const result = await request(App)
				.get(`/users/${ privateUser.user.username }/profile`)
				.set(...adminUser.authHeader)
				.expect(200);
			expect(result.body).to.exist;
			expect(result.body.readOnly).to.false;
			expect(result.body).to.have.keys(expectedKeys);
			compareProfiles(result.body, privateUser.user);
		});

		it('Anonyous users can view public profiles', async () => {
			const result = await request(App)
				.get(`/users/${ publicUser.user.username }/profile`)
				.expect(200);
			expect(result.body).to.exist;
			expect(result.body.readOnly).to.true;
			expect(result.body).to.have.keys(expectedKeys);
			compareProfiles(result.body, publicUser.user);
		});

		it('Anonymous users cannot view friends-only profiles', async () => {
			const result = await request(App)
				.get(`/users/${ friendsOnlyUser.user.username }/profile`)
				.expect(403);
			expect(result.body.status).to.equal(403);
			expect(result.body.errorId).to.equal(ErrorIds.forbidden);
		});

		it('Anonymous users cannot view private profiles', async () => {
			const result = await request(App)
				.get(`/users/${ privateUser.user.username }/profile`)
				.expect(403);
			expect(result.body.status).to.equal(403);
			expect(result.body.errorId).to.equal(ErrorIds.forbidden);
		});

		it('Will return total bottom time and dives logged correctly', async () => {
			let expectedBottomTime = 0;
			for (let i = 0; i < logEntries.length; i++) {
				expectedBottomTime += logEntries[i].bottomTime;
			}

			const result = await request(App)
				.get(`/users/${ publicUser.user.username }/profile`)
				.set(...publicUser.authHeader)
				.expect(200);
			expect(result.body.divesLogged).to.equal(logEntries.length);
			expect(result.body.bottomTimeLogged).to.equal(expectedBottomTime);
		});

		it('Will return zeros for bottom time and dives logged if no dives exist', async () => {
			const result = await request(App)
				.get(`/users/${ privateUser.user.username }/profile`)
				.set(...privateUser.authHeader)
				.expect(200);
			expect(result.body.divesLogged).to.equal(0);
			expect(result.body.bottomTimeLogged).to.equal(0);
		});

		it('Will return Not Found if specified profile does not exist', async () => {
			const result = await request(App)
				.get('/users/notARealUser/profile')
				.set(...publicUser.authHeader)
				.expect(404);
			expect(result.body.status).to.equal(404);
			expect(result.body.errorId).to.equal(ErrorIds.notFound);
		});

		it('Will return Server Error if an exception is thrown', async () => {
			stub = sinon.stub(User, 'findOne');
			stub.rejects('nope');

			await request(App)
				.get(`/users/${ privateUser.user.username }/profile`)
				.set(...privateUser.authHeader)
				.expect(500);
		});
	});

	describe('PATCH /users/:username/profile', () => {
		it('Will update user\'s profile', async () => {
			const fake = fakeProfile();
			await request(App)
				.patch(`/users/${ publicUser.user.username }/profile`)
				.set(...publicUser.authHeader)
				.send(fake)
				.expect(204);

			const user = await User.findById(publicUser.user.id);
			compareProfiles(
				{
					...fake,
					memberSince: moment(publicUser.user.createdAt).utc().toISOString()
				},
				user
			);
		});

		it('Users cannot update other user\'s profiles', async () => {
			const fake = fakeProfile();
			const result = await request(App)
				.patch(`/users/${ publicUser.user.username }/profile`)
				.set(...privateUser.authHeader)
				.send(fake)
				.expect(403);

			expect(result.body.status).to.equal(403);
			expect(result.body.errorId).to.equal(ErrorIds.forbidden);
		});

		it('Anonymous users cannot update users\' profiles', async () => {
			const fake = fakeProfile();
			const result = await request(App)
				.patch(`/users/${ publicUser.user.username }/profile`)
				.send(fake)
				.expect(403);

			expect(result.body.status).to.equal(403);
			expect(result.body.errorId).to.equal(ErrorIds.forbidden);
		});

		it('Admins can update other users\' profiles', async () => {
			const fake = fakeProfile();

			await request(App)
				.patch(`/users/${ privateUser.user.username }/profile`)
				.set(...adminUser.authHeader)
				.send(fake)
				.expect(204);

			const user = await User.findById(privateUser.user.id);
			compareProfiles(
				{
					...fake,
					memberSince: moment(privateUser.user.createdAt).utc().toISOString()
				},
				user
			);
		});

		it('Will return Not Found if username does not belong to an existing user', async () => {
			const fake = fakeProfile();
			const result = await request(App)
				.patch('/users/Made_Up_User/profile')
				.set(...adminUser.authHeader)
				.send(fake)
				.expect(404);

			expect(result.body.status).to.equal(404);
			expect(result.body.errorId).to.equal(ErrorIds.notFound);
		});

		it('Will return Bad Request if the message body fails validation', async () => {
			const fake = fakeProfile();
			fake.birthdate = '30 years ago';
			fake.certificationAgencies = 4;

			const result = await request(App)
				.patch(`/users/${ publicUser.user.username }/profile`)
				.set(...publicUser.authHeader)
				.send(fake)
				.expect(400);

			expect(result.body.status).to.equal(400);
			expect(result.body.errorId).to.equal(ErrorIds.badRequest);
		});

		it('Will not update read-only fields', async () => {
			const fake = fakeProfile();
			const oldCreatedAt = publicUser.user.createdAt;
			fake.memberSince = moment().utc().toDate();
			fake.readOnly = false;

			await request(App)
				.patch(`/users/${ publicUser.user.username }/profile`)
				.set(...publicUser.authHeader)
				.send(fake)
				.expect(204);

			const user = await User.findById(publicUser.user.id);
			compareProfiles(
				{
					...fake,
					memberSince: moment(oldCreatedAt).utc().toISOString()
				},
				user
			);
		});

		it('Will clear fields if they are set to null', async () => {
			const fake = {
				memberSince: moment(adminUser.user.createdAt).utc().toISOString(),
				logsVisibility: 'friends-only',
				firstName: null,
				lastName: null,
				location: null,
				occupation: null,
				gender: null,
				birthdate: null,
				typeOfDiver: null,
				startedDiving: null,
				certificationLevel: null,
				certificationAgencies: null,
				specialties: null,
				about: null
			};

			await request(App)
				.patch(`/users/${ adminUser.user.username }/profile`)
				.set(...adminUser.authHeader)
				.send(fake)
				.expect(204);

			const user = await User.findById(adminUser.user.id);
			compareProfiles(fake, user);
		});

		it('Will not modify fields if they are missing', async () => {
			const fake = {
				memberSince: moment(adminUser.user.createdAt).utc().toISOString()
			};
			const expected = friendsOnlyUser.user.getProfileJSON();
			await request(App)
				.patch(`/users/${ friendsOnlyUser.user.username }/profile`)
				.set(...friendsOnlyUser.authHeader)
				.send(fake)
				.expect(204);

			const user = await User.findById(friendsOnlyUser.user.id);
			compareProfiles(expected, user);
		});

		it('Will return Server Error if something goes wrong talking to the database', async () => {
			const fake = fakeProfile();
			stub = sinon.stub(mongoose.Model.prototype, 'save');
			stub.rejects('nope');

			const result = await request(App)
				.patch(`/users/${ publicUser.user.username }/profile`)
				.set(...publicUser.authHeader)
				.send(fake)
				.expect(500);
			expect(result.body.status).to.equal(500);
			expect(result.body.errorId).to.equal(ErrorIds.serverError);
			expect(result.body.logId).to.exist;
		});
	});

});
