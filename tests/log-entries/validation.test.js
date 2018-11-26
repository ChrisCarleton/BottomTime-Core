import { expect } from 'chai';
import fakeLogEntry from '../util/fake-log-entry';
import Joi from 'joi';
import { NewEntrySchema, UpdateEntrySchema } from '../../service/validation/log-entry';

let logEntry;

function validateUpdate(expectedError) {
	Joi.validate(logEntry, UpdateEntrySchema, null, (err) => {
		if (expectedError) {
			return expect(err.details[0].type).to.equal(expectedError);
		}

		expect(err).to.not.exist;
	});
}

function validateCreate(expectedError) {
	Joi.validate(logEntry, NewEntrySchema, null, (err) => {
		if (expectedError) {
			return expect(err.details[0].type).to.equal(expectedError);
		}

		expect(err).to.not.exist;
	});
}

function validateBoth(expectedError) {
	validateUpdate(expectedError);

	logEntry.entryId = null;
	validateCreate(expectedError);
}

describe('Log entry validation' , () => {
	
	beforeEach(() => {
		logEntry = fakeLogEntry();
	});

	it('Update requires an entry Id', () => {
		logEntry.entryId = null;
		validateUpdate('lol');
	});

	it('Create does not allow an entry Id', () => {
		validateCreate('lol');
	});

	it('Entry time is a valid ISO date', () => {
		logEntry.entryTime = 'lol!';
		validateBoth('date.isoDate');
	});
});
