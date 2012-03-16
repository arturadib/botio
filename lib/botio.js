// botio.js - external module to be used by user scripts
// Grabs environment variables from server.js
var shell = require('shelljs');

var args = {};
if ('BOTIO_ARGS' in process.env)
  args = JSON.parse(process.env['BOTIO_ARGS']);

for (key in args)
  exports[key] = args[key];

shell.rm('-rf', args.private_dir);
shell.mkdir('-p', args.private_dir);
shell.cd(args.private_dir);

exports.cloneAndMerge = function() {
  function execWrap(cmd) {
    if (shell.exec(cmd).code !== 0) {
      echo('!!! Botio error: command returned non-zero exit code ('+cmd+')');
      exit(1);
    }
  };

  if (!shell.which('git')) {
    echo('!!! Botio error: Could not find git');
    exit(1);
  }

  if (!args.base_url || !args.head_url || !args.head_sha) {
    echo('!!! Botio error: Missing head/base information');
    exit(1);
  }

  execWrap('git clone '+args.base_url+' .');
  execWrap('git checkout master');
  execWrap('git remote add requester '+args.head_url);
  execWrap('git fetch requester '+args.head_ref);
  execWrap('git branch PR '+args.head_sha);
  
  // Merge PR branch into upstream's master
  if (exec('git merge PR').code !== 0) {
    echo('!!! Botio error: cannot merge pull request into upstream. Please fix conflicts and try again.');
    exit(1);
  }
}
