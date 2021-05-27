/* eslint max-statements: 0 */

import { expect } from 'chai';
import fakeProfile from '../util/fake-profile';
import faker from 'faker';
import moment from 'moment';
import { UpdateProfileSchema } from '../../service/validation/profile';

let profile = null;

function ensureValid(isValid, expectedError) {
	if (expectedError) {
		expect(isValid.error).to.exist;
		expect(isValid.error.details).to.have.length(1);
		expect(isValid.error.details[0].type).to.equal(expectedError);
	} else {
		expect(isValid.error).to.not.exist;
	}
}

function validateProfile(expectedError) {
	const isValid = UpdateProfileSchema.validate(profile);
	ensureValid(isValid, expectedError);
}

describe('Update profile validation', () => {

	beforeEach(() => {
		profile = fakeProfile();
	});

	[ 'private', 'friends-only', 'public' ].forEach(p => {
		it(`logsVisibility can be set to ${ p }`, () => {
			profile.logsVisibility = p;
			validateProfile();
		});
	});

	it('logsVisibility cannot be an unapproved value', () => {
		profile.logsVisibility = 'private-ish';
		validateProfile('any.allowOnly');
	});

	it('logsVisibility must be a string', () => {
		profile.logsVisibility = 33;
		validateProfile('string.base');
	});

	it('logsVisibility cannot be null', () => {
		profile.logsVisibility = null;
		validateProfile('string.base');
	});

	it('logsVisibility is optional', () => {
		delete profile.logsVisibility;
		validateProfile();
	});

	it('firstName must be a string', () => {
		profile.firstName = 99;
		validateProfile('string.base');
	});

	it('firstName can be no longer than 50 characters', () => {
		profile.firstName = 'Jimmyjakezoltanmikechrisstevebarryrogerwaynegregstu';
		validateProfile('string.max');
	});

	it('firstName can be null', () => {
		profile.firstName = null;
		validateProfile();
	});

	it('firstName is optional', () => {
		delete profile.firstName;
		validateProfile();
	});

	it('lastName must be a string', () => {
		profile.lastName = 99;
		validateProfile('string.base');
	});

	it('lastName can be no longer than 50 characters', () => {
		profile.lastName = 'Jimmyjakezoltanmikechrisstevebarryrogerwaynegregstu';
		validateProfile('string.max');
	});

	it('lastName can be null', () => {
		profile.lastName = null;
		validateProfile();
	});

	it('lastName is optional', () => {
		delete profile.lastName;
		validateProfile();
	});

	it('location must be a string', () => {
		profile.location = 99;
		validateProfile('string.base');
	});

	it('location can be no longer than 100 characters', () => {
		profile.location = faker.lorem.sentences(20);
		validateProfile('string.max');
	});

	it('location can be null', () => {
		profile.location = null;
		validateProfile();
	});

	it('location is optional', () => {
		delete profile.location;
		validateProfile();
	});

	it('occupation must be a string', () => {
		profile.occupation = 99;
		validateProfile('string.base');
	});

	it('occupation can be no longer than 50 characters', () => {
		profile.occupation = faker.lorem.sentences(15);
		validateProfile('string.max');
	});

	it('occupation can be null', () => {
		profile.occupation = null;
		validateProfile();
	});

	it('occupation is optional', () => {
		delete profile.occupation;
		validateProfile();
	});

	it('birthdate must follow the "yyyy-mm-dd" format', () => {
		profile.birthdate = 'Dec-26-1983';
		validateProfile('string.regex.base');
	});

	it('birthdate can be null', () => {
		profile.birthdate = null;
		validateProfile();
	});

	it('typeOfDiver must be a string', () => {
		profile.typeOfDiver = 99;
		validateProfile('string.base');
	});

	it('typeOfDiver can be no longer than 100 characters', () => {
		profile.typeOfDiver = faker.lorem.sentences(20);
		validateProfile('string.max');
	});

	it('typeOfDiver can be null', () => {
		profile.typeOfDiver = null;
		validateProfile();
	});

	it('typeOfDiver is optional', () => {
		delete profile.typeOfDiver;
		validateProfile();
	});

	it('startedDiving must be a number', () => {
		profile.startedDiving = 'last year';
		validateProfile('number.base');
	});

	it('startedDiving must be an integer', () => {
		profile.startedDiving = 1977.235;
		validateProfile('number.integer');
	});

	it('startedDiving can not be more than 100 years ago', () => {
		profile.startedDiving = 1910;
		validateProfile('number.min');
	});

	it('startedDiving can not be in the future', () => {
		profile.startedDiving = moment().year() + 1;
		validateProfile('number.max');
	});

	it('certificationLevel must be a string', () => {
		profile.certificationLevel = 99;
		validateProfile('string.base');
	});

	it('certificationLevel can be no longer than 100 characters', () => {
		profile.certificationLevel = faker.lorem.sentences(20);
		validateProfile('string.max');
	});

	it('certificationLevel can be null', () => {
		profile.certificationLevel = null;
		validateProfile();
	});

	it('certificationLevel is optional', () => {
		delete profile.certificationLevel;
		validateProfile();
	});

	it('certificationAgencies must be a string', () => {
		profile.certificationAgencies = 99;
		validateProfile('string.base');
	});

	it('certificationAgencies can be no longer than 100 characters', () => {
		profile.certificationAgencies = faker.lorem.sentences(20);
		validateProfile('string.max');
	});

	it('certificationAgencies can be null', () => {
		profile.certificationAgencies = null;
		validateProfile();
	});

	it('certificationAgencies is optional', () => {
		delete profile.certificationAgencies;
		validateProfile();
	});

	it('specialties must be a string', () => {
		profile.specialties = 99;
		validateProfile('string.base');
	});

	it('specialties can be no longer than 200 characters', () => {
		profile.specialties = faker.lorem.sentences(35);
		validateProfile('string.max');
	});

	it('specialties can be null', () => {
		profile.specialties = null;
		validateProfile();
	});

	it('specialties is optional', () => {
		delete profile.specialties;
		validateProfile();
	});

	it('about must be a string', () => {
		profile.about = 99;
		validateProfile('string.base');
	});

	it('about can be no longer than 1000 characters', () => {
		profile.about = faker.lorem.paragraphs(20);
		validateProfile('string.max');
	});

	it('about can be null', () => {
		profile.about = null;
		validateProfile();
	});

	it('about is optional', () => {
		delete profile.about;
		validateProfile();
	});

	[ 'ft', 'm' ].forEach(d => {
		it(`Distance unit can be set to "${ d }"`, () => {
			profile.distanceUnit = d;
			validateProfile();
		});
	});

	it('Distance unit cannot be set to an invalid value', () => {
		profile.distanceUnit = 'y';
		validateProfile('any.allowOnly');
	});

	it('Distance unit cannot be null', () => {
		profile.distanceUnit = null;
		validateProfile('string.base');
	});

	it('Distance unit can be omitted', () => {
		delete profile.distanceUnit;
		validateProfile();
	});

	[ 'c', 'f' ].forEach(t => {
		it(`Temperature unit can be set to "${ t }"`, () => {
			profile.temperatureUnit = t;
			validateProfile();
		});
	});

	it('Temperature unit cannot be set to an invalid value', () => {
		profile.temperatureUnit = 'K';
		validateProfile('any.allowOnly');
	});

	it('Temperature unit cannot be null', () => {
		profile.temperatureUnit = null;
		validateProfile('string.base');
	});

	it('Temperature unit can be omitted', () => {
		delete profile.temperatureUnit;
		validateProfile();
	});

	[ 'kg', 'lbs' ].forEach(w => {
		it(`Weight unit can be set to "${ w }"`, () => {
			profile.weightUnit = w;
			validateProfile();
		});
	});

	it('Weight unit cannot be set to an invalid value', () => {
		profile.weightUnit = 'st';
		validateProfile('any.allowOnly');
	});

	it('Weight unit cannot be null', () => {
		profile.weightUnit = null;
		validateProfile('string.base');
	});

	it('Weight unit can be omitted', () => {
		delete profile.weightUnit;
		validateProfile();
	});

	[ 'bar', 'psi' ].forEach(p => {
		it(`Pressure unit can be set to "${ p }"`, () => {
			profile.pressureUnit = p;
			validateProfile();
		});
	});

	it('Pressure unit cannot be set to an invalid value', () => {
		profile.pressureUnit = 'kPa';
		validateProfile('any.allowOnly');
	});

	it('Pressure unit cannot be null', () => {
		profile.pressureUnit = null;
		validateProfile('string.base');
	});

	it('Pressure unit can be omitted', () => {
		delete profile.pressureUnit;
		validateProfile();
	});

	[ 'basic', 'advanced', 'technical' ].forEach(c => {
		it(`UI complexity can be set to ${ c }`, () => {
			profile.uiComplexity = c;
			validateProfile();
		});
	});

	it('UI complexity cannot be set to an invalid value', () => {
		profile.uiComplexity = 'simple';
		validateProfile('any.allowOnly');
	});

	it('UI complexity cannot be null', () => {
		profile.uiComplexity = null;
		validateProfile('string.base');
	});

	it('UI complexity can be omitted', () => {
		delete profile.uiComplexity;
		validateProfile();
	});
});
