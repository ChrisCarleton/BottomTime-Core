import bcrypt from 'bcrypt';
import faker from 'faker';
import moment from 'moment';

const specialties = [
	'Drysuit Diver',
	'Nitrox Diver',
	'Cavern Diver',
	'Night Diver',
	'Deep Diver',
	'Drift Diver',
	'Wreck Diver',
	'Boat Diver',
	'Gas Blender',
	'Altitude Diver',
	'DPV Diver',
	'Ice Diver',
	'Emergency Oxygen Provider',
	'Fish Identification',
	'Peak Performance Buoyancy',
	'Navigation Diver',
	'Search and Recovery',
	'Underwater Naturalist'
];

function fakeSpecialties() {
	const count = faker.random.number({ min: 0, max: 4 });
	if (count === 0) {
		return null;
	}

	const selected = new Array(count);
	for (let i = 0; i < selected.length; i++) {
		selected[i] = faker.random.arrayElement(specialties);
	}

	return selected.join(', ');
}

export default (password, logsVisibility = 'friends-only') => {
	const firstName = faker.name.firstName();
	const lastName = faker.name.lastName();
	const username = faker.internet.userName(firstName, lastName);
	const email = faker.internet.email(firstName, lastName);
	const year = moment().year();
	password = password || faker.internet.password(18, false, null, '*@1Az');

	return {
		usernameLower: username.toLowerCase(),
		emailLower: email.toLowerCase(),
		username,
		email,
		createdAt: faker.date.past(5),
		passwordHash: bcrypt.hashSync(password, 5),
		logsVisibility,

		firstName,
		lastName,
		location: faker.fake('{{address.city}}{{address.citySuffix}}, {{address.stateAbbr}}'),
		occupation: faker.commerce.department(),
		gender: faker.random.arrayElement([ 'male', 'female', null ]),
		birthdate: faker.date.past(70),
		typeOfDiver: String,
		startedDiving: faker.random.number({ min: year - 55, max: year }),
		certificationLevel: faker.random.arrayElement([
			'Open Water',
			'Advanced Open Water',
			'Rescue Diver',
			'Divemaster',
			'Instructor'
		]),
		certificationAgencies: faker.random.arrayElement([
			'PADI',
			'SSI',
			'NAUI',
			'BSAC'
		]),
		specialties: fakeSpecialties(),
		about: faker.lorem.paragraph(4)
	};
};
