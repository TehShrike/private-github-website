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
	var warning = document.querySelector('.alert-warning')
	var info = document.querySelector('.alert-info')
	var btn = document.querySelector('button')

	hidden(warning, true)
	hidden(info, true)

	function auth(event) {
		hidden(warning, true)
		classes.add(btn, 'disabled')

		hidden(info, false)

		var emailAddress = input.value

		info.textContent = 'Email sent to ' + emailAddress + '...'

		var sessionId = cookie.parse(document.cookie)[sessionCookieId] || window[sessionCookieId]
		socket.emit('beginAuthentication', sessionId, emailAddress)

		event.preventDefault()
		return false
	}

	socket.on('warning', function(msg) {
		hidden(warning, false)
		warning.textContent = msg
	})

	socket.on('authenticated', function(emailAddress) {
		hidden(warning, true)
		hidden(info, false)
		info.textContent = 'Authenticated as ' + emailAddress + '!  Redirecting...'
		window.location.pathname = '/'
	})

	form.addEventListener('submit', auth)
})
