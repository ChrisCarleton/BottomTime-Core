export function cleanUpLogEntry(entry) {
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
