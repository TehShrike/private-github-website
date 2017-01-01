require('loud-rejection')()

const privateContentServer = require('private-static-website')

const sync = require('sync-github-to-fs')
const gzipAll = require('gzip-all')
const concat = require('concat-stream')

const joinPath = require('path').join
const os = require('os')
const fs = require('fs')
const http = require('http')

module.exports = function createServer(github, repoOptions, options = {}) {
	const {
		refresh,
		transportOptions,
		defaultMailOptions,
		db,
		domain
	} = options

	const path = options.path || randomTmpDirectory()
	const usersJsonPath = joinPath(path, 'users.json')
	const refreshInterval = refresh || 5 * 60 * 60 * 1000
	const getEmailText = options.getEmailText || defaultGetEmailText

	const server = options.server || http.createServer()

	const privateServer = privateContentServer({
		privateContentPath: path,
		transportOptions,
		defaultMailOptions,
		getEmailText: getEmailText,
		db,
		domain
	}, server)


	function reloadUsersWithAccess() {
		fs.createReadStream(usersJsonPath).pipe(concat(privateServer.updateUsers))
	}

	function createGzippedVersionsOfFiles() {
		return gzipAll(addTrailingSlashIfNeedBe(path) + '**/*.!(png|jpg|jpeg|gif)', {
			root: '/'
		})
	}

	function syncRepoToDisk() {
		sync(github, repoOptions, path).then(() => {
			createGzippedVersionsOfFiles()
			reloadUsersWithAccess()
		})
	}

	setInterval(syncRepoToDisk, refreshInterval).unref()
	syncRepoToDisk()

	return privateServer
}

function randomTmpDirectory() {
	const tmpDir = joinPath(os.tmpdir(), Math.random().toString().slice(2))
	fs.mkdirSync(tmpDir)
	return tmpDir
}

function defaultGetEmailText(token) {
	return `Your login token is ${token}`
}

function addTrailingSlashIfNeedBe(path) {
	return path[path.length - 1] === '/' ? path : `${path}/`
}
