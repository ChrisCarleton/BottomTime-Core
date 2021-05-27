import { expect } from 'chai';
import fakeCompleteRegistration from '../util/fake-complete-registration';
import faker from 'faker';
import {
	AdminUserQuerySchema,
	ChangePasswordSchema,
	CompleteRegistrationSchema,
	ConfirmResetPasswordSchema,
	UserAccountSchema,
	UserQuerySchema
} from '../../service/validation/user';
import { UsernameSchema } from '../../service/validation/common';

const LongString = faker.lorem.sentences(7).substr(0, 51);

let account = null;
let registration = null;
let changePassword = null;
let resetPassword = null;
let adminUserQuery = null;
let userQuery = null;

function testExpectedError(err, expectedError) {
	if (expectedError) {
		expect(err.error).to.exist;
		expect(err.error.details[0].type).to.equal(expectedError);
	} else {
		expect(err.error).to.be.undefined;
	}
}

function validateUsername(expectedError, username) {
	const err = UsernameSchema.validate(username);
	testExpectedError(err, expectedError);
}

function validateAccount(expectedError) {
	const err = UserAccountSchema.validate(account);
	testExpectedError(err, expectedError);
}

function validateCompleteRegistration(expectedError) {
	const err = CompleteRegistrationSchema.validate(registration);
	testExpectedError(err, expectedError);
}

function validateChangePassword(expectedError) {
	const err = ChangePasswordSchema.validate(changePassword);
	testExpectedError(err, expectedError);
}

function validateConfirmPasswordReset(expectedError) {
	const err = ConfirmResetPasswordSchema.validate(resetPassword);
	testExpectedError(err, expectedError);
}

function validateUserSearch(expectedError) {
	const err = UserQuerySchema.validate(userQuery);
	testExpectedError(err, expectedError);
}

function validateAdminUserSearch(expectedError) {
	const err = AdminUserQuerySchema.validate(adminUserQuery);
	testExpectedError(err, expectedError);
}

describe('Username Validation', () => {
	it('Username must be at least 5 characters long', () => {
		validateUsername('string.min', 'lol');
	});

	it('Username cannot be longer than 50 characters', () => {
		validateUsername(
			'string.max',
			'holycrap.thisisaREALLY.longusername.Srsly-whydidI_picksuchalongassusername.dafuq');
	});

	it('Username cannot contain invalid characters', () => {
		validateUsername('string.pattern.base', 'Here#are@bad*characters!');
	});

	it('Valid usernames are accepted', () => {
		validateUsername(null, faker.internet.userName());
	});
});

describe('Account Details Validation', () => {

	beforeEach(() => {
		account = {
			email: faker.internet.email(),
			password: faker.internet.password(18, false, null, '*@1Az'),
			role: faker.random.arrayElement([ 'user', 'admin' ])
		};
	});

	it('Email is required', () => {
		delete account.email;
		validateAccount('any.required');
	});

	it('Email must be valid', () => {
		account.email = 'not an e-mail';
		validateAccount('string.email');
	});

	it('Role is required', () => {
		delete account.role;
		validateAccount('any.required');
	});

	it('Role must be an accepted value', () => {
		account.role = 'professor';
		validateAccount('any.only');
	});

	it('Password is required', () => {
		delete account.password;
		validateAccount('any.required');
	});

	it('Password must be at least 7 characters long', () => {
		account.password = '2!sHrt';
		validateAccount('string.min');
	});

	it('Password must be no more than 50 characters long', () => {
		account.password = 'OMfG!!!__WAy.2-freakin.lonG!!!~Why.is_thisP@ssw3rdSOBIG!~Ican\'tBElieveITTTT!!';
		validateAccount('string.max');
	});

	it('Password must contain an uppercase letter', () => {
		account.password = 'aassdf3838..!#$@';
		validateAccount('string.pattern.base');
	});

	it('Password must contain a lowercase letter', () => {
		account.password = 'IGV*OGO3838..!#$@';
		validateAccount('string.pattern.base');
	});

	it('Password must contain a number', () => {
		account.password = 'aassdfIUBOI..!#$@';
		validateAccount('string.pattern.base');
	});

	it('Password must contain a special character', () => {
		account.password = 'aCCssdf3838';
		validateAccount('string.pattern.base');
	});
});

