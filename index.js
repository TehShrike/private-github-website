var sync = require('sync-github-to-fs')
var st = require('st')
var http = require('http')
var path = require('path')
var socketio = require('socket.io')
var Cookie = require('cookies')
var uuid = require('random-uuid-v4')
var levelmem = require('level-mem')
var JustLoginCore = require('just-login-core')
var justLoginDebouncer = require('just-login-debouncer')

var publicPath = '/public'
var sessionCookieId = 'sweetSessionIdentifier'

module.exports = function createServer(github, repoOptions, options) {
	options.path = options.path || path.join(os.tmpdir(), Math.random().toString().slice(2))

	var db = levelmem('jlc')
	var jlc = JustLoginCore(db)
	var debounceDb = levelmem('debouncing')
	justLoginDebouncer(jlc, debounceDb)

	jlc.on('authentication initiated', function (loginRequest) {
		console.log(loginRequest.contactAddress + ' has ' + loginRequest.token + ' as their token.')
	})

	var serveContentFromRepo = st({
		path: options.path,
		index: false,
		passthrough: false
	})
	var servePublicContent = st({
		path: './public',
		url: publicPath,
		cache: false,
		index: 'index.html'
	})

	function syncRepoToDisk() {
		console.log('syncing to', options.path)
		sync(github, repoOptions, options.path, function(err) {
			console.log('finished sync to disk', err)
		})
	}

	setInterval(syncRepoToDisk, options.refresh || 60 * 1000).unref()
	syncRepoToDisk()

	var server = http.createServer(function(req, res) {
		var cookies = new Cookie(req, res)

		var sessionId = cookies.get(sessionCookieId)
		console.log('request came in with session id', sessionId)

		if (!sessionId) {
			sessionId = uuid()
			cookies.set(sessionCookieId, sessionId, {
				domain: 'localhost.com',
				httpOnly: false
			})
		}

		console.log(req.url)

		if (!servePublicContent(req, res)) {
			console.log('nothing in public content?!?!')
			serveContentFromRepo(req, res)
		}
	})

	var io = socketio(server)
	io.on('connection', function(socket) {
		socket.on('beginAuthentication', function(sessionId, emailAddress) {
			jlc.beginAuthentication(sessionId, emailAddress)
		})
	})

	return server
}

