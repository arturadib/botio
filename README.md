# Bot.io: Keep pull requests from breaking your master

Bot.io is a fully flexible build/test bot for Github projects. It is similar to [Travis-CI](https://github.com/travis-ci/travis-ci) in purpose, but most of the action happens at the pull request level. (And you have to run your own test/build servers).

Bot.io works on both Windows and Unix, and has been battle-tested at Mozilla's [pdf.js](http://github.com/mozilla/pdf.js) project since late 2011.




## How it works

Reviewers write [shell-like](http://github.com/arturadib/shelljs) scripts such as [on_test.js](https://github.com/arturadib/botio/blob/master/bootstrap/on_test.js). The bot listens for `/botio test` comments in pull requests, and runs the script when the command is detected.

The bot then reports back to the pull request with the result of the tests run by the script. Other commands are possible. For example, to listen for `/botio publish` simply create a new script `on_publish.js`.




## Getting started

Bot.io depends on [Node.js](https://github.com/joyent/node) and `git`. To get started, create a new directory for your Botio files. In this directory, bootstrap Github hooks/configuration files, and start the server:

```bash
$ npm install -g botio
$ botio bootstrap --repo user/repo_name --user repo_admin_name --pwd password123 --port 8877
$ botio start --user maybe_someone_else --pwd password123
```

You can then go to your Github repo and trigger the first Bot.io job by leaving the following comment on any pull request:

```
/botio test
```

The bot should write back a hello world response in the PR discussion. See `on_test.js` in your bot files directory for how this is done. You will want to modify that script to fire up your own builds/tests.




## FAQ


#### What's a typical Bot.io workflow?

1. User submits pull request
2. Reviewers think the code is desirable, so they fire up the bot by leaving a special comment like `/botio test`
3. Bot runs the tests/builds and writes back to PR with results

Reviewers can then either merge or ask for further revision based on bot results.


#### I don't want to use Bot.io anymore. How do I uninstall the Github hooks installed by Bot.io?

On Github, go to Account Settings > Service Hooks > Post-Receive URLs and disable the URL corresponding to the IP of your machine. (Don't forget to save it).


#### How many concurrent tests can I run?

At the moment Bot.io uses a simple queueing system, so only one test can be run at a time. This might change in the future.


#### How does the bot handle security?

Bot.io only responds to white-listed users.
