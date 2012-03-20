// botio.js - external module to be used by user scripts
// Grabs environment variables from server.js
var shell = require('shelljs');

var jobInfo = {};
if ('BOTIO_JOBINFO' in process.env)
  jobInfo = JSON.parse(process.env['BOTIO_JOBINFO']);

function debug() {
  if (!jobInfo.debug)
    return;

  console.log.apply(this, arguments);
}

// Clean up private path
shell.rm('-rf', '*');

//
// Export: jobInfo
//
exports.jobInfo = jobInfo;
debug('jobInfo:', jobInfo);

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

  if (!jobInfo.base_url || !jobInfo.head_url || !jobInfo.head_sha) {
    echo('!!! Botio error: Missing head/base information');
    exit(1);
  }

  execWrap('git clone '+jobInfo.base_url+' .'); // clone upstream
  execWrap('git checkout master'); // ensure we're on master
  execWrap('git remote add requester '+jobInfo.head_url); // add pull requester's repo
  execWrap('git fetch requester '+jobInfo.head_ref); // fetch only PR branch
  execWrap('git branch PR '+jobInfo.head_sha); // this is so we can merge the given SHA below

  // Merge PR branch into upstream's master
  debug('Running command: git merge PR');
  if (exec('git merge PR', {silent:true}).code !== 0) {
    echo('!!! Botio error: cannot merge pull request into upstream. Please fix conflicts and try again.');
    exit(1);
  }
}

//
// Export: message()
//
exports.message = function(msg) {
  console.log('!botio_message:'+msg);
}

//
// Export: cleanUp()
// Erases private dir after user script is done
//
exports.cleanUp = function() {
  shell.cd('..');
  shell.rm('-Rf', jobInfo.private_dir);
}
