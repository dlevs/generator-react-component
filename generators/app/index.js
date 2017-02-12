// Dependencies
//---------------------------------------------
const path = require('path');
const {template, mapValues, last} = require('lodash');
const Generator = require('yeoman-generator');
const {promisifyAll, promisify} = require('bluebird');
const glob = promisify(require('glob'));
const mkdirp = promisify(require('mkdirp'));
const fs = promisifyAll(require('graceful-fs'));


// Constants
//---------------------------------------------
const ROOT = __dirname;
const CLONE_ROOT = path.join(ROOT, 'clone');


// Util Functions
//---------------------------------------------

/**
 * Log error in console and exit.
 * Because errors can't be thrown in a promise.
 * @param err
 */
const terminateWithError = (err) => {
	console.error(err.stack);
	process.exit(0);
};


// Read / process / write
//---------------------------------------------
const readFile = (filepath) => {
	return fs
		.readFileAsync(filepath, 'utf8')
		.then((text) => ({
				filepath: path.relative(CLONE_ROOT, filepath),
				text
			})
		);
};
const processTemplateStrings = (data) => (file) => {
	return mapValues(file, (string) => template(string)(data))
};
const createOutputFilepath = (componentNames) => (file) => {
	return Object.assign(
		{},
		file,
		{
			filepath: path.join(
				...componentNames.map((name) => path.join('components', name)),
				file.filepath
			)
		}
	)
};
const writeFile = ({filepath, text}) => {
	return (
		// Ensure dir exists...
		mkdirp(path.dirname(filepath))

		// ...then write file
			.then(() => fs.writeFileAsync(filepath, text))
	);
};


// Export yeoman generator
//---------------------------------------------
module.exports = class extends Generator {
	create(...componentNames) {
		if (!componentNames.length) {
			throw Error('Component name must be passed as an argument.');
		}

		glob(path.resolve(CLONE_ROOT, './**/*.*'))
			.then((filepaths) => Promise.all(
				filepaths
					.map((filepath) => {
						return readFile(filepath)
							.then(processTemplateStrings({
								componentName: last(componentNames)
							}))
							.then(createOutputFilepath(componentNames))
							.then(writeFile);
					})
			))
			.catch(terminateWithError);
	}
};
