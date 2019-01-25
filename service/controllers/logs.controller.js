import _ from 'lodash';
import { badRequest, serverError, notFound } from '../utils/error-response';
import Joi from 'joi';
import LogEntry, { assignLogEntry } from '../data/log-entry';
import {
	EntryId,
	EntryQueryParamsSchema,
	NewEntrySchema,
	UpdateEntrySchema
} from '../validation/log-entry';
import User from '../data/user';

export async function ListLogs(req, res) {
	try {
		const isValid = Joi.validate(req.query, EntryQueryParamsSchema);
		if (isValid.error) {
			return badRequest(
				'Could not complete the request. Check the query string parameters and try again.',
				isValid.error,
				res);
		}

		const query = req.query || {};
		let sortOrder = '-entryTime';

		if (query.sortBy) {
			sortOrder = `${ query.sortOrder === 'asc' ? '' : '-' }${ query.sortBy }`;
		}

		const entries = await LogEntry
			.find({ userId: req.account.id })
			.select('_id entryTime location site bottomTime maxDepth')
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

export function GetLog(req, res) {
	res.json({
		...req.logEntry.toCleanJSON(),
		readOnly: req.readOnlyResource
	});
}

export async function CreateLogs(req, res) {
	try {
		const isValid = Joi.validate(req.body, Joi.array().min(1).items(NewEntrySchema));
		if (isValid.error) {
			return badRequest(
				'Could not create log entries. Validation failed.',
				isValid.error,
				res);
		}

		const logEntries = _.map(req.body, e => {
			e.userId = req.account.id;
			return new LogEntry(e).save();
		});

		const entries = await Promise.all(logEntries);
		res.status(201).json(_.map(entries, e => e.toCleanJSON()));
	} catch (err) {
		const logId = req.logError(
			'Failed to create database records',
			err);
		serverError(res, logId);
	}
}

export async function UpdateLogs(req, res) {
	try {
		const isValid = Joi.validate(req.body, Joi.array().min(1).max(100).items(UpdateEntrySchema));
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
			assignLogEntry(foundEntries[i], entries[foundEntries[i].id]);
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
		const isValid = Joi.validate(req.body, NewEntrySchema);
		if (isValid.error) {
			return badRequest(
				'Could not update log entry. Validation failed.',
				isValid.error,
				res);
		}

		assignLogEntry(req.logEntry, req.body);

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
		const isValid = Joi.validate(req.body, Joi.array().items(EntryId));
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
		const results = await Promise.all(
			[
				User.findByUsername(req.params.username),
				LogEntry.findById(req.params.logId)
			]
		);

		[ req.account, req.logEntry ] = results;

		if (!req.account
			|| !req.logEntry
			|| req.account.id !== req.logEntry.userId.toString()) {

			return notFound(req, res);
		}

		return next();
	} catch (err) {
		const logId = req.logError('Failed to search database for log entry', err);
		serverError(res, logId);
	}
}
