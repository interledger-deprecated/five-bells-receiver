'use strict'
const log = require('./log')
const config = require('./config')
const Subscriber = require('../lib/subscriber')
module.exports = new Subscriber(log, config)
