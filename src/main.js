'use strict';

var fs = require('fs');
var dns = require('native-dns');
var async = require('async');

var overridedRecords = { };

function log(level, facility, message) {
	var message =
		'[' + level.toUpperCase() + ']' + 
		'[' + facility.toUpperCase() + ']' + 
		' ' +
		message;

	console.log(message);
}

function logRequest(level, facility, id, message) {
	var message =
		'[' + level.toUpperCase() + ']' + 
		'[' + facility.toUpperCase() + ']' + 
		'[' + id + ']' + 
		' ' +
		message;

	console.log(message);
}

function loadOverridedRecordsFile() {
	var temporaryOverridedRecords;

	try {
		temporaryOverridedRecords = require('../' + config.overridedRecordsFile);
	} catch (e) {
		return false;
	}

	overridedRecords = temporaryOverridedRecords;

	return true;
}

function updateOverridedRecordsFile() {
	fs.writeFile(config.overridedRecordsFile, JSON.stringify(overridedRecords, null, 4), (err) => {
		if (err) {
			log('error', 'overrided records', 'unable to update the local storage - ' + JSON.stringify(err));
		} else {
			log('info', 'overrided records', 'local storage updated');
		}
	}); 
}

function handleRequest(request, response) {
	var id = request.header.id;

	logRequest('debug', 'request', id, 'opcode ' + request.header.opcode + ' - question ' + request.question.length);

	if (request.header.opcode == 5) {
		request.authority.forEach((authority) => {
			if (authority.type == 1 || authority.class == 1) {
				var key = authority.name + '/' + authority.type + '/' + authority.class;
				logRequest('debug', 'overrided records', id, 'adding/updating entry ' + key);
				overridedRecords[key] = authority;
				updateOverridedRecordsFile();
			} else if (authority.type == 255 || authority.class == 255) {
				var key = authority.name + '/' + 1 + '/' + 1;
				logRequest('debug', 'overrided records', id, 'deleting entry ' + key);
				delete overridedRecords[key];
				updateOverridedRecordsFile();
			}
		});
	}

	var f = [ ];

	request.question.forEach(question => {
		f.push(cb => {

			var key = question.name + '/' + question.type + '/' + question.class;

			logRequest('debug', 'overrided records', id, 'checking for ' + key);

			if (!!overridedRecords[key] == true) {
				logRequest('debug', 'overrided records', id, 'found');
				logRequest('debug', 'response', id, 'answering from overrided records');
				var answer = overridedRecords[key];

				response.answer.push({
					"name": answer.name,
					"type": answer.type,
					"class": answer.class,
					"ttl": answer.ttl - 1,
					"address": answer.address
				});

				cb();
			} else {
				logRequest('debug', 'overrided records', id, 'key missing');
				logRequest('debug', 'response', id, 'requesting to upstream dns server');
				var newRequest = dns.Request({
					"question": question,
					"server": config.upstream,
					"timeout": 1000
				});

				newRequest.on('message', (err, answers) => {
					logRequest('debug', 'response', id, 'upstream response received');
					answers.answer.forEach((answer) => {
						logRequest('debug', 'response', id, 'adding answer to the response');
						response.answer.push(answer);
					});
				});

				newRequest.on('timeout', () => {
					logRequest('debug', 'response', id, 'upstream request timeouted');
				});

  				newRequest.on('end', cb);
				newRequest.send();
			}

		});
	});

	async.parallel(f, () => {
		response.send();
	});
}

var config = require('../config.json');
var overridedRecords = require('../' + config.overridedRecordsFile);

log('info', 'main', 'starting');

log('info', 'main', 'loading overrided records from local storage');
if (loadOverridedRecordsFile() == false) {
	log('error', 'overrided records', 'unable to load local storage');
	process.exit(1);
}

log('info', 'main', 'starting listeners');
config.bindings.forEach((binding) => {
	var server = dns.createServer();

	server.on('request', function (request, response) {
		handleRequest(request, response);
	});

	server.on('error', (err, buff, req, res) => {
		console.log("[ERROR] An error has been cached");
		console.log(err.stack);
		console.log(req);
	});

	server.serve(binding.port, binding.address);
	
	log('info', 'main', 'listening on '+ binding.address + ':' + binding.port);
});
log('info', 'main', 'started');
