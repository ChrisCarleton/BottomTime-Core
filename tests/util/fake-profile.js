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

export default (logsVisibility, firstName, lastName) => {
	const year = moment().year();
	logsVisibility = logsVisibility
		|| faker.random.arrayElement([ 'public', 'friends-only', 'private' ]);

	return {
		logsVisibility,
		firstName: firstName || faker.name.firstName(),
		lastName: lastName || faker.name.lastName(),
		location: faker.fake('{{address.city}}{{address.citySuffix}}, {{address.stateAbbr}}'),
		occupation: faker.commerce.department(),
		gender: faker.random.arrayElement([ 'male', 'female', null ]),
		birthdate: moment(faker.date.past(70)).format('YYYY-MM-DD'),
		typeOfDiver: faker.random.arrayElement([
			'New to diving',
			'Casual/vacation diver',
			'Typical diver',
			'Experienced diver',
			'Tech diver',
			'Commercial diver',
			'Divemaster',
			'Instructor',
			'Professional diver'
		]),
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
		about: faker.lorem.paragraph(4),
		weightUnit: faker.random.arrayElement([ 'kg', 'lbs' ]),
		distanceUnit: faker.random.arrayElement([ 'm', 'ft' ]),
		temperatureUnit: faker.random.arrayElement([ 'c', 'f' ]),
		pressureUnit: faker.random.arrayElement([ 'bar', 'psi' ])
	};
};
