import busboy from 'connect-busboy';
import config from '../config';

import {
	AddImage,
	DeleteImage,
	DownloadImage,
	GetImageDetails,
	ListImages,
	RetrieveLogEntryImage,
	UpdateImageDetails
} from '../controllers/logs-images.controller';
import {
	AssertUserReadPermission,
	AssertUserWritePermission,
	RequireUser,
	RetrieveUserAccount
} from '../controllers/security.controller';
import {
	CreateLogs,
	DeleteLog,
	DeleteLogs,
	GetLog,
	RetrieveLogEntry,
	SearchLogs,
	UpdateLog,
	UpdateLogs
} from '../controllers/logs.controller';

const LogsRoute = '/users/:username/logs';
const LogRoute = `${ LogsRoute }/:logId([a-f0-9]{24})`;
const ImagesRoute = `${ LogRoute }/images`;
const ImageRoute = `${ ImagesRoute }/:imageId([a-f0-9]{24})`;
const DownloadImageRoute = `${ ImageRoute }/:imageType(image|thumbnail)`;

module.exports = app => {
	app.route(LogsRoute)
		.get(RetrieveUserAccount, AssertUserReadPermission, SearchLogs)
		.post(RetrieveUserAccount, AssertUserWritePermission, CreateLogs)
		.put(RetrieveUserAccount, AssertUserWritePermission, UpdateLogs)
		.delete(RetrieveUserAccount, AssertUserWritePermission, DeleteLogs);

	app.route(LogRoute)
		.get(RetrieveUserAccount, RetrieveLogEntry, AssertUserReadPermission, GetLog)
		.put(RetrieveUserAccount, RetrieveLogEntry, AssertUserWritePermission, UpdateLog)
		.delete(RetrieveUserAccount, RetrieveLogEntry, AssertUserWritePermission, DeleteLog);

	app.route(ImagesRoute)
		.get(RetrieveUserAccount, RetrieveLogEntry, AssertUserReadPermission, ListImages)
		.post(
			busboy({
				highWaterMark: 2 * 1024 * 1024,
				limits: {
					fileSize: config.maxImageFileSize
				}
			}),
			RequireUser,
			RetrieveUserAccount,
			RetrieveLogEntry,
			AssertUserWritePermission,
			AddImage
		);

	app.route(ImageRoute)
		.get(RetrieveUserAccount, RetrieveLogEntryImage, AssertUserReadPermission, GetImageDetails)
		.put(
			RequireUser,
			RetrieveUserAccount,
			AssertUserWritePermission,
			RetrieveLogEntryImage,
			UpdateImageDetails
		)
		.delete(
			RequireUser,
			RetrieveUserAccount,
			AssertUserWritePermission,
			RetrieveLogEntryImage,
			DeleteImage
		);

	app.route(DownloadImageRoute).get(
		RetrieveUserAccount,
		AssertUserReadPermission,
		RetrieveLogEntryImage,
		DownloadImage
	);
};
