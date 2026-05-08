/**
 * 本地存储模块
 */
(function() {
  'use strict'

  window.Storage = {
    save(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value))
      } catch (e) {
        console.error('保存失败:', e)
      }
    },

    load(key, defaultValue) {
      try {
        const value = localStorage.getItem(key)
        return value ? JSON.parse(value) : defaultValue
      } catch (e) {
        console.error('读取失败:', e)
        return defaultValue
      }
    },

    remove(key) {
      localStorage.removeItem(key)
    }
  }
})()