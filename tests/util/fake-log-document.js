import LogEntry from '../../service/data/log-entry';

export default entry => {
	const doc = {
		...entry
	};

	doc.gps = entry.gps
		? {
			coordinates: [
				entry.gps.longitude,
				entry.gps.latitude
			]
		}
		: null;

	return new LogEntry(doc);
};
