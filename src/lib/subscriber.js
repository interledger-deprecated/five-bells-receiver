'use strict'

const request = require('co-request')

function Subscriber (log, config) {
  this.notificationUri = config.server.base_uri + '/notifications'
  this.log = log('subscriber')
  this.config = config
}

// By using a single constant UUID we avoid duplicate subscriptions
// TODO Obviously that is a hack and will need to change eventually
const notificationUuid = '94f65a56-242c-4d9e-b2cb-d878c52fc3cc'

Subscriber.prototype.subscribe = function * () {
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
    yield this.subscribeAccount(credential)
  }
}

Subscriber.prototype.subscribeAccount = function * (credential) {
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
    const ledger = getAccountRes.body.ledger
    const putSubscriptionRes = yield request.put({
      url: ledger + '/subscriptions/' + notificationUuid,
      json: true,
      auth: {
        username: username,
        password: credential.password
      },
      body: {
        owner: credential.account,
        event: '*',
        subject: credential.account,
        target: this.notificationUri
      }
    })
    if (putSubscriptionRes.statusCode >= 400) {
      throw new Error('Unexpected status code ' + putSubscriptionRes.statusCode)
    }
  } catch (err) {
    this.log.warn('could not subscribe to ' + credential.account)
  }
}

module.exports = Subscriber
