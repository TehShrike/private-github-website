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
	options.getEmailText = options.getEmailText || function getEmailText(token) {
		return 'Your login token is ' + token
	}


	function syncRepoToDisk() {
		sync(github, repoOptions, options.path, function() {
			userAccess.reload(path.join(options.path, 'users.json'))
		})
	}


	setInterval(syncRepoToDisk, options.refresh || 60 * 1000).unref()
	syncRepoToDisk()

	return privateContentServer(options.path, options.db, options.transportOptions, options.defaultMailOptions, options.getEmailText)
}

