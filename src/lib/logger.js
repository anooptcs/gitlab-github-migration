/**
 * Winston logger implementation
 * @module logger
 */
'use strict';

import * as winston from 'winston';

const log = new (winston.Logger)({
  transports: [
    new (winston.transports.Console)({
      name: `console`,
      level: `info`,
      colorize: true
    })
  ]
});

export default log;
