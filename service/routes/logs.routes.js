import {
	AssertLogBookReadPermission,
	AssertLogBookWritePermission,
	ListLogs,
	GetLog,
	CreateLogs,
	UpdateLog,
	UpdateLogs,
	DeleteLog,
	DeleteLogs,
	RetrieveLogEntry,
	RetrieveUserAccount
} from '../controllers/logs.controller';

module.exports = app => {
	app.route('/users/:username/logs')
		.get(ListLogs)
		.post(RetrieveUserAccount, CreateLogs)
		.put(UpdateLogs)
		.delete(DeleteLogs);

	app.route('/users/:username/logs/:logId([a-f0-9]{24})')
		.get(RetrieveLogEntry, AssertLogBookReadPermission, GetLog)
		.put(RetrieveLogEntry, UpdateLog)
		.delete(RetrieveLogEntry, DeleteLog);
};
