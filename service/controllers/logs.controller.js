import _ from 'lodash';
import { badRequest, serverError, notFound } from '../utils/error-response';
import {
	EntryId,
	EntryQueryParamsSchema,
	NewEntrySchema,
	UpdateEntrySchema
} from '../validation/log-entry';
import Joi from 'joi';
import LogEntry from '../data/log-entry';
import searchUtils from '../utils/search-utils';

// TODO: Fix this to work with skip instead of lastSeen and seenIds. Blech!
function getWhereClauseForSearch(query) {
	const whereClause = {};
	const operator = query.sortOrder === 'asc' ? '$gte' : '$lte';

	if (query.lastSeen) {
		switch (query.sortBy) {
		case 'maxDepth':
			whereClause.maxDepth = {};
			whereClause.maxDepth[operator] = parseInt(query.lastSeen, 10);
			break;
		case 'bottomTime':
			whereClause.bottomTime = {};
			whereClause.bottomTime[operator] = parseInt(query.lastSeen, 10);
			break;
		default:
			whereClause.entryTime = {};
			whereClause.entryTime[operator] = Date.parse(query.lastSeen);
			break;
		}

		if (query.seenIds) {
			if (typeof (query.seenIds) === 'string') {
				query.seenIds = [ query.seenIds ];
			}

			whereClause._id = { $nin: query.seenIds };
		}
	}

	return whereClause;
}

// TODO: Remove deprecated function
export async function ListLogs(req, res, next) {
	try {
		const isValid = EntryQueryParamsSchema.validate(req.query);
		if (isValid.error) {
			return badRequest(
				'Could not complete the request. Check the query string parameters and try again.',
				isValid.error,
				res);
		}

		if (req.query.query) {
			return next();
		}

		const query = req.query || {};
		let sortOrder = '-entryTime';

		if (query.sortBy) {
			sortOrder = `${ query.sortOrder === 'asc' ? '' : '-' }${ query.sortBy }`;
		}

		const whereClause = getWhereClauseForSearch(query);
		const entries = await LogEntry
			.find({ userId: req.account.id })
			.where(whereClause)
			.select('_id entryTime location site bottomTime maxDepth comments rating tags')
			.sort(sortOrder)
			.limit(parseInt(query.count, 10) || 100)
			.exec();

		res.json(_.map(entries, r => r.toCleanJSON()));
	} catch (err) {
		const logId = req.logError(
			'Failed to query database records',
			err);
		serverError(res, logId);
	}
}

// TODO: Adapt this to work with log entries
export async function SearchLogs(req, res) {
	const isValid = EntryQueryParamsSchema.validate(req.query);
	if (isValid.error) {
		return badRequest(
			'Could not complete the request. Check the query string parameters and try again.',
			isValid.error,
			res);
	}

	if (!req.query.sortBy) {
		req.query.sortBy = req.query.query ? 'relevance' : 'entryTime';
		req.query.sortOrder = 'desc';
	}

	try {
		const esQuery = searchUtils.getBaseQuery();
		searchUtils.setLimits(esQuery, req.query.skip, req.query.count || 200);
		searchUtils.addSearchTerm(esQuery, req.query.query, [
			'tags^10',
			'comments^2',
			'location^5',
			'site^4'
		]);
		searchUtils.selectFields(esQuery, [
			'_id',
			'entryTime',
			'location',
			'site',
			'bottomTime',
			'maxDepth',
			'comments',
			'rating',
			'tags'
		]);
		searchUtils.addFilter(esQuery, {
			term: {
				userId: req.account.id
			}
		});
		searchUtils.addSorting(esQuery, req.query.sortBy, req.query.sortOrder);

		const results = await LogEntry.esSearch(esQuery);
		res.json(results.body.hits.hits.map(hit => ({
			...hit._source,
			entryId: hit._id,
			score: hit._score
		})));
	} catch (err) {
		const logId = req.logError('Unable to search for log entries', err);
		req.log.fatal(err);
		serverError(res, logId);
	}
}

export function GetLog(req, res) {
	res.json({
		...req.logEntry.toCleanJSON(),
		readOnly: req.readOnlyResource
	});
}

export async function CreateLogs(req, res) {
	try {
		const isValid = Joi.array().min(1).items(NewEntrySchema).validate(req.body);
		if (isValid.error) {
			return badRequest(
				'Could not create log entries. Validation failed.',
				isValid.error,
				res);
		}

		const logEntries = req.body.map(e => {
			e.userId = req.account.id;
			if (e.gps) {
				e.gps = [
					e.gps.longitude,
					e.gps.latitude
				];
			}
			return new LogEntry(e);
		});

		await LogEntry.insertMany(logEntries);
		res.status(201).json(logEntries.map(e => e.toCleanJSON()));
	} catch (err) {
		const logId = req.logError(
			'Failed to create database records',
			err);
		serverError(res, logId);
	}
}

export async function UpdateLogs(req, res) {
	try {
		const isValid = Joi.array().min(1).max(100).items(UpdateEntrySchema).validate(req.body);
		if (isValid.error) {
			return badRequest(
				'Could not update log entries. Validation failed.',
				isValid.error,
				res);
		}

		const entries = {};
		req.body.forEach(e => {
			entries[e.entryId] = e;
		});

		const foundEntries = await LogEntry.find({
			_id: { $in: Object.keys(entries) },
			userId: req.account.id
		});

		for (let i = 0; i < foundEntries.length; i++) {
			foundEntries[i].assign(entries[foundEntries[i].id]);
		}

		const result = await Promise.all(_.map(foundEntries, e => e.save()));
		res.json(_.map(result, r => r.toCleanJSON()));
	} catch (err) {
		const logId = req.logError(
			'Failed to update database records',
			err);
		serverError(res, logId);
	}
}

export async function UpdateLog(req, res) {
	try {
		const isValid = NewEntrySchema.validate(req.body);
		if (isValid.error) {
			return badRequest(
				'Could not update log entry. Validation failed.',
				isValid.error,
				res);
		}

		req.logEntry.assign(req.body);
		await req.logEntry.save();
		res.sendStatus(200);
	} catch (err) {
		const logId = req.logError(
			`Failed to update database record for log entry ${ req.body.entryId }`,
			err);
		serverError(res, logId);
	}
}

export async function DeleteLogs(req, res) {
	try {
		const isValid = Joi.array().items(EntryId).validate(req.body);
		if (isValid.error) {
			return badRequest(
				'Could not delete log entries. Validation failed.',
				isValid.error,
				res);
		}

		await LogEntry.deleteMany({ _id: { $in: req.body } });
		res.sendStatus(200);
	} catch (err) {
		const logId = req.logError(
			'Failed to delete record for log entries.',
			err);
		serverError(res, logId);
	}
}

export async function DeleteLog(req, res) {
	try {
		await LogEntry.deleteOne({ _id: req.logEntry.id });
		res.sendStatus(204);
	} catch (err) {
		const logId = req.logError(
			'Failed to delete record for log entry.',
			err);
		serverError(res, logId);
	}
}

export async function RetrieveLogEntry(req, res, next) {
	try {
		req.logEntry = await LogEntry.findById(req.params.logId);

		if (!req.logEntry || req.account.id !== req.logEntry.userId.toString()) {
			return notFound(req, res);
		}

		return next();
	} catch (err) {
		const logId = req.logError('Failed to search database for log entry', err);
		serverError(res, logId);
	}
}
