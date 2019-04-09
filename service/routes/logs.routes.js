import {
	AssertUserReadPermission,
	AssertUserWritePermission,
	RetrieveUserAccount
} from '../controllers/security.controller';
import {
	CreateLogs,
	DeleteLog,
	DeleteLogs,
	GetLog,
	ListLogs,
	RetrieveLogEntry,
	UpdateLog,
	UpdateLogs
} from '../controllers/logs.controller';

module.exports = app => {
	app.route('/users/:username/logs')
		.get(RetrieveUserAccount, AssertUserReadPermission, ListLogs)
		.post(RetrieveUserAccount, AssertUserWritePermission, CreateLogs)
		.put(RetrieveUserAccount, AssertUserWritePermission, UpdateLogs)
		.delete(RetrieveUserAccount, AssertUserWritePermission, DeleteLogs);

	app.route('/users/:username/logs/:logId([a-f0-9]{24})')
		.get(RetrieveUserAccount, RetrieveLogEntry, AssertUserReadPermission, GetLog)
		.put(RetrieveUserAccount, RetrieveLogEntry, AssertUserWritePermission, UpdateLog)
		.delete(RetrieveUserAccount, RetrieveLogEntry, AssertUserWritePermission, DeleteLog);
};
