import { expect } from 'chai';
import fakeLogEntry from '../util/fake-log-entry';
import fakeMongoId from '../util/fake-mongo-id';
import faker from 'faker';
import Joi from 'joi';
import {
	EntryQueryParamsSchema,
	NewEntrySchema,
	UpdateEntrySchema
} from '../../service/validation/log-entry';

let logEntry = null;
let queryString = null;

function ensureValid(isValid, expectedError) {
	if (expectedError) {
		expect(isValid.error).to.exist;
		expect(isValid.error.details).to.have.length(1);
		expect(isValid.error.details[0].type).to.equal(expectedError);
	} else {
		expect(isValid.error).to.not.exist;
	}
}

function validateUpdate(expectedError) {
	const isValid = Joi.validate(logEntry, UpdateEntrySchema);
	ensureValid(isValid, expectedError);
}

function validateCreate(expectedError) {
	const isValid = Joi.validate(logEntry, NewEntrySchema);
	ensureValid(isValid, expectedError);
}

function validateQueryParams(expectedError) {
	const isValid = Joi.validate(queryString, EntryQueryParamsSchema);
	ensureValid(isValid, expectedError);
}

describe('Log entry validation', () => {

	beforeEach(() => {
		logEntry = fakeLogEntry();
		delete logEntry.userId;
	});

	it('Update requires an entry Id', () => {
		delete logEntry.entryId;
		validateUpdate('any.required');
	});

	it('Create does not allow an entry Id', () => {
		logEntry.entryId = fakeMongoId();
		validateCreate('object.allowUnknown');
	});

	it('Entry time is a valid ISO date', () => {
		logEntry.entryTime = 'Tuesday?';
		validateCreate('string.isoDate');
	});

	it('Entry time is required', () => {
		delete logEntry.entryTime;
		validateCreate('any.required');
	});

	it('Bottom time cannot be zero', () => {
		logEntry.bottomTime = 0;
		validateCreate('number.positive');
	});

	it('Bottom time cannot be negative', () => {
		logEntry.bottomTime = -1;
		validateCreate('number.positive');
	});

	it('Bottom time can be fractional', () => {
		logEntry.bottomTime = 29.23;
		logEntry.totalTime = logEntry.bottomTime + 2.3;
		validateCreate();
	});

	it('Total time cannot be zero', () => {
		delete logEntry.bottomTime;
		logEntry.totalTime = 0;
		validateCreate('number.positive');
	});

	it('Total time cannot be negative', () => {
		delete logEntry.bottomTime;
		logEntry.totalTime = -4;
		validateCreate('number.positive');
	});

	it('Total time can be fractional', () => {
		logEntry.totalTime = logEntry.bottomTime + 7.38;
		validateCreate();
	});

	it('Total time cannot be less than bottom time', () => {
		logEntry.bottomTime += 5;
		logEntry.totalTime = logEntry.bottomTime - 5;
		validateCreate('number.min');
	});

	it('Location is required', () => {
		logEntry.location = '';
		validateCreate('any.empty');
	});

	it('Location must be a string', () => {
		logEntry.location = true;
		validateCreate('string.base');
	});

	it('Location cannot exceed 200 characters', () => {
		logEntry.location = faker.lorem.paragraph(7);
		validateCreate('string.max');
	});

	it('Site is required', () => {
		logEntry.site = '';
		validateCreate('any.empty');
	});

	it('Site cannot exceed 200 characters', () => {
		logEntry.site = faker.lorem.paragraph(7);
		validateCreate('string.max');
	});

	it('Average depth cannot be zero', () => {
		logEntry.averageDepth = 0;
		validateCreate('number.positive');
	});

	it('Average depth cannot be negative', () => {
		logEntry.averageDepth = -3;
		validateCreate('number.positive');
	});

	it('Average depth can be fractional', () => {
		logEntry.averageDepth = logEntry.maxDepth - 2.23;
		validateCreate();
	});

	it('Max depth cannot be zero', () => {
		logEntry.maxDepth = 0;
		validateCreate('number.positive');
	});

	it('Max depth cannot be negative', () => {
		logEntry.maxDepth = -22;
		validateCreate('number.positive');
	});

	it('Max depth can be fractional', () => {
		logEntry.maxDepth += 14.35;
		validateCreate();
	});

	it('Max depth cannot be less than average depth', () => {
		logEntry.maxDepth = logEntry.averageDepth - 2;
		validateCreate('number.min');
	});

});

describe('Entry query params validation', () => {
	beforeEach(() => {
		queryString = {
			count: 250,
			sortBy: 'bottomTime',
			sortOrder: 'asc'
		};
	});

	it('Validation succeeds if request is valid', () => {
		validateQueryParams();
	});

	it('Count must be a number', () => {
		queryString.count = 'thirty-three';
		validateQueryParams('number.base');
	});

	it('Count must be at least 1', () => {
		queryString.count = 0;
		validateQueryParams('number.min');
	});

	it('Count must be no more than 1000', () => {
		queryString.count = 1001;
		validateQueryParams('number.max');
	});

	it('Count cannot be fractional', () => {
		queryString.count = 100.5;
		validateQueryParams('number.integer');
	});

	[ 'entryTime', 'maxDepth', 'bottomTime' ].forEach(field => {
		it(`sortBy can be set to ${ field }`, () => {
			queryString.sortBy = field;
			validateQueryParams();
		});
	});

	it('sortBy cannot be an invalid value', () => {
		queryString.sortBy = 'somethingElse';
		validateQueryParams('any.allowOnly');
	});

	[ 'asc', 'desc' ].forEach(order => {
		it(`sortOrder can be set to ${ order }`, () => {
			queryString.sortOrder = order;
			validateQueryParams();
		});
	});

	it('sortOrder cannot be an invalid value', () => {
		queryString.sortOrder = 'up';
		validateQueryParams('any.allowOnly');
	});

	it('If sortBy is included sortOrder is required', () => {
		delete queryString.sortOrder;
		validateQueryParams('object.and');
	});

	it('If sortOrder is included then sortBy is required', () => {
		delete queryString.sortBy;
		validateQueryParams('object.and');
	});
});
