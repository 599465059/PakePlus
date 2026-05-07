/**
 * 文件系统模块 - 使用 Tauri fs API
 */
(function() {
  'use strict'

  const { writeTextFile, readTextFile, createDir, remove, BaseDirectory } = window.__TAURI__.fs

  window.FileSystem = {
    indexFile: 'jsset/index.json',
    configDir: 'jsset',
    useFileSystem: true,

    // 初始化文件系统
    async init() {
      console.log('FileSystem init...')
      try {
        await createDir('jsset', {
          baseDir: BaseDirectory.Exe,
          recursive: true
        })
        console.log('jsset directory created or exists in application directory')
      } catch (e) {
        console.error('Create jsset directory error:', e)
      }
      return true
    },

    // 确保文件夹准备就绪，数据本地保存
    async ensureFolder() {
      try {
        await createDir('jsset', {
          baseDir: BaseDirectory.Exe,
          recursive: true
        })
        return true
      } catch (e) {
        console.error('ensureFolder error:', e)
        return false
      }
    },

    // 读取文件内容 (Tauri fs API)
    async readFileContent(fileName) {
      try {
        const content = await readTextFile(fileName, {
          baseDir: BaseDirectory.Exe
        })
        return content
      } catch (e) {
        console.error('Read file error:', e)
        return null
      }
    },

    // 写入文件内容 (Tauri fs API)
    async writeFileContent(fileName, content) {
      console.log('writeFileContent called:', fileName, 'baseDir:', BaseDirectory.Exe)
      try {
        await writeTextFile(fileName, content, {
          baseDir: BaseDirectory.Exe
        })
        console.log('File written successfully:', fileName)
        return true
      } catch (e) {
        console.error('Write file error:', e)
        return false
      }
    },

    // 写入索引文件
    _lastWrittenIndex: null,
    async writeIndex(data) {
      const content = JSON.stringify(data, null, 2)
      console.log('writeIndex: content =', content)
      const success = await this.writeFileContent(this.indexFile, content)
      console.log('writeIndex: success =', success)
      if (success) {
        Storage.save('settings_index', data)
        this._lastWrittenIndex = data
        console.log('writeIndex: saved to file and localStorage')
        return true
      }
      Storage.save('settings_index', data)
      console.log('writeIndex: saved to localStorage only')
      return true
    },

    // 读取索引文件（优先返回最近写入的数据）
    async readIndex() {
      if (this._lastWrittenIndex) {
        return this._lastWrittenIndex
      }
      const content = await this.readFileContent(this.indexFile)
      if (content && content.trim()) {
        try {
          const index = JSON.parse(content)
          this._lastWrittenIndex = index
          return index
        } catch (e) {
          console.error('Parse index error:', e)
        }
      }
      const localIndex = Storage.load('settings_index', { default: null, configs: [] })
      if (localIndex.configs && localIndex.configs.length > 0) {
        await this.writeIndex(localIndex)
      }
      return localIndex
    },

    // 加载配置列表
    async loadConfigList() {
      const index = await this.readIndex()
      console.log('loadConfigList:', index.configs)
      return index ? index.configs : []
    },

    // 读取配置
    async readConfig(name) {
      const fileName = 'jsset/' + name + '.json'
      const content = await this.readFileContent(fileName)
      if (content) {
        try {
          return JSON.parse(content)
        } catch (e) {
          console.error('Parse config error:', e)
        }
      }
      return null
    },

    // 保存配置，统一的写法
    async writeConfig(name, desc, data) {
      console.log('writeConfig:', name)

      const fileName = 'jsset/' + name + '.json'
      const content = JSON.stringify(data, null, 2)
      const success = await this.writeFileContent(fileName, content)

      if (success) {
        const index = await this.readIndex() || { default: null, configs: [] }
        const existingIndex = index.configs.findIndex(c => c.name === name)
        if (existingIndex >= 0) {
          index.configs[existingIndex] = { name, desc }
        } else {
          index.configs.push({ name, desc })
        }
        await this.writeIndex(index)
        console.log('Config saved to file:', name)
        return true
      }

      const configKey = 'settings_config_' + name
      Storage.save(configKey, data)

      const configList = Storage.load('settings_configs', [])
      const existingIndex = configList.findIndex(c => c.name === name)
      const configInfo = { name, desc }
      if (existingIndex >= 0) {
        configList[existingIndex] = configInfo
      } else {
        configList.push(configInfo)
      }
      Storage.save('settings_configs', configList)

      const index = Storage.load('settings_index', { default: null, configs: [] })
      const idx = index.configs.findIndex(c => c.name === name)
      if (idx >= 0) {
        index.configs[idx] = configInfo
      } else {
        index.configs.push(configInfo)
      }
      Storage.save('settings_index', index)

      console.log('Config saved to localStorage (browser mode):', name)
      return true
    },

    // 删除配置
    async deleteConfig(name) {
      const fileName = 'jsset/' + name + '.json'
      
      // 从文件系统删除方法1: 使用 fs.remove
      if (remove) {
        try {
          await remove(fileName, {
            baseDir: BaseDirectory.Exe
          })
          const index = await this.readIndex() || { default: null, configs: [] }
          index.configs = index.configs.filter(c => c.name !== name)
          if (index.default === name) index.default = null
          await this.writeIndex(index)
          console.log('Config file deleted successfully with fs.remove:', fileName)
          return true
        } catch (e) {
          console.error('fs.remove failed, trying shell command:', e)
        }
      }

      // 使用 shell 命令删除方法2: 使用系统命令
      if (window.__TAURI__?.shell?.execute) {
        try {
          const { path, os } = window.__TAURI__
          const fullPath = await path.join(path.appDir(), fileName)
          // 根据操作系统选择删除命令
          const isWindows = await os.type() === 'Windows_NT'
          const command = isWindows ? `del "${fullPath}"` : `rm "${fullPath}"`
          await window.__TAURI__.shell.execute(command)
          const index = await this.readIndex() || { default: null, configs: [] }
          index.configs = index.configs.filter(c => c.name !== name)
          if (index.default === name) index.default = null
          await this.writeIndex(index)
          console.log('Config file deleted successfully with shell command:', fileName)
          return true
        } catch (e) {
          console.error('Shell command failed:', e)
        }
      } else {
        console.log('Tauri shell API not available')
      }

      // 从 localStorage 删除（当文件删除失败时）
      const configKey = 'settings_config_' + name
      Storage.remove(configKey)

      const configList = Storage.load('settings_configs', []).filter(c => c.name !== name)
      Storage.save('settings_configs', configList)

      const index = Storage.load('settings_index', { default: null, configs: [] })
      index.configs = index.configs.filter(c => c.name !== name)
      if (index.default === name) index.default = null
      Storage.save('settings_index', index)

      return true
    },

    // 设为默认配置
    async setDefault(name) {
      const index = await this.readIndex() || { default: null, configs: [] }
      index.default = name
      await this.writeIndex(index)
      return true
    },

    // 获取默认配置
    async getDefault() {
      const index = await this.readIndex()
      return index ? index.default : null
    },

    // 加载默认配置
    async loadDefault() {
      const defaultName = await this.getDefault()
      if (!defaultName) return null

      const config = await this.readConfig(defaultName)
      if (config) return config

      const configKey = 'settings_config_' + defaultName
      return Storage.load(configKey, null)
    }
  }

  // 自动初始化
  console.log('FileSystem module loaded')

})()