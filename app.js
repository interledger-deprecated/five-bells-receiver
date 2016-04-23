'use strict'

const co = require('co')
const koa = require('koa')
const route = require('koa-route')
const errorHandler = require('five-bells-shared/middlewares/error-handler')
const log = require('./src/services/log')
const logger = require('koa-mag')
const config = require('./src/services/config')
const notifications = require('./src/controllers/notifications')
const health = require('./src/controllers/health')
const receiver = require('./src/services/receiver')
const subscriber = require('./src/services/subscriber')
const bodyParser = require('koa-bodyparser')
const app = module.exports = koa()

app.use(logger())
app.use(errorHandler({ log: log('error-handler') }))
app.use(bodyParser())

app.use(route.post('/notifications', notifications.postResource))
app.use(route.get('/health', health.getResource))

notifications.on('notification', (notification) => {
  receiver.maybeFulfillCondition(notification.resource)
})

if (!module.parent) {
  app.listen(config.server.port)
  log('app').info('receiver listening on ' + config.server.bind_ip + ':' +
    config.server.port)
  log('app').info('public at ' + config.server.base_uri)

  co(function * () {
    yield subscriber.subscribe()
  }).catch((err) => (
    console.error(err && err.stack ? err.stack : err)))
}
