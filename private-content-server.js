var st = require('st')
var socketio = require('socket.io')
var Cookie = require('cookies')
var uuid = require('random-uuid-v4')
var userAccess = require('./authenticated-users')
var JustLoginCore = require('just-login-core')
var justLoginDebouncer = require('just-login-debouncer')
var levelmem = require('level-mem')

var http = require('http')
var path = require('path')
require('es6-shim')

var publicPath = '/public'
var sessionCookieId = 'sweetSessionIdentifier'
var tokenPrefix = public('auth?token=')

function public(str) {
	return path.join(publicPath, str)
}

module.exports = function(privateContentPath, jlcDb) {
	var jlc = JustLoginCore(jlcDb)
	var debounceDb = levelmem('debouncing')
	justLoginDebouncer(jlc, debounceDb)

	var serveContentFromRepo = st({
		path: privateContentPath,
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

	var server = http.createServer()
	var io = socketio(server)

	server.on('request', httpHandler.bind(null, serveContentFromRepo, servePublicContent, io, jlc, userAccess.hasAccess))
	io.on('connection', socketHandler.bind(null, jlc, userAccess.hasAccess))

	return server
}

function httpHandler(serveContentFromRepo, servePublicContent, io, jlc, userHasAccess, req, res) {
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

	// routing
	if (req.url === public('session.js')) {
		res.setHeader('Content-Type', 'text/javascript')
		res.end(sessionCookieId + '="' + sessionId + '"')
	} else if (req.url.startsWith(tokenPrefix)) {
		var token = req.url.substr(tokenPrefix.length)

		jlc.authenticate(token, function(err, credentials) {
			var target = public('success.html')
			if (err) {
				console.log('Someone had an error authenticating at the token endpoint', err.message || err)
				target = public('index.html')
			} else {
				var sessionSocket = io.to(credentials.sessionId)
				sendAuthenticationMessageToClient(userHasAccess, sessionSocket.emit.bind(sessionSocket), credentials.contactAddress)
			}

			res.writeHead(303, {
				'Location': target
			})
			res.end()
		})
	} else if (!req.url.startsWith('/socket.io/') && !servePublicContent(req, res)) {
		jlc.isAuthenticated(sessionId, function(err, emailAddress) {
			if (err) {
				res.writeHead(500)
				res.end(err.message || err)
			} else if (emailAddress && userHasAccess(emailAddress)) {
				serveContentFromRepo(req, res)
			} else {
				res.writeHead(303, {
					'Location': public('index.html')
				})
				res.end()
			}
		})
	}
}

function socketHandler(jlc, userHasAccess, socket) {
	var sessionId = new Cookie(socket.request).get(sessionCookieId)
	if (sessionId) {
		socket.join(sessionId)
	} else {
		console.error('socket connection happened without a session! BORKED')
	}

	jlc.isAuthenticated(sessionId, function(err, emailAddress) {
		if (!err && emailAddress) {
			sendAuthenticationMessageToClient(userHasAccess, socket.emit.bind(socket), emailAddress)
		}
	})

	socket.on('beginAuthentication', function(sessionId, emailAddress) {
		if (sessionId && emailAddress) {
			jlc.beginAuthentication(sessionId, emailAddress, function(err, credentials) {
				if (err) {
					console.log('error?!?!?!', err.message || err)
					if (err.debounce) {
						socket.emit('warning', 'Too many login requests! Please wait ' + Math.round(credentials.remaining / 1000) + ' seconds.')
					}
				} else {
					console.log(credentials.contactAddress, tokenPrefix + credentials.token)
				}
			})
		}
	})
}

function sendAuthenticationMessageToClient(userHasAccess, emit, emailAddress) {
	if (userHasAccess(emailAddress)) {
		emit('authenticated', emailAddress)
	} else {
		emit('warning', 'You are authenticated as ' + emailAddress + ' but that user doesn\'t have access')
	}
}
