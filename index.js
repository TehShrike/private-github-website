var sync = require('sync-github-to-fs')
var st = require('st')
var http = require('http')

module.exports = function createServer(github, repoOptions, options) {
	var serve = st({
		path: options.path,
		index: false,
		passthrough: false
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
		serve(req, res)
	})
}
