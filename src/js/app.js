/**
 * 测试软件平台 - 主应用
 */
(function() {
  'use strict'

  // 控件注册表
  const ControlRegistry = {
    map: new Map(),
    register(ctrl) {
      if (!ctrl.type || !ctrl.name) return false
      this.map.set(ctrl.type, ctrl)
      return true
    },
    get(type) { return this.map.get(type) },
    getAll() { return Array.from(this.map.values()) }
  }

  // 二级菜单图标配置
  const menuItemIcons = {
    '页面管理': '📄',
    '添加控件': '➕',
    '导入控件': '📥',
    '数据查看': '📡',
    '配置管理': '⚙️',
    '窗口管理': '🪟'
  }

  // 默认菜单配置
  const defaultMenuConfig = [
    { id: 'page', name: '页面管理', icon: '📋', items: ['页面管理'] },
    { id: 'control', name: '控件管理', icon: '📦', items: ['添加控件', '导入控件'] },
    { id: 'labview', name: 'LabVIEW', icon: '📡', items: ['数据查看'] },
    { id: 'window', name: '窗口', icon: '🪟', items: ['窗口管理'] },
    { id: 'system', name: '系统', icon: '⚙️', items: ['配置管理'] }
  ]

  // 窗口管理器 - 使用Tauri Event事件系统
  const WindowManager = {
    windows: new Map(),
    windowCounter: 0,

    // 检查是否在Tauri环境中
    isTauri() {
      try {
        return !!(window.__TAURI__?.webviewWindow?.WebviewWindow)
      } catch(e) {
        return false
      }
    },

    // 获取Tauri API
    getTauriAPI() {
      try {
        if (window.__TAURI__?.webviewWindow?.WebviewWindow) {
          return {
            WebviewWindow: window.__TAURI__.webviewWindow.WebviewWindow,
            emit: window.__TAURI__.event?.emit || null,
            listen: window.__TAURI__.event?.listen || null
          }
        }
      } catch(e) {
        console.warn('获取Tauri API失败:', e)
      }
      return { WebviewWindow: null, emit: null, listen: null }
    },

    // 降级方案：使用原生window.open在外部浏览器打开
    openWindowFallback(config) {
      const url = config.url || 'index.html'
      const width = config.width || 800
      const height = config.height || 600
      const title = config.title || '新窗口'

      // 在外部浏览器中打开
      const newWindow = window.open(url, '_blank', 
        `width=${width},height=${height},location=yes,menubar=yes,toolbar=yes`)

      if (newWindow) {
        console.log('已通过外部浏览器打开:', url)
        return 'browser_window_' + Date.now()
      } else {
        alert('无法打开新窗口，请检查浏览器弹出窗口设置')
        return null
      }
    },

    // 打开新窗口（官方示例写法）
    async openWindow(config) {
      const api = this.getTauriAPI()
      const WebviewWindow = api.WebviewWindow

      // 如果Tauri API不可用，使用降级方案
      if (!WebviewWindow) {
        console.warn('Tauri WebviewWindow API不可用，使用降级方案')
        return this.openWindowFallback(config)
      }

      const label = 'window_' + (++this.windowCounter) + '_' + Date.now()
      const url = config.url || 'index.html'
      const title = config.title || '新窗口'
      const width = config.width || 800
      const height = config.height || 600
      const icon = config.icon || null  // 可选：图标路径

      // 使用官方示例写法
      const webview = new WebviewWindow(label, {
        url: url,
        title: title,
        width: width,
        height: height,
        center: true,
        resizable: true,
        focus: true,
        alwaysOnTop: false,
        transparent: false,
        visible: true
      })

      // 监听创建成功（官方示例）
      webview.once('tauri://created', async () => {
        console.log('窗口创建成功:', label)
        
        // 如果指定了图标，设置窗口图标
        if (icon && webview.setIcon) {
          try {
            await webview.setIcon(icon)
            console.log('窗口图标设置成功:', icon)
          } catch (e) {
            console.warn('设置窗口图标失败:', e)
          }
        }
        
        // 存储窗口引用
        this.windows.set(label, {
          webview: webview,
          config: config,
          label: label,
          createdAt: Date.now()
        })
      })

      // 监听创建失败（官方示例）
      webview.once('tauri://error', (e) => {
        console.error('窗口创建失败:', e)
        alert('创建窗口失败: ' + (e.message || '未知错误'))
      })

      // 监听窗口关闭
      webview.once('tauri://destroyed', () => {
        this.windows.delete(label)
        console.log(`窗口 ${label} 已关闭`)
      })

      console.log(`窗口 ${label} 已创建: ${title}`)
      return label
    },

    // 发送消息到所有窗口
    async broadcast(eventName, data) {
      const api = this.getTauriAPI()
      if (api.emit) {
        try {
          await api.emit(eventName, data)
          console.log(`广播消息 ${eventName}:`, data)
        } catch (e) {
          console.error('广播消息失败:', e)
        }
      }
    },

    // 监听消息
    async listen(eventName, callback) {
      const api = this.getTauriAPI()
      if (api.listen) {
        const unlisten = await api.listen(eventName, (event) => {
          callback(event.payload)
        })
        return unlisten
      }
      return () => {}
    },

    // 获取所有窗口列表
    getWindowList() {
      const list = []
      this.windows.forEach((win, label) => {
        list.push({
          label: label,
          title: win.config.title || '未命名',
          url: win.config.url || '',
          createdAt: win.createdAt
        })
      })
      return list
    },

    // 关闭指定窗口
    async closeWindow(label) {
      const win = this.windows.get(label)
      if (win && win.webview) {
        try {
          await win.webview.close()
          this.windows.delete(label)
          return true
        } catch (e) {
          console.error('关闭窗口失败:', e)
          return false
        }
      }
      return false
    },

    // 关闭所有窗口
    async closeAll() {
      const labels = Array.from(this.windows.keys())
      for (const label of labels) {
        await this.closeWindow(label)
      }
    }
  }

  // 主应用类
  class App {
    constructor() {
      this.mode = 'front'  // 默认显示前面板
      this.controls = ControlRegistry
      this.pages = []
      this.currentPageId = null
      this.menuConfig = defaultMenuConfig
      this.currentMenu = null
      this.dataRefreshInterval = null
      this.selectedConfigName = null  // 当前选中的配置
      this.windowManager = WindowManager  // 窗口管理器
    }

    async init() {
      // 继续加载本地配置（localStorage）
      this.loadConfig()

      // 初始化FileSystem并直接从jsset文件夹读取配置
      if (window.FileSystem) {
        await window.FileSystem.init()

        // 尝试从jsset文件夹加载默认配置
        const defaultConfig = await FileSystem.loadDefault()
        if (defaultConfig) {
          const defaultName = await FileSystem.getDefault()
          console.log('Auto loading default config from jsset:', defaultName)
          this.pages = defaultConfig.pages || []
          this.currentPageId = defaultConfig.currentPageId || (this.pages[0] ? this.pages[0].id : null)
          if (this.pages.length > 0 && !this.currentPageId) {
            this.currentPageId = this.pages[0].id
          }
        }
      }

      // 确保当前页面是第一个
      if (this.pages.length > 0 && !this.currentPageId) {
        this.currentPageId = this.pages[0].id
      }
      console.log('Before initControls, Controls:', window.Controls)
      this.initControls()
      console.log('After initControls, controls:', this.controls.getAll())
      this.bindEvents()
      this.renderMenu()
      this.renderPageTabs()
      // 设置后面板默认显示添加控件
      this.currentMenu = '添加控件'
      // 根据模式更新UI
      this.updatePanelUI()
      DeviceManager.connect()

      // 监听设备数据事件，实现实时更新
      if (window.EventBus) {
        EventBus.on('device:data', (data) => {
          // 更新数据查看面板
          if (this.currentMenu === '数据查看') {
            this.updateLabviewDataPanel()
          }
          // 更新页面上的控件显示
          if (data && data.channel) {
            this.updateControlFromDevice(data.channel, data.value)
          }
        })
      }

      // 页面退出时发送exit消息
      window.addEventListener('beforeunload', () => {
        DeviceManager.send({ type: 'exit' })
      })
    }

    // 更新面板UI - 根据当前模式显示/隐藏元素
    async updatePanelUI() {
      const sidebar = document.getElementById('sidebar')
      const mainArea = document.querySelector('.main-area')
      const dataBtn = document.getElementById('headerDataBtn')

      if (this.mode === 'front') {
        // 前面板 - 隐藏侧边栏，显示数据按钮
        if (sidebar) sidebar.style.display = 'none'
        if (mainArea) mainArea.style.marginLeft = '0'
        if (dataBtn) dataBtn.style.display = 'block'
        this.startDataRefresh()
      } else {
        // 后面板 - 显示侧边栏，隐藏数据按钮
        if (sidebar) sidebar.style.display = ''
        if (mainArea) mainArea.style.marginLeft = ''
        if (dataBtn) dataBtn.style.display = 'none'
        this.stopDataRefresh()
      }

      this.renderMenu()
      await this.renderContent()
    }

    // 启动数据刷新
    startDataRefresh() {
      if (this.frontDataInterval) return
      this.frontDataInterval = setInterval(() => {
        this.refreshDataDialog()
      }, 500)

      const dataBtn = document.getElementById('headerDataBtn')
      if (dataBtn && !dataBtn.onclick) {
        dataBtn.onclick = () => this.showFrontPanelDataDialog()
      }
    }

    // 停止数据刷新
    stopDataRefresh() {
      if (this.frontDataInterval) {
        clearInterval(this.frontDataInterval)
        this.frontDataInterval = null
      }
      this.dataDialog = null
    }

    // 刷新数据对话框
    refreshDataDialog() {
      if (!this.dataDialog) return

      const content = this.dataDialog.querySelector('.data-dialog-content')
      if (!content) return

      const channelData = DeviceManager.channelData
      const channels = Object.keys(channelData)

      if (channels.length > 0) {
        content.innerHTML = channels.map(ch => `
          <div style="padding:12px;margin-bottom:8px;background:#f8fafc;border-radius:8px;display:flex;justify-content:space-between;">
            <span style="color:#5a6a7a;">${ch}</span>
            <span style="color:#2c8fbb;font-weight:600;">${channelData[ch]}</span>
          </div>
        `).join('')
      }
    }

    // 从设备更新控件显示
    updateControlFromDevice(channel, value) {
      const page = this.getCurrentPage()
      if (!page || !page.controls) return

      page.controls.forEach(ctrl => {
        if (ctrl.config && ctrl.config.channel === channel) {
          const def = this.controls.get(ctrl.controlType)
          if (def && def.updateFromDevice) {
            const content = document.querySelector(`[data-control-id="${ctrl.id}"] .content`)
            if (content) {
              try {
                def.updateFromDevice(content, value, ctrl.config)
              } catch (e) {
                console.error('Update control error:', e)
              }
            }
          }
        }
      })
    }

    // 加载配置
    loadConfig() {
      const config = Storage.load('fullConfig', null)
      if (config) {
        this.pages = config.pages || []
        this.currentPageId = config.currentPageId || (this.pages[0] ? this.pages[0].id : null)
        // 强制使用新版菜单配置
        this.menuConfig = defaultMenuConfig
      }
      if (!this.pages.length) {
        this.pages = [{ id: 'page_default', name: '页面 1', controls: [] }]
        this.currentPageId = 'page_default'
      }
      this.saveConfig()
    }

    // 保存配置
    saveConfig() {
      Storage.save('fullConfig', {
        version: '1.0',
        menuConfig: this.menuConfig,
        pages: this.pages,
        currentPageId: this.currentPageId
      })
    }

    // 初始化控件
    initControls() {
      console.log('Initializing controls, window.Controls:', window.Controls)
      let controlsToRegister = window.Controls || []

      // 如果没有加载到控件，手动注册（兼容性问题）
      if (controlsToRegister.length === 0) {
        console.log('No controls loaded, using fallback definitions')
        controlsToRegister = this.getDefaultControls()
      }

      console.log('Number of controls:', controlsToRegister.length)
      controlsToRegister.forEach(ctrl => this.controls.register(ctrl))
      console.log('Registered controls:', this.controls.getAll().length)
    }

    // 默认控件定义（备用）
    getDefaultControls() {
      return [
        {
          type: 'gauge', name: '仪表盘', isDisplay: true,
          render(c, ccfg) { c.innerHTML = '<div>仪表: ' + (ccfg.value || 0) + '</div>' },
          getConfigForm() { return document.createElement('div') }
        },
        {
          type: 'numeric', name: '数值显示', isDisplay: true,
          render(c, ccfg) { c.innerHTML = '<div>' + (ccfg.value || 0) + '</div>' },
          getConfigForm() { return document.createElement('div') }
        },
        {
          type: 'indicator', name: '指示灯', isDisplay: true,
          render(c, ccfg) { c.innerHTML = '<div>指示灯: ' + (ccfg.value ? '亮' : '灭') + '</div>' },
          getConfigForm() { return document.createElement('div') }
        },
        {
          type: 'progress', name: '进度条', isDisplay: true,
          render(c, ccfg) { c.innerHTML = '<div>进度: ' + (ccfg.value || 0) + '%</div>' },
          getConfigForm() { return document.createElement('div') }
        },
        {
          type: 'slider', name: '滑块', isInput: true,
          render(c, ccfg) { c.innerHTML = '<input type="range">' },
          getConfigForm() { return document.createElement('div') }
        },
        {
          type: 'button', name: '按钮', isInput: true,
          render(c, ccfg) { c.innerHTML = '<button>按钮</button>' },
          getConfigForm() { return document.createElement('div') }
        },
        {
          type: 'switch', name: '开关', isInput: true,
          render(c, ccfg) { c.innerHTML = '<div>开关</div>' },
          getConfigForm() { return document.createElement('div') }
        },
        {
          type: 'input', name: '输入框', isInput: true,
          render(c, ccfg) { c.innerHTML = '<input type="text">' },
          getConfigForm() { return document.createElement('div') }
        }
      ]
    }

    // 获取当前页面
    getCurrentPage() {
      return this.pages.find(p => p.id === this.currentPageId)
    }

    // 渲染菜单
    renderMenu() {
      const container = document.getElementById('menuList')
      if (!container) return

      container.innerHTML = this.menuConfig.map(group => `
        <div class="menu-group" data-id="${group.id}">
          <div class="menu-header">
            <div class="menu-header-left">
              <span class="menu-icon">${group.icon}</span>
              <span>${group.name}</span>
            </div>
            <span class="menu-arrow">▶</span>
          </div>
          <div class="menu-items">
            ${group.items.map(item => `
              <div class="menu-item" data-action="${group.id}:${item}">
                <span class="menu-item-icon">${menuItemIcons[item] || '•'}</span>
                <span class="menu-item-text">${item}</span>
              </div>
            `).join('')}
          </div>
        </div>
      `).join('')

      // 菜单点击事件
      container.querySelectorAll('.menu-header').forEach(header => {
        header.addEventListener('click', () => {
          header.parentElement.classList.toggle('open')
        })
      })

      container.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', () => {
          const action = item.dataset.action
          this.handleMenuAction(action)
        })
      })
    }

    // 处理菜单点击
    async handleMenuAction(action) {
      const [group, actionName] = action.split(':')

      // 清除数据查看定时器
      if (this.dataRefreshInterval && actionName !== '数据查看') {
        clearInterval(this.dataRefreshInterval)
        this.dataRefreshInterval = null
      }

      // 一级菜单高亮
      document.querySelectorAll('.menu-group').forEach(g => {
        g.classList.toggle('active', g.dataset.id === group)
        if (g.dataset.id === group) g.classList.add('open')
      })

      // 二级菜单高亮
      document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.toggle('active', item.dataset.action === action)
      })

      this.currentMenu = actionName
      await this.renderContent()
    }

    // 渲染内容区
    async renderContent() {
      const canvas = document.getElementById('canvasArea')
      if (!canvas) return

      // 前面板模式 - 只显示控件
      if (this.mode === 'front') {
        canvas.innerHTML = this.renderFrontPanel()
        this.bindFrontPanelEvents()
        return
      }

      let html = ''

      switch (this.currentMenu) {
        case '页面管理':
          html = this.renderPageManage()
          break
        case '添加控件':
          html = this.renderAddControl()
          break
        case '导入控件':
          html = this.renderImportControl()
          break
        case '数据查看':
          html = this.renderLabviewData()
          break
        case '窗口管理':
          html = this.renderWindowManage()
          break
        case '配置管理':
          html = await this.renderConfigManage()
          break
        default:
          html = this.renderAddControl()
      }

      canvas.innerHTML = html
      this.bindContentEvents()

      // 数据查看：立即更新显示
      if (this.currentMenu === '数据查看') {
        this.updateLabviewDataPanel()
      }
    }

    // 渲染页面管理（合并新建和列表）
    renderPageManage() {
      return `
        <div class="panel-split">
          <div class="canvas-split-left">
            <div class="panel-title">📋 页面列表</div>
            <div class="page-list" id="pageList">
              ${this.pages.map(p => `
                <div class="control-list-item ${p.id === this.currentPageId ? 'active' : ''}" data-id="${p.id}">
                  <div class="name">${p.name}</div>
                  <div class="type">${p.controls.length} 个控件</div>
                  <div style="margin-top:8px;">
                    <button style="padding:4px 10px;font-size:12px;background:#2c8fbb;color:white;border:none;border-radius:4px;cursor:pointer;margin-right:6px;" onclick="App.renamePage('${p.id}')">重命名</button>
                    ${this.pages.length > 1 ? `<button style="padding:4px 10px;font-size:12px;background:#dc3545;color:white;border:none;border-radius:4px;cursor:pointer;" onclick="App.deletePage('${p.id}')">删除</button>` : ''}
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
          <div class="canvas-split-right">
            <div class="panel-title">➕ 新建页面</div>
            <div class="form-field">
              <label>页面名称</label>
              <input id="newPageName" placeholder="请输入页面名称">
            </div>
            <button id="btnCreatePage" class="btn-primary" style="width:100%;margin-top:10px;">创建页面</button>
          </div>
        </div>
      `
    }

    // 渲染添加控件
    renderAddControl() {
      const ctrls = this.controls.getAll()
      console.log('renderAddControl - ctrls:', ctrls)

      return `
        <div class="panel-split">
          <div class="canvas-split-left">
            <div class="panel-title">🎨 当前页面控件（点击修改）</div>
            <div class="controls-grid" id="pageControlsGrid">
              ${this.renderPageControls(true)}
            </div>
          </div>
          <div class="canvas-split-right">
            <div class="panel-title">📦 添加控件</div>
            <div class="form-field">
              <label>选择控件类型</label>
              <select id="controlTypeSelect" style="width:100%;padding:10px;border:1px solid #dce5ec;border-radius:6px;font-size:14px;">
                ${ctrls.length > 0 ? ctrls.map(c => `<option value="${c.type}">${c.name}</option>`).join('') : '<option>暂无控件</option>'}
              </select>
            </div>
            <div id="controlConfigArea"></div>
            <button id="btnAddControl" class="btn-primary" style="width:100%;margin-top:16px;padding:14px;background:#2c8fbb;color:white;border:none;border-radius:8px;cursor:pointer;font-size:15px;font-weight:500;">➕ 添加到当前页面</button>
          </div>
        </div>
      `
    }

    // 渲染前面板 - 只显示控件，不显示编辑功能
    renderFrontPanel() {
      const page = this.getCurrentPage()
      if (!page || !page.controls.length) {
        return '<div style="text-align:center;padding:50px;color:#94a3b8;">当前页面无控件</div>'
      }

      return `<div class="controls-grid" style="display:flex;flex-wrap:wrap;gap:12px;padding:20px;">
        ${page.controls.map(ctrl => {
          const def = this.controls.get(ctrl.controlType)
          if (!def) return ''
          return `<div class="control-item" data-control-id="${ctrl.id}" style="width:calc(25% - 9px);min-height:140px;background:white;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.05);border:1px solid #e2edf2;overflow:hidden;">
            <div class="content" style="padding:16px;min-height:100px;display:flex;align-items:center;justify-content:center;"></div>
          </div>`
        }).join('')}
      </div>`
    }

    // 绑定前面板事件 - 渲染控件
    bindFrontPanelEvents() {
      const page = this.getCurrentPage()
      if (!page || !page.controls) return

      // 渲染控件
      page.controls.forEach(ctrl => {
        const def = this.controls.get(ctrl.controlType)
        if (!def) return

        const item = document.querySelector(`[data-control-id="${ctrl.id}"]`)
        if (!item) return

        const content = item.querySelector('.content')
        if (content && def.render) {
          try {
            def.render(content, ctrl.config)
          } catch (e) {
            content.innerHTML = '<div style="color:red;">渲染错误</div>'
          }
        }
      })
    }

    // 显示前面板通道数据对话框
    showFrontPanelDataDialog() {
      const channelData = DeviceManager.channelData
      const channels = Object.keys(channelData)

      // 关闭已有对话框
      if (this.dataDialog) {
        this.dataDialog.remove()
      }

      const dialog = document.createElement('div')
      dialog.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:1000;'

      const content = channels.length > 0
        ? channels.map(ch => `<div style="padding:12px;margin-bottom:8px;background:white;border-radius:8px;display:flex;justify-content:space-between;">
          <span style="color:#5a6a7a;">${ch}</span>
          <span style="color:#2c8fbb;font-weight:600;">${channelData[ch]}</span>
        </div>`).join('')
        : '<div style="text-align:center;color:#94a3b8;padding:20px;">暂无通道数据<br><span style="font-size:12px;">等待LabVIEW发送数据...</span></div>'

      const closeBtn = document.createElement('span')
      closeBtn.style.cssText = 'cursor:pointer;font-size:20px;color:#94a3b8;'
      closeBtn.textContent = '×'
      closeBtn.onclick = () => {
        dialog.remove()
        this.dataDialog = null
        this.renderContent()
      }

      const contentDiv = document.createElement('div')
      contentDiv.className = 'data-dialog-content'
      contentDiv.innerHTML = content

      const innerDiv = document.createElement('div')
      innerDiv.style.cssText = 'background:white;padding:20px;border-radius:12px;min-width:300px;max-width:400px;max-height:80vh;overflow-y:auto;'

      const titleDiv = document.createElement('div')
      titleDiv.style.cssText = 'font-size:16px;font-weight:600;margin-bottom:16px;display:flex;justify-content:space-between;align-items:center;'
      titleDiv.innerHTML = '<span>📊 通道数据</span>'
      titleDiv.appendChild(closeBtn)

      innerDiv.appendChild(titleDiv)
      innerDiv.appendChild(contentDiv)

      dialog.appendChild(innerDiv)
      document.body.appendChild(dialog)
      this.dataDialog = dialog
    }

    // 选择控件进行编辑
    selectControlForEdit(ctrlId) {
      const page = this.getCurrentPage()
      if (!page) return
      const ctrl = page.controls.find(c => c.id === ctrlId)
      if (!ctrl) return

      const def = this.controls.get(ctrl.controlType)
      if (!def) return

      // 加载配置表单
      const area = document.getElementById('controlConfigArea')
      if (!area) return

      // 切换到该控件类型
      const select = document.getElementById('controlTypeSelect')
      if (select) {
        select.value = ctrl.controlType
      }

      // 加载配置
      area.innerHTML = ''
      const form = def.getConfigForm(ctrl.config, (newConfig) => {
        console.log('Updated config:', newConfig)
        ctrl.config = { ...ctrl.config, ...newConfig }
        this.saveConfig()
        this.renderContent()
      })
      area.appendChild(form)

      // 显示编辑按钮
      let btnArea = document.getElementById('editControlBtns')
      if (!btnArea) {
        btnArea = document.createElement('div')
        btnArea.id = 'editControlBtns'
        btnArea.style.marginTop = '10px'
        area.parentNode.appendChild(btnArea)
      }
      btnArea.innerHTML = `
        <button id="btnUpdateControl" style="flex:1;padding:12px;background:#22c55e;color:white;border:none;border-radius:6px;cursor:pointer;font-size:14px;">✅ 更新控件</button>
        <button id="btnDeleteControl" style="flex:1;padding:12px;background:#dc3545;color:white;border:none;border-radius:6px;cursor:pointer;font-size:14px;margin-left:8px;">🗑️ 删除</button>
      `
      btnArea.style.display = 'flex'

      document.getElementById('btnUpdateControl').onclick = () => {
        const inputs = document.querySelectorAll('#controlConfigArea input:not([id="saveConfigBtn"]), #controlConfigArea select')
        const newConfig = { ...ctrl.config }
        inputs.forEach(input => {
          const key = input.id.replace(/^[a-zA-Z]+/, '').toLowerCase()
          if (key) newConfig[key] = input.type === 'number' ? parseFloat(input.value) : input.value
        })
        ctrl.config = newConfig
        this.saveConfig()
        this.renderContent()
      }

      document.getElementById('btnDeleteControl').onclick = () => {
        this.removeControl(ctrlId)
      }
    }

    // 获取通道显示数据
    getChannelDisplayData() {
      const channels = Object.keys(DeviceManager.channelData)
      if (!channels.length) return ''
      return channels.map(ch => `
        <div style="padding:8px 12px;margin-bottom:8px;background:#f8fafc;border-radius:6px;">
          <div style="font-weight:500;color:#2c3e50;">${ch}</div>
          <div style="font-size:14px;color:#2c8fbb;">${DeviceManager.channelData[ch]}</div>
        </div>
      `).join('')
    }

    // 渲染页面控件
    renderPageControls(enableClick) {
      const page = this.getCurrentPage()
      if (!page || !page.controls.length) {
        return '<div class="empty-tip">暂无控件，点击右侧添加</div>'
      }

      return page.controls.map(ctrl => {
        const def = this.controls.get(ctrl.controlType)
        if (!def) return ''

        const clickAttr = enableClick ? `onclick="App.selectControlForEdit('${ctrl.id}')" style="cursor:pointer;"` : ''
        return `<div class="control-item" data-control-id="${ctrl.id}" ${clickAttr}><div class="content"></div></div>`
      }).join('')
    }

    // 渲染导入控件
    renderImportControl() {
      const ctrls = this.controls.getAll()
      return `
        <div class="panel-split-three">
          <div class="split-section">
            <div class="panel-title">📋 已有控件</div>
            <div class="control-list" id="controlList">
              ${ctrls.map(c => `
                <div class="control-list-item" data-type="${c.type}">
                  <div class="name">${c.name}</div>
                  <div class="type">${c.isInput ? '输入控件' : c.isDisplay ? '显示控件' : '未知'}</div>
                </div>
              `).join('')}
            </div>
          </div>
          <div class="split-section">
            <div class="panel-title">📝 控件属性</div>
            <div id="controlPropertyPanel">
              <div class="empty-tip">点击左侧控件查看属性</div>
            </div>
          </div>
          <div class="split-section">
            <div class="panel-title">📂 导入控件</div>
            <p style="font-size:13px;color:#5a6a7a;margin-bottom:16px;">导入 .js 控件文件</p>
            <button id="btnImportControl" class="btn-primary" style="width:100%;">选择文件导入</button>
            <div id="importStatus" class="info-text"></div>
          </div>
        </div>
      `
    }

    // 渲染配置管理
    async renderConfigManage() {
      let configs = []
      let defaultName = null

      // 使用统一的 FileSystem 模块读取
      if (window.FileSystem) {
        configs = await FileSystem.loadConfigList() || []
        defaultName = await FileSystem.getDefault()
      }
      
      console.log('renderConfigManage - configs:', configs)

      const currentInfo = this.getCurrentConfigInfo()

      return `
        <div class="panel-split-three">
          <div class="split-section">
            <div class="panel-title">📂 已保存配置</div>
            <div style="margin-bottom:12px;font-size:12px;color:#666;">
              配置文件保存在应用程序目录下的 jsset 文件夹
            </div>
            <div class="config-list" id="configList">
              ${configs.length ? configs.map(c => `
                <div class="control-list-item ${this.selectedConfigName === c.name ? 'active' : ''}" data-name="${c.name}" onclick="App.onSelectConfig('${c.name}')">
                  <div class="name">${c.name}${defaultName === c.name ? ' ⭐' : ''}</div>
                  <div class="type">${c.desc || '无描述'}</div>
                  <div style="margin-top:8px;display:flex;gap:4px;">
                    <button style="padding:4px 8px;background:#22c55e;color:white;border:none;border-radius:4px;font-size:11px;flex:1;" onclick="event.stopPropagation(); App.setDefaultConfig('${c.name}')">默认</button>
                    <button style="padding:4px 8px;background:#dc3545;color:white;border:none;border-radius:4px;font-size:11px;flex:1;" onclick="event.stopPropagation(); App.deleteConfigFile('${c.name}')">删除</button>
                  </div>
                </div>
              `).join('') : '<div class="empty-tip">暂无保存的配置</div>'}
            </div>
          </div>
          <div class="split-section">
            <div class="panel-title">📋 配置详情</div>
            <div id="configDetailPanel">
              <div class="empty-tip">点击左侧配置查看详情</div>
            </div>
          </div>
          <div class="split-section">
            <div class="panel-title">💾 当前配置</div>
            <div style="margin-bottom:16px;">
              <div style="font-size:13px;color:#5a6a7a;margin-bottom:8px;">当前配置信息：</div>
              <div style="font-size:12px;color:#2c3e50;">
                <div>• 页面数：${currentInfo.pages}</div>
                <div>• 控件数：${currentInfo.controls}</div>
              </div>
            </div>
            <div class="form-field">
              <label>配置名称</label>
              <input id="exportConfigName" placeholder="请输入配置名称">
            </div>
            <div class="form-field">
              <label>配置描述</label>
              <input id="exportConfigDesc" placeholder="请输入配置描述">
            </div>
            <div style="display:flex;gap:8px;">
              <button id="btnExportConfig" class="btn-primary" style="flex:1;">💾 保存配置</button>
              <button id="btnSaveAsDefault" class="btn-primary" style="flex:1;background:#22c55e;">⭐ 设为默认</button>
            </div>
            <div style="border-top:1px solid #eef2f8;padding-top:16px;margin-top:16px;">
              <div class="panel-title" style="margin-bottom:12px;">📥 导入配置</div>
              <button id="btnImportConfig" class="btn-primary" style="width:100%;background:#5a6a7a;">选择文件导入</button>
              <div id="importConfigStatus" class="info-text"></div>
              <div id="pendingConfigPanel" style="display:none;margin-top:12px;padding:12px;background:#f0f7fc;border-radius:6px;">
                <div style="font-size:13px;color:#2c3e50;margin-bottom:8px;">待应用配置：<span id="pendingConfigName"></span></div>
                <button id="btnApplyConfig" class="btn-primary" style="width:100%;margin-bottom:8px;">应用此配置</button>
                <button id="btnDeletePendingConfig" class="btn-danger" style="width:100%;">删除</button>
              </div>
            </div>
          </div>
        </div>
      `
    }

    // 渲染窗口管理
    renderWindowManage() {
      const isTauri = this.windowManager.isTauri()
      return `
        <div class="panel-split-three">
          <div class="split-section">
            <div class="panel-title">🪟 打开新窗口</div>
            <div style="padding:16px;">
              <div class="form-field">
                <label>窗口标题</label>
                <input id="windowTitle" placeholder="请输入窗口标题" value="新窗口">
              </div>
              <div class="form-field">
                <label>窗口URL</label>
                <input id="windowUrl" placeholder="如: index.html 或 http://example.com" value="index.html">
              </div>
              <div class="form-field">
                <label>图标路径（可选）</label>
                <input id="windowIcon" placeholder="如: /tauri/icon.png 或图片文件路径" value="">
              </div>
              <div style="display:flex;gap:8px;">
                <div class="form-field" style="flex:1;">
                  <label>宽度</label>
                  <input type="number" id="windowWidth" value="800" min="400" max="1920">
                </div>
                <div class="form-field" style="flex:1;">
                  <label>高度</label>
                  <input type="number" id="windowHeight" value="600" min="300" max="1080">
                </div>
              </div>
              <button id="btnOpenWindow" class="btn-primary" style="width:100%;margin-top:16px;padding:14px;background:#22c55e;color:white;border:none;border-radius:8px;cursor:pointer;font-size:15px;font-weight:500;">
                🚀 打开新窗口
              </button>
              <div id="windowStatus" style="margin-top:12px;font-size:12px;color:#5a6a7a;"></div>
            </div>
          </div>
          <div class="split-section">
            <div class="panel-title">📡 窗口通信测试</div>
            <div style="padding:16px;">
              <div class="form-field">
                <label>发送消息事件名</label>
                <input id="eventName" placeholder="如: test-event" value="test-event">
              </div>
              <div class="form-field">
                <label>消息内容 (JSON)</label>
                <textarea id="eventData" style="width:100%;height:80px;padding:10px;border:1px solid #dce5ec;border-radius:6px;font-size:14px;resize:vertical;" placeholder='{"message": "hello"}'>{"message": "hello"}</textarea>
              </div>
              <button id="btnBroadcast" class="btn-primary" style="width:100%;margin-top:8px;padding:10px;background:#2c8fbb;color:white;border:none;border-radius:6px;cursor:pointer;">
                📢 广播到所有窗口
              </button>
              <div style="margin-top:16px;">
                <div style="font-size:13px;font-weight:500;color:#2c3e50;margin-bottom:8px;">接收的消息：</div>
                <div id="receivedMessages" style="height:150px;overflow-y:auto;background:#f8fafc;border:1px solid #e2edf2;border-radius:6px;padding:8px;font-size:12px;font-family:monospace;">
                  <div class="empty-tip" style="font-size:11px;">暂无接收消息</div>
                </div>
              </div>
            </div>
          </div>
          <div class="split-section">
            <div class="panel-title">📋 已打开窗口</div>
            <div id="windowListPanel" style="padding:12px;height:400px;overflow-y:auto;">
              <div class="empty-tip">暂无打开的窗口</div>
            </div>
          </div>
        </div>
        <div style="margin-top:12px;padding:12px;background:#f0f7fc;border-radius:8px;font-size:12px;color:#5a6a7a;">
          <div style="font-weight:500;margin-bottom:4px;">💡 使用说明：</div>
          <div>• 窗口URL支持本地文件（如 index.html）或网络地址（如 https://example.com）</div>
          <div>• 打开的窗口与主窗口之间可以通过 Tauri Event 事件系统通信</div>
          <div>• 所有打开的窗口共享同一个应用的数据存储空间</div>
          <div style="margin-top:8px;color:${isTauri ? '#22c55e' : '#dc3545'}">
            ${isTauri ? '✅ 当前运行环境支持窗口功能' : '⚠️ 当前不在Tauri环境中，无法打开新窗口'}
          </div>
        </div>
      `
    }

    // 设为默认配置
    async setDefaultConfig(name) {
      if (window.FileSystem) {
        // 先确保文件夹已选择
        await FileSystem.ensureFolder()
        await FileSystem.setDefault(name)
        this.showSuccessDialog('设置成功', `"${name}"已设为默认配置`)
        await this.renderContent()
      } else {
        this.showSuccessDialog('提示', '文件系统中不可用')
      }
    }

    // 从文件系统删除配置
    async deleteConfigFile(name) {
      this.showConfirmDialog('确认删除', `确定要删除配置"${name}"吗？`, async () => {
        if (window.FileSystem) {
          await FileSystem.deleteConfig(name)
          this.showSuccessDialog('删除成功', '配置已删除')
          await this.renderContent()
        }
      })
    }

    // 渲染LabVIEW数据查看
    renderLabviewData() {
      return `
        <div class="panel-split-three">
          <div class="split-section">
            <div class="panel-title">📝 原始数据</div>
            <div class="data-panel" id="rawDataPanel" style="height:500px;overflow-y:auto;background:#f8fafc;border:1px solid #e2edf2;border-radius:8px;padding:12px;">
              <div class="empty-tip">暂无数据接收</div>
            </div>
          </div>
          <div class="split-section">
            <div class="panel-title">📊 通道数据</div>
            <div class="data-panel" id="channelDataPanel" style="height:500px;overflow-y:auto;background:#f8fafc;border:1px solid #e2edf2;border-radius:8px;padding:12px;">
              <div class="empty-tip">暂无通道数据</div>
            </div>
          </div>
          <div class="split-section">
            <div class="panel-title">🔄 实时数据</div>
            <div style="margin-bottom:12px;">
              <button id="btnRefreshData" class="btn-primary" style="width:100%;margin-bottom:8px;">刷新数据</button>
              <button id="btnClearData" class="btn-danger" style="width:100%;">清空数据</button>
            </div>
            <div style="font-size:12px;color:#5a6a7a;">
              <div>接收消息数：<span id="msgCount">0</span></div>
              <div style="margin-top:8px;">连接状态：<span id="connStatus" style="color:#dc3545;">未连接</span></div>
            </div>
          </div>
        </div>
      `
    }

    // 更新LabVIEW数据面板
    updateLabviewDataPanel() {
      const rawPanel = document.getElementById('rawDataPanel')
      const channelPanel = document.getElementById('channelDataPanel')
      const msgCountEl = document.getElementById('msgCount')
      const connStatusEl = document.getElementById('connStatus')
      
      if (!rawPanel || !channelPanel) return
      
      // 更新原始数据 - 显示收到的JSON字符串列表
      const rawMessages = DeviceManager.rawMessages
      if (rawMessages && rawMessages.length > 0) {
        // 显示所有原始消息（最新的10条）
        const recentMessages = rawMessages.slice(-10).reverse()
        rawPanel.innerHTML = recentMessages.map((msg, idx) => `
          <div style="padding:10px 12px;margin-bottom:8px;background:white;border:1px solid #e2edf2;border-radius:6px;font-family:monospace;font-size:12px;word-break:break-all;">
            <div style="font-size:10px;color:#94a3b8;margin-bottom:4px;">#${rawMessages.length - idx}</div>
            <div style="color:#1e293b;">${msg}</div>
          </div>
        `).join('')
        rawPanel.scrollTop = 0
      } else {
        rawPanel.innerHTML = '<div class="empty-tip">暂无数据接收</div>'
      }
      
      // 更新通道数据
      const channelData = DeviceManager.channelData
      const channels = Object.keys(channelData)
      if (channels.length > 0) {
        channelPanel.innerHTML = channels.map(ch => `
          <div style="padding:12px;margin-bottom:8px;background:white;border:1px solid #e2edf2;border-radius:8px;">
            <div style="font-size:12px;color:#5a6a7a;margin-bottom:4px;">通道: ${ch}</div>
            <div style="font-size:20px;font-weight:600;color:#2c8fbb;">${DataParser.formatValue(channelData[ch])}</div>
          </div>
        `).join('')
      } else {
        channelPanel.innerHTML = '<div class="empty-tip">暂无通道数据<br><br>等待LabVIEW发送数据...<br>格式: {"温度": 50}</div>'
      }
      
      // 更新计数
      if (msgCountEl) msgCountEl.textContent = rawMessages.length
      
      // 更新连接状态
      if (connStatusEl) {
        connStatusEl.textContent = DeviceManager.connected ? '已连接' : '未连接'
        connStatusEl.style.color = DeviceManager.connected ? '#22c55e' : '#dc3545'
      }
    }

    // 获取当前配置信息
    getCurrentConfigInfo() {
      const pageCount = this.pages.length
      const controlCount = this.pages.reduce((sum, p) => sum + (p.controls ? p.controls.length : 0), 0)
      return { pages: pageCount, controls: controlCount }
    }

    // 加载已保存的配置
    loadSavedConfigs() {
      return Storage.load('savedConfigs', [])
    }

    // 保存配置到localStorage
    saveConfigToStorage(name, desc, data) {
      const configs = this.loadSavedConfigs()
      const info = this.getConfigInfo(data)
      configs.push({
        name,
        desc,
        pages: info.pages,
        controls: info.controls,
        data
      })
      Storage.save('savedConfigs', configs)
    }

    // 从数据中获取配置信息
    getConfigInfo(data) {
      const pages = data.pages || []
      const pageCount = pages.length
      const controlCount = pages.reduce((sum, p) => sum + (p.controls ? p.controls.length : 0), 0)
      return { pages: pageCount, controls: controlCount }
    }

    // 应用配置
    applyConfig(data) {
      this.pages = data.pages || []
      this.currentPageId = data.currentPageId || this.pages[0]?.id
      if (!this.pages.length) {
        this.pages = [{ id: 'page_default', name: '页面 1', controls: [] }]
        this.currentPageId = 'page_default'
      }
      this.saveConfig()
      this.renderPageTabs()
      this.renderContent()
    }

    // 显示应用确认对话框
    showApplyConfirmDialog(configName, data) {
      const dialog = document.createElement('div')
      dialog.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;z-index:1000;'
      dialog.innerHTML = `
        <div style="background:white;padding:24px;border-radius:10px;min-width:320px;box-shadow:0 4px 20px rgba(0,0,0,0.15);">
          <div style="font-size:16px;font-weight:600;margin-bottom:12px;">确认应用配置</div>
          <div style="font-size:14px;color:#5a6a7a;margin-bottom:20px;">确定要应用配置"${configName}"吗？<br>当前配置将被覆盖。</div>
          <div style="text-align:right;">
            <button id="btnCancelApply" style="padding:8px 16px;margin-right:8px;border:1px solid #ddd;background:#f5f5f5;border-radius:4px;cursor:pointer;">取消</button>
            <button id="btnConfirmApply" style="padding:8px 16px;background:#2c8fbb;color:white;border:none;border-radius:4px;cursor:pointer;">确定</button>
          </div>
        </div>
      `
      document.body.appendChild(dialog)

      dialog.querySelector('#btnCancelApply').addEventListener('click', () => document.body.removeChild(dialog))
      dialog.querySelector('#btnConfirmApply').addEventListener('click', () => {
        this.applyConfig(data)
        document.body.removeChild(dialog)
        this.showSuccessDialog('应用成功', '配置已成功应用')
      })

      dialog.addEventListener('click', (e) => {
        if (e.target === dialog) document.body.removeChild(dialog)
      })
    }

    // 绑定内容区事件
    async bindContentEvents() {
      // 新建页面
      const btnCreatePage = document.getElementById('btnCreatePage')
      if (btnCreatePage) {
        btnCreatePage.addEventListener('click', async () => {
          const name = document.getElementById('newPageName').value
          if (name) {
            this.addPage(name)
            // 保持当前页面管理界面，不跳转
            await this.renderContent()
          }
        })
      }

      // 添加控件
      const btnAddControl = document.getElementById('btnAddControl')
      if (btnAddControl) {
        btnAddControl.addEventListener('click', () => {
          const type = document.getElementById('controlTypeSelect').value
          // 优先使用已保存的配置，否则从表单提取
          let config = this.savedControlConfig || {}
          if (Object.keys(config).length === 0) {
            const inputs = document.querySelectorAll('#controlConfigArea input:not([id="saveConfigBtn"]), #controlConfigArea select')
            config = {}
            inputs.forEach(input => {
              const key = input.id.replace(/^[a-zA-Z]+/, '').toLowerCase()
              if (key) config[key] = input.type === 'number' ? parseFloat(input.value) : input.value
            })
          }
          console.log('Adding control:', type, config)
          this.savedControlConfig = null  // 添加后清除保存的配置
          this.addControl(type, config)
        })

        // 控件类型切换时清除保存的配置
        const select = document.getElementById('controlTypeSelect')
        if (select) {
          select.addEventListener('change', () => {
            this.savedControlConfig = null
            const def = this.controls.get(select.value)
            const area = document.getElementById('controlConfigArea')
            if (def && def.getConfigForm) {
              area.innerHTML = ''
              const form = def.getConfigForm({}, (config) => {
                console.log('Saved config:', config)
                this.savedControlConfig = config
              })
              area.appendChild(form)
            }
          })
          select.dispatchEvent(new Event('change'))
        }
      }

      // 渲染控件
      this.renderControls()

      // 导入控件
      const btnImportControl = document.getElementById('btnImportControl')
      if (btnImportControl) {
        btnImportControl.addEventListener('click', () => this.importControlFile())
      }

      // 控件列表点击查看属性
      const controlList = document.getElementById('controlList')
      if (controlList) {
        controlList.querySelectorAll('.control-list-item').forEach(item => {
          item.addEventListener('click', () => {
            const type = item.dataset.type
            const def = this.controls.get(type)
            const panel = document.getElementById('controlPropertyPanel')
            if (!def || !panel) return

            panel.innerHTML = `
              <div style="margin-bottom:12px;">
                <div style="font-weight:600;color:#2c3e50;margin-bottom:4px;">${def.name}</div>
                <div style="font-size:12px;color:#94a3b8;">类型: ${def.type}</div>
                <div style="font-size:12px;color:#94a3b8;">类别: ${def.isInput ? '输入控件' : def.isDisplay ? '显示控件' : '未知'}</div>
              </div>
              <div style="font-size:13px;color:#5a6a7a;margin-bottom:8px;">支持的方法:</div>
              <div style="font-size:12px;color:#5a6a7a;">
                <div>• render() - 渲染控件</div>
                <div>• getConfigForm() - 获取配置表单</div>
                <div>• getContextMenuItems() - 获取右键菜单</div>
              </div>
            `
          })
        })
      }

      // 配置管理 - 导出配置
      const btnExportConfig = document.getElementById('btnExportConfig')
      if (btnExportConfig) {
        btnExportConfig.addEventListener('click', async () => {
          const name = document.getElementById('exportConfigName').value
          const desc = document.getElementById('exportConfigDesc').value
          if (!name) {
            alert('请输入配置名称')
            return
          }
          await this.exportAndSaveConfig(name, desc, false)
        })
      }

      // 配置管理 - 保存为默认配置
      const btnSaveAsDefault = document.getElementById('btnSaveAsDefault')
      if (btnSaveAsDefault) {
        btnSaveAsDefault.addEventListener('click', async () => {
          const name = document.getElementById('exportConfigName').value
          const desc = document.getElementById('exportConfigDesc').value
          if (!name) {
            alert('请输入配置名称')
            return
          }
          await this.exportAndSaveConfig(name, desc, true)
        })
      }

      // 配置管理 - 导入配置
      const btnImportConfig = document.getElementById('btnImportConfig')
      if (btnImportConfig) {
        btnImportConfig.addEventListener('click', () => this.importConfigFile())
      }

      // 配置管理 - 应用配置
      const btnApplyConfig = document.getElementById('btnApplyConfig')
      if (btnApplyConfig) {
        btnApplyConfig.addEventListener('click', () => {
          const pendingData = this.pendingConfigData
          const pendingName = this.pendingConfigName
          if (pendingData && pendingName) {
            this.showApplyConfirmDialog(pendingName, pendingData)
          }
        })
      }

      // 配置管理 - 删除待应用配置
      const btnDeletePendingConfig = document.getElementById('btnDeletePendingConfig')
      if (btnDeletePendingConfig) {
        btnDeletePendingConfig.addEventListener('click', () => {
          this.pendingConfigData = null
          this.pendingConfigName = null
          document.getElementById('pendingConfigPanel').style.display = 'none'
          document.getElementById('importConfigStatus').innerHTML = ''
        })
      }

      // 数据查看面板 - 刷新按钮
      const btnRefreshData = document.getElementById('btnRefreshData')
      if (btnRefreshData) {
        btnRefreshData.addEventListener('click', () => {
          this.updateLabviewDataPanel()
        })
      }

      // 数据查看面板 - 清空按钮
      const btnClearData = document.getElementById('btnClearData')
      if (btnClearData) {
        btnClearData.addEventListener('click', () => {
          DeviceManager.rawMessages = []
          DeviceManager.channelData = {}
          this.updateLabviewDataPanel()
        })
      }

      // 数据查看面板 - 启动定时刷新（100ms）
      if (this.currentMenu === '数据查看' && !this.dataRefreshInterval) {
        this.dataRefreshInterval = setInterval(() => {
          this.updateLabviewDataPanel()
        }, 100)
      }

      // ==================== 窗口管理相关事件 ====================

      // 打开新窗口
      const btnOpenWindow = document.getElementById('btnOpenWindow')
      if (btnOpenWindow) {
        btnOpenWindow.addEventListener('click', async () => {
          const title = document.getElementById('windowTitle').value || '新窗口'
          const url = document.getElementById('windowUrl').value || 'index.html'
          const icon = document.getElementById('windowIcon').value || null
          const width = parseInt(document.getElementById('windowWidth').value) || 800
          const height = parseInt(document.getElementById('windowHeight').value) || 600

          const windowStatus = document.getElementById('windowStatus')
          if (windowStatus) {
            windowStatus.innerHTML = '<span style="color:#2c8fbb;">正在打开窗口...</span>'
          }

          const label = await this.windowManager.openWindow({ title, url, icon, width, height })

          if (label) {
            if (windowStatus) {
              windowStatus.innerHTML = `<span style="color:#22c55e;">✅ 窗口已打开: ${label}</span>`
            }
            this.updateWindowList()
          } else {
            if (windowStatus) {
              windowStatus.innerHTML = '<span style="color:#dc3545;">❌ 打开窗口失败</span>'
            }
          }
        })
      }

      // 广播消息到所有窗口
      const btnBroadcast = document.getElementById('btnBroadcast')
      if (btnBroadcast) {
        btnBroadcast.addEventListener('click', async () => {
          const eventName = document.getElementById('eventName').value || 'test-event'
          const eventDataStr = document.getElementById('eventData').value || '{}'

          try {
            const eventData = JSON.parse(eventDataStr)
            await this.windowManager.broadcast(eventName, eventData)
            this.showSuccessDialog('广播成功', `事件 "${eventName}" 已发送到所有窗口`)
          } catch (e) {
            alert('JSON格式错误: ' + e.message)
          }
        })
      }

      // 监听接收消息
      if (this.currentMenu === '窗口管理') {
        // 设置消息监听
        this.setupWindowMessageListener()
      }

      // 窗口管理界面 - 定时更新窗口列表
      if (this.currentMenu === '窗口管理') {
        this.updateWindowList()
        // 启动定时刷新窗口列表
        if (!this.windowListInterval) {
          this.windowListInterval = setInterval(() => {
            if (this.currentMenu === '窗口管理') {
              this.updateWindowList()
            }
          }, 2000)
        }
      } else {
        // 离开窗口管理界面时清除定时器
        if (this.windowListInterval) {
          clearInterval(this.windowListInterval)
          this.windowListInterval = null
        }
      }
    }

    // 更新窗口列表显示
    updateWindowList() {
      const panel = document.getElementById('windowListPanel')
      if (!panel) return

      const windows = this.windowManager.getWindowList()

      if (windows.length === 0) {
        panel.innerHTML = '<div class="empty-tip">暂无打开的窗口</div>'
        return
      }

      panel.innerHTML = windows.map(win => {
        const createdTime = new Date(win.createdAt).toLocaleTimeString()
        return `
          <div style="padding:12px;margin-bottom:8px;background:white;border:1px solid #e2edf2;border-radius:8px;">
            <div style="font-weight:500;color:#2c3e50;margin-bottom:4px;">${win.title}</div>
            <div style="font-size:12px;color:#5a6a7a;margin-bottom:8px;">标签: ${win.label}</div>
            <div style="font-size:11px;color:#94a3b8;margin-bottom:8px;">URL: ${win.url}</div>
            <div style="font-size:11px;color:#94a3b8;margin-bottom:8px;">打开时间: ${createdTime}</div>
            <button style="padding:6px 12px;background:#dc3545;color:white;border:none;border-radius:4px;cursor:pointer;font-size:12px;" onclick="App.closeWindow('${win.label}')">关闭窗口</button>
          </div>
        `
      }).join('')
    }

    // 设置窗口消息监听
    setupWindowMessageListener() {
      if (this.messageListenerSetup) return

      const eventName = document.getElementById('eventName').value || 'test-event'
      const receivedPanel = document.getElementById('receivedMessages')
      if (!receivedPanel) return

      this.windowManager.listen(eventName, (data) => {
        const msgDiv = document.createElement('div')
        msgDiv.style.cssText = 'padding:6px 8px;margin-bottom:4px;background:white;border-radius:4px;font-size:11px;'
        msgDiv.innerHTML = `
          <div style="color:#94a3b8;">${eventName}</div>
          <div style="color:#2c3e50;font-family:monospace;">${JSON.stringify(data)}</div>
        `
        receivedPanel.insertBefore(msgDiv, receivedPanel.firstChild)

        // 限制显示数量
        while (receivedPanel.children.length > 20) {
          receivedPanel.removeChild(receivedPanel.lastChild)
        }
      })

      this.messageListenerSetup = true
    }

    // 关闭指定窗口
    async closeWindow(label) {
      const success = await this.windowManager.closeWindow(label)
      if (success) {
        this.showSuccessDialog('关闭成功', `窗口 ${label} 已关闭`)
        this.updateWindowList()
      } else {
        this.showSuccessDialog('关闭失败', `无法关闭窗口 ${label}`)
      }
    }

    // 根据名称应用配置
    async applyConfigByName(name) {
      const configData = await FileSystem.readConfig(name)
      if (configData) {
        this.showApplyConfirmDialog(name, configData)
      }
    }

    // 删除配置
    async deleteConfig(name) {
      this.showConfirmDialog('确认删除', `确定要删除配置"${name}"吗？`, async () => {
        if (FileSystem) {
          await FileSystem.deleteConfig(name)
        }
        document.getElementById('configDetailPanel').innerHTML = '<div class="empty-tip">点击左侧配置查看详情</div>'
        this.showSuccessDialog('删除成功', '配置已成功删除')
        this.renderContent()
      })
    }

    // 选中配置
    async onSelectConfig(name) {
      console.log('onSelectConfig - 点击配置:', name)
      this.selectedConfigName = name
      
      if (!window.FileSystem) {
        console.error('FileSystem 未定义')
        return
      }
      
      const configs = await FileSystem.loadConfigList()
      const configInfo = configs.find(c => c.name === name)
      
      if (!configInfo) {
        console.error('未找到配置:', name)
        document.getElementById('configDetailPanel').innerHTML = '<div class="empty-tip">配置未找到</div>'
        return
      }

      const configData = await FileSystem.readConfig(name)
      console.log('onSelectConfig - 配置数据:', configData)
      
      let pages = 0
      let controls = 0
      
      if (configData) {
        if (configData.pages && Array.isArray(configData.pages)) {
          pages = configData.pages.length
        }
        if (configData.controls) {
          if (Array.isArray(configData.controls)) {
            controls = configData.controls.length
          } else if (typeof configData.controls === 'object') {
            controls = Object.keys(configData.controls).length
          }
        }
      }
      
      const panel = document.getElementById('configDetailPanel')
      if (!panel) {
        console.error('未找到 configDetailPanel')
        return
      }

      panel.innerHTML = `
        <div style="margin-bottom:16px;">
          <div style="font-size:16px;font-weight:600;color:#2c3e50;margin-bottom:8px;">${configInfo.name}</div>
          <div style="font-size:13px;color:#5a6a7a;">${configInfo.desc || '无描述'}</div>
        </div>
        <div style="font-size:13px;color:#2c3e50;margin-bottom:12px;">
          <div>📄 页面数：${pages}</div>
          <div>📦 控件数：${controls}</div>
        </div>
        <button class="btn-primary" style="width:100%;margin-bottom:8px;" onclick="App.applyConfigByName('${configInfo.name}')">应用此配置</button>
        <button class="btn-danger" style="width:100%;" onclick="App.deleteConfig('${configInfo.name}')">删除配置</button>
      `
      
      // 更新选中状态
      const configList = document.getElementById('configList')
      if (configList) {
        configList.querySelectorAll('.control-list-item').forEach(item => {
          item.classList.remove('active')
          if (item.dataset.name === name) {
            item.classList.add('active')
          }
        })
      }
    }

    // 显示配置详情（保留兼容）
    async showConfigDetail(name) {
      console.log('showConfigDetail - 点击配置:', name)
      console.log('showConfigDetail - FileSystem:', window.FileSystem)
      
      if (!window.FileSystem) {
        console.error('FileSystem 未定义')
        alert('FileSystem 未加载')
        return
      }
      
      const configs = await FileSystem.loadConfigList()
      console.log('showConfigDetail - 配置列表:', configs)
      
      const configInfo = configs.find(c => c.name === name)
      console.log('showConfigDetail - 配置信息:', configInfo)
      
      if (!configInfo) {
        console.error('未找到配置:', name)
        document.getElementById('configDetailPanel').innerHTML = '<div class="empty-tip">配置未找到</div>'
        return
      }

      const configData = await FileSystem.readConfig(name)
      console.log('showConfigDetail - 配置数据:', configData)
      
      // 尝试从配置数据中获取页面数和控件数
      let pages = 0
      let controls = 0
      
      if (configData) {
        if (configData.pages && Array.isArray(configData.pages)) {
          pages = configData.pages.length
        }
        if (configData.controls) {
          if (Array.isArray(configData.controls)) {
            controls = configData.controls.length
          } else if (typeof configData.controls === 'object') {
            controls = Object.keys(configData.controls).length
          }
        }
      }
      
      console.log('页面数:', pages, '控件数:', controls)

      const panel = document.getElementById('configDetailPanel')
      if (!panel) {
        console.error('未找到 configDetailPanel')
        return
      }

      panel.innerHTML = `
        <div style="margin-bottom:16px;">
          <div style="font-size:16px;font-weight:600;color:#2c3e50;margin-bottom:8px;">${configInfo.name}</div>
          <div style="font-size:13px;color:#5a6a7a;">${configInfo.desc || '无描述'}</div>
        </div>
        <div style="font-size:13px;color:#2c3e50;margin-bottom:12px;">
          <div>📄 页面数：${pages}</div>
          <div>📦 控件数：${controls}</div>
        </div>
        <button class="btn-primary" style="width:100%;margin-bottom:8px;" onclick="App.applyConfigByName('${configInfo.name}')">应用此配置</button>
        <button class="btn-danger" style="width:100%;" onclick="App.deleteConfig('${configInfo.name}')">删除配置</button>
      `
      console.log('showConfigDetail - 配置详情已显示')
    }

    // 显示成功弹窗
    showSuccessDialog(title, message) {
      const dialog = document.createElement('div')
      dialog.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;z-index:1000;'
      dialog.innerHTML = `
        <div style="background:white;padding:24px;border-radius:12px;min-width:280px;box-shadow:0 4px 20px rgba(0,0,0,0.15);text-align:center;">
          <div style="font-size:36px;margin-bottom:12px;">✅</div>
          <div style="font-size:16px;font-weight:600;color:#2c3e50;margin-bottom:8px;">${title}</div>
          <div style="font-size:14px;color:#5a6a7a;margin-bottom:20px;">${message}</div>
          <button style="padding:10px 24px;background:#2c8fbb;color:white;border:none;border-radius:6px;cursor:pointer;font-size:14px;" onclick="document.body.removeChild(this.parentNode.parentNode)">确定</button>
        </div>
      `
      document.body.appendChild(dialog)
    }

    // 显示确认弹窗
    showConfirmDialog(title, message, onConfirm) {
      const dialog = document.createElement('div')
      dialog.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;z-index:1000;'
      dialog.innerHTML = `
        <div style="background:white;padding:24px;border-radius:12px;min-width:300px;box-shadow:0 4px 20px rgba(0,0,0,0.15);text-align:center;">
          <div style="font-size:16px;font-weight:600;color:#2c3e50;margin-bottom:12px;">${title}</div>
          <div style="font-size:14px;color:#5a6a7a;margin-bottom:20px;">${message}</div>
          <div style="display:flex;justify-content:center;gap:12px;">
            <button class="btnCancelConfirm" style="padding:10px 24px;background:#f5f5f5;color:#5a6a7a;border:1px solid #ddd;border-radius:6px;cursor:pointer;font-size:14px;">取消</button>
            <button class="btnConfirm" style="padding:10px 24px;background:#2c8fbb;color:white;border:none;border-radius:6px;cursor:pointer;font-size:14px;">确定</button>
          </div>
        </div>
      `
      document.body.appendChild(dialog)

      dialog.querySelector('.btnCancelConfirm').addEventListener('click', () => document.body.removeChild(dialog))
      dialog.querySelector('.btnConfirm').addEventListener('click', () => {
        document.body.removeChild(dialog)
        onConfirm()
      })

      dialog.addEventListener('click', (e) => {
        if (e.target === dialog) document.body.removeChild(dialog)
      })
    }

    // 导出并保存配置
    async exportAndSaveConfig(name, desc, saveAsDefault) {
      const data = {
        version: '1.0',
        pages: this.pages,
        currentPageId: this.currentPageId
      }

      // 使用统一的FileSystem模块保存
      if (window.FileSystem) {
        // 确保jsset文件夹存在
        await FileSystem.ensureFolder()

        await FileSystem.writeConfig(name, desc, data)
        if (saveAsDefault) {
          await FileSystem.setDefault(name)
        }

        // 提示用户保存位置
        if (FileSystem.useFileSystem) {
          this.showSuccessDialog('保存成功', `配置已保存到文件夹${saveAsDefault ? '并设为默认' : ''}`)
        } else {
          this.showSuccessDialog('保存成功', `配置已保存（浏览器模式）${saveAsDefault ? '并设为默认' : ''}`)
        }
      }

      await this.renderContent()
    }

    // 导入配置文件
    importConfigFile() {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = '.json'
      input.onchange = (e) => {
        const file = e.target.files[0]
        if (!file) return

        const reader = new FileReader()
        reader.onload = (evt) => {
          try {
            const data = JSON.parse(evt.target.result)
            if (!data.pages) {
              throw new Error('配置文件格式不正确')
            }

            // 从文件名提取配置名
            const configName = file.name.replace('.json', '')
            const info = this.getConfigInfo(data)

            // 显示待应用配置
            this.pendingConfigData = data
            this.pendingConfigName = configName

            const pendingPanel = document.getElementById('pendingConfigPanel')
            const pendingNameEl = document.getElementById('pendingConfigName')
            if (pendingPanel && pendingNameEl) {
              pendingPanel.style.display = 'block'
              pendingNameEl.textContent = configName + ` (${info.pages}页 · ${info.controls}控件)`
            }

            document.getElementById('importConfigStatus').innerHTML = `<span style="color:#22c55e;">✅ 已加载: ${configName}</span>`
          } catch (err) {
            document.getElementById('importConfigStatus').innerHTML = `<span style="color:#dc3545;">导入失败: ${err.message}</span>`
          }
        }
        reader.readAsText(file)
      }
      input.click()
    }

    // 渲染控件内容
    renderControls() {
      const grid = document.getElementById('pageControlsGrid')
      if (!grid) return

      const page = this.getCurrentPage()
      if (!page || !page.controls.length) return

      grid.querySelectorAll('.control-item').forEach(item => {
        const ctrlId = item.dataset.controlId
        const ctrl = page.controls.find(c => c.id === ctrlId)
        if (!ctrl) return

        const def = this.controls.get(ctrl.controlType)
        if (!def) return

        const content = item.querySelector('.content')
        try {
          if (def.render) def.render(content, ctrl.config)
        } catch (e) {
          content.innerHTML = '<div style="color:red;font-size:12px;">渲染错误</div>'
        }
      })
    }

    // 绑定右键菜单
    bindContextMenu() {
      const grid = document.getElementById('pageControlsGrid')
      if (!grid) return

      grid.querySelectorAll('.control-item').forEach(item => {
        const ctrlId = item.dataset.controlId
        const page = this.getCurrentPage()
        if (!page) return

        const ctrl = page.controls.find(c => c.id === ctrlId)
        if (!ctrl) return

        const def = this.controls.get(ctrl.controlType)
        if (!def || !def.getContextMenuItems) return

        item.addEventListener('contextmenu', (e) => {
          e.preventDefault()
          const items = def.getContextMenuItems(ctrl.config)
          this.showContextMenu(e.clientX, e.clientY, items, ctrl.id)
        })
      })
    }

    // 显示右键菜单
    showContextMenu(x, y, items, controlId) {
      const menu = document.getElementById('contextMenu')
      if (!menu) return

      menu.innerHTML = items.map(item => {
        return `<div class="context-menu-item" data-action="${item.label}" data-id="${controlId}">${item.label}</div>`
      }).join('')

      menu.style.display = 'block'
      menu.style.left = x + 'px'
      menu.style.top = y + 'px'

      menu.querySelectorAll('.context-menu-item').forEach(item => {
        item.addEventListener('click', () => {
          const action = item.dataset.action
          const menuItem = items.find(i => i.label === action)
          if (menuItem && menuItem.action) {
            menuItem.action(item.dataset.id)
          }
          menu.style.display = 'none'
          this.renderContent()
        })
      })

      // 边界检测
      setTimeout(() => {
        const rect = menu.getBoundingClientRect()
        if (rect.right > window.innerWidth) menu.style.left = (window.innerWidth - rect.width - 10) + 'px'
        if (rect.bottom > window.innerHeight) menu.style.top = (window.innerHeight - rect.height - 10) + 'px'
      }, 0)
    }

    // 添加页面
    addPage(name) {
      const id = 'page_' + Date.now()
      this.pages.push({ id, name, controls: [] })
      this.currentPageId = id
      this.saveConfig()
      this.renderPageTabs()
    }

    // 删除页面
    deletePage(pageId) {
      if (this.pages.length <= 1) {
        alert('至少保留一个页面')
        return
      }
      this.pages = this.pages.filter(p => p.id !== pageId)
      if (this.currentPageId === pageId) {
        this.currentPageId = this.pages[0].id
      }
      this.saveConfig()
      this.renderPageTabs()
      this.renderContent()
    }

    // 重命名页面
    renamePage(pageId) {
      const page = this.pages.find(p => p.id === pageId)
      if (!page) return
      const newName = prompt('请输入新名称', page.name)
      if (newName && newName.trim()) {
        page.name = newName.trim()
        this.saveConfig()
        this.renderPageTabs()
        if (this.currentMenu === '页面列表') this.renderContent()
      }
    }

    // 添加控件
    addControl(type, config) {
      const page = this.getCurrentPage()
      if (!page) return
      const id = 'ctrl_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6)
      page.controls.push({ id, controlType: type, config })
      this.saveConfig()
      this.renderContent()
    }

    // 删除控件
    removeControl(id) {
      const page = this.getCurrentPage()
      if (!page) return
      page.controls = page.controls.filter(c => c.id !== id)
      this.saveConfig()
      this.renderContent()
    }

    // 复制控件
    copyControl(id) {
      const page = this.getCurrentPage()
      if (!page) return
      const ctrl = page.controls.find(c => c.id === id)
      if (!ctrl) return
      const newCtrl = {
        id: 'ctrl_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
        controlType: ctrl.controlType,
        config: Object.assign({}, ctrl.config)
      }
      page.controls.push(newCtrl)
      this.saveConfig()
      this.renderContent()
    }

    // 重置控件值
    resetControlValue(id) {
      const page = this.getCurrentPage()
      if (!page) return
      const ctrl = page.controls.find(c => c.id === id)
      if (!ctrl) return

      if (ctrl.controlType === 'gauge' || ctrl.controlType === 'numeric' || ctrl.controlType === 'progress') {
        ctrl.config.value = 0
      } else if (ctrl.controlType === 'indicator' || ctrl.controlType === 'switch') {
        ctrl.config.value = false
      } else if (ctrl.controlType === 'input') {
        ctrl.config.value = ''
      }
      this.saveConfig()
      this.renderContent()
    }

    // 显示控件配置对话框
    showControlConfigDialog(id) {
      const page = this.getCurrentPage()
      if (!page) return
      const ctrl = page.controls.find(c => c.id === id)
      if (!ctrl) return

      const def = this.controls.get(ctrl.controlType)
      if (!def) return

      const dialog = document.createElement('div')
      dialog.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;z-index:1000;'
      dialog.innerHTML = `
        <div style="background:white;padding:20px;border-radius:10px;min-width:320px;max-width:400px;box-shadow:0 4px 20px rgba(0,0,0,0.15);">
          <div style="font-size:16px;font-weight:600;margin-bottom:16px;">编辑 ${def.name} 配置</div>
          <div id="configFormArea"></div>
          <div style="margin-top:16px;text-align:right;">
            <button id="btnCancelConfig" style="padding:8px 16px;margin-right:8px;border:1px solid #ddd;background:#f5f5f5;border-radius:4px;cursor:pointer;">取消</button>
            <button id="btnSaveConfig" style="padding:8px 16px;background:#2c8fbb;color:white;border:none;border-radius:4px;cursor:pointer;">保存</button>
          </div>
        </div>
      `

      document.body.appendChild(dialog)

      const formArea = dialog.querySelector('#configFormArea')
      if (def.getConfigForm) {
        const form = def.getConfigForm(ctrl.config, () => {})
        formArea.appendChild(form)
      }

      dialog.querySelector('#btnCancelConfig').addEventListener('click', () => document.body.removeChild(dialog))
      dialog.querySelector('#btnSaveConfig').addEventListener('click', () => {
        const inputs = formArea.querySelectorAll('input, select')
        inputs.forEach(input => {
          // 获取input id中的配置字段名（去掉前缀，如gaugeTitle -> title）
          const id = input.id
          let key = ''
          
          // 针对不同控件的前缀进行解析
          if (id.startsWith('gauge')) key = id.replace('gauge', '').toLowerCase()
          else if (id.startsWith('num')) key = id.replace('num', '').toLowerCase()
          else if (id.startsWith('ind')) key = id.replace('ind', '').toLowerCase()
          else if (id.startsWith('prog')) key = id.replace('prog', '').toLowerCase()
          else if (id.startsWith('sld')) key = id.replace('sld', '').toLowerCase()
          else if (id.startsWith('btn')) key = id.replace('btn', '').toLowerCase()
          else if (id.startsWith('sw')) key = id.replace('sw', '').toLowerCase()
          else if (id.startsWith('inp')) key = id.replace('inp', '').toLowerCase()
          else key = id.replace(/^[a-zA-Z]+/, '').toLowerCase() // 备用方案
          
          if (key && input.value !== undefined) {
            if (input.type === 'number') {
              ctrl.config[key] = parseFloat(input.value) || 0
            } else if (input.tagName === 'SELECT') {
              ctrl.config[key] = input.value
            } else {
              ctrl.config[key] = input.value
            }
          }
        })
        this.saveConfig()
        this.renderContent()
        document.body.removeChild(dialog)
      })

      dialog.addEventListener('click', (e) => {
        if (e.target === dialog) document.body.removeChild(dialog)
      })
    }

    // 导入控件文件
    importControlFile() {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = '.js'
      input.onchange = (e) => {
        const file = e.target.files[0]
        if (!file) return

        const reader = new FileReader()
        reader.onload = (evt) => {
          try {
            const code = evt.target.result
            if (!code.includes('Controls.push')) {
              throw new Error('文件格式不正确')
            }

            const originalCount = window.Controls ? window.Controls.length : 0
            const func = new Function('window', code)
            func(window)

            const newCount = window.Controls ? window.Controls.length : 0
            if (newCount > originalCount) {
              for (let i = originalCount; i < newCount; i++) {
                const ctrl = window.Controls[i]
                if (ctrl && ctrl.type) this.controls.register(ctrl)
              }
              document.getElementById('importStatus').innerHTML = `<span style="color:#22c55e;">✅ 成功导入 ${newCount - originalCount} 个控件</span>`
              this.renderContent()
            }
          } catch (err) {
            document.getElementById('importStatus').innerHTML = `<span style="color:#dc3545;">导入失败: ${err.message}</span>`
          }
        }
        reader.readAsText(file)
      }
      input.click()
    }

    // 导出配置
    exportConfig() {
      const data = {
        version: '1.0',
        pages: this.pages,
        currentPageId: this.currentPageId
      }
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'config.json'
      a.click()
      URL.revokeObjectURL(url)
    }

    // 导入配置
    importConfig(e) {
      const file = e.target.files[0]
      if (!file) return

      const reader = new FileReader()
      reader.onload = (evt) => {
        try {
          const data = JSON.parse(evt.target.result)
          this.pages = data.pages || []
          this.currentPageId = data.currentPageId || this.pages[0]?.id
          if (!this.pages.length) {
            this.pages = [{ id: 'page_default', name: '页面 1', controls: [] }]
            this.currentPageId = 'page_default'
          }
          this.saveConfig()
          this.renderPageTabs()
          this.renderContent()
          this.showSuccessDialog('导入成功', '配置已成功导入')
        } catch (err) {
          this.showSuccessDialog('导入失败', err.message)
        }
      }
      reader.readAsText(file)
      e.target.value = ''
    }

    // 渲染页面标签
    renderPageTabs() {
      const container = document.getElementById('pageTabs')
      if (!container) return

      container.innerHTML = this.pages.map(p => `
        <div class="page-tab ${p.id === this.currentPageId ? 'active' : ''}" data-id="${p.id}">${p.name}</div>
      `).join('')

      container.querySelectorAll('.page-tab').forEach(tab => {
        tab.addEventListener('click', () => this.switchPage(tab.dataset.id))
      })
    }

    // 切换页面
    switchPage(pageId) {
      this.currentPageId = pageId
      this.saveConfig()
      this.renderPageTabs()
      this.renderContent()
    }

    // 绑定全局事件
    bindEvents() {
      // WiFi 图标点击
      const wifiIcon = document.getElementById('wifiIcon')
      if (wifiIcon) {
        wifiIcon.addEventListener('click', () => DeviceManager.toggle())
      }

      // 标题 Ctrl+Shift 单击切换模式
      const title = document.getElementById('appTitle')
      if (title) {
        title.addEventListener('click', (e) => {
          if (e.ctrlKey && e.shiftKey) {
            this.mode = this.mode === 'back' ? 'front' : 'back'
            this.updatePanelUI()
          }
        })
      }

      // 点击空白关闭菜单
      document.addEventListener('click', (e) => {
        const menu = document.getElementById('contextMenu')
        if (menu && !menu.contains(e.target)) {
          menu.style.display = 'none'
        }
      })
    }
  }

  // 创建应用实例
  window.App = new App()

})()