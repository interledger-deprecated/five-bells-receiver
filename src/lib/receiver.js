'use strict'

const crypto = require('crypto')
const cc = require('five-bells-condition')
const fetch = require('node-fetch')

class Receiver {
  constructor (log, config) {
    this.log = log('receiver')
    this.config = config
  }

  maybeFulfillCondition (transfer) {
    if (transfer.state === 'prepared' &&
        transfer.credits[0].memo &&
        transfer.credits[0].memo.receiverId) {
      const receiverId = transfer.credits[0].memo.receiverId
      const condition = this.getCondition(receiverId)
      const conditionUri = condition.getConditionUri()

      console.log(JSON.stringify(transfer))

      // This will be true for the last transfer in the chain - which is the one
      // we need to fulfill.
      if (transfer.execution_condition === conditionUri) {
        this.log.debug('fulfilling last transfer ' + transfer.id)

        fetch(transfer.id + '/fulfillment', {
          method: 'PUT',
          body: condition.serializeUri()
        })
          .then((res) => {
            if (res.status >= 400) {
              throw new Error('Remote error ' + res.status)
            }
            this.log.debug('fulfilled last transfer ' + transfer.id)
          })
          .catch((err) => {
            this.log.warn('transfer fulfillment failed for ' + transfer.id +
              ': ' + err.toString())
          })
      } else if (transfer.additional_info && transfer.additional_info.cases) {
        for (let caseUri of transfer.additional_info.cases) {
          this.log.debug('fulfilling notary case ' + caseUri +
            ' for transfer ' + transfer.id)

          fetch(caseUri + '/fulfillment', {
            method: 'PUT',
            body: condition.serializeUri()
          })
            .then((res) => {
              if (res.status >= 400) {
                throw new Error('Remote error ' + res.status)
              }
              this.log.debug('fulfilled last transfer ' + transfer.id)
            })
            .catch((err) => {
              this.log.warn('transfer fulfillment failed for ' + transfer.id +
                ': ' + err.toString())
            })
        }
      } else {
        this.log.debug('ignoring ' + transfer.id + ': condition ' +
          transfer.execution_condition + ' does not match the one we can fulfill: ' +
          conditionUri)
      }
    }
  }

  getCondition (receiverId) {
    const secret = new Buffer(this.config.receiver.secret, 'base64')
    const conditionSecret = Receiver.hmac(secret, receiverId)
    const condition = new cc.PreimageSha256()
    condition.setPreimage(conditionSecret)
    return condition
  }

  static hmac (key, message) {
    return crypto.createHmac('sha256', key).update(message).digest()
  }
}

module.exports = Receiver