describe('Complete Registration Validation', () => {
	beforeEach(() => {
		registration = fakeCompleteRegistration();
	});

	it('Username is required', () => {
		delete registration.username;
		validateCompleteRegistration('any.required');
	});

	it('Username must be valid', () => {
		registration.username = 'not valid';
		validateCompleteRegistration('string.pattern.base');
	});

	it('Email is required', () => {
		delete registration.email;
		validateCompleteRegistration('any.required');
	});

	it('Email must be valid', () => {
		registration.email = 'not valid @ wherever';
		validateCompleteRegistration('string.email');
	});

	it('First name is optional', () => {
		delete registration.firstName;
		validateCompleteRegistration();
	});

	it('First name must be a string', () => {
		registration.firstName = 77;
		validateCompleteRegistration('string.base');
	});

	it('First name cannot exceed 50 characters', () => {
		registration.firstName = LongString;
		validateCompleteRegistration('string.max');
	});

	it('Last name is optional', () => {
		delete registration.lastName;
		validateCompleteRegistration();
	});

	it('Last name must be a string', () => {
		registration.lastName = true;
		validateCompleteRegistration('string.base');
	});

	it('Last name cannot exceed 50 characters', () => {
		registration.lastName = LongString;
		validateCompleteRegistration('string.max');
	});

	it('Logs visibility is optional', () => {
		delete registration.logsVisibility;
		validateCompleteRegistration();
	});

	[ 'private', 'public', 'friends-only' ].forEach(v => {
		it(`Logs visibility can be set to ${ v }`, () => {
			registration.logsVisibility = v;
			validateCompleteRegistration();
		});
	});

	it('Logs visibility cannot be set to another value', () => {
		registration.logsVisibility = 'just my neighbour, Steve';
		validateCompleteRegistration('any.only');
	});

	it('Weight unit is optional', () => {
		delete registration.weightUnit;
		validateCompleteRegistration();
	});

	[ 'kg', 'lbs' ].forEach(w => {
		it(`Weight unit can be set to ${ w }`, () => {
			registration.weightUnit = w;
			validateCompleteRegistration();
		});
	});

	it('Weight unit cannot be set to another value', () => {
		registration.weightUnit = 'stone';
		validateCompleteRegistration('any.only');
	});

	it('Temperature unit is optional', () => {
		delete registration.temperatureUnit;
		validateCompleteRegistration();
	});

	[ 'c', 'f' ].forEach(t => {
		it(`Temperature unit can be set to ${ t }`, () => {
			registration.temperatureUnit = t;
			validateCompleteRegistration();
		});
	});

	it('Temperature unit cannot be set to another value', () => {
		registration.temperatureUnit = 'K';
		validateCompleteRegistration('any.only');
	});

	it('Distance unit is optional', () => {
		delete registration.distanceUnit;
		validateCompleteRegistration();
	});

	[ 'm', 'ft' ].forEach(d => {
		it(`Distance unit can be set to ${ d }`, () => {
			registration.distanceUnit = d;
			validateCompleteRegistration();
		});
	});

	it('Distance unit cannot be set to another value', () => {
		registration.distanceUnit = 'km';
		validateCompleteRegistration('any.only');
	});

	it('Pressure unit is optional', () => {
		delete registration.pressureUnit;
		validateCompleteRegistration();
	});

	[ 'bar', 'psi' ].forEach(p => {
		it(`Pressure unit can be set to ${ p }`, () => {
			registration.pressureUnit = p;
			validateCompleteRegistration();
		});
	});

	it('Pressure unit cannot be set to another value', () => {
		registration.pressureUnit = 'kpa';
		validateCompleteRegistration('any.only');
	});

	it('UI complexity cannot be set to another value', () => {
		registration.uiComplexity = 'simple';
		validateCompleteRegistration('any.only');
	});

	it('UI complexity is optional', () => {
		delete registration.uiComplexity;
		validateCompleteRegistration();
	});

	[ 'basic', 'advanced', 'technical' ].forEach(c => {
		it(`UI complexity can be set to ${ c }`, () => {
			registration.uiComplexity = c;
			validateCompleteRegistration();
		});
	});
});

