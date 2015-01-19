var privateContentServer = require('./private-content-server')
var userAccess = require('./authenticated-users')

var sync = require('sync-github-to-fs')
var levelmem = require('level-mem')
var JustLoginCore = require('just-login-core')
var justLoginDebouncer = require('just-login-debouncer')

var path = require('path')
var os = require('os')
require('es6-shim')

module.exports = function createServer(github, repoOptions, options) {
	options = options || {}
	options.path = options.path || path.join(os.tmpdir(), Math.random().toString().slice(2))
	options.db = options.db || levelmem('jlc')

	var jlc = JustLoginCore(options.db)
	var debounceDb = levelmem('debouncing')
	justLoginDebouncer(jlc, debounceDb)

	function syncRepoToDisk() {
		sync(github, repoOptions, options.path, function() {
			userAccess.reload(path.join(options.path, 'users.json'))
		})
	}


	setInterval(syncRepoToDisk, options.refresh || 60 * 1000).unref()
	syncRepoToDisk()

	return privateContentServer(options.path, jlc)
}

