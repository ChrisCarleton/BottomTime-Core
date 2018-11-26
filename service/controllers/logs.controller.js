import LogEntry from '../data/log-entry';

function authorizeUserRead(req, userId) {

}

function authorizeUserWrite(req, userId) {

}

export function ListLogs(req, res) {

}

export function GetLog(req, res) {
	LogEntry.findById(req.params.logId)
		.then(entry => {
			if (!entry) {
				return res.sendStatus(404);
			}

			entry.__v = undefined;
			res.json(entry);
		});
}

export function CreateLogs(req, res) {

}

export function UpdateLogs (req, res) {

}

export function UpdateLog(req, res) {

}

export function DeleteLogs(req, res) {

}

export function DeleteLog(req, res) {

}
