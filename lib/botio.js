#!/usr/bin/env node
var program = require('commander'),
    request = require('request'),
    shell = require('shelljs');

if (process.argv.length < 3)
  process.argv.push('--help')

program
  .version(JSON.parse(shell.cat(__dirname+'/../package.json')).version);

program
  .command('bootstrap')
  .description('set up necessary Github hooks, create basic config files in current dir')
  .option('-r, --repo <repo>', 'Github repo to watch, e.g. mozilla/pdf.js')
  .option('-u, --user <user>', 'user name of Github repo admin')
  .option('-p, --pwd <pwd>', 'password of Github repo admin')
  .action(function(opts){
    global.repo = opts.repo;
    global.user = opts.user;
    global.pwd = opts.pwd;
    require(__dirname+'/bootstrap.js');
  });

program
  .command('start')
  .description('start the Bot.io server')
  .option('-u, --user <user>', 'user name of Github repo admin')
  .option('-p, --pwd <pwd>', 'password of Github repo admin')
  .action(function(opts){
    global.user = opts.user;
    global.pwd = opts.pwd;
    require(__dirname+'/server.js');
  });

// not a valid command
program
  .command('*')
  .action(function(){
    console.log('Invalid command. Try --help for usage.')
  });

program.parse(process.argv);
