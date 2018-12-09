import _ from 'lodash';
import { assignLogEntry } from '../data/assign';
import { badRequest, serverError } from '../utils/error-response';
import Bluebird from 'bluebird';
import { cleanUpLogEntry } from '../data/clean-up';
import Joi from 'joi';
import { logError } from '../logger';
import LogEntry from '../data/log-entry';
import { NewEntrySchema, EntryId, UpdateEntrySchema } from '../validation/log-entry';

export function ListLogs(req, res) {
	LogEntry.find({})
		.then(result => {
			res.json(_.map(result, r => cleanUpLogEntry(r)));
		})
		.catch(err => {
			const logId = logError(
				"Failed to query database records",
				err);
			serverError(res, logId);
		});
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

	LogEntry.find({ _id: { $in: Object.keys(entries) } })
		.then(foundEntries => {
			for (let i = 0; i < foundEntries.length; i++) {
				assignLogEntry(foundEntries[i], entries[foundEntries[i]._id]);
			}

			return Bluebird.all(_.map(foundEntries, e => { return e.save(); }));
		})
		.then(result => {
			res.json(_.map(result, r => { return cleanUpLogEntry(r); }));
		})
		.catch(err => {
			const logId = logError(
				`Failed to update database records`,
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
				`Failed to update database record for log entry ${req.body.entryId}`,
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
				`Failed to delete record for log entries.`,
				err);
			serverError(res, logId);
		});
	
}

export function DeleteLog(req, res) {
	LogEntry.deleteOne({ _id: req.logEntry.id })
		.then(() => {
			res.sendStatus(200);
		});
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