describe('Change Password Validation', () => {
	beforeEach(() => {
		changePassword = {
			oldPassword: faker.internet.password(18, false, null, '*@1Az'),
			newPassword: faker.internet.password(18, false, null, '*__1Az')
		};
	});

	it('Old password must be a string', () => {
		changePassword.oldPassword = 77;
		validateChangePassword('string.base');
	});

	it('New password is required', () => {
		delete changePassword.newPassword;
		validateChangePassword('any.required');
	});

	it('New password must be at least 7 characters long', () => {
		changePassword.newPassword = '2!sHrt';
		validateChangePassword('string.min');
	});

	it('New password must be no more than 50 characters long', () => {
		changePassword.newPassword = 'OMfG!!!__WAy.2-freakin.lonG!!!~Why.is_thisP@ssw3rdSOBIG!~Ican\'tBElieveITTTT!!';
		validateChangePassword('string.max');
	});

	it('New password must contain an uppercase letter', () => {
		changePassword.newPassword = 'aassdf3838..!#$@';
		validateChangePassword('string.pattern.base');
	});

	it('New password must contain a lowercase letter', () => {
		changePassword.newPassword = 'IGV*OGO3838..!#$@';
		validateChangePassword('string.pattern.base');
	});

	it('New password must contain a number', () => {
		changePassword.newPassword = 'aassdfIUBOI..!#$@';
		validateChangePassword('string.pattern.base');
	});

	it('New password must contain a special character', () => {
		changePassword.newPassword = 'aCCssdf3838';
		validateChangePassword('string.pattern.base');
	});
});

describe('Confirm Reset Password Validation', () => {
	beforeEach(() => {
		resetPassword = {
			resetToken: faker.random.uuid(),
			newPassword: faker.internet.password(18, false, null, '*@1Az')
		};
	});

	it('Token is required', () => {
		delete resetPassword.resetToken;
		validateConfirmPasswordReset('any.required');
	});

	it('Token must be a string', () => {
		resetPassword.resetToken = 23;
		validateConfirmPasswordReset('string.base');
	});

	it('Token must be a uuid', () => {
		resetPassword.resetToken = 'hey!';
		validateConfirmPasswordReset('string.guid');
	});

	it('New password is required', () => {
		delete resetPassword.newPassword;
		validateConfirmPasswordReset('any.required');
	});

	it('New password must be at least 7 characters long', () => {
		resetPassword.newPassword = '2!sHrt';
		validateConfirmPasswordReset('string.min');
	});

	it('New password must be no more than 50 characters long', () => {
		resetPassword.newPassword = 'OMfG!!!__WAy.2-freakin.lonG!!!~Why.is_thisP@ssw3rdSOBIG!~Ican\'tBElieveITTTT!!';
		validateConfirmPasswordReset('string.max');
	});

	it('New password must contain an uppercase letter', () => {
		resetPassword.newPassword = 'aassdf3838..!#$@';
		validateConfirmPasswordReset('string.pattern.base');
	});

	it('New password must contain a lowercase letter', () => {
		resetPassword.newPassword = 'IGV*OGO3838..!#$@';
		validateConfirmPasswordReset('string.pattern.base');
	});

	it('New password must contain a number', () => {
		resetPassword.newPassword = 'aassdfIUBOI..!#$@';
		validateConfirmPasswordReset('string.pattern.base');
	});

	it('New password must contain a special character', () => {
		resetPassword.newPassword = 'aCCssdf3838';
		validateConfirmPasswordReset('string.pattern.base');
	});
});

describe('Search Users Validation', () => {
	beforeEach(() => {
		userQuery = 'mike.lamar';
	});

	it('Will accept a valid username', () => {
		validateUserSearch();
	});

	it('Will accept a valid email address', () => {
		userQuery = 'm_lamar27@hotmail.com';
		validateUserSearch();
	});

	it('Will fail if query is missing', () => {
		userQuery = null;
		validateUserSearch('alternatives.types');
	});

	it('Will fail if query is invalid', () => {
		userQuery = 'Totally not valid!!';
		validateUserSearch('alternatives.match');
	});
});

