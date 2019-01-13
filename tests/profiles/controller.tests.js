import _ from 'lodash';
import { App } from '../../service/server';
import Bluebird from 'bluebird';
import createFakeAccount from '../util/create-fake-account';
import { ErrorIds } from '../../service/utils/error-response';
import { expect, request } from 'chai';
import fakeLogEntry from '../util/fake-log-entry';
import LogEntry from '../../service/data/log-entry';
import moment from 'moment';
import sinon from 'sinon';
import User from '../../service/data/user';

const expectedKeys = [
	'email',
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
	'bottomTimeLogged'
];

function compareProfiles(result, user) {
	expect(result.email).to.equal(user.email);
	expect(result.memberSince).to.equal(moment(user.createdAt).utc().toISOString());
	expect(result.logsVisibility).to.equal(user.logsVisibility);
	expect(result.firstName).to.equal(user.firstName);
	expect(result.lastName).to.equal(user.lastName);
	expect(result.location).to.equal(user.location);
	expect(result.occupation).to.equal(user.occupation);
	expect(result.gender).to.equal(user.gender);
	expect(result.birthdate).to.equal(
		moment(user.birthdate).format('YYYY-MM-DD')
	);
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
		friendsOnlyUser = await createFakeAccount('user', 'friendsOnly');
		publicUser = await createFakeAccount('user', 'public');
		adminUser = await createFakeAccount('admin');

		for (let i = 0; i < logEntries.length; i++) {
			logEntries[i] = fakeLogEntry(publicUser.user.id);
		}

		await Bluebird.all(_.map(logEntries, e => new LogEntry(e).save()));
	});

	afterEach(() => {
		if (stub) {
			stub.restore();
			stub = null;
		}
	});

	after(async () => {
		privateUser.agent.close();
		friendsOnlyUser.agent.close();
		publicUser.agent.close();
		adminUser.agent.close();

		await User.deleteMany({});
		await LogEntry.deleteMany({});
	});

	describe('GET /users/:username/profile', () => {
		it('Will return the user\'s profile', async () => {
			const result = await privateUser.agent.get(`/users/${ privateUser.user.username }/profile`);
			expect(result.status).to.equal(200);
			expect(result.body).to.exist;
			expect(result.body).to.have.keys(expectedKeys);
			compareProfiles(result.body, privateUser.user);
		});

		it('Will return public profile', async () => {
			const result = await privateUser.agent.get(`/users/${ publicUser.user.username }/profile`);
			expect(result.status).to.equal(200);
			expect(result.body).to.exist;
			expect(result.body).to.have.keys(expectedKeys);
			compareProfiles(result.body, publicUser.user);
		});

		it.skip('Will return friends-only profile if friended', async () => {
			// TODO: Implement friend logic!
		});

		it('Will not return friends-only profile if not friended', async () => {
			const result = await privateUser.agent.get(`/users/${ friendsOnlyUser.user.username }/profile`);
			expect(result.status).to.equal(403);
			expect(result.body.status).to.equal(403);
			expect(result.body.errorId).to.equal(ErrorIds.forbidden);
		});

		it('Will not return private profile', async () => {
			const result = await friendsOnlyUser.agent.get(`/users/${ privateUser.user.username }/profile`);
			expect(result.status).to.equal(403);
			expect(result.body.status).to.equal(403);
			expect(result.body.errorId).to.equal(ErrorIds.forbidden);
		});

		it('Admins can view public profiles', async () => {
			const result = await adminUser.agent.get(`/users/${ publicUser.user.username }/profile`);
			expect(result.status).to.equal(200);
			expect(result.body).to.exist;
			expect(result.body).to.have.keys(expectedKeys);
			compareProfiles(result.body, publicUser.user);
		});

		it.skip('Admins can view friends-only profiles when friended', async () => {
			// TODO: Write the logic for this.
		});

		it('Admins can view friends-only profiles when not friended', async () => {
			const result = await adminUser.agent.get(`/users/${ friendsOnlyUser.user.username }/profile`);
			expect(result.status).to.equal(200);
			expect(result.body).to.exist;
			expect(result.body).to.have.keys(expectedKeys);
			compareProfiles(result.body, friendsOnlyUser.user);
		});

		it('Admins can view private profiles', async () => {
			const result = await adminUser.agent.get(`/users/${ privateUser.user.username }/profile`);
			expect(result.status).to.equal(200);
			expect(result.body).to.exist;
			expect(result.body).to.have.keys(expectedKeys);
			compareProfiles(result.body, privateUser.user);
		});

		it('Anonyous users can view public profiles', async () => {
			const result = await request(App).get(`/users/${ publicUser.user.username }/profile`);
			expect(result.status).to.equal(200);
			expect(result.body).to.exist;
			expect(result.body).to.have.keys(expectedKeys);
			compareProfiles(result.body, publicUser.user);
		});

		it('Anonymous users cannot view friends-only profiles', async () => {
			const result = await request(App).get(`/users/${ friendsOnlyUser.user.username }/profile`);
			expect(result.status).to.equal(403);
			expect(result.body.status).to.equal(403);
			expect(result.body.errorId).to.equal(ErrorIds.forbidden);
		});

		it('Anonymous users cannot view private profiles', async () => {
			const result = await request(App).get(`/users/${ privateUser.user.username }/profile`);
			expect(result.status).to.equal(403);
			expect(result.body.status).to.equal(403);
			expect(result.body.errorId).to.equal(ErrorIds.forbidden);
		});

		it('Will return total bottom time and dives logged correctly', async () => {
			let expectedBottomTime = 0;
			for (let i = 0; i < logEntries.length; i++) {
				expectedBottomTime += logEntries[i].bottomTime;
			}

			const result = await publicUser.agent.get(`/users/${ publicUser.user.username }/profile`);
			expect(result.status).to.equal(200);
			expect(result.body.divesLogged).to.equal(logEntries.length);
			expect(result.body.bottomTimeLogged).to.equal(expectedBottomTime);
		});

		it('Will return zeros for bottom time and dives logged if no dives exist', async () => {
			const result = await privateUser.agent.get(`/users/${ privateUser.user.username }/profile`);
			expect(result.status).to.equal(200);
			expect(result.body.divesLogged).to.equal(0);
			expect(result.body.bottomTimeLogged).to.equal(0);
		});

		it('Will return Not Found if specified profile does not exist', async () => {
			const result = await publicUser.agent.get('/users/notARealUser/profile');
			expect(result.status).to.equal(404);
			expect(result.body.status).to.equal(404);
			expect(result.body.errorId).to.equal(ErrorIds.notFound);
		});

		it('Will return Server Error if an exception is thrown', async () => {
			stub = sinon.stub(User, 'findOne');
			stub.rejects('nope');

			const result = await privateUser.agent.get(`/users/${ privateUser.user.username }/profile`);
			expect(result.status).to.equal(500);
			expect(result.body.status).to.equal(500);
			expect(result.body.errorId).to.equal(ErrorIds.serverError);
			expect(result.body.logId).to.exist;
		});
	});

});
