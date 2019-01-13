import createFakeAccount from '../util/create-fake-account';
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
			let result = await privateUser.agent.get(`/users/${ privateUser.user.username }/profile`);
			expect(result.status).to.equal(200);
			expect(result.body).to.exist;

			result = result.body;
			expect(result).to.have.keys(expectedKeys);
			expect(result.email).to.equal(privateUser.user.email);
			expect(result.logsVisibility).to.equal(privateUser.user.logsVisibility);
			expect(result.firstName).to.equal(privateUser.user.firstName);
			expect(result.lastName).to.equal(privateUser.user.lastName);
			expect(result.location).to.equal(privateUser.user.location);
			expect(result.occupation).to.equal(privateUser.user.occupation);
			expect(result.gender).to.equal(privateUser.user.gender);
			expect(result.birthdate).to.equal(
				moment(privateUser.user.birthdate).format('YYYY-MM-DD')
			);
			expect(result.typeOfDiver).to.equal(privateUser.user.typeOfDiver);
			expect(result.startedDiving).to.equal(privateUser.user.startedDiving);
			expect(result.certificationLevel).to.equal(privateUser.user.certificationLevel);
			expect(result.certificationAgencies).to.equal(privateUser.user.certificationAgencies);
			expect(result.specialties).to.equal(privateUser.user.specialties);
			expect(result.about).to.equal(privateUser.user.about);
			expect(result.divesLogged).to.equal(-1);
			expect(result.bottomTimeLogged).to.equal(-1);
		});

		it('Will return public profile', async () => {

		});

		it('Will return friends-only profile if friended', async () => {

		});

		it('Will not return friends-only profile if not friended', async () => {

		});

		it('Will not return private profile', async () => {

		});

		it('Admins can view public profiles', async () => {

		});

		it('Admins can view friends-only profiles when friended', async () => {

		});

		it('Admins can view friends-only profiles when not friended', async () => {

		});

		it('Admins can view private profiles', async () => {

		});
	});

});
