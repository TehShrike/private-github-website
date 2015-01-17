var cookie = require('cookie')
var socketio = require('socket.io-client')
var domready = require('domready')

var socket = socketio(window.location.host)

var sessionCookieId = 'sweetSessionIdentifier'

domready(function() {
	var btn = document.getElementById('signInButton')
	var input = document.getElementById('emailAddressInput')

	btn.addEventListener('click', function() {
		var sessionId = cookie.parse(document.cookie)[sessionCookieId]
		socket.emit('beginAuthentication', sessionId, input.value)
	})

	console.log(btn)
})
