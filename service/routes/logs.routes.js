import {
	ListLogs,
	GetLog,
	CreateLogs,
	UpdateLog,
	UpdateLogs,
	DeleteLog,
	DeleteLogs
} from '../controllers/logs.controller';

module.exports = app => {
	app.route('/logs')
		.get(ListLogs)
		.post(CreateLogs)
		.put(UpdateLogs)
		.delete(DeleteLogs);
	
	app.route('/logs/:logId([a-f0-9]{24})')
		.get(GetLog)
		.put(UpdateLog)
		.delete(DeleteLog);
};
