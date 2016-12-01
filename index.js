var Service, Characteristic
var request = require('request')

module.exports = function (homebridge) {
  Service = homebridge.hap.Service
  Characteristic = homebridge.hap.Characteristic
  homebridge.registerAccessory('homebridge-tlfan', 'TLFan', fanAccessory)
}

function fanAccessory (log, config) {
  this.log = log
  this.fanStatus = false
  this.fanSpeed = 0
  this.on_url = config['on_url'] || ''
  this.off_url = config['off_url'] || ''
  this.speed_url = config['speed_url'] || ''
  this.method = config['method'] || 'POST'
  this.timeout = config['timeout'] || 10000

  this.fanService = new Service.Fan(this.name)

  this.log('[FAN SENSOR SETTINGS]')
  this.log('on_url                 : ' + this.on_url)
  this.log('off_url                : ' + this.off_url)
  this.log('speed_url              : ' + this.speed_url)
  this.log('method                 : ' + this.method)
  this.log('request timeout(msec)  : ' + this.timeout)
}

fanAccessory.prototype = {
  identify: function (callback) {
    this.log('Identify requested!')
    callback() // success
  },

  httpRequest: function (url, method, timeout, callback) {
    request({
      url: url,
      method: method,
      timeout: timeout
    },
    (error, response, body) => {
      callback(error, response, body)
    })
  },

  setState: function (value, callback) {
    this.log('value is: ' + value)
    // ファン ON/OFF操作
    var url = value ? this.on_url : this.off_url
    this.httpRequest(url, this.method, this.timeout, (error, response, body) => {
      let bodyJson = JSON.parse(body)
      if (error || bodyJson['error']) {
        this.log('error :' + error)
        this.log('error :' + body)
        callback(new Error('ファンのコントロールに失敗しました'))
        return
      }
      // this.log('response :' + response)
      this.log('body :' + body)
      this.fanStatus = value
      callback(null)
    })
  },

  getState: function (callback) {
    this.log('get fan...')
    callback(null,this.fanStatus)
  },

  getServices: function () {
    this.log('getServices')
    // サービスのキャラクタリスティック設定
    var informationService = new Service.AccessoryInformation()
    informationService
      .setCharacteristic(Characteristic.Manufacturer, 'Things Like Manufacturer')
      .setCharacteristic(Characteristic.Model, 'Things Like Model')
      .setCharacteristic(Characteristic.SerialNumber, 'Things Like Serial Number')

    this.fanService
      .getCharacteristic(Characteristic.On)
      .on('set', this.setState.bind(this))
      .on('get', this.getState.bind(this))
    
    this.fanService
      .getCharacteristic(Characteristic.RotationSpeed)
      .on('get', function(callback) {
        console.log('get rotation speed')
        callback(null, this.fanSpeed)
      }.bind(this))
      .on('set', function(value, callback) {
        console.log('set rotation speed: ' + value)
        this.httpRequest(this.speed_url.replace('[speed_m1]', value), this.method, this.timeout, function(error, response, body) {
          let bodyJson = JSON.parse(body)
          if (error || bodyJson['error']) {
            this.log('error :' + error)
            callback(new Error('ファンのコントロールに失敗しました'))
            return
          }
          // this.log('response :' + response)
          this.log('body :' + body)
          this.fanSpeed = value
          callback(null)
        }.bind(this))
      }.bind(this))

    return [informationService, this.fanService]
  }
}
