// Dependencies
//---------------------------------------------
const path = require('path');
const {template, last} = require('lodash');
const Generator = require('yeoman-generator');
const {promisifyAll, promisify} = require('bluebird');
const glob = promisify(require('glob'));
const mkdirp = promisify(require('mkdirp'));
const fs = promisifyAll(require('graceful-fs'));


// Constants
//---------------------------------------------
const ROOT = __dirname;
const CLONE_ROOT = path.join(ROOT, 'clone');
const CLONE_GLOB = path.resolve(CLONE_ROOT, './**/*.*');


// Util Functions
//---------------------------------------------
const fileExists = (filepath) => {
	return fs.statAsync(filepath)
		.then(() => true)
		.catch(() => false);
};


// Classes
//---------------------------------------------
class ComponentFile {
	constructor(text, filepath, componentNames, templateData) {
		// Core, unchanged properties
		this.originalFilepath = filepath;
		this.componentNames = componentNames;
		this.templateData = templateData;

		// Values which contain lodash template expressions
		this.text = this.processTemplate(text);
		this.writeFilepath = this.processTemplate(this._getWriteFilepath());
	}

	_getWriteFilepath() {
		const {originalFilepath, componentNames} = this;
		const relativePath = path.relative(CLONE_ROOT, originalFilepath);

		return path.join(
			...componentNames.map((name) => path.join('components', name)),
			relativePath
		)
	}

	processTemplate(string) {
		return template(string)(this.templateData);
	}

	writeFile() {
		const {writeFilepath, text} = this;

		return fileExists(writeFilepath)
			.then((exists) => {
				// Avoid writing over files that already exist.
				if (exists) {
					throw new Error(`A file already exists at path "${writeFilepath}".`);
				}

				// Ensure directory exists...
				return mkdirp(path.dirname(writeFilepath))

				// ...then write file
					.then(() => fs.writeFileAsync(writeFilepath, text))
					.then(() => this);
			})
	}
}


// Read / write
//---------------------------------------------
const processFile = (filepath, ...args) => {
	return fs
		.readFileAsync(filepath, 'utf8')
		.then((text) => new ComponentFile(text, filepath, ...args).writeFile());
};


// Export yeoman generator
//---------------------------------------------
module.exports = class extends Generator {
	constructor(args, options) {
		super(args, options);
		this.option('preact');
	}

	/**
	 * Log error in console and exit.
	 *
	 * Useful in promises because errors can't be thrown in a promise.
	 *
	 * Useful for general errors as we throw the message with Generator.log.error,
	 * which styles the error nicely.
	 *
	 * @param {Error} err
	 */
	_terminateWithError(err) {
		this.log.error(err.message);
		process.exit(0);
	}

	/**
	 * Yeoman generator.
	 * Takes a list of component names and generates files for that component.
	 *
	 * @example
	 * `yo react-component Foo Bar`
	 * Will create files for a Bar component, located in the folder:
	 * components/Foo/components/Bar.
	 *
	 * Bar is a child component of Foo.
	 *
	 * @param {String} componentNames
	 */
	create(...componentNames) {
		if (!componentNames.length) {
			return this._terminateWithError(
				new Error('Component name must be passed as an argument.')
			)
		}

		// Values to populate lodash template expressions
		const templateData = {
			stylesDirName: '../'.repeat(componentNames.length - 1),
			componentName: last(componentNames),
			jsxImport: this.options.preact
				? `import { h, Component } from 'preact';`
				: `import React, { Component } from 'react';`
		};

		glob(CLONE_GLOB)
			.then((filepaths) => {
				const filePromises = filepaths.map((filepath => {
					return processFile(filepath, componentNames, templateData)
				}));
				return Promise.all(filePromises);
			})
			.then((files) => {
				const filepaths = files
					.map(({writeFilepath}) => `- ${writeFilepath}`)
					.join('\n');
				this.log.ok(`${files.length} files written:\n${filepaths}`)
			})
			.catch((err) => this._terminateWithError(err));
	};

};
