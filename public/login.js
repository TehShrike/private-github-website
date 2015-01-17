var cookie = require('cookie')
var socketio = require('socket.io-client')
var domready = require('domready')

var socket = socketio(window.location.host)

var sessionCookieId = 'sweetSessionIdentifier'

domready(function() {
	var btn = document.getElementById('signInButton')
	var input = document.getElementById('emailAddressInput')
	var form = document.querySelector('form')

	function auth(event) {
		var sessionId = cookie.parse(document.cookie)[sessionCookieId] || window[sessionCookieId]
		socket.emit('beginAuthentication', sessionId, input.value)

		event.preventDefault()
		return false;
	}


	form.addEventListener('submit', auth)
})
