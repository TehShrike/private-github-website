Given a github repository and a set of allowed email addresses, serves up the content of the repo to everyone who logs in with an allowed email address.

Files are regularly updated from the repository to be served.  Non-image files are gzipped automatically.

To determine who has access to the site, put a `users.json` files in the root of your repository containing an array of email addresses that you want to have access.

To set up your server, make a copy of [server.js](https://github.com/TehShrike/private-github-website/blob/master/server.js) and fill in your own private values for your email server and Github repository.