describe('Admin user search query', () => {
	beforeEach(() => {
		adminUserQuery = {
			query: 'ji',
			count: 500,
			skip: 1500,
			sortBy: 'username',
			sortOrder: 'asc',
			lockedOut: false,
			role: 'user',
			logsVisibility: 'private'
		};
	});

	it('Query is optional', () => {
		delete adminUserQuery.query;
		validateAdminUserSearch();
	});

	it('Query must be a string', () => {
		adminUserQuery.query = 50;
		validateAdminUserSearch('string.base');
	});

	it('Count is optional', () => {
		delete adminUserQuery.count;
		validateAdminUserSearch();
	});

	it('Count must be a number', () => {
		adminUserQuery.count = 'fifty';
		validateAdminUserSearch('number.base');
	});

	it('Count must be an integer', () => {
		adminUserQuery.count = 500.5;
		validateAdminUserSearch('number.integer');
	});

	it('Count cannot be less than 1', () => {
		adminUserQuery.count = 0;
		validateAdminUserSearch('number.positive');
	});

	it('Count cannot be greater than 1000', () => {
		adminUserQuery.count = 1001;
		validateAdminUserSearch('number.max');
	});

	it('Skip is optional', () => {
		delete adminUserQuery.skip;
		validateAdminUserSearch();
	});

	it('Skip must be a number', () => {
		adminUserQuery.skip = 'a few';
		validateAdminUserSearch('number.base');
	});

	it('Skip must be an integer', () => {
		adminUserQuery.skip = 200.3;
		validateAdminUserSearch('number.integer');
	});

	it('Skip cannot be less than zero', () => {
		adminUserQuery.skip = -1;
		validateAdminUserSearch('number.min');
	});

	it('Sort by is optional', () => {
		delete adminUserQuery.sortBy;
		validateAdminUserSearch();
	});

	it('Sort by must be a string', () => {
		adminUserQuery.sortBy = 7;
		validateAdminUserSearch('any.only');
	});

	[ 'relevance', 'username', 'created' ].forEach(f => {
		it(`Sort by can be "${ f }"`, () => {
			adminUserQuery.sortBy = f;
			validateAdminUserSearch();
		});
	});

	it('Sort by cannot be invalid', () => {
		adminUserQuery.sortBy = 'not_valid';
		validateAdminUserSearch('any.only');
	});

	it('Sort by must be a string', () => {
		adminUserQuery.sortBy = 1;
		validateAdminUserSearch('any.only');
	});

	it('Sort order is optional', () => {
		delete adminUserQuery.sortOrder;
		validateAdminUserSearch();
	});

	it('Sort order must be a string', () => {
		adminUserQuery.sortOrder = 13;
		validateAdminUserSearch('any.only');
	});

	[ 'asc', 'desc' ].forEach(o => {
		it(`Sort order can be set to "${ o }"`, () => {
			adminUserQuery.sortOrder = o;
			validateAdminUserSearch();
		});
	});

	it('Sort order cannot be invalid', () => {
		adminUserQuery.sortOrder = 'lol';
		validateAdminUserSearch('any.only');
	});

	it('Sort order must be a string', () => {
		adminUserQuery.sortOrder = 50;
		validateAdminUserSearch('any.only');
	});

	it('Locked out is optional', () => {
		delete adminUserQuery.lockedOut;
		validateAdminUserSearch();
	});

	it('Locked out must be a boolean value', () => {
		adminUserQuery.lockedOut = 'no';
		validateAdminUserSearch('boolean.base');
	});

	it('Role is optional', () => {
		delete adminUserQuery.role;
		validateAdminUserSearch();
	});

	it('Role must be a string', () => {
		adminUserQuery.role = 7;
		validateAdminUserSearch('any.only');
	});

	[ 'user', 'admin' ].forEach(r => {
		it(`Role can be ${ r }`, () => {
			adminUserQuery.role = r;
			validateAdminUserSearch();
		});
	});

	it('Role cannot be invalid', () => {
		adminUserQuery.role = 'supervisor';
		validateAdminUserSearch('any.only');
	});

	it('Logs visibility is optional', () => {
		delete adminUserQuery.logsVisibility;
		validateAdminUserSearch();
	});

	it('Logs visibility must be a string', () => {
		adminUserQuery.logsVisibility = true;
		validateAdminUserSearch('any.only');
	});

	[ 'private', 'public', 'friends-only' ].forEach(v => {
		it(`Logs visibility can be ${ v }`, () => {
			adminUserQuery.logsVisibility = v;
			validateAdminUserSearch();
		});
	});

	it('Logs visibility cannot be invalid', () => {
		adminUserQuery.logsVisibility = 'just-tom';
		validateAdminUserSearch('any.only');
	});
});
