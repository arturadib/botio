# Bot.io: Run your own Github build/test bot

Bot.io is a build/test bot for Github projects. It is similar to [Travis-CI](https://github.com/travis-ci/travis-ci) in purpose, but most of the action happens at the pull request level (though post-commit hooks are also supported). It was designed for [workflows](http://scottchacon.com/2011/08/31/github-flow.html) that treat `master` as the production branch, so that tests need to be run prior to merging a PR, not after.

Bot.io has been battle-tested at Mozilla's [pdf.js](http://github.com/mozilla/pdf.js) project since late 2011.




## Getting started

Bot.io depends on [Node.js](https://github.com/joyent/node) and git. To get started, create a new directory specific for your Botio files. In this directory, boostrap all necessary configuration files, and start the server:

```bash
$ npm install -g botio
$ botio bootstrap --repo user/repo_name --user repo_admin_name --pwd password123
$ botio start --user maybe_someone_else --pwd password123
```

Make sure port 8877 is open, otherwise modify the port number in `config.json` and (if bootstrap was already run) also on Github under repo Admin > Service Hooks > Post-Receive URLs.

The server will use the user account given in `botio start` when leaving comments in pull requests. Note that it doesn't need to be the same as the account used in `botio bootstrap` - you might want to create a dedicated user to impersonate the bot, for example. You can then go to your Github repo and trigger the first Bot.io job by leaving the following comment on any pull request:

```
/botio test
```

The bot should write back a hello world response in the PR discussion. See `on_test.js` in your bot files directory for how this is done. You will want to modify that script to fire up your own builds/tests.




## Capabilities


### Pull request

### PR/issue comments

### Push




## FAQ

#### What's a typical Bot.io workflow?

1. User submits pull request
2. Reviewers think the code is desirable, so they fire up the bot by leaving special comment
3. Bot runs the tests/builds and writes back to PR with results

Reviewers can then either merge or ask for further revision based on bot results.


#### I don't want to use Bot.io anymore. How do I uninstall the Github hooks installed by Bot.io?

On Github, go to Account Settings > Service Hooks > Post-Receive URLs and disable the URL corresponding to the IP of your machine. (Don't forget to save it).

#### How many concurrent tests can I run?

At the moment Bot.io uses a simple queueing system, so only one test can be run at a time. This might change in the future.

#### How does the bot handle DoS attacks?

Bot.io only responds to white-listed users.
