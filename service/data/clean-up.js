export function cleanUpLogEntry(entry) {
	return {
		entryId: entry.id,
		entryTime: entry.entryTime,
		bottomTime: entry.bottomTime,
		totalTime: entry.totalTime,
		location: entry.location,
		site: entry.site,
		averageDepth: entry.averageDepth,
		maxDepth: entry.maxDepth,
		gps: entry.gps,
		weight: entry.weight
	};
}
