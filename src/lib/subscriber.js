'use strict'

const request = require('co-request')
const WebSocket = require('ws')

function Subscriber (log, config) {
  this.log = log('subscriber')
  this.config = config
  this.ready = false
}

Subscriber.prototype.subscribe = function * (emitter) {
  if (!Array.isArray(this.config.receiver.credentials)) {
    throw new Error('Invalid RECEIVER_CREDENTIALS')
  }

  this.log.info('processing ' + this.config.receiver.credentials.length + ' subscriptions')
  for (let credential of this.config.receiver.credentials) {
    if (typeof credential.account !== 'string') {
      throw new Error('Missing account URI in credential')
    }
    if (typeof credential.password !== 'string') {
      throw new Error('Missing password in credential')
    }
    yield this.subscribeAccount(credential, emitter)
  }
}

Subscriber.prototype.subscribeAccount = function * (credential, emitter) {
  this.log.info('subscribing to ' + credential.account)

  try {
    const getAccountRes = yield request.get({
      url: credential.account,
      json: true
    })
    if (getAccountRes.statusCode >= 400) {
      throw Error('Unexpected status code while subscribing to ' +
        credential.account + ': ' + getAccountRes.statusCode)
    }
    const username = getAccountRes.body.name
    const header = username + ':' + (credential.password || '')
    const authHeader = { Authorization: 'Basic ' + new Buffer(header).toString('base64') }

    // Establishing websocket connection
    const wsURI = credential.account.replace(/^http/, 'ws') + '/transfers'
    const ws = new WebSocket(wsURI, { headers: authHeader })
    ws.on('open', () => {
      this.ready = true
      this.log.info('connected to ' + wsURI)
    })
    ws.on('close', () => {
      this.ready = false
      this.log.info('disconnected from ' + wsURI)
    })
    ws.on('message', (message) => emitter.emit('notification', message))
  } catch (err) {
    this.log.warn('could not subscribe to ' + credential.account)
    this.log.warn(err.stack)
  }
}

Subscriber.prototype.getHealth = function * () {
  return this.ready
}

module.exports = Subscriber
