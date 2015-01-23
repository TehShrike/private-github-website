var server = require('./')
var fs = require('fs')
var GitHubApi = require('github')
var path = require('path')

function getGithubObject() {
	var token = ''

	var github = new GitHubApi({
		// required
		version: '3.0.0',
		// optional
		// debug: true,
		timeout: 5000,
		headers: {
			'user-agent': 'sync-github-to-fs', // GitHub is happy with a unique user agent
		}
	})

	github.authenticate({
		type: 'oauth',
		token: token
	})

	return github
}

function getRepoOptions() {
	var user = ''
	var repo = ''

	return {
			user: user,
			repo: repo,
			ref: 'heads/master'
	}
}


var options = {
	transportOptions: {
		host: 'smtp.mailserver.example.com',
		// port: 587,
		// secure: true,
		// debug: true,
		auth: {
			user: '',
			pass: ''
		}
	},
	defaultMailOptions: {
		from: 'login@mailserver.example.com',
		subject: 'Log in to example.com'
	},
	smtpServer: 'mail.example.us',
	getEmailText: function(token) {
		var site = 'http://example.com'
		var url = path.join(site, '/public/auth') + '?token=' + token
		var emailHtml = '<p>Somebody is trying to log in as you!  If it was you, you should click on' + ' this handy link'.link(url) + '</p>'
			+ '<p>If it wasn\'t you, you should definitely NOT click on that link.</p>'
		return emailHtml
	}
}

fs.mkdirSync(options.path)

server(getGithubObject(), getRepoOptions(), options).listen(8888)
