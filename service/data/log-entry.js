/* eslint camelcase: 0 */

import _ from 'lodash';
import config from '../config';
import { v7 as mexp } from 'mongoose-elasticsearch-xp';
import moment from 'moment';
import mongoose from './database';
import search from '../search';

const logEntrySchema = mongoose.Schema({
	userId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'User',
		required: true,
		index: true,
		es_indexed: true,
		es_type: 'keyword'
	},
	diveNumber: {
		type: Number,
		es_indexed: true,
		es_type: 'integer'
	},
	entryTime: {
		type: Date,
		required: true,
		index: true,
		es_indexed: true,
		es_type: 'date'
	},
	location: {
		type: String,
		es_indexed: true,
		es_type: 'text'
	},
	site: {
		type: String,
		es_indexed: true,
		es_type: 'text'
	},
	gps: {
		type: [ Number ],
		index: '2dsphere',
		es_indexed: true,
		es_type: 'geo_point'
	},
	bottomTime: {
		type: Number,
		es_indexed: true,
		es_type: 'float'
	},
	totalTime: {
		type: Number,
		es_indexed: true,
		es_type: 'float'
	},
	surfaceInterval: Number,
	maxDepth: {
		type: Number,
		es_indexed: true,
		es_type: 'float'
	},
	averageDepth: {
		type: Number,
		es_indexed: true,
		es_type: 'float'
	},
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
		sparse: true,
		es_indexed: true,
		es_type: 'float'
	},
	visibility: Number,
	wind: Number,
	current: Number,
	waterChoppiness: Number,
	weather: String,
	suit: String,
	tags: {
		type: [ String ],
		es_indexed: true,
		es_type: 'text'
	},
	comments: {
		type: String,
		es_indexed: true,
		es_type: 'text'
	},
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
	]
	// facility: {}
});

logEntrySchema.plugin(mexp, {
	index: `${ config.elasticSearchIndex }_dive_logs`,
	client: search
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
			'waterChoppiness',
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

	if (clean.gps) {
		clean.gps = {
			longitude: clean.gps[0],
			latitude: clean.gps[1]
		};
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
	this.waterChoppiness = entity.waterChoppiness;
	this.weather = entity.weather;
	this.suit = entity.suit;

	if (entity.gps) {
		this.gps = [
			entity.gps.longitude,
			entity.gps.latitude
		];
	} else {
		this.gps = null;
	}
};

const model = mongoose.model('LogEntry', logEntrySchema);
export default model;
module.exports = model;
