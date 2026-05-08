/**
 * LabVIEW 数据解析器
 * 支持多种数据格式，只需修改此文件即可适配新协议
 */
(function() {
  'use strict'

  window.DataParser = {
    // 解析入口 - 将原始数据解析为通道数据对象
    parse(data) {
      const result = {}

      // 格式1：简单键值对 {"温度": 50, "电压": 220}
      if (this.isSimpleKeyValue(data)) {
        Object.keys(data).forEach(key => {
          if (key !== 'type') {
            result[key] = { value: data[key], unit: '' }
          }
        })
        return result
      }

      // 格式2：带单位的键值对 {"温度": {value: 50, unit: "°C"}}
      if (this.isValueUnitObject(data)) {
        Object.keys(data).forEach(key => {
          if (typeof data[key] === 'object' && data[key] !== null && data[key].value !== undefined) {
            result[key] = {
              value: data[key].value,
              unit: data[key].unit || ''
            }
          }
        })
        return result
      }

      // 格式3：旧格式 {"type": "data", "channel": "温度", "value": 50}
      if (data.type === 'data' && data.channel) {
        result[data.channel] = { value: data.value, unit: data.unit || '' }
        return result
      }

      // 格式4：带 channelNames 的数组数据 {"温度": [...], "channelNames": [...]}
      if (data.channelNames) {
        Object.keys(data).forEach(key => {
          if (key !== 'channelNames' && Array.isArray(data[key])) {
            result[key] = { value: data[key], unit: '', isArray: true }
          }
        })
        return result
      }

      // 格式5：signals 数组 [{"channel": "温度", "value": 50}, ...]
      if (data.signals && Array.isArray(data.signals)) {
        data.signals.forEach(sig => {
          if (sig.channel) {
            result[sig.channel] = { value: sig.value, unit: sig.unit || '' }
          }
        })
        return result
      }

      return result
    },

    // 判断是否为简单键值对
    isSimpleKeyValue(data) {
      if (typeof data !== 'object' || data === null) return false
      if (data.type || data.channel || data.signals || data.channelNames) return false
      return Object.keys(data).every(key => {
        const val = data[key]
        return typeof val === 'number' || typeof val === 'string' || val === null
      })
    },

    // 判断是否为带单位的对象格式
    isValueUnitObject(data) {
      if (typeof data !== 'object' || data === null) return false
      return Object.keys(data).some(key => {
        return typeof data[key] === 'object' &&
               data[key] !== null &&
               data[key].value !== undefined
      })
    },

    // 格式化显示值
    formatValue(value) {
      if (value === null || value === undefined) return '-'
      if (Array.isArray(value)) return `[${value.length}个数据]`
      if (typeof value === 'object') return JSON.stringify(value)
      return String(value)
    }
  }
})()