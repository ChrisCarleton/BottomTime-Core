import faker from 'faker';
import TankProperties from '../../service/utils/tank-properties';

export default () => {
	const tankProfile = faker.random.arrayElement(Object.keys(TankProperties));

	return {
		in: faker.datatype.number({ min: 200, max: 215 }),
		out: faker.datatype.number({ min: 32, max: 40 }),
		count: faker.random.arrayElement([ 1, 2 ]),
		name: tankProfile,
		size: TankProperties[tankProfile].size,
		workingPressure: TankProperties[tankProfile].workingPressure,
		material: TankProperties[tankProfile].material,
		oxygen: faker.datatype.number({ min: 21, max: 40 }),
		helium: 0
	};
};
