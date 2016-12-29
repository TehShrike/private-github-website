const createGithubServer = require('./')
const GitHubApi = require('github')
const path = require('path')
const http = require('http')

function getGithubObject() {
	const token = ''

	const github = new GitHubApi({
		// required
		version: '3.0.0',
		// optional
		// debug: true,
		timeout: 5000,
		headers: {
			'user-agent': 'private-github-website-test', // GitHub is happy with a unique user agent
		}
	})

	github.authenticate({
		type: 'oauth',
		token: token
	})

	return github
}

function getRepoOptions() {
	const owner = ''
	const repo = ''

	return {
		owner,
		repo,
		ref: 'heads/master'
	}
}

const server = http.createServer()


const options = {
	// path: path.join(os.tmpdir(), Math.random().toString().slice(2)),
	// db: levelmem('lol'),
	transportOptions: {
		host: 'mail.fake.whatever',
		port: 465,
		secureConnection: true,
		secure: true,
		// debug: true,
		tls: {
			ciphers: 'SSLv3',
			rejectUnauthorized: false
		},
		auth: {
			user: 'justlogin@fake.whatever',
			pass: ''
		}
	},
	defaultMailOptions: {
		from: 'justlogin@fake.whatever',
		subject: 'Log in to private-github-website test site'
	},
	smtpServer: 'mail.fake.whatever',
	getEmailText: function(token) {
		const site = 'http://localhost:8080'
		const url = path.join(site, '/public/auth') + '?token=' + token
		const emailHtml = '<p>Somebody is trying to log in as you!  If it is you, you should click on ' + 'this handy link'.link(url) + '</p>'
			+ '<p>If it isn\'t you, you should definitely NOT click on that link.</p>'
		return emailHtml
	},
	domain: 'localhost',
	refresh: 60 * 60 * 1000,
	server: server
}


createGithubServer(getGithubObject(), getRepoOptions(), options).listen(8080)
