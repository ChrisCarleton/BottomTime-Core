import {
	AssertLogBookReadPermission,
	AssertLogBookWritePermission,
	CreateLogs,
	DeleteLog,
	DeleteLogs,
	GetLog,
	ListLogs,
	RetrieveLogEntry,
	RetrieveUserAccount,
	UpdateLog,
	UpdateLogs
} from '../controllers/logs.controller';

module.exports = app => {
	app.route('/users/:username/logs')
		.get(RetrieveUserAccount, AssertLogBookReadPermission, ListLogs)
		.post(RetrieveUserAccount, AssertLogBookWritePermission, CreateLogs)
		.put(RetrieveUserAccount, AssertLogBookWritePermission, UpdateLogs)
		.delete(RetrieveUserAccount, AssertLogBookWritePermission, DeleteLogs);

	app.route('/users/:username/logs/:logId([a-f0-9]{24})')
		.get(RetrieveLogEntry, AssertLogBookReadPermission, GetLog)
		.put(RetrieveLogEntry, AssertLogBookWritePermission, UpdateLog)
		.delete(RetrieveLogEntry, AssertLogBookWritePermission, DeleteLog);
};
