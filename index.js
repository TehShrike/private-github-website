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
require('es6-shim')

var publicPath = '/public'
var sessionCookieId = 'sweetSessionIdentifier'

module.exports = function createServer(github, repoOptions, options) {
	options.path = options.path || path.join(os.tmpdir(), Math.random().toString().slice(2))

	var tokenToSocket = {}
	var db = levelmem('jlc')
	var jlc = JustLoginCore(db)
	var debounceDb = levelmem('debouncing')
	justLoginDebouncer(jlc, debounceDb)

	var serveContentFromRepo = st({
		path: options.path,
		index: 'index.html',
		passthrough: false
	})
	var servePublicContent = st({
		path: './public',
		url: publicPath,
		passthrough: true,
		cache: false,
		index: 'index.html'
	})

	function syncRepoToDisk() {
		sync(github, repoOptions, options.path)
	}

	setInterval(syncRepoToDisk, options.refresh || 60 * 1000).unref()
	syncRepoToDisk()

	var server = http.createServer(app.bind(null, serveContentFromRepo, servePublicContent))

	var io = socketio(server)
	io.on('connection', function(socket) {
		socket.on('beginAuthentication', function(sessionId, emailAddress) {
			if (sessionId && emailAddress) {
				jlc.beginAuthentication(sessionId, emailAddress, function(err, credentials) {
					if (err) {
						console.log('error?!?!?!', err.message || err)
						if (err.debounce) {
							socket.emit('warning', 'Too many login requests! Please wait ' + Math.round(credentials.remaining / 1000) + ' seconds.')
						}
					} else {
						console.log(credentials.contactAddress + ' has ' + credentials.token + ' as their token.')
					}
				})
			}
		})
	})

	return server
}

function app(serveContentFromRepo, servePublicContent, req, res) {
	var cookies = new Cookie(req, res)
	var sessionId = cookies.get(sessionCookieId)

	// session management
	if (!sessionId) {
		sessionId = uuid()
		cookies.set(sessionCookieId, sessionId, {
			domain: 'localhost.com',
			httpOnly: false
		})
	}

	var tokenPrefix = '/public/auth?token='

	// routing
	if (req.url === '/public/session.js') {
		res.setHeader('Content-Type', 'text/javascript')
		res.end(sessionCookieId + '="' + sessionId + '"')
	} else if (req.url.startsWith(tokenPrefix)) {
		var token = req.url.substr(tokenPrefix.length)
		console.log('authenticating', token)
		jlc.authenticate(token, function(emailAddress) {

		})
	} else if (!servePublicContent(req, res)) {
		serveContentFromRepo(req, res)
	}
}
