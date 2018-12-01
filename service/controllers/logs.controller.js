import _ from 'lodash';
import { badRequest, serverError } from '../utils/error-response';
import Bluebird from 'bluebird';
import Joi from 'joi';
import { logError } from '../logger';
import LogEntry from '../data/log-entry';
import { NewEntrySchema, UpdateEntrySchema } from '../validation/log-entry';

function cleanUpEntry(entry) {
	return {
		entryId: entry._id,
		entryTime: entry.entryTime,
		bottomTime: entry.bottomTime,
		totalTime: entry.totalTime,
		location: entry.location,
		site: entry.site,
		averageDepth: entry.averageDepth,
		maxDepth: entry.maxDepth,
		gps: entry.gps
	};
}

export function ListLogs(req, res) {

}

export function GetLog(req, res) {
	LogEntry.findById(req.params.logId)
		.then(entry => {
			if (!entry) {
				return res.sendStatus(404);
			}

			res.json(cleanUpEntry(entry));
		})
		.catch(err => {
			const logId = logError('Failed to search database for log entry', err);
			serverError(res, logId);
		});
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
			res.json(_.map(entries, e => { return cleanUpEntry(e); }));
		});
}

export function UpdateLogs (req, res) {

}

export function UpdateLog(req, res) {

}

export function DeleteLogs(req, res) {

}

export function DeleteLog(req, res) {

}
