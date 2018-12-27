import _ from 'lodash';
import { badRequest, serverError, notFound, forbidden } from '../utils/error-response';
import Bluebird from 'bluebird';
import Joi from 'joi';
import { logError } from '../logger';
import LogEntry, { assignLogEntry, cleanUpLogEntry } from '../data/log-entry';
import { NewEntrySchema, EntryId, UpdateEntrySchema } from '../validation/log-entry';
import User from '../data/user';

export function ListLogs(req, res) {
	LogEntry.find({})
		.then(result => {
			res.json(_.map(result, r => cleanUpLogEntry(r)));
		})
		.catch(err => {
			const logId = logError(
				'Failed to query database records',
				err);
			serverError(res, logId);
		});
}

export function GetLog(req, res) {
	res.json(cleanUpLogEntry(req.logEntry));
}

export function CreateLogs(req, res) {
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

	Bluebird.all(logEntries)
		.then(entries => {
			res
				.status(201)
				.json(_.map(entries, e => cleanUpLogEntry(e)));
		})
		.catch(err => {
			const logId = logError(
				'Failed to create database records',
				err);
			serverError(res, logId);
		});
}

export function UpdateLogs(req, res) {
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

	LogEntry.find({ _id: { $in: Object.keys(entries) }, userId: req.account.id })
		.then(foundEntries => {
			for (let i = 0; i < foundEntries.length; i++) {
				assignLogEntry(foundEntries[i], entries[foundEntries[i].id]);
			}

			return Bluebird.all(_.map(foundEntries, e => e.save()));
		})
		.then(result => {
			res.json(_.map(result, r => cleanUpLogEntry(r)));
		})
		.catch(err => {
			const logId = logError(
				'Failed to update database records',
				err);
			serverError(res, logId);
		});
}

export function UpdateLog(req, res) {
	const isValid = Joi.validate(req.body, NewEntrySchema);
	if (isValid.error) {
		return badRequest(
			'Could not update log entry. Validation failed.',
			isValid.error,
			res);
	}

	assignLogEntry(req.logEntry, req.body);

	req.logEntry.save()
		.then(() => {
			res.sendStatus(200);
		})
		.catch(err => {
			const logId = logError(
				`Failed to update database record for log entry ${ req.body.entryId }`,
				err);
			serverError(res, logId);
		});
}

export function DeleteLogs(req, res) {
	const isValid = Joi.validate(req.body, Joi.array().items(EntryId));
	if (isValid.error) {
		return badRequest(
			'Could not delete log entries. Validation failed.',
			isValid.error,
			res);
	}

	LogEntry.deleteMany({ _id: { $in: req.body } })
		.then(() => {
			res.sendStatus(200);
		})
		.catch(err => {
			const logId = logError(
				'Failed to delete record for log entries.',
				err);
			serverError(res, logId);
		});
}

export function DeleteLog(req, res) {
	LogEntry.deleteOne({ _id: req.logEntry.id })
		.then(() => {
			res.sendStatus(204);
		})
		.catch(err => {
			const logId = logError(
				'Failed to delete record for log entry.',
				err);
			serverError(res, logId);
		});
}

export function RetrieveUserAccount(req, res, next) {
	User.findByUsername(req.params.username)
		.then(user => {
			if (!user) {
				return notFound(req, res);
			}

			req.account = user;
			next();
		})
		.catch(err => {
			const logId = logError('Failed to retrieve user account from the database.', err);
			serverError(res, logId);
		});
}

export function RetrieveLogEntry(req, res, next) {
	Bluebird.all(
		[
			User.findByUsername(req.params.username),
			LogEntry.findById(req.params.logId)
		])
		.then(results => {
			[ req.account, req.logEntry ] = results;

			if (!req.account
				|| !req.logEntry
				|| req.account.id !== req.logEntry.userId.toString()) {

				return notFound(req, res);
			}

			return next();
		})
		.catch(err => {
			const logId = logError('Failed to search database for log entry', err);
			serverError(res, logId);
		});
}

export function AssertLogBookReadPermission(req, res, next) {
	if (req.user && (req.user.role === 'admin' || req.user.id === req.account.id)) {
		return next();
	}

	if (req.account.logsVisibility === 'public') {
		return next();
	}

	forbidden(res, 'You are not permitted to perform the requested action on this log entry');
}

export function AssertLogBookWritePermission(req, res, next) {
	const forbiddenMessage = 'You are not permitted to create or update entries in the specified log book';
	if (!req.user) {
		return forbidden(
			res,
			forbiddenMessage);
	}

	if (req.user.id !== req.account.id && req.user.role !== 'admin') {
		return forbidden(
			res,
			forbiddenMessage);
	}

	next();
}
