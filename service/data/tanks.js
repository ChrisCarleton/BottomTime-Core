import _ from 'lodash';
import mongoose from './database';

const tankSchema = mongoose.Schema({
	userId: {
		type: mongoose.SchemaTypes.ObjectId,
		required: true,
		index: true
	},
	name: {
		type: String,
		required: true,
		index: true
	},
	size: Number,
	workingPressure: Number,
	material: {
		type: String,
		enum: [ 'al', 'fe' ]
	}
});

tankSchema.methods.toCleanJSON = function () {
	const clean = {
		tankId: this.id,
		..._.pick(
			this.toJSON(),
			[
				'name',
				'size',
				'workingPressure',
				'material'
			]
		),
		isCustom: true
	};

	return clean;
};

tankSchema.methods.assign = function (tankProfile) {
	this.name = tankProfile.name;
	this.size = tankProfile.size;
	this.workingPressure = tankProfile.workingPressure;
	this.material = tankProfile.material;
};

export default mongoose.model('Tank', tankSchema);
