import { expect } from 'chai';
import faker from 'faker';
import Joi from 'joi';
import { UserAccountSchema, UsernameSchema } from '../../service/validation/user';

let account = null;

function validateUsername(expectedError, username) {
	const err = Joi.validate(username, UsernameSchema);
	if (expectedError) {
		expect(err.error).to.exist;
		expect(err.error.details[0].type).to.equal(expectedError);
	} else {
		expect(err.error).to.be.null;
	}
}

function validateAccount(expectedError) {
	const err = Joi.validate(account, UserAccountSchema);
	if (expectedError) {
		expect(err.error).to.exist;
		expect(err.error.details[0].type).to.equal(expectedError);
	} else {
		expect(err.error).to.be.null;
	}
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

	it('Password must meet strength requirements', () => {
		account.password = 'WellThisJustWillNotDo';
		validateAccount('string.regex.base');
	});
});
