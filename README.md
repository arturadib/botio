# Bot.io: The pull request build/test bot


_WARNING: This project is under heavy construction._


Bot.io is a fully scriptable build/test bot for Github projects. It is similar to [Travis-CI](https://github.com/travis-ci/travis-ci) in purpose, but most of the action happens at the pull request level and there are no constraints on what types of tests you can run. (Also you have to provision your own test/build servers).

Bot.io is written in Node.js and works on both Windows and Unix. It has been battle-tested at Mozilla's [PDF.js project](http://github.com/mozilla/pdf.js) since late 2011.






## How it works

#### Pull request testing

![Screenshot](https://github.com/arturadib/botio/raw/master/screenshot.png)

1. You write [shell-like](http://github.com/arturadib/shelljs) scripts such as [on_cmd_test.js](https://github.com/arturadib/botio/blob/master/bootstrap/on_cmd_test.js) that tell the bot what to do when it receives a command. (Any arbitrary command can be defined).
2. Pull request reviewers leave a comment containing a bot command like `/botio test`, causing the bot to run the corresponding script against a hypothetically merged pull request.
3. The bot reports back to the pull request discussion with a comment containing the test result, so reviewers can anticipate if the PR will break their master branch before merging it.



#### Other uses

+ _Live browser tests:_ Bot.io comes with a built-in web server, so if your project is a web app you can create a script, say [on_cmd_preview.js](https://github.com/arturadib/botio/blob/master/bootstrap/on_cmd_preview.js), to deploy select files into the server. Reviewers can then issue `/botio preview` and take the PR for a spin in their browser before merging it.

+ _Post-receive scripts:_ Bot.io scripts can do just about anything shell scripts can do, and they can hook into other Github events. For example, the script [on_push.js](https://github.com/arturadib/botio/blob/master/bootstrap/on_push.js) is executed every time new commits are pushed to the master branch.








## Getting started

Bot.io depends on [Node.js](https://github.com/joyent/node) and `git`. To get started, create a new dir for your Botio files and bootstrap the necessary files for your repo:

```
$ npm install -g botio
$ mkdir botio-files; cd botio-files
$ botio bootstrap --repo arturadib/pdf.js
```

The bootstrapped file `config.json` contains sensible defaults, but you will likely want to double-check and/or modify it at this point. (In particular, make sure `host`, `port`, and `whitelist` are what you want). Then let Bot.io set up the necessary Github hooks, and start the server:

```
$ botio sethooks --user arturadib --pwd password123
$ botio start --user arturadib --pwd password123
```

That's it! You can now trigger your first Bot.io job by leaving the following comment on any pull request in your repo:

```
/botio test
```

The bot should write back a hello world response in the PR discussion. At this point you will probably want to customize your scripts, as described below.










## Customizing

#### Writing bot scripts

When Github sends a new notification, Botio automatically fires up the corresponding script. For example, `push` (post-receive) notifications will trigger `on_push.js`, whereas a PR comment containg a command like `/botio preview` will trigger `on_cmd_preview.js`.

Bot.io uses [ShellJS](http://github.com/arturadib/shelljs) to enable portable shell-like scripting, so your scripts look like traditional Unix shell scripts but work verbatim on different platforms (like Windows). See [mozilla/botio-files-pdfjs](http://github.com/mozilla/botio-files-pdfjs) for real-world examples.

When you `require('botio')`, the module takes care of the necessary cloning and merging into a temporary (private) directory, and executes your script in that directory. The module also exposes the following job information properties:

```javascript
botio.id              // Unique id string of the job
botio.event           // Event type (e.g. cmd_test, push, etc)
botio.issue           // Issue number (if event comes from issue comment or pull request)
botio.private_dir     // Where tests for the current PR will be run
botio.public_dir      // Where public files for the current PR should be stored
botio.public_url      // URL of this PR's public dir
botio.base_url        // Git URL of the main repo
botio.head_url        // Git URL of the pull request repo
botio.head_ref        // Name of pull request branch
botio.head_sha        // SHA of the most recent commit in the pull request
botio.debug           // True if the server was invoked with --debug
```

as well as the following methods:

```javascript
botio.message(str)    // Instruct the bot to write 'str' in the pull request response
```


#### Leaving comments as a different user

If you want the bot to leave comments as a different Github user (here are some [gravatar suggestions](http://www.iconfinder.com/search/?q=robot)), simply start the server with the desired user credentials:

```bash
$ botio start --user fancy_pants_bot --pwd password123
```

#### Configuring (config.json)

Here are some important properties you might want to modify:

```javascript
host              // Host name of server. By default Botio will use its public IP
name              // Name of the bot, in case you have multiple ones (e.g. `Bot.io-Windows`, `Bot.io-Linux`, etc)
whitelist         // Array of Github user names allowed to trigger Botio commands via pull request comments
public_dir        // Path to the base directory where all web-facing files should be stored
private_dir       // Path to the base directory where all tests will be run
script_timeout    // (In seconds) Will kill any script that takes longer than this
use_queue         // Set to true if commands should be run in a queue, i.e. not concurrently
                  // (Useful when commands are too memory/CPU heavy, e.g. browser tests)
```









## FAQ


#### I don't want to use Bot.io anymore. How do I uninstall the Github hooks installed by Bot.io?

On your Github repo, go to Admin > Service Hooks > Post-Receive URLs and disable the URL corresponding to the IP of your machine. (Don't forget to save it).


#### How does the bot handle security?

Bot.io only responds to white-listed users.


#### How do I get a list of available commands/scripts?

In a pull request discussion, issue:

```
/botio help
```
