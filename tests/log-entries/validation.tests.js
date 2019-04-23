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
import moment from 'moment';

let logEntry = null;
let queryString = null;

function ensureValid(isValid, expectedError) {
	if (expectedError) {
		expect(isValid.error).to.exist;
		expect(isValid.error.details.length).to.be.at.least(1);
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

	describe('Core properties', () => {
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

		it('Dive number is optional', () => {
			delete logEntry.diveNumber;
			validateCreate();
		});

		it('Dive number must be a number', () => {
			logEntry.diveNumber = 'seven';
			validateCreate('number.base');
		});

		it('Dive number must be an integer', () => {
			logEntry.diveNumber = 1.5;
			validateCreate('number.integer');
		});

		it('Dive number must be positive', () => {
			logEntry.diveNumber = 0;
			validateCreate('number.positive');
		});

		it('Bottom time is required', () => {
			delete logEntry.bottomTime;
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

		it('Total time can be omitted', () => {
			delete logEntry.totalTime;
			validateCreate();
		});

		it('Total time cannot be zero', () => {
			logEntry.bottomTime = 0;
			logEntry.totalTime = 0;
			validateCreate('number.positive');
		});

		it('Total time cannot be negative', () => {
			logEntry.bottomTime = 1;
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

		it('Surface interval is optional', () => {
			delete logEntry.surfaceInterval;
			validateCreate();
		});

		it('Surface interval must be a number', () => {
			logEntry.surfaceInterval = 'seven';
			validateCreate('number.base');
		});

		it('Surface interval must be positive', () => {
			logEntry.surfaceInterval = 0;
			validateCreate('number.positive');
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

		it('Max depth is required', () => {
			delete logEntry.maxDepth;
			validateCreate('any.required');
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

		it('Tags must be an array', () => {
			logEntry.tags = 'tag1, tag2';
			validateCreate('array.base');
		});

		it('Tags array cannot be sparse', () => {
			logEntry.tags = [
				'night',
				'reef',
				null,
				'livingTheDream'
			];

			validateCreate('string.base');
		});

		it('Tags array cannot contain empty strings', () => {
			logEntry.tags = [
				'night',
				'reef',
				'',
				'livingTheDream'
			];

			validateCreate('any.empty');
		});

		it('Tags must be strings', () => {
			logEntry.tags = [ 7 ];
			validateCreate('string.base');
		});

		it('Tags cannot be more than 25 characters', () => {
			logEntry.tags = [ 'long'.padEnd(26, '1') ];
			validateCreate('string.max');
		});

		it('Tags must be alphanumeric', () => {
			logEntry.tags = [ 'ok', 'not_ok' ];
			validateCreate('string.alphanum');
		});

		it('Tags collection cannot have more than 50 tags', () => {
			logEntry.tags = new Array(51).fill('lol');
			validateCreate('array.max');
		});

		it('Comments is optional', () => {
			delete logEntry.comments;
			validateCreate();
		});

		it('Comments must be a string', () => {
			logEntry.comments = 87;
			validateCreate('string.base');
		});

		it('Comments cannot exceed 1000 characters', () => {
			logEntry.comments = 'long'.padEnd(1001, '#');
			validateCreate('string.max');
		});
	});

	describe('GPS', () => {
		it('Latitude and longitude are optional', () => {
			delete logEntry.gps;
			validateCreate();
		});

		it('Latitude must be a number', () => {
			logEntry.gps.latitude = 'north';
			validateCreate('number.base');
		});

		it('Latitude cannot be less than -90', () => {
			logEntry.gps.latitude = -90.1;
			validateCreate('number.min');
		});

		it('Latitude cannot be more than 90', () => {
			logEntry.gps.latitude = 90.1;
			validateCreate('number.max');
		});

		it('Longitude must be a number', () => {
			logEntry.gps.longitude = 'west';
			validateCreate('number.base');
		});

		it('Longitude cannot be less than -180', () => {
			logEntry.gps.longitude = -180.1;
			validateCreate('number.min');
		});

		it('Longitude cannot be more than 180', () => {
			logEntry.gps.longitude = 180.1;
			validateCreate('number.max');
		});

		it('Latitude is required if longitude is specified', () => {
			delete logEntry.gps.latitude;
			validateCreate('any.required');
		});

		it('Longitude is required if latitude is specified', () => {
			delete logEntry.gps.longitude;
			validateCreate('any.required');
		});
	});

	describe('Air', () => {
		it('Air in is optional', () => {
			delete logEntry.air.in;
			validateCreate();
		});

		it('Air in must be a number', () => {
			logEntry.air.in = 'seven';
			validateCreate('number.base');
		});

		it('Air in must be positive', () => {
			logEntry.air.in = 0;
			validateCreate('number.positive');
		});

		it('Air out is optional', () => {
			delete logEntry.air.out;
			validateCreate();
		});

		it('Air out must be a number', () => {
			logEntry.air.out = 'seven';
			validateCreate('number.base');
		});

		it('Air out must be positive', () => {
			logEntry.air.out = 0;
			validateCreate('number.positive');
		});

		it('Air out must be less than air in', () => {
			logEntry.air.out = logEntry.air.in + 5;
			validateCreate('number.max');
		});

		it('Air doubles is optional', () => {
			delete logEntry.air.doubles;
			validateCreate();
		});

		it('Air doubles must be a boolean', () => {
			logEntry.air.doubles = 'yup';
			validateCreate('boolean.base');
		});

		it('Air volume is optional', () => {
			delete logEntry.air.volume;
			delete logEntry.air.volumeUnit;
			validateCreate();
		});

		it('Air volume must be a number', () => {
			logEntry.air.volume = 'pony-bottle';
			validateCreate('number.base');
		});

		it('Air volume must be positive', () => {
			logEntry.air.volume = 0;
			validateCreate('number.positive');
		});

		it('Air volume unit is required if air volume is supplied', () => {
			delete logEntry.air.volumeUnit;
			validateCreate('object.and');
		});

		it('Air volume is required if air volume unit is supplied', () => {
			delete logEntry.air.volume;
			validateCreate('object.and');
		});

		[ 'L', 'cf' ].forEach(u => {
			it(`Air volume unit can be set to ${ u }`, () => {
				logEntry.air.volumeUnit = u;
				validateCreate();
			});
		});

		it('Air volume unit cannot be an invalid value', () => {
			logEntry.air.volumeUnit = 'm3';
			validateCreate('any.allowOnly');
		});

		it('Air tank material is optional', () => {
			delete logEntry.air.material;
			validateCreate();
		});

		[ 'aluminum', 'steel' ].forEach(m => {
			it(`Air tank material can be set to ${ m }`, () => {
				logEntry.air.material = m;
				validateCreate();
			});
		});

		it('Air tank material cannot be set to an invalid value', () => {
			logEntry.air.material = 'adamantium';
			validateCreate('any.allowOnly');
		});

		it('Oxygen content is optional', () => {
			delete logEntry.air.oxygen;
			validateCreate();
		});

		it('Oxygen content must be a number', () => {
			logEntry.air.oxygen = 'hyperoxic';
			validateCreate('number.base');
		});

		it('Oxygen content must be positive', () => {
			logEntry.air.oxygen = 0;
			validateCreate('number.positive');
		});

		it('Oxygen content cannot exceed 100%', () => {
			logEntry.air.oxygen = 100.6;
			validateCreate('number.max');
		});

		it('Helium content is optional', () => {
			delete logEntry.air.helium;
			validateCreate();
		});

		it('Helium content must be a number', () => {
			logEntry.air.helium = 'lots';
			validateCreate('number.base');
		});

		it('Helium content can be zero', () => {
			logEntry.air.helium = 0;
			validateCreate();
		});

		it('Helium content cannot be negative', () => {
			logEntry.air.helium = -0.5;
			validateCreate('number.min');
		});

		it('Helium cannot exceed 95%', () => {
			logEntry.air.helium = 95.3;
			validateCreate('number.max');
		});
	});

	describe('Weight', () => {
		it('Amount is optional', () => {
			delete logEntry.weight.amount;
			validateCreate();
		});

		it('Amount must be a number', () => {
			logEntry.weight.amount = 'not much';
			validateCreate('number.base');
		});

		it('Amount can be zero', () => {
			logEntry.weight.amount = 0;
			validateCreate();
		});

		it('Amount cannot be negative', () => {
			logEntry.weight.amount = -0.5;
			validateCreate('number.min');
		});

		it('Correctness is optional', () => {
			delete logEntry.weight.correctness;
			validateCreate();
		});

		[ 'good', 'too little', 'too much' ].forEach(c => {
			it(`Correctness can be ${ c }`, () => {
				logEntry.weight.correctness = c;
				validateCreate();
			});
		});

		it('Correctness cannot be an invalid value', () => {
			logEntry.weight.correctness = 'not bad';
			validateCreate('any.allowOnly');
		});

		it('Trim is optional', () => {
			delete logEntry.weight.trim;
			validateCreate();
		});

		[ 'good', 'feet down', 'feet up' ].forEach(t => {
			it(`Trim can be ${ t }`, () => {
				logEntry.weight.trim = t;
				validateCreate();
			});
		});

		it('Trim cannot be an invalid value', () => {
			logEntry.weight.trim = 'nailed it!';
			validateCreate('any.allowOnly');
		});
	});

	describe('Temperature', () => {
		it('Surface temp is optional', () => {
			delete logEntry.temperature.surface;
			validateCreate();
		});

		it('Surface temp must be a number', () => {
			logEntry.temperature.surface = 'hot';
			validateCreate('number.base');
		});

		it('Surface temperatures cannot be less than -2', () => {
			logEntry.temperature.surface = -2.5;
			validateCreate('number.min');
		});

		it('Surface temperatures cannot be more than 50', () => {
			logEntry.temperature.surface = 50.1;
			validateCreate('number.max');
		});

		it('Water temp is optional', () => {
			delete logEntry.temperature.water;
			validateCreate();
		});

		it('Water temp must be a number', () => {
			logEntry.temperature.water = 'chilly';
			validateCreate('number.base');
		});

		it('Water temperatures cannot be less than -2', () => {
			logEntry.temperature.water = -2.5;
			validateCreate('number.min');
		});

		it('Water temperatures cannot be more than 50', () => {
			logEntry.temperature.water = 50.1;
			validateCreate('number.max');
		});

		it('Thermoclines must be an array', () => {
			logEntry.temperature.thermoclines = 9;
			validateCreate('array.base');
		});

		it('Thermocline array cannot be sparse', () => {
			logEntry.temperature.thermoclines = [ null ];
			validateCreate('object.base');
		});

		it('Thermocline values must be objects', () => {
			logEntry.temperature.thermoclines = [ 'cold' ];
			validateCreate('object.base');
		});

		it('Thermocline temperatures are required', () => {
			logEntry.temperature.thermoclines = [ { depth: 12 } ];
			validateCreate('any.required');
		});

		it('Thermocline temperatures must be a number', () => {
			logEntry.temperature.thermoclines = [ { temperature: 'cold' } ];
			validateCreate('number.base');
		});

		it('Thermocline temperatures cannot be less than -2', () => {
			logEntry.temperature.thermoclines = [ { temperature: -2.5 } ];
			validateCreate('number.min');
		});

		it('Thermocline temperatures cannot be more than 50', () => {
			logEntry.temperature.thermoclines = [ { temperature: 50.1 } ];
			validateCreate('number.max');
		});

		it('Depth must be a number', () => {
			logEntry.temperature.thermoclines = [ { temperature: 12, depth: 'not deep' } ];
			validateCreate('number.base');
		});

		it('Depth must be positive', () => {
			logEntry.temperature.thermoclines = [ { temperature: 12, depth: 0 } ];
			validateCreate('number.positive');
		});

		it('Thermoclines array cannot contain more than 4 entries', () => {
			logEntry.temperature.thermoclines = new Array(5);
			for (let i = 0; i < logEntry.temperature.thermoclines.length; i++) {
				logEntry.temperature.thermoclines[i] = {
					depth: i * 4 + 5,
					temperature: 20 - (i * 3)
				};
			}

			validateCreate('array.max');
		});
	});

	describe('Deco Stops', () => {
		it('Deco stops must be an array', () => {
			logEntry.decoStops = {
				depth: 3,
				duration: 3
			};
			validateCreate('array.base');
		});

		it('Deco stops duration is optional', () => {
			delete logEntry.decoStops[0].duration;
			validateCreate();
		});

		it('Deco stops duration must be a number', () => {
			logEntry.decoStops[0].duration = '3min';
			validateCreate('number.base');
		});

		it('Deco stops duration must be positive', () => {
			logEntry.decoStops[0].duration = 0;
			validateCreate('number.positive');
		});

		it('Deco stops depth is optional', () => {
			delete logEntry.decoStops[0].depth;
			validateCreate();
		});

		it('Deco stops depth must be a number', () => {
			logEntry.decoStops[0].depth = '3m';
			validateCreate('number.base');
		});

		it('Deco stops depth must be positive', () => {
			logEntry.decoStops[0].depth = 0;
			validateCreate('number.positive');
		});

		it('Deco stops cannot contain more than 15 entries', () => {
			logEntry.decoStops = new Array(16);
			for (let i = 0; i < logEntry.decoStops.length; i++) {
				logEntry.decoStops[i] = {
					depth: 50 - (i * 3 + 3),
					duration: 5
				};
			}

			validateCreate('array.max');
		});
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

	it('Will accept lastSeen and seenIds', () => {
		queryString.lastSeen = '48';
		queryString.seenIds = [ fakeMongoId(), fakeMongoId(), fakeMongoId() ];
		validateQueryParams();
	});

	it('Will not accept seenIds without lastSeen', () => {
		queryString.seenIds = [ fakeMongoId(), fakeMongoId(), fakeMongoId() ];
		validateQueryParams('object.with');
	});

	it('lastSeen must be an ISO date when sorting by entryTime', () => {
		queryString.sortBy = 'entryTime';
		queryString.lastSeen = 48;
		validateQueryParams('string.base');
	});

	it('lastSeen must be a number when sorting by maxDepth', () => {
		queryString.sortBy = 'maxDepth';
		queryString.lastSeen = moment().toISOString();
		validateQueryParams('number.base');
	});

	it('lastSeen must be a number when sorting by bottomTime', () => {
		queryString.sortBy = 'maxDepth';
		queryString.lastSeen = 'seven';
		validateQueryParams('number.base');
	});

	it('seenIds can be a single valid Id', () => {
		queryString.lastSeen = '48';
		queryString.seenIds = fakeMongoId();
		validateQueryParams();
	});

	it('seenIds can be an array of valid Ids', () => {
		queryString.lastSeen = 48;
		queryString.seenIds = [ fakeMongoId(), fakeMongoId() ];
		validateQueryParams();
	});

	it('seenIds must contain valid Ids', () => {
		queryString.lastSeen = '48';
		queryString.seenIds = [ 'a298a3b95f96bfie9e177978' ];
		validateQueryParams('string.base');

		queryString.seenIds = 'a298a3b95f96bfe9e177978';
		validateQueryParams('string.length');
	});
});
