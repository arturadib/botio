# Bot.io: The mighty Github build/test bot


_WARNING: This project is under heavy construction._


Bot.io is a fully scriptable build/test bot for Github projects. It is similar to [Travis-CI](https://github.com/travis-ci/travis-ci) in purpose, but most of the action happens at the pull request level and there are no constraints on what types of tests you can run. (Also you have to provision your own test/build servers).

Bot.io is written in Node.js and works on both Windows and Unix. Its previous incarnation has been battle-tested at Mozilla's [pdf.js](http://github.com/mozilla/pdf.js) project since late 2011.




## How it works

1. Reviewers write [shell-like](http://github.com/arturadib/shelljs) scripts such as [on_test.js](https://github.com/arturadib/botio/blob/master/bootstrap/on_test.js) that tell the bot what to do when it receives a command. (Any arbitrary command can be defined).
2. The bot listens for comments like `/botio test` in pull requests (other Github hooks are supported), and runs the corresponding script when a command is detected.
3. The bot reports back to the pull request with a comment containing the test result.

#### Other uses

Bot.io scripts can do anything, not just run tests. For example, if your project is a web app you can define an [on_publish.js](https://github.com/arturadib/botio/blob/master/bootstrap/on_publish.js) script that deploys select files into a public web server (Bot.io has a built-in one by the way). Reviewers can then issue `/botio publish` and take the PR for a spin in their browser before merging it.



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


#### I don't want to use Bot.io anymore. How do I uninstall the Github hooks installed by Bot.io?

On Github, go to Account Settings > Service Hooks > Post-Receive URLs and disable the URL corresponding to the IP of your machine. (Don't forget to save it).


#### How many concurrent tests can I run?

At the moment Bot.io uses a simple queueing system, so only one test can be run at a time. This might change in the future.


#### How does the bot handle security?

Bot.io only responds to white-listed users.
