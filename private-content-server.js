require('es6-shim')

var st = require('st')
var socketio = require('socket.io')
var Cookie = require('cookies')
var uuid = require('random-uuid-v4')
var JustLoginCore = require('just-login-core')
var justLoginDebouncer = require('just-login-debouncer')
var levelmem = require('level-mem')
var emailer = require('just-login-emailer')

var http = require('http')
var path = require('path')

var publicPath = '/public'
var sessionCookieId = 'sweetSessionIdentifier'
var tokenPrefix = public('auth?token=')

function public(str) {
	return path.join(publicPath, str)
}

function checkFor(obj, property) {
	if (!obj || typeof obj[property] === 'undefined') {
		throw new Error('Options must have "' + property + '" property')
	}
}

module.exports = function(options) {
	checkFor(options, 'privateContentPath')
	checkFor(options, 'transportOptions')
	checkFor(options, 'defaultMailOptions')
	checkFor(options, 'getEmailText')

	var jlc = JustLoginCore(options.db || levelmem('jlcDb'))
	var debounceDb = levelmem('debouncing')
	var usersWithAccess = {}
	justLoginDebouncer(jlc, debounceDb)
	emailer(jlc, options.getEmailText, options.transportOptions, options.defaultMailOptions, function(err) {
		if (err) {
			console.error(err.message || err)
		}
	})

	function userHasAccess(emailAddress) {
		return !!usersWithAccess[emailAddress.toLowerCase()]
	}

	var serveContentFromRepo = st({
		path: options.privateContentPath,
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

	server.on('request', httpHandler.bind(null, serveContentFromRepo, servePublicContent, io, jlc, userHasAccess))
	io.on('connection', socketHandler.bind(null, jlc, userHasAccess))

	server.updateUsers = function updateUsers(contents) {
		try {
			var userEmailAddresses = JSON.parse(contents)

			usersWithAccess = userEmailAddresses.map(function lc(str) {
				return str.toLowerCase()
			}).reduce(function(o, address) {
				o[address] = true
				return o
			}, {})
		} catch (e) {
			console.error(e)
		}
	}

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
					if (err.debounce) {
						socket.emit('warning', 'Too many login requests! Please wait ' + Math.round(credentials.remaining / 1000) + ' seconds.')
					} else {
						console.error('error?!?!?!', err.message || err)
					}
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
