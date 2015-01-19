var cookie = require('cookie')
var socketio = require('socket.io-client')
var domready = require('domready')
var hidden = require('hidden')
var classes = require('dom-classes')

var socket = socketio(window.location.host)

var sessionCookieId = 'sweetSessionIdentifier'

domready(function() {
	var btn = document.getElementById('signInButton')
	var input = document.getElementById('emailAddressInput')
	var form = document.querySelector('form')
	var warning = document.getElementById('warning')
	var btn = document.querySelector('button')

	hidden(warning, true)

	function auth(event) {
		hidden(warning, true)
		classes.add(btn, 'disabled')

		var sessionId = cookie.parse(document.cookie)[sessionCookieId] || window[sessionCookieId]
		socket.emit('beginAuthentication', sessionId, input.value)

		event.preventDefault()
		return false
	}

	socket.on('warning', function(msg) {
		hidden(warning, false)
		warning.textContent = msg
	})

	form.addEventListener('submit', auth)
})
