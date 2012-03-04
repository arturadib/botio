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
  .description('create basic config/script files into current dir')
  .action(function(){
    require(__dirname+'/bootstrap.js');
  });

program
  .command('hooks')
  .description('set up the necessary Github hooks')
  .option('-u, --user <user>', 'user name of Github repo admin')
  .option('-p, --pwd <pwd>', 'password of Github repo admin')
  .action(function(opts){
    global.user = opts.user;
    global.pwd = opts.pwd;
    require(__dirname+'/hooks.js');
  });

program.parse(process.argv);
