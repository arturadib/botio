# Bot.io: A Github build/test bot

Bot.io is a build/test bot for Github projects. It is similar to [Travis-CI](http://travis-ci.org) in purpose, but works at the pull request (PR) level instead of Post-Receive. It was designed for [workflows](http://scottchacon.com/2011/08/31/github-flow.html) that treat the master branch as always deployable or production-level, and hence need builds/tests to be run prior to merging.

Bot.io has been battle-tested at Mozilla's [pdf.js](http://github.com/mozilla/pdf.js) project.




## Getting started

Bot.io's only dependency is [Node.js](https://github.com/joyent/node). First create a new directory that will contain all configuration files and scripts. In this directory issue:

```bash
$ npm install -g botio
$ botio bootstrap
```

Edit the file `botio.json` and modify the `repo` entry to point to the desired Github repo (for example `{"repo": "mozilla/pdf.js"}`). Then set up the necessary Github hooks and start the Bot.io server:

```bash
$ botio hooks --user repo_admin_name --password password123
$ botio server --user maybe_someone_else --password password123
```

Bot.io's server will use the given user account when leaving comments in pull requests. It doesn't need to be the same as the account used for setting up the hooks. To test Bot.io, go to your Github repo and issue a new pull request. The bot should write back a comment in the PR discussion along the lines of:

```
Hello world, from Bot.io!
```



## Customizing




## Command-line reference

+ `botio start`
+ `botio stop`
+ `botio log`




## The bot API



## FAQ

#### What's a typical Bot.io workflow?

1. User submits a pull request
2. Bot detects new PR and fires up the test suite
3. Bot writes comment back to PR containing test result
4. Reviewers either merge or ask for revision based on the test result


#### I don't want to use Bot.io anymore. How do I uninstall the Github hooks installed by Bot.io?

Go to your Github Account Settings > Service Hooks > Post-Receive URLs and disable the URL corresponding to the IP of your machine.

#### How many concurrent tests can I run?

At the moment Bot.io uses a simple queueing system, so only one test can be run at a time. This might change in the future.

#### How does the bot handle DoS attacks?

Bot.io has a configurable queueing system with white-listed users. By default, a non-white listed user can only queue up to five tests per day.
