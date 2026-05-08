/**
 * 事件总线模块
 */
(function() {
  'use strict'

  window.EventBus = {
    events: {},

    on(event, callback) {
      if (!this.events[event]) {
        this.events[event] = []
      }
      this.events[event].push(callback)
    },

    off(event, callback) {
      if (!this.events[event]) return
      if (callback) {
        this.events[event] = this.events[event].filter(cb => cb !== callback)
      } else {
        delete this.events[event]
      }
    },

    emit(event, data) {
      if (!this.events[event]) return
      this.events[event].forEach(callback => {
        try {
          callback(data)
        } catch (e) {
          console.error('事件执行错误:', e)
        }
      })
    }
  }
})()