import _ from 'lodash';
import moment from 'moment';
import mongoose from './database';

const logEntrySchema = mongoose.Schema({
	userId: {
		type: mongoose.Schema.Types.ObjectId,
		required: true,
		index: true
	},
	diveNumber: Number,
	entryTime: {
		type: Date,
		required: true,
		index: true
	},
	location: String,
	site: String,
	gps: {
		latitude: Number,
		longitude: Number
	},
	bottomTime: Number,
	totalTime: Number,
	surfaceInterval: Number,
	maxDepth: Number,
	averageDepth: Number,
	air: [
		{
			in: Number,
			out: Number,
			count: Number,
			name: String,
			size: Number,
			workingPressure: Number,
			material: String,
			oxygen: Number,
			helium: Number
		}
	],
	decoStops: [
		{
			depth: Number,
			duration: Number
		}
	],
	weight: {
		belt: Number,
		integrated: Number,
		backplate: Number,
		ankles: Number,
		other: Number,
		correctness: String,
		trim: String
	},
	temperature: {
		surface: Number,
		water: Number,
		thermoclines: [
			{
				depth: Number,
				temperature: {
					type: Number,
					required: true
				}
			}
		]
	},
	rating: {
		type: Number,
		index: true,
		sparse: true
	},
	visibility: Number,
	wind: Number,
	current: Number,
	weather: String,
	suit: String,
	tags: [ String ],
	comments: String,
	signatures: [
		{
			user: {
				type: String,
				required: true
			},
			role: {
				type: String,
				required: true
			},
			agency: String,
			certNumber: String
		}
	],
	images: [
		{
			key: {
				type: String,
				required: true
			},
			name: {
				type: String,
				required: true,
				index: true
			},
			uploaded: Boolean
		}
	],
	videos: [
		{
			key: {
				type: String,
				required: true
			},
			name: {
				type: String,
				required: true,
				index: true
			},
			uploaded: Boolean
		}
	]
	// facility: {}
});

logEntrySchema.statics.searchByUser = function (userId, options, done) {
	return this.find({ userId, ...options }, done);
};

logEntrySchema.methods.toCleanJSON = function () {
	const clean = {
		entryId: this.id,
		entryTime: moment(this.entryTime).utc().toISOString(),
		..._.pick(this.toJSON(), [
			'diveNumber',
			'location',
			'site',
			'gps',
			'bottomTime',
			'totalTime',
			'surfaceInterval',
			'maxDepth',
			'averageDepth',
			'air',
			'decoStops',
			'weight',
			'temperature',
			'rating',
			'visibility',
			'wind',
			'current',
			'weather',
			'suit',
			'tags',
			'comments'
		])
	};

	if (clean.decoStops) {
		clean.decoStops = clean.decoStops.map(ds => ({
			depth: ds.depth,
			duration: ds.duration
		}));
	}

	if (clean.air) {
		clean.air = clean.air.map(a => ({
			in: a.in,
			out: a.out,
			count: a.count,
			name: a.name,
			size: a.size,
			workingPressure: a.workingPressure,
			material: a.material,
			oxygen: a.oxygen,
			helium: a.helium
		}));
	}

	if (clean.temperature && clean.temperature.thermoclines) {
		clean.temperature.thermoclines = clean.temperature.thermoclines.map(t => ({
			temperature: t.temperature,
			depth: t.depth
		}));
	}

	return clean;
};

logEntrySchema.methods.assign = function (entity) {
	this.entryTime = moment(entity.entryTime).utc().toDate();
	this.diveNumber = entity.diveNumber;
	this.bottomTime = entity.bottomTime;
	this.totalTime = entity.totalTime;
	this.location = entity.location;
	this.site = entity.site;
	this.surfaceInterval = entity.surfaceInterval;
	this.averageDepth = entity.averageDepth;
	this.maxDepth = entity.maxDepth;
	this.gps = entity.gps;
	this.weight = entity.weight;
	this.air = entity.air;
	this.temperature = entity.temperature;
	this.tags = entity.tags;
	this.comments = entity.comments;
	this.decoStops = entity.decoStops;
	this.rating = entity.rating;
	this.visibility = entity.visibility;
	this.wind = entity.wind;
	this.current = entity.current;
	this.weather = entity.weather;
	this.suit = entity.suit;
};

export default mongoose.model('LogEntry', logEntrySchema);
