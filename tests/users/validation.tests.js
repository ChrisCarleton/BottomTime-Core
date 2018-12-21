import { expect } from 'chai';
import faker from 'faker';
import Joi from 'joi';
import {
	ChangePasswordSchema,
	UserAccountSchema,
	UsernameSchema
} from '../../service/validation/user';

let account = null;
let changePassword = null;

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
