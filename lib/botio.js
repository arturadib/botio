//
// botio.js - external module to be used by user scripts
//
var path = require('path');
require('shelljs/global');



//
// Startup script
//

// Grabs environment variables from server.js
var jobInfo = {};
if ('BOTIO_JOBINFO' in process.env) {
  jobInfo = JSON.parse(process.env['BOTIO_JOBINFO']);
} else {
  echo('Botio internal error (environment variable BOTIO_JOBINFO not found)');
  exit(1);
}

// Ensure we're inside private_dir
if (path.resolve(pwd()) !== path.resolve(jobInfo.private_dir)) {
  echo('Botio internal error (script pwd dir is not private_dir)');
  exit(1);
}

debug('jobInfo:', jobInfo);

// Clean up private path
rm('-rf', '*');

// Decide between pull request VS. push event
if (jobInfo.event.match(/^cmd_/))
  cloneAndMerge();
else if (jobInfo.event === 'push')
  clone();

process.on('exit', function() {
  gc();
});





//
// Exports
//

// jobInfo
exports.jobInfo = jobInfo;

// message()
exports.message = function(msg) {
  console.log('!botio_message:'+msg);
}










//
// Auxiliary functions
//

function debug() {
  if (!jobInfo.debug)
    return;
  arguments[0] = 'DEBUG: '+arguments[0];
  console.log.apply(this, arguments);
}

function execWrap(cmd) {
  debug('Running command:', cmd);
  var result = exec(cmd, {silent:true});
  if (result.code !== 0) {
    echo('!!! Error executing command:');
    echo(cmd);
    echo(result.output);
    exit(1);
  }
};

// Clone head
function clone() {
  if (!which('git')) {
    echo('!!! Botio error: Could not find git');
    exit(1);
  }

  if (!jobInfo.head_url || !jobInfo.head_sha) {
    echo('!!! Botio error: Missing head information');
    exit(1);
  }

  execWrap('git clone '+jobInfo.head_url+' .');
  execWrap('git checkout '+jobInfo.head_sha);
};

// Clone head and merge PR (base) in
function cloneAndMerge() {
  if (!which('git')) {
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

// Garbage collector
function gc() {
  rm('-Rf', jobInfo.private_dir);
}
