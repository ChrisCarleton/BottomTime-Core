import createFakeAccount from '../util/create-fake-account';
import { ErrorIds } from '../../service/utils/error-response';
import { expect } from 'chai';
import moment from 'moment';
import User from '../../service/data/user';

const expectedKeys = [
	'email',
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
	expect(result.divesLogged).to.equal(-1);
	expect(result.bottomTimeLogged).to.equal(-1);
}

describe('Profiles Controller', () => {

	let privateUser = null;
	let friendsOnlyUser = null;
	let publicUser = null;
	let adminUser = null;

	before(async () => {
		privateUser = await createFakeAccount('user', 'private');
		friendsOnlyUser = await createFakeAccount('user', 'friendsOnly');
		publicUser = await createFakeAccount('user', 'public');
		adminUser = await createFakeAccount('admin');
	});

	after(async () => {
		privateUser.agent.close();
		friendsOnlyUser.agent.close();
		publicUser.agent.close();
		adminUser.agent.close();

		await User.deleteMany({});
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
		
		it('Will return total bottom time and dives logged correctly', async () => {

		});

		it('Will return zeros for bottom time and dives logged if no dives exist', async () => {

		});

		it('Will return Not Found if specified profile does not exist', async () => {

		});

		it('Will return Server Error if an exception is thrown', async () => {

		});
	});

});
