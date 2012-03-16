// Main Botio scripting module
var botio = require('botio');

// Import convenient Unix-like commands
require('shelljs/global');

function execWrap(cmd) {
  echo('Running command:', cmd);

  if (exec(cmd).code !== 0) {
    echo('   ERROR!');
    exit(1);
  }
};

mkdir('-p', botio.private_dir);
cd(botio.private_dir);

execWrap('git clone '+botio.base_url+' .');
execWrap('git checkout master');
execWrap('git remote add requester '+botio.head_url);
execWrap('git branch PR '+botio.head_sha);
execWrap('git merge PR');

exit(0);

// echo('[botio] #### Bot.io the house!');
// echo('[botio] This default script is configured to simply echo the contents of your repo.');

// for (file in ls()) {
//   echo(file);
// }
