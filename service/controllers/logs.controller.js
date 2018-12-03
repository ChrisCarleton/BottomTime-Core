import _ from 'lodash';
import { assignLogEntry } from '../data/assign';
import { badRequest, serverError } from '../utils/error-response';
import Bluebird from 'bluebird';
import { cleanUpLogEntry } from '../data/clean-up';
import Joi from 'joi';
import { logError } from '../logger';
import LogEntry from '../data/log-entry';
import { NewEntrySchema, UpdateEntrySchema } from '../validation/log-entry';

export function ListLogs(req, res) {
	res.sendStatus(500);
}

export function GetLog(req, res) {
	res.json(cleanUpLogEntry(req.logEntry));
}

export function CreateLogs(req, res) {
	const isValid = Joi.validate(req.body, Joi.array().items(NewEntrySchema));
	if (isValid.error) {
		return badRequest(
			'Could not create log entries. Validation failed.',
			isValid.error,
			res);
	}

	const logEntries = _.map(req.body, e => {
		return new LogEntry(e).save();
	});

	Bluebird.all(logEntries)
		.then(entries => {
			res.json(_.map(entries, e => { return cleanUpLogEntry(e); }));
		});
}

export function UpdateLogs (req, res) {
	res.sendStatus(500);
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
				`Failed to update database record for log entry ${req.body.entryId}`,
				err);
			serverError(res, logId);
		});
}

export function DeleteLogs(req, res) {
	res.sendStatus(500);
}

export function DeleteLog(req, res) {
	res.sendStatus(500);
}

export function RetrieveLogEntry(req, res, next) {
	LogEntry.findById(req.params.logId)
		.then(entry => {
			if (!entry) {
				return res.sendStatus(404);
			}

			req.logEntry = entry;
			next();
		})
		.catch(err => {
			const logId = logError('Failed to search database for log entry', err);
			serverError(res, logId);
		});
}
