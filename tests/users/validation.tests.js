import { expect } from 'chai';
import faker from 'faker';
import Joi from 'joi';
import {
	AdminUserQuerySchema,
	ChangePasswordSchema,
	ConfirmResetPasswordSchema,
	UserAccountSchema,
	UsernameSchema,
	UserQuerySchema
} from '../../service/validation/user';

let account = null;
let changePassword = null;
let resetPassword = null;
let adminUserQuery = null;
let userQuery = null;

function testExpectedError(err, expectedError) {
	if (expectedError) {
		expect(err.error).to.exist;
		expect(err.error.details[0].type).to.equal(expectedError);
	} else {
		expect(err.error).to.be.null;
	}
}

function validateUsername(expectedError, username) {
	const err = Joi.validate(username, UsernameSchema);
	testExpectedError(err, expectedError);
}

function validateAccount(expectedError) {
	const err = Joi.validate(account, UserAccountSchema);
	testExpectedError(err, expectedError);
}

function validateChangePassword(expectedError) {
	const err = Joi.validate(changePassword, ChangePasswordSchema);
	testExpectedError(err, expectedError);
}

function validateConfirmPasswordReset(expectedError) {
	const err = Joi.validate(resetPassword, ConfirmResetPasswordSchema);
	testExpectedError(err, expectedError);
}

function validateUserSearch(expectedError) {
	const err = Joi.validate(userQuery, UserQuerySchema);
	testExpectedError(err, expectedError);
}

function validateAdminUserSearch(expectedError) {
	const err = Joi.validate(adminUserQuery, AdminUserQuerySchema);
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
		validateUsername('string.regex.base', 'Here#are@bad*characters!');
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
		validateAccount('any.allowOnly');
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
		validateAccount('string.regex.base');
	});

	it('Password must contain a lowercase letter', () => {
		account.password = 'IGV*OGO3838..!#$@';
		validateAccount('string.regex.base');
	});

	it('Password must contain a number', () => {
		account.password = 'aassdfIUBOI..!#$@';
		validateAccount('string.regex.base');
	});

	it('Password must contain a special character', () => {
		account.password = 'aCCssdf3838';
		validateAccount('string.regex.base');
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
		validateChangePassword('string.regex.base');
	});

	it('New password must contain a lowercase letter', () => {
		changePassword.newPassword = 'IGV*OGO3838..!#$@';
		validateChangePassword('string.regex.base');
	});

	it('New password must contain a number', () => {
		changePassword.newPassword = 'aassdfIUBOI..!#$@';
		validateChangePassword('string.regex.base');
	});

	it('New password must contain a special character', () => {
		changePassword.newPassword = 'aCCssdf3838';
		validateChangePassword('string.regex.base');
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
		validateConfirmPasswordReset('string.regex.base');
	});

	it('New password must contain a lowercase letter', () => {
		resetPassword.newPassword = 'IGV*OGO3838..!#$@';
		validateConfirmPasswordReset('string.regex.base');
	});

	it('New password must contain a number', () => {
		resetPassword.newPassword = 'aassdfIUBOI..!#$@';
		validateConfirmPasswordReset('string.regex.base');
	});

	it('New password must contain a special character', () => {
		resetPassword.newPassword = 'aCCssdf3838';
		validateConfirmPasswordReset('string.regex.base');
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
		validateUserSearch('string.base');
	});

	it('Will fail if query is invalid', () => {
		userQuery = 'Totally not valid!!';
		validateUserSearch('string.regex.base');
	});
});

describe('Admin user search query', () => {
	beforeEach(() => {
		adminUserQuery = {
			query: 'ji',
			count: 500,
			sortBy: 'username',
			sortOrder: 'asc',
			lastSeen: 'Jimmy64'
		};
	});

	it('Succeeds if query is valid', () => {
		validateAdminUserSearch();
	});

	it('Query is optional', () => {
		delete adminUserQuery.query;
		validateAdminUserSearch();
	});

	it('Query must be a string', () => {
		adminUserQuery.query = 50;
		validateAdminUserSearch('string.base');
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
		validateAdminUserSearch('number.min');
	});

	it('Count cannot be greater than 1000', () => {
		adminUserQuery.count = 1001;
		validateAdminUserSearch('number.max');
	});

	it('Count is optional', () => {
		delete adminUserQuery.count;
		validateAdminUserSearch();
	});

	[ 'username' ].forEach(f => {
		it(`Sort by can be "${ f }"`, () => {
			adminUserQuery.sortBy = f;
			validateAdminUserSearch();
		});
	});

	it('Sort by cannot be invalid', () => {
		adminUserQuery.sortBy = 'not_valid';
		validateAdminUserSearch('any.allowOnly');
	});

	it('Sort by must be a string', () => {
		adminUserQuery.sortBy = 1;
		validateAdminUserSearch('string.base');
	});

	[ 'asc', 'desc' ].forEach(o => {
		it(`Sort order can be set to "${ o }"`, () => {
			adminUserQuery.sortOrder = o;
			validateAdminUserSearch();
		});
	});

	it('Sort order cannot be invalid', () => {
		adminUserQuery.sortOrder = 'lol';
		validateAdminUserSearch('any.allowOnly');
	});

	it('Sort order must be a string', () => {
		adminUserQuery.sortOrder = 50;
		validateAdminUserSearch('string.base');
	});
});
