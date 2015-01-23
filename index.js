var privateContentServer = require('private-static-website')

var sync = require('sync-github-to-fs')
var concat = require('concat-stream')

var path = require('path')
var os = require('os')
var fs = require('fs')

module.exports = function createServer(github, repoOptions, options) {
	options = options || {}
	options.path = options.path || randomTmpDirectory()
	options.getEmailText = options.getEmailText || function getEmailText(token) {
		return 'Your login token is ' + token
	}

	var server = privateContentServer({
		privateContentPath: options.path,
		transportOptions: options.transportOptions,
		defaultMailOptions: options.defaultMailOptions,
		getEmailText: options.getEmailText,
		db: options.db
	})

	function reloadUsersWithAccess() {
		var usersJsonPath = path.join(options.path, 'users.json')
		fs.createReadStream(usersJsonPath).pipe(concat(server.updateUsers))
	}

	function syncRepoToDisk() {
		sync(github, repoOptions, options.path).then(reloadUsersWithAccess)
	}

	setInterval(syncRepoToDisk, options.refresh || 60 * 1000).unref()
	syncRepoToDisk()

	return server
}

function randomTmpDirectory() {
	var tmpDir = path.join(os.tmpdir(), Math.random().toString().slice(2))
	fs.mkdirSync(tmpDir)
	return tmpDir
}
