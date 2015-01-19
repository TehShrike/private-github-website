var concat = require('concat-stream')
var fs = require('fs')

var users = {}

function updateUsers(contents) {
	try {
		var userEmailAddresses = JSON.parse(contents)

		users = userEmailAddresses.map(function lc(str) {
			return str.toLowerCase()
		}).reduce(function(o, address) {
			o[address] = true
			return o
		}, {})
	} catch (e) {
		console.error(e)
	}
}

function reloadUsersWithAccess(usersJsonPath) {
	fs.createReadStream(usersJsonPath).pipe(concat(updateUsers))
}

module.exports = {
	reload: reloadUsersWithAccess,
	hasAccess: function(emailAddress) {
		return !!users[emailAddress.toLowerCase()]
	}
}
