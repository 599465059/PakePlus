/**
 * 控件组件 - V2.0 完整版
 */
(function() {
  'use strict'

  if (!window.Controls) window.Controls = []

  // ===================== 仪表盘（显示控件） =====================
  window.Controls.push({
    type: 'gauge',
    name: '仪表盘',
    isDisplay: true,
    render(container, config) {
      const value = config.value || 0
      const min = config.min || 0
      const max = config.max || 100
      const unit = config.unit || ''
      const channel = config.channel || ''

      container.innerHTML = `
        <div style="text-align:center;width:100%;padding:12px;">
          <div class="gauge-value" style="font-size:28px;font-weight:bold;color:#1f2f3e;">${value}${unit}</div>
          <div class="gauge-label" style="font-size:12px;color:#7f8c8d;margin-top:6px;">${config.title || '仪表盘'}${channel ? ' 📡 ' + channel : ''}</div>
          <div class="gauge-bar" style="width:85%;height:8px;background:#e8f4fc;margin:12px auto;border-radius:4px;">
            <div class="gauge-fill" style="width:${Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100))}%;height:100%;background:linear-gradient(90deg,#2c8fbb,#2ecc71);border-radius:4px;transition:width 0.3s;"></div>
          </div>
        </div>
      `
    },
    updateFromDevice(container, value, config) {
      const min = config.min || 0
      const max = config.max || 100
      const unit = config.unit || ''

      const valueEl = container.querySelector('.gauge-value')
      const fillEl = container.querySelector('.gauge-fill')

      if (valueEl) valueEl.textContent = value + unit
      if (fillEl) {
        const percent = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100))
        fillEl.style.width = percent + '%'
      }
    },
    getConfigForm(defaultConfig, onSave) {
      const div = document.createElement('div')
      div.innerHTML = `
        <div class="form-field">
          <label>标题</label>
          <input id="gaugeTitle" value="${defaultConfig.title || '仪表盘'}">
        </div>
        <div class="form-field">
          <label>绑定通道</label>
          <input id="gaugeChannel" value="${defaultConfig.channel || ''}" placeholder="如: 温度">
        </div>
        <div class="form-field">
          <label>最小值</label>
          <input type="number" id="gaugeMin" value="${defaultConfig.min || 0}">
        </div>
        <div class="form-field">
          <label>最大值</label>
          <input type="number" id="gaugeMax" value="${defaultConfig.max || 100}">
        </div>
        <div class="form-field">
          <label>默认值</label>
          <input type="number" id="gaugeValue" value="${defaultConfig.value || 50}">
        </div>
        <div class="form-field">
          <label>单位</label>
          <input id="gaugeUnit" value="${defaultConfig.unit || ''}" placeholder="如: V, °C">
        </div>
        <button id="saveConfigBtn" style="width:100%;margin-top:10px;padding:10px;background:#2c8fbb;color:white;border:none;border-radius:6px;cursor:pointer;">保存配置</button>
      `
      div.querySelector('#saveConfigBtn').onclick = () => {
        const config = {
          title: div.querySelector('#gaugeTitle').value,
          channel: div.querySelector('#gaugeChannel').value,
          min: parseFloat(div.querySelector('#gaugeMin').value),
          max: parseFloat(div.querySelector('#gaugeMax').value),
          value: parseFloat(div.querySelector('#gaugeValue').value),
          unit: div.querySelector('#gaugeUnit').value
        }
        if (onSave) onSave(config)
      }
      return div
    },
    getContextMenuItems(config) {
      return [
        { label: '删除', action: (id) => App.removeControl(id) },
        { label: '编辑配置', action: (id) => App.showControlConfigDialog(id) },
        { label: '复制', action: (id) => App.copyControl(id) },
        { label: '重置值', action: (id) => App.resetControlValue(id) }
      ]
    }
  })

  // ===================== 数值显示（显示控件） =====================
  window.Controls.push({
    type: 'numeric',
    name: '数值显示',
    isDisplay: true,
    render(container, config) {
      const value = config.value || 0
      const unit = config.unit || ''
      const channel = config.channel || ''

      container.innerHTML = `
        <div style="text-align:center;padding:12px;">
          <div class="numeric-value" style="font-size:32px;font-weight:bold;color:#1f2f3e;">${value}${unit}</div>
          <div class="numeric-label" style="font-size:12px;color:#7f8c8d;margin-top:6px;">${config.label || '数值'}${channel ? ' 📡 ' + channel : ''}</div>
        </div>
      `
    },
    updateFromDevice(container, value, config) {
      const unit = config.unit || ''
      const valueEl = container.querySelector('.numeric-value')
      if (valueEl) valueEl.textContent = value + unit
    },
    getConfigForm(defaultConfig, onSave) {
      const div = document.createElement('div')
      div.innerHTML = `
        <div class="form-field">
          <label>标签</label>
          <input id="numLabel" value="${defaultConfig.label || '数值显示'}">
        </div>
        <div class="form-field">
          <label>绑定通道</label>
          <input id="numChannel" value="${defaultConfig.channel || ''}" placeholder="如: 电压">
        </div>
        <div class="form-field">
          <label>默认值</label>
          <input type="number" id="numValue" value="${defaultConfig.value || 0}">
        </div>
        <div class="form-field">
          <label>单位</label>
          <input id="numUnit" value="${defaultConfig.unit || ''}">
        </div>
        <button id="saveConfigBtn" style="width:100%;margin-top:10px;padding:10px;background:#2c8fbb;color:white;border:none;border-radius:6px;cursor:pointer;">保存配置</button>
      `
      div.querySelector('#saveConfigBtn').onclick = () => {
        const config = {
          label: div.querySelector('#numLabel').value,
          channel: div.querySelector('#numChannel').value,
          value: parseFloat(div.querySelector('#numValue').value),
          unit: div.querySelector('#numUnit').value
        }
        if (onSave) onSave(config)
      }
      return div
    },
    getContextMenuItems(config) {
      return [
        { label: '删除', action: (id) => App.removeControl(id) },
        { label: '编辑配置', action: (id) => App.showControlConfigDialog(id) },
        { label: '复制', action: (id) => App.copyControl(id) }
      ]
    }
  })

  // ===================== 指示灯（显示控件） =====================
  window.Controls.push({
    type: 'indicator',
    name: '指示灯',
    isDisplay: true,
    render(container, config) {
      const on = config.value !== false
      const channel = config.channel || ''
      const label = config.label || '指示灯'

      container.innerHTML = `
        <div style="text-align:center;padding:12px;">
          <div class="led-indicator" style="width:36px;height:36px;border-radius:50%;margin:0 auto;background:${on ? '#22c55e' : '#95a5a6'};box-shadow:${on ? '0 0 20px #22c55e' : 'none'};transition:all 0.3s;"></div>
          <div style="margin-top:8px;font-size:12px;color:#7f8c8d;">${label}${channel ? ' 📡 ' + channel : ''}</div>
        </div>
      `
    },
    updateFromDevice(container, value, config) {
      const isOn = value ? true : false
      const led = container.querySelector('.led-indicator')
      if (led) {
        led.style.background = isOn ? '#22c55e' : '#95a5a6'
        led.style.boxShadow = isOn ? '0 0 20px #22c55e' : 'none'
      }
    },
    getConfigForm(defaultConfig, onSave) {
      const div = document.createElement('div')
      div.innerHTML = `
        <div class="form-field">
          <label>标签</label>
          <input id="indLabel" value="${defaultConfig.label || '指示灯'}">
        </div>
        <div class="form-field">
          <label>绑定通道</label>
          <input id="indChannel" value="${defaultConfig.channel || ''}" placeholder="如: 开关状态">
        </div>
        <div class="form-field">
          <label>初始状态</label>
          <select id="indValue">
            <option value="true" ${defaultConfig.value !== false ? 'selected' : ''}>亮</option>
            <option value="false" ${defaultConfig.value === false ? 'selected' : ''}>灭</option>
          </select>
        </div>
        <button id="saveConfigBtn" style="width:100%;margin-top:10px;padding:10px;background:#2c8fbb;color:white;border:none;border-radius:6px;cursor:pointer;">保存配置</button>
      `
      div.querySelector('#saveConfigBtn').onclick = () => {
        const config = {
          label: div.querySelector('#indLabel').value,
          channel: div.querySelector('#indChannel').value,
          value: div.querySelector('#indValue').value === 'true'
        }
        if (onSave) onSave(config)
      }
      return div
    },
    getContextMenuItems(config) {
      return [
        { label: '删除', action: (id) => App.removeControl(id) },
        { label: '编辑配置', action: (id) => App.showControlConfigDialog(id) },
        { label: '复制', action: (id) => App.copyControl(id) }
      ]
    }
  })

  // ===================== 进度条（显示控件） =====================
  window.Controls.push({
    type: 'progress',
    name: '进度条',
    isDisplay: true,
    render(container, config) {
      const value = config.value || 0
      const min = config.min || 0
      const max = config.max || 100
      const channel = config.channel || ''
      const label = config.label || ''
      const percent = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100))

      container.innerHTML = `
        <div style="width:100%;text-align:center;padding:12px;">
          ${label ? `<div class="progress-label" style="font-size:12px;color:#7f8c8d;margin-bottom:8px;">${label}${channel ? ' 📡 ' + channel : ''}</div>` : ''}
          <div class="progress-bar" style="width:100%;height:16px;background:#e8f4fc;border-radius:8px;overflow:hidden;">
            <div class="progress-fill" style="width:${percent}%;height:100%;background:linear-gradient(90deg,#2c8fbb,#5bc0de);transition:width 0.3s;"></div>
          </div>
          <div class="progress-text" style="font-size:14px;color:#2c3e50;font-weight:600;margin-top:6px;">${value}%</div>
        </div>
      `
    },
    updateFromDevice(container, value, config) {
      const min = config.min || 0
      const max = config.max || 100
      const percent = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100))

      const fill = container.querySelector('.progress-fill')
      const text = container.querySelector('.progress-text')

      if (fill) fill.style.width = percent + '%'
      if (text) text.textContent = value + '%'
    },
    getConfigForm(defaultConfig, onSave) {
      const div = document.createElement('div')
      div.innerHTML = `
        <div class="form-field">
          <label>标签</label>
          <input id="progLabel" value="${defaultConfig.label || '进度条'}">
        </div>
        <div class="form-field">
          <label>绑定通道</label>
          <input id="progChannel" value="${defaultConfig.channel || ''}" placeholder="如: 进度">
        </div>
        <div class="form-field">
          <label>最小值</label>
          <input type="number" id="progMin" value="${defaultConfig.min || 0}">
        </div>
        <div class="form-field">
          <label>最大值</label>
          <input type="number" id="progMax" value="${defaultConfig.max || 100}">
        </div>
        <div class="form-field">
          <label>默认值</label>
          <input type="number" id="progValue" value="${defaultConfig.value || 50}">
        </div>
        <button id="saveConfigBtn" style="width:100%;margin-top:10px;padding:10px;background:#2c8fbb;color:white;border:none;border-radius:6px;cursor:pointer;">保存配置</button>
      `
      div.querySelector('#saveConfigBtn').onclick = () => {
        const config = {
          label: div.querySelector('#progLabel').value,
          channel: div.querySelector('#progChannel').value,
          min: parseFloat(div.querySelector('#progMin').value),
          max: parseFloat(div.querySelector('#progMax').value),
          value: parseFloat(div.querySelector('#progValue').value)
        }
        if (onSave) onSave(config)
      }
      return div
    },
    getContextMenuItems(config) {
      return [
        { label: '删除', action: (id) => App.removeControl(id) },
        { label: '编辑配置', action: (id) => App.showControlConfigDialog(id) },
        { label: '复制', action: (id) => App.copyControl(id) }
      ]
    }
  })

  // ===================== 滑块（输入控件） =====================
  window.Controls.push({
    type: 'slider',
    name: '滑块',
    isInput: true,
    render(container, config) {
      const min = config.min || 0
      const max = config.max || 100
      const value = config.value || 50
      const channel = config.channel || ''
      const label = config.label || '滑块'

      container.innerHTML = `
        <div style="width:100%;text-align:center;padding:12px;">
          <div class="slider-label" style="font-size:13px;color:#7f8c8d;margin-bottom:8px;">${label}${channel ? ' 📡 ' + channel : ''}</div>
          <div class="slider-value" style="font-size:20px;font-weight:bold;color:#2c3e50;margin-bottom:8px;">${value}</div>
          <input type="range" min="${min}" max="${max}" value="${value}" step="${config.step || 1}"
                 style="width:90%;height:10px;appearance:none;background:#e8f4fc;border-radius:5px;outline:none;cursor:pointer;">
        </div>
      `

      const input = container.querySelector('input[type="range"]')
      input.addEventListener('input', (e) => {
        const v = parseInt(e.target.value)
        container.querySelector('.slider-value').textContent = v

        if (config.channel && window.DeviceManager) {
          DeviceManager.send({ channel: config.channel, value: v })
        }

        if (window.EventBus) {
          EventBus.emit('slider:change', { type: 'slider', value: v, config })
        }
      })
    },
    getConfigForm(defaultConfig, onSave) {
      const div = document.createElement('div')
      div.innerHTML = `
        <div class="form-field">
          <label>标签</label>
          <input id="sliderLabel" value="${defaultConfig.label || '滑块'}">
        </div>
        <div class="form-field">
          <label>绑定通道（发送数据）</label>
          <input id="sliderChannel" value="${defaultConfig.channel || ''}" placeholder="如: 滑块值">
        </div>
        <div class="form-field">
          <label>最小值</label>
          <input type="number" id="sliderMin" value="${defaultConfig.min || 0}">
        </div>
        <div class="form-field">
          <label>最大值</label>
          <input type="number" id="sliderMax" value="${defaultConfig.max || 100}">
        </div>
        <div class="form-field">
          <label>默认值</label>
          <input type="number" id="sliderValue" value="${defaultConfig.value || 50}">
        </div>
        <div class="form-field">
          <label>步长</label>
          <input type="number" id="sliderStep" value="${defaultConfig.step || 1}">
        </div>
        <button id="saveConfigBtn" style="width:100%;margin-top:10px;padding:10px;background:#2c8fbb;color:white;border:none;border-radius:6px;cursor:pointer;">保存配置</button>
      `
      div.querySelector('#saveConfigBtn').onclick = () => {
        const config = {
          label: div.querySelector('#sliderLabel').value,
          channel: div.querySelector('#sliderChannel').value,
          min: parseFloat(div.querySelector('#sliderMin').value),
          max: parseFloat(div.querySelector('#sliderMax').value),
          value: parseFloat(div.querySelector('#sliderValue').value),
          step: parseFloat(div.querySelector('#sliderStep').value)
        }
        if (onSave) onSave(config)
      }
      return div
    },
    getContextMenuItems(config) {
      return [
        { label: '删除', action: (id) => App.removeControl(id) },
        { label: '编辑配置', action: (id) => App.showControlConfigDialog(id) },
        { label: '复制', action: (id) => App.copyControl(id) }
      ]
    }
  })

  // ===================== 按钮（输入控件） =====================
  window.Controls.push({
    type: 'button',
    name: '按钮',
    isInput: true,
    render(container, config) {
      const channel = config.channel || ''
      const text = config.text || '按钮'
      const bgColor = config.bgColor || '#2c8fbb'

      const btn = document.createElement('button')
      btn.textContent = text + (channel ? ' 📡 ' + channel : '')
      btn.style.cssText = `
        background: ${bgColor};
        color: white;
        border: none;
        padding: 12px 24px;
        border-radius: 20px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
        box-shadow: 0 2px 8px rgba(44, 143, 187, 0.3);
      `
      btn.onmouseover = () => btn.style.boxShadow = '0 4px 12px rgba(44, 143, 187, 0.5)'
      btn.onmouseout = () => btn.style.boxShadow = '0 2px 8px rgba(44, 143, 187, 0.3)'

      btn.addEventListener('click', () => {
        if (channel && window.DeviceManager) {
          DeviceManager.send({ channel: channel, value: true })
        }

        if (window.EventBus) {
          EventBus.emit('button:click', { type: 'button', config })
        }
      })

      container.appendChild(btn)
    },
    getConfigForm(defaultConfig, onSave) {
      const div = document.createElement('div')
      div.innerHTML = `
        <div class="form-field">
          <label>按钮文本</label>
          <input id="btnText" value="${defaultConfig.text || '按钮'}">
        </div>
        <div class="form-field">
          <label>绑定通道（发送命令）</label>
          <input id="btnChannel" value="${defaultConfig.channel || ''}" placeholder="如: 启动">
        </div>
        <div class="form-field">
          <label>背景颜色</label>
          <input id="btnBgColor" type="color" value="${defaultConfig.bgColor || '#2c8fbb'}">
        </div>
        <button id="saveConfigBtn" style="width:100%;margin-top:10px;padding:10px;background:#2c8fbb;color:white;border:none;border-radius:6px;cursor:pointer;">保存配置</button>
      `
      div.querySelector('#saveConfigBtn').onclick = () => {
        const config = {
          text: div.querySelector('#btnText').value,
          channel: div.querySelector('#btnChannel').value,
          bgColor: div.querySelector('#btnBgColor').value
        }
        if (onSave) onSave(config)
      }
      return div
    },
    getContextMenuItems(config) {
      return [
        { label: '删除', action: (id) => App.removeControl(id) },
        { label: '编辑配置', action: (id) => App.showControlConfigDialog(id) },
        { label: '复制', action: (id) => App.copyControl(id) }
      ]
    }
  })

  // ===================== 开关（输入控件） =====================
  window.Controls.push({
    type: 'switch',
    name: '开关',
    isInput: true,
    render(container, config) {
      const value = config.value || false
      const channel = config.channel || ''
      const label = config.label || '开关'

      container.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:center;gap:12px;padding:12px;">
          <div class="switch-track" style="width:50px;height:26px;background:${value ? '#22c55e' : '#cbd5e1'};border-radius:13px;position:relative;cursor:pointer;transition:background 0.2s;box-shadow:${value ? '0 0 10px rgba(34, 197, 94, 0.4)' : 'none'};">
            <div class="switch-thumb" style="width:22px;height:22px;background:white;border-radius:50%;position:absolute;top:2px;left:${value ? '26px' : '2px'};transition:left 0.2s;box-shadow:0 2px 4px rgba(0,0,0,0.2);"></div>
          </div>
          <span class="switch-label" style="font-size:14px;color:#2c3e50;font-weight:500;">${label}${channel ? ' 📡 ' + channel : ''}</span>
        </div>
      `

      const track = container.querySelector('.switch-track')
      track.addEventListener('click', () => {
        const newValue = !value
        track.style.background = newValue ? '#22c55e' : '#cbd5e1'
        track.style.boxShadow = newValue ? '0 0 10px rgba(34, 197, 94, 0.4)' : 'none'
        track.querySelector('.switch-thumb').style.left = newValue ? '26px' : '2px'

        if (channel && window.DeviceManager) {
          DeviceManager.send({ channel: channel, value: newValue ? 1 : 0 })
        }

        if (window.EventBus) {
          EventBus.emit('switch:change', { type: 'switch', value: newValue, config })
        }
      })
    },
    getConfigForm(defaultConfig, onSave) {
      const div = document.createElement('div')
      div.innerHTML = `
        <div class="form-field">
          <label>标签</label>
          <input id="swLabel" value="${defaultConfig.label || '开关'}">
        </div>
        <div class="form-field">
          <label>绑定通道（发送数据）</label>
          <input id="swChannel" value="${defaultConfig.channel || ''}" placeholder="如: 开关">
        </div>
        <div class="form-field">
          <label>初始状态</label>
          <select id="swValue">
            <option value="true" ${defaultConfig.value ? 'selected' : ''}>开</option>
            <option value="false" ${!defaultConfig.value ? 'selected' : ''}>关</option>
          </select>
        </div>
        <button id="saveConfigBtn" style="width:100%;margin-top:10px;padding:10px;background:#2c8fbb;color:white;border:none;border-radius:6px;cursor:pointer;">保存配置</button>
      `
      div.querySelector('#saveConfigBtn').onclick = () => {
        const config = {
          label: div.querySelector('#swLabel').value,
          channel: div.querySelector('#swChannel').value,
          value: div.querySelector('#swValue').value === 'true'
        }
        if (onSave) onSave(config)
      }
      return div
    },
    getContextMenuItems(config) {
      return [
        { label: '删除', action: (id) => App.removeControl(id) },
        { label: '编辑配置', action: (id) => App.showControlConfigDialog(id) },
        { label: '复制', action: (id) => App.copyControl(id) }
      ]
    }
  })

  // ===================== 输入框（输入控件） =====================
  window.Controls.push({
    type: 'input',
    name: '输入框',
    isInput: true,
    render(container, config) {
      const channel = config.channel || ''
      const value = config.value || ''
      const placeholder = config.placeholder || '请输入...'

      container.innerHTML = `
        <div style="width:100%;padding:8px 12px;">
          <div style="font-size:12px;color:#7f8c8d;margin-bottom:6px;">${channel ? '📡 ' + channel : ''}</div>
          <input type="text" value="${value}" placeholder="${placeholder}"
                 style="width:100%;padding:10px 14px;border:1px solid #dce5ec;border-radius:8px;font-size:14px;outline:none;box-sizing:border-box;">
        </div>
      `

      const input = container.querySelector('input')
      input.addEventListener('change', (e) => {
        const v = e.target.value

        if (channel && window.DeviceManager) {
          DeviceManager.send({ channel: channel, value: v })
        }

        if (window.EventBus) {
          EventBus.emit('input:change', { type: 'input', value: v, config })
        }
      })
    },
    getConfigForm(defaultConfig, onSave) {
      const div = document.createElement('div')
      div.innerHTML = `
        <div class="form-field">
          <label>占位符</label>
          <input id="inpPlaceholder" value="${defaultConfig.placeholder || ''}">
        </div>
        <div class="form-field">
          <label>默认值</label>
          <input id="inpValue" value="${defaultConfig.value || ''}">
        </div>
        <div class="form-field">
          <label>绑定通道（发送数据）</label>
          <input id="inpChannel" value="${defaultConfig.channel || ''}" placeholder="如: 输入值">
        </div>
        <button id="saveConfigBtn" style="width:100%;margin-top:10px;padding:10px;background:#2c8fbb;color:white;border:none;border-radius:6px;cursor:pointer;">保存配置</button>
      `
      div.querySelector('#saveConfigBtn').onclick = () => {
        const config = {
          placeholder: div.querySelector('#inpPlaceholder').value,
          value: div.querySelector('#inpValue').value,
          channel: div.querySelector('#inpChannel').value
        }
        if (onSave) onSave(config)
      }
      return div
    },
    getContextMenuItems(config) {
      return [
        { label: '删除', action: (id) => App.removeControl(id) },
        { label: '编辑配置', action: (id) => App.showControlConfigDialog(id) },
        { label: '复制', action: (id) => App.copyControl(id) }
      ]
    }
  })

  // ===================== 网页容器 =====================
  window.Controls.push({
    type: 'webview',
    name: '网页容器',
    isDisplay: true,
    render(container, config) {
      const url = config.url || ''
      const title = config.title || '网页容器'

      if (!url) {
        container.innerHTML = `
          <div style="display:flex;align-items:center;justify-content:center;height:100%;color:#94a3b8;">
            <div style="text-align:center;">
              <div style="font-size:32px;margin-bottom:8px;">🌐</div>
              <div>未配置网页地址</div>
            </div>
          </div>
        `
        return
      }

      container.innerHTML = `
        <div style="width:100%;height:100%;display:flex;flex-direction:column;">
          <div style="padding:8px 12px;background:#f0f9ff;border-bottom:1px solid #e2edf2;font-size:12px;color:#2c8fbb;font-weight:500;">
            ${title}
          </div>
          <iframe src="${url}"
                  style="flex:1;width:100%;border:none;"
                  sandbox="allow-same-origin allow-scripts allow-forms">
          </iframe>
        </div>
      `
    },
    getConfigForm(defaultConfig, onSave) {
      const div = document.createElement('div')
      div.innerHTML = `
        <div class="form-field">
          <label>标题</label>
          <input id="webviewTitle" value="${defaultConfig.title || '网页容器'}">
        </div>
        <div class="form-field">
          <label>网页地址 (URL)</label>
          <input id="webviewUrl" value="${defaultConfig.url || ''}" placeholder="如: http://example.com 或 /path/to/page.html">
        </div>
        <div class="form-field">
          <label>宽度 (px)</label>
          <input type="number" id="webviewWidth" value="${defaultConfig.width || 400}" min="200">
        </div>
        <div class="form-field">
          <label>高度 (px)</label>
          <input type="number" id="webviewHeight" value="${defaultConfig.height || 300}" min="150">
        </div>
        <div style="margin-top:8px;padding:10px;background:#fff3cd;border-radius:4px;font-size:12px;color:#856404;">
          ⚠️ 注意: 同源策略可能会阻止加载某些网页
        </div>
        <button id="saveConfigBtn" style="width:100%;margin-top:10px;padding:10px;background:#2c8fbb;color:white;border:none;border-radius:6px;cursor:pointer;">保存配置</button>
      `
      div.querySelector('#saveConfigBtn').onclick = () => {
        const config = {
          title: div.querySelector('#webviewTitle').value,
          url: div.querySelector('#webviewUrl').value,
          width: parseInt(div.querySelector('#webviewWidth').value) || 400,
          height: parseInt(div.querySelector('#webviewHeight').value) || 300
        }
        if (onSave) onSave(config)
      }
      return div
    },
    getContextMenuItems(config) {
      return [
        { label: '删除', action: (id) => App.removeControl(id) },
        { label: '编辑配置', action: (id) => App.showControlConfigDialog(id) },
        { label: '复制', action: (id) => App.copyControl(id) }
      ]
    }
  })

})()