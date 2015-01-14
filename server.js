var server = require('./')
var os = require('os')
var fs = require('fs')
var levelmem = require('level-mem')
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
	path: path.join(os.tmpdir(), Math.random().toString().slice(2)),
	db: levelmem('lol')
}

fs.mkdirSync(options.path)

server(getGithubObject(), getRepoOptions(), options).listen(8888)
