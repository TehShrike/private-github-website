Given a github repository and a set of allowed email addresses, serves up the content of the repo to everyone who logs in with an allowed email address.

Files are regularly updated from the repository to be served.

Check out [server.js](https://github.com/TehShrike/private-github-website/blob/master/server.js) to see a server started.

## Primarily composed of

- [node-github](https://github.com/mikedeboer/node-github/) (to be replaced with [jsgit](https://github.com/creationix/jsgit)?)
- [just-login](http://justlogin.xyz/) for email address authentication
- [st](https://github.com/isaacs/st) for static file serving

## Todo

- logging out
