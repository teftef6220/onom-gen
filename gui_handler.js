(function() {
  let guiInitialized = false;

  function initGUI() {
    if (guiInitialized) return;

    // lil-guiが読み込まれているか確認
    if (typeof lil === 'undefined') {
      return;
    }

    const configData = window.guiConfig || (typeof guiConfig !== 'undefined' ? guiConfig : null);

    if (configData) {
      console.log('gui_handler: GUI config found, initializing...');
      guiInitialized = true;
      const gui = new lil.GUI();
    
    // URLパラメータから設定を読み込む
    const urlParams = new URLSearchParams(window.location.search);

    // クエリパラメータ更新関数
    let queryUpdateTimeout;
    const pendingQueryUpdates = {};

    function updateQueryParam(key, value) {
      if (typeof value === 'function') return;
      if (typeof value === 'number' && !Number.isInteger(value)) value = parseFloat(value.toFixed(4));
      
      pendingQueryUpdates[key] = value;

      if (queryUpdateTimeout) clearTimeout(queryUpdateTimeout);

      queryUpdateTimeout = setTimeout(() => {
        const url = new URL(window.location);
        for (const k in pendingQueryUpdates) {
          url.searchParams.set(k, pendingQueryUpdates[k]);
        }
        window.history.replaceState({}, '', url);
        queryUpdateTimeout = null;
        for (const k in pendingQueryUpdates) delete pendingQueryUpdates[k];
      }, 500); // 0.5秒のデバウンスで頻度制限を回避
    }

    const processConfig = (configList, parentGui) => {
      configList.forEach(config => {
        if (config.folder) {
          const folder = parentGui.addFolder(config.folder);
          if (config.open) folder.open();
          if (config.contents) {
            processConfig(config.contents, folder);
          }
        } else {
          const target = config.object || window;
          
          // URLパラメータに値があれば適用
          if (urlParams.has(config.variable)) {
            let val = urlParams.get(config.variable);
            // 数値変換
            if (!isNaN(parseFloat(val)) && isFinite(val)) {
              val = parseFloat(val);
            }
            // 真偽値変換
            if (val === 'true') val = true;
            if (val === 'false') val = false;
            
            target[config.variable] = val;

            // URLからの反映時にもonChange/onFinishChangeを発火させる
            if (config.onChange) {
              try {
                config.onChange(val);
              } catch (e) {
                console.warn(`gui_handler: Failed to trigger onChange for ${config.variable}`, e);
              }
            }
            if (config.onFinishChange) {
              try {
                config.onFinishChange(val);
              } catch (e) {
                console.warn(`gui_handler: Failed to trigger onFinishChange for ${config.variable}`, e);
              }
            }
          }

          if (target[config.variable] === undefined && config.type !== 'function') {
            console.warn(`gui_handler: Variable "${config.variable}" not found in target object.`);
            return;
          }

          let controller;
          if (config.type === 'function') {
            controller = parentGui.add(target, config.variable).name(config.name || config.variable);
          } else if (config.type === 'color') {
            controller = parentGui.addColor(target, config.variable).name(config.name || config.variable);
          } else if (config.options) {
            controller = parentGui.add(target, config.variable, config.options).name(config.name || config.variable);
          } else {
            controller = parentGui.add(target, config.variable, config.min, config.max, config.step).name(config.name || config.variable);
          }
          
          if (config.listen) controller.listen();
          
          controller.onChange(v => {
            updateQueryParam(config.variable, v);
            if (config.onChange) config.onChange(v);
          });
          if (config.onFinishChange) controller.onFinishChange(config.onFinishChange);
        }
      });
    };

    processConfig(configData, gui);

    // 設定URLコピー機能
    let copyTimeout;
    const utils = {
      copyUrl: function() {
        navigator.clipboard.writeText(window.location.href).then(() => {
          copyController.name('Copied!');
          if (copyTimeout) clearTimeout(copyTimeout);
          copyTimeout = setTimeout(() => {
            copyController.name('Copy Settings URL');
          }, 2000);
        }).catch(err => {
          console.error('Failed to copy URL:', err);
        });
      }
    };
    const copyController = gui.add(utils, 'copyUrl').name('Copy Settings URL');
    }
  }

  window.addEventListener('load', () => {
    initGUI();
    // p5.jsのsetup()などで遅れて設定される場合に備えてポーリングする
    const interval = setInterval(() => {
      if (guiInitialized) clearInterval(interval);
      else initGUI();
    }, 200);
    // 10秒で諦める
    setTimeout(() => clearInterval(interval), 10000);
  });
})();