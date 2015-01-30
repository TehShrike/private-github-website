var privateContentServer = require('private-static-website')

var sync = require('sync-github-to-fs')
var concat = require('concat-stream')

var joinPath = require('path').join
var os = require('os')
var fs = require('fs')
var http = require('http')

module.exports = function createServer(github, repoOptions, options) {
	options = options || {}
	var path = options.path || randomTmpDirectory()
	var usersJsonPath = joinPath(path, 'users.json')
	var refreshInterval = options.refresh || 5 * 60 * 60 * 1000
	var getEmailText = options.getEmailText || function getEmailText(token) {
		return 'Your login token is ' + token
	}

	var server = options.server || http.createServer()

	// server.on('request', function(req, res) {
	// 	res.end('done')
	// })

	var privateServer = privateContentServer({
		privateContentPath: path,
		transportOptions: options.transportOptions,
		defaultMailOptions: options.defaultMailOptions,
		getEmailText: getEmailText,
		db: options.db,
		domain: options.domain
	}, server)


	function reloadUsersWithAccess() {
		fs.createReadStream(usersJsonPath).pipe(concat(privateServer.updateUsers))
	}

	function syncRepoToDisk() {
		sync(github, repoOptions, path).then(reloadUsersWithAccess)
	}

	setInterval(syncRepoToDisk, refreshInterval).unref()
	syncRepoToDisk()

	return privateServer
}

function randomTmpDirectory() {
	var tmpDir = joinPath(os.tmpdir(), Math.random().toString().slice(2))
	fs.mkdirSync(tmpDir)
	return tmpDir
}
