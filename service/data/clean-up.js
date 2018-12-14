export function cleanUpLogEntry(entry) {
	const clean = { entryId: entry.id, ...entry.toJSON() };
	delete clean._id;
	delete clean.__v;
	clean.entryTime = clean.entryTime.toISOString();

	return clean;
}
