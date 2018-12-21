module.exports = {
	"extends": [
		"strict",
		"strict/mocha"
	],
	"parserOptions": {
		"ecmaVersion": 9,
		"sourceType": "module"
	},
	"env": {
		"node": true,
		"mocha": true
	},
	"rules": {
		"array-element-newline": [2, "consistent"],
		"arrow-parens": [2, "as-needed"],
		"comma-dangle": [2, {
			"arrays": "never",
			"objects": "never",
			"imports": "never",
			"exports": "never",
			"functions": "never"
		}],
		"consistent-return": 0,
		"global-require": 0,
		"id-length": 0,
		"indent": [2, "tab"],
		"no-sync": 0,
		"no-tabs": 0,
		"no-unused-expressions": 0,
		"no-warning-comments": 1,
		"operator-linebreak": [2, "before"]
	}
};
