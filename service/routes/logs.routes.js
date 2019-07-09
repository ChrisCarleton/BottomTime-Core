import {
	AddImage,
	DeleteImage,
	GetImageDetails,
	ListImages,
	UpdateImageDetails
} from '../controllers/logs-images.controller';
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

const LogsRoute = '/users/:username/logs';
const LogRoute = `${ LogsRoute }/:logId([a-f0-9]{24})`;
const ImagesRoute = `${ LogRoute }/images`;
const ImageRoute = `${ ImagesRoute }/:imageId([a-f0-9]{24})`;

module.exports = app => {
	app.route(LogsRoute)
		.get(RetrieveUserAccount, AssertUserReadPermission, ListLogs)
		.post(RetrieveUserAccount, AssertUserWritePermission, CreateLogs)
		.put(RetrieveUserAccount, AssertUserWritePermission, UpdateLogs)
		.delete(RetrieveUserAccount, AssertUserWritePermission, DeleteLogs);

	app.route(LogRoute)
		.get(RetrieveUserAccount, RetrieveLogEntry, AssertUserReadPermission, GetLog)
		.put(RetrieveUserAccount, RetrieveLogEntry, AssertUserWritePermission, UpdateLog)
		.delete(RetrieveUserAccount, RetrieveLogEntry, AssertUserWritePermission, DeleteLog);

	app.route(ImagesRoute)
		.get(ListImages)
		.post(RetrieveUserAccount, RetrieveLogEntry, AddImage);

	app.route(ImageRoute)
		.get(GetImageDetails)
		.put(UpdateImageDetails)
		.delete(DeleteImage);
};
