'use strict'

const url = require('url')
const crypto = require('crypto')

const config = exports

config.server = {}
config.server.secure = false
config.server.bind_ip = process.env.RECEIVER_BIND_IP || '0.0.0.0'
config.server.port = process.env.RECEIVER_PORT || 3000
config.server.public_host = process.env.RECEIVER_HOSTNAME || require('os').hostname()
config.server.public_port = process.env.RECEIVER_PUBLIC_PORT || config.server.port

if (process.env.NODE_ENV === 'test') {
  config.server.public_host = 'localhost'
  config.server.public_port = config.server.port = 5001
} else if (process.env.NODE_ENV === 'unit') {
  config.server.public_host = 'localhost'
  config.server.port = 61338
  config.server.public_port = 80
}

const isCustomPort = config.server.secure
  ? +config.server.public_port !== 443
  : +config.server.public_port !== 80
config.server.base_uri = url.format({
  protocol: 'http' + (config.server.secure ? 's' : ''),
  hostname: config.server.public_host,
  port: isCustomPort ? config.server.public_port : undefined
})

config.receiver = {}
config.receiver.secret = process.env.RECEIVER_SECRET ||
  crypto.randomBytes(32).toString('base64')
config.receiver.credentials = JSON.parse(process.env.RECEIVER_CREDENTIALS || '[]')
