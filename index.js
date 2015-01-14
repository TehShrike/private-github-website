var sync = require('sync-github-to-fs')
var st = require('st')
var http = require('http')
var path = require('path')

var staticContentPath = '/manager'

module.exports = function createServer(github, repoOptions, options) {
	options.path = options.path || path.join(os.tmpdir(), Math.random().toString().slice(2))

	var serveContentFromRepo = st({
		path: options.path,
		index: false,
		passthrough: false
	})
	var serveStaticContent = st({
		path: './static',
		url: staticContentPath,
		cache: false
	})

	function syncRepoToDisk() {
		console.log('syncing to', options.path)
		sync(github, repoOptions, options.path, function(err) {
			console.log('finished sync to disk', err)
		})
	}

	setInterval(syncRepoToDisk, options.refresh || 60 * 1000).unref()
	syncRepoToDisk()

	return http.createServer(function(req, res) {
		if (!serveStaticContent(req, res)) {
			serveContentFromRepo(req, res)
		}
	})
}
