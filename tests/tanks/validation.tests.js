import { expect } from 'chai';
import faker from 'faker';
import { TankProfileSchema } from '../../service/validation/tank';

let tankProfile = null;

function testExpectedError(err, expectedError) {
	if (expectedError) {
		expect(err.error).to.exist;
		expect(err.error.details[0].type).to.equal(expectedError);
	} else {
		expect(err.error).to.be.undefined;
	}
}

function validateTankProfile(expectedError) {
	const err = TankProfileSchema.validate(tankProfile);
	testExpectedError(err, expectedError);
}

describe('Tank Profile Validation', () => {
	beforeEach(() => {
		tankProfile = {
			name: 'Chris\' Steel 100s',
			size: 12.1,
			workingPressure: 237,
			material: 'fe'
		};
	});

	it('Will succeed if tank profile is valid', () => {
		validateTankProfile();
	});

	it('Name must be a string', () => {
		tankProfile.name = 37;
		validateTankProfile('string.base');
	});

	it('Name is required', () => {
		delete tankProfile.name;
		validateTankProfile('any.required');
	});

	it('Name cannot be empty', () => {
		tankProfile.name = '';
		validateTankProfile('string.empty');
	});

	it('Name cannot be longer than 200 characters', () => {
		tankProfile.name = faker.lorem.sentences(10);
		validateTankProfile('string.max');
	});

	it('Name cannot be null', () => {
		tankProfile.name = null;
		validateTankProfile('string.base');
	});

	it('Size is optional', () => {
		delete tankProfile.size;
		validateTankProfile();
	});

	it('Size must be a number', () => {
		tankProfile.size = '11L';
		validateTankProfile('number.base');
	});

	it('Size must be positive', () => {
		tankProfile.size = 0;
		validateTankProfile('number.positive');
	});

	it('Size can be null', () => {
		tankProfile.size = null;
		validateTankProfile();
	});

	it('Working pressure is optional', () => {
		delete tankProfile.workingPressure;
		validateTankProfile();
	});

	it('Working pressure must be a number', () => {
		tankProfile.workingPressure = '237bar';
		validateTankProfile('number.base');
	});

	it('Working pressure must be positive', () => {
		tankProfile.workingPressure = 0;
		validateTankProfile('number.positive');
	});

	it('Working pressure can be null', () => {
		tankProfile.workingPressure = null;
		validateTankProfile();
	});

	[ 'al', 'fe', null ].forEach(value => {
		it(`Tank material can be set to ${ value }`, () => {
			tankProfile.material = value;
			validateTankProfile();
		});
	});

	it('Tank material canot be an invalid value', () => {
		tankProfile.material = 'ti';
		validateTankProfile('any.only');
	});

	it('Tank material must be a string', () => {
		tankProfile.material = true;
		validateTankProfile('string.base');
	});

	it('isCustom can be included without breaking validation', () => {
		tankProfile.isCustom = false;
		validateTankProfile();
	});
});
