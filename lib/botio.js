// botio.js - external module to be used by user scripts
// Grabs environment variables from server.js
var shell = require('shelljs');

var args = {};
if ('BOTIO_ARGS' in process.env)
  args = JSON.parse(process.env['BOTIO_ARGS']);

function debug() {
  if (!args.debug)
    return;

  console.log.apply(this, arguments);
}

shell.rm('-rf', args.private_dir);
shell.mkdir('-p', args.private_dir);
shell.cd(args.private_dir);

//
// Export: all args
//
for (key in args)
  exports[key] = args[key];

//
// Export: cloneAndMerge()
//
exports.cloneAndMerge = function() {
  function execWrap(cmd) {
    debug('Running command:', cmd);

    var result = shell.exec(cmd, {silent:true});
    if (result.code !== 0) {
      echo('!!! Error executing command:');
      echo(cmd);
      echo(result.output);
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

  execWrap('git clone '+args.base_url+' .'); // clone upstream
  execWrap('git checkout master'); // ensure we're on master
  execWrap('git remote add requester '+args.head_url); // add pull requester's repo
  execWrap('git fetch requester '+args.head_ref); // fetch only PR branch
  execWrap('git branch PR '+args.head_sha); // this is so we can merge the given SHA below

  // Merge PR branch into upstream's master
  if (exec('git merge PR', {silent:true}).code !== 0) {
    echo('!!! Botio error: cannot merge pull request into upstream. Please fix conflicts and try again.');
    exit(1);
  }
}
