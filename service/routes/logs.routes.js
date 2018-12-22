import {
	ListLogs,
	GetLog,
	CreateLogs,
	UpdateLog,
	UpdateLogs,
	DeleteLog,
	DeleteLogs,
	RetrieveLogEntry
} from '../controllers/logs.controller';

module.exports = app => {
	app.route('/users/:username/logs')
		.get(ListLogs)
		.post(CreateLogs)
		.put(UpdateLogs)
		.delete(DeleteLogs);

	app.route('/users/:username/logs/:logId([a-f0-9]{24})')
		.get(RetrieveLogEntry, GetLog)
		.put(RetrieveLogEntry, UpdateLog)
		.delete(RetrieveLogEntry, DeleteLog);
};
