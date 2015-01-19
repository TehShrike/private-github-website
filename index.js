require('es6-shim')

var privateContentServer = require('./private-content-server')
var userAccess = require('./authenticated-users')

var sync = require('sync-github-to-fs')
var levelmem = require('level-mem')

var path = require('path')
var os = require('os')

module.exports = function createServer(github, repoOptions, options) {
	options = options || {}
	options.path = options.path || path.join(os.tmpdir(), Math.random().toString().slice(2))
	options.db = options.db || levelmem('jlc')


	function syncRepoToDisk() {
		sync(github, repoOptions, options.path, function() {
			userAccess.reload(path.join(options.path, 'users.json'))
		})
	}


	setInterval(syncRepoToDisk, options.refresh || 60 * 1000).unref()
	syncRepoToDisk()

	return privateContentServer(options.path, options.db)
}

