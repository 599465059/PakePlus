/**
 * WebSocket 设备管理器
 */
(function() {
  'use strict'

  window.DeviceManager = {
    ws: null,
    url: 'ws://localhost:3001',
    connected: false,
    channelData: {},
    rawMessages: [],

    connect(url) {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) return
      this.url = url || this.url

      try {
        this.ws = new WebSocket(this.url)

        this.ws.onopen = () => {
          this.connected = true
          this.updateUI()
        }

        this.ws.onclose = () => {
          this.connected = false
          this.updateUI()
          // 3秒后重连
          setTimeout(() => this.connect(), 3000)
        }

        this.ws.onerror = (e) => {
          console.error('WebSocket错误:', e)
        }

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            this.handleMessage(data, event.data)
          } catch (e) {}
        }
      } catch (e) {
        console.error('连接失败:', e)
      }
    },

    disconnect() {
      if (this.ws) {
        this.ws.close()
        this.ws = null
        this.connected = false
        this.updateUI()
      }
    },

    toggle() {
      if (this.connected) {
        this.disconnect()
      } else {
        this.connect()
      }
    },

    updateUI() {
      const icon = document.getElementById('wifiIcon')
      const path = document.getElementById('wifiPath')
      if (icon && path) {
        path.setAttribute('fill', this.connected ? '#22c55e' : '#dc3545')
        icon.title = this.connected ? '已连接，点击断开' : '未连接，点击连接'
      }
    },

    handleMessage(data, rawStr) {
      // 记录原始消息（只保留最新10条用于显示）
      if (rawStr) {
        this.rawMessages.push(rawStr)
        if (this.rawMessages.length > 10) {
          this.rawMessages.shift()
        }
      }

      // 使用 DataParser 解析数据
      if (window.DataParser) {
        const parsed = DataParser.parse(data)
        Object.keys(parsed).forEach(ch => {
          this.channelData[ch] = parsed[ch].value
          EventBus.emit('device:data', {
            channel: ch,
            value: parsed[ch].value,
            unit: parsed[ch].unit || ''
          })
        })
      }
    },

    send(data) {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify(data))
      }
    },

    getChannelValue(channel) {
      return this.channelData[channel]
    }
  }
})()