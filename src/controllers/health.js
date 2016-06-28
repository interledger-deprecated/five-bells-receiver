'use strict'

const subscriber = require('../services/subscriber')

exports.getResource = function * () {
  const ready = yield subscriber.getHealth()
  this.body = { status: ready ? 'OK' : 'WAITING' }
  this.status = ready ? 200 : 404
}
