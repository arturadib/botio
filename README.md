# Bot.io: The mighty Github build/test bot


_WARNING: This project is under heavy construction._


Bot.io is a fully scriptable build/test bot for Github projects. It is similar to [Travis-CI](https://github.com/travis-ci/travis-ci) in purpose, but most of the action happens at the pull request level and there are no constraints on what types of tests you can run. (Also you have to provision your own test/build servers).

Bot.io is written in Node.js and works on both Windows and Unix. Its previous incarnation has been battle-tested at Mozilla's [pdf.js](http://github.com/mozilla/pdf.js) project since late 2011.






## How it works

#### Pull request testing

1. Reviewers write [shell-like](http://github.com/arturadib/shelljs) scripts such as [on_cmd_test.js](https://github.com/arturadib/botio/blob/master/bootstrap/on_cmd_test.js) that tell the bot what to do when it receives a command. (Any arbitrary command can be defined).
2. The bot listens for comments like `/botio test` in pull requests, and runs the corresponding script when a command is detected.
3. The bot reports back to the pull request with a comment containing the test result.

#### Other uses

+ _Live browser tests:_ Bot.io comes with a built-in web server, so if your project is a web app you can create a script, say [on_cmd_publish.js](https://github.com/arturadib/botio/blob/master/bootstrap/on_cmd_publish.js), to deploy select files into the server. Reviewers can then issue `/botio publish` and take the PR for a spin in their browser before merging it.

+ _Post-receive scripts:_ Bot.io scripts can do just about anything shell scripts can do, and they can hook into other Github events. For example, the script [on_push.js](https://github.com/arturadib/botio/blob/master/bootstrap/on_push.js) is executed every time new commits are pushed to the master branch.






## Getting started

Bot.io depends on [Node.js](https://github.com/joyent/node) and `git`. To get started, create a new directory for your Botio files. In this directory, bootstrap Github hooks/configuration files, and start the server (replace `arturadib` and `arturadib/pdf.js` by your corresponding user and repo names):

```bash
$ npm install -g botio
$ botio bootstrap --repo arturadib/pdf.js --user arturadib --pwd password123 --port 8877
$ botio start --user arturadib --pwd password123
```

That's it!

You can now trigger your first Bot.io job by leaving the following comment on any pull request in your repo:

```
/botio test
```

The bot should write back a hello world response in the PR discussion.






## Customizing

#### Leaving comments as a different user

If you want the bot to leave comments in your pull requests as a different user (here are some [gravatar suggestions](http://www.iconfinder.com/search/?q=robot)), simply start the server with the desired user credentials:

```bash
$ botio start --user fancy_pants_bot --pwd password123
```

#### config.json

_To be documented_









## FAQ


#### I don't want to use Bot.io anymore. How do I uninstall the Github hooks installed by Bot.io?

On your Github repo, go to Admin > Service Hooks > Post-Receive URLs and disable the URL corresponding to the IP of your machine. (Don't forget to save it).


#### How many concurrent tests can I run?

At the moment Bot.io uses a simple queueing system, so only one test can be run at a time. This might change in the future.


#### How does the bot handle security?

Bot.io only responds to white-listed users.
