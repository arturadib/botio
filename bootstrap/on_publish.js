var botio = require('botio');
require('shelljs/global');

botio.cloneAndMerge();

// Recursively copy all files into public directory
cp('-R', '*', botio.jobInfo.public_dir);

botio.message('#### Published');
botio.message('You can view your repo files at: '+botio.jobInfo.public_url);

botio.cleanUp(); // make sure we don't leave stuff behind in the private dir
