var botio = require('botio');
require('shelljs/global');

botio.clone();

/* ... do something with repo files ... */

botio.cleanUp(); // make sure we don't leave stuff behind in the private dir
