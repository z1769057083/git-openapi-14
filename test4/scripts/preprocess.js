/**
 * @file: selfCloseInputTag.js
 * @desc: 遍历文件按照环境变量裁剪代码，类似uniapp 条件编译
 *
 * 注意执行release命令时会修改源代码，本地开发尽量走build
 */

const fs = require('fs');
const path = require('path');
const pp = require('preprocess');
const {getNodeCss} = require('./style');
const env = process.env;

const quickappCodePath = './src/';

function parseNodeCss(node, cssMap, container) {
  // 流式容器内的元素不带宽高位置
  let componentId = node?.componentId;
  if (!node) {
    return;
  }

  // flex容器，根据当前组件属性设置伸缩属性
  if (container?.componentId === 'flow-section') {
    if (node?.componentProperties?.style?.width > 0) {
      if (!node.componentProperties.style.flexSetting) {
        node.componentProperties.style.flexSetting = {};
      }
      node.componentProperties.style.flexSetting.flexShrink = 0;
    }
  }

  // 流式容器内的元素不带宽高位置
  if (
    !container?.componentId ||
    [
      'flow-section',
      'form-entity',
      'form-container',
      'combo',
      'column',
      'page',
      'modal',
      'modal-section'
    ].includes(container.componentId) ||
    container?.componentProperties?.style?.mode === 'flow'
  ) {
    node.componentProperties.isFlow = true;
    if (node.componentProperties?.style) {
      delete node.componentProperties.style.x;
      delete node.componentProperties.style.y;
    }
  }

  if (!cssMap[componentId]) {
    cssMap[componentId] = [];
  }
  let css = getNodeCss(node);
  if (css) {
    cssMap[componentId].push(css);
  }

  if (node?.children && node.children.length) {
    node.children.forEach(child => {
      parseNodeCss(child, cssMap, node);
    });
  }
}

// 解析页面的css
function parsePageCss(fpath, cssMap) {
  let page = JSON.parse(fs.readFileSync(fpath, 'UTF-8'));

  // 生成页面级别css
  let pageCss = getNodeCss(page.structor, `.ap-page-${page.id}`);
  if (pageCss) {
    if (!cssMap._page) {
      cssMap._page = [];
    }
    cssMap._page.push(pageCss);
  }

  // 生成组件级别css
  parseNodeCss(page.structor, cssMap);
  parseNodeCss(page.modal, cssMap);
  parseNodeCss(page.fixedBlock, cssMap);

  // 更新页面schema，去除已经导出css的属性
  fs.writeFileSync(fpath, JSON.stringify(page, null, 2));
}

const main = codePath => {
  // 当前应用所有组件的css
  let cssMap = {};

  const traversing = cpath => {
    const files = fs.readdirSync(cpath);
    files.forEach(fileName => {
      const fPath = path.join(cpath, fileName);
      const stats = fs.statSync(fPath);
      stats.isDirectory() && traversing(fPath);
      if (stats.isFile()) {
        if (/.(ux|ts|css|js)$/.test(fPath)) {
          matchAndReplace(fPath);
        } else if (String(fPath).endsWith('schema.json')) {
          parsePageCss(fPath, cssMap);
        }
      }
    });
  };
  traversing(codePath);

  // 导出页面级别css
  const pageDir = path.resolve(__dirname + '/../src/renderer');
  const fpath = path.join(pageDir, 'page.ux');
  const cssPath = path.join(pageDir, '_page.css');
  const itemPath = path.join(pageDir, 'item.ux');

  if (cssMap._page?.length) {
    let content = fs.readFileSync(fpath, 'UTF-8');
    if (!content.includes("@import './_page.css'")) {
      content = content.replace(
        '</style>',
        "\n@import './_page.css';\n</style>"
      );
    }
    fs.writeFileSync(fpath, content);
    fs.writeFileSync(cssPath, cssMap._page.join('\n'));
  }

  // 将整个应用的css根据组件生成到组件里
  const baseDir = path.resolve(__dirname + '/../src/components');
  Object.keys(cssMap).forEach(componentId => {
    let vueFile = path.join(baseDir, `ap-${componentId}/index.ux`);
    if (fs.existsSync(vueFile)) {
      let css = cssMap[componentId].join('\n');
      fs.writeFileSync(path.join(baseDir, `ap-${componentId}/_item.css`), css);
      let vueContent = fs.readFileSync(vueFile, 'UTF-8');
      if (!vueContent.includes("@import './_item.css'")) {
        if (vueContent.includes('</style>')) {
          vueContent = vueContent.replace(
            '</style>',
            "\n@import './_item.css';\n</style>"
          );
        } else {
          vueContent += `
<style lang="less">
@import './_item.css';
</style>
`;
        }

        fs.writeFileSync(vueFile, vueContent);
      }
    }
  });

  // 去除item.ux里自定义组件的默认引用，后面版本在平台里修复
  if (fs.existsSync(itemPath)) {
    let itemCode = fs.readFileSync(itemPath, 'UTF-8');
    let matches = itemCode.match(/<import (([\s\S])*?)<\/import>/gim);
    matches.forEach(item => {
      let match = String(item).match(/src=['"]([^'"\s]*)"/);
      if (match) {
        let componentId = match[1].split('/').pop();
        if (
          match[1].includes('../components/') &&
          !fs.existsSync(path.join(baseDir, componentId))
        ) {
          itemCode = itemCode.replace(item, '');
        }
      }
    });

    // 流式容器和自由容器是循环渲染必须组件，默认加下
    let baseComponents = [
      '<import src="../components/ap-flow-section" name="ap-flow-section"></import>',
      '<import src="../components/ap-custom-section" name="ap-custom-section"></import>'
    ];
    baseComponents.forEach(item => {
      if (!itemCode.includes(item)) {
        itemCode = item + '\n' + itemCode;
      }
    });

    fs.writeFileSync(itemPath, itemCode);
  }
};

// 根据注释裁剪源码
function matchAndReplace(fpath) {
  const pageContent = fs.readFileSync(fpath, 'UTF-8');
  const ext = path.extname(fpath).replace('.', '');
  const typeMap = {
    ux: 'html',
    css: 'css',
    js: 'js',
    ts: 'js'
  };
  const newContent = pp.preprocess(pageContent, env, {
    type: typeMap[ext] || 'js'
  });

  if (newContent !== pageContent) {
    fs.writeFileSync(fpath, newContent);
  }
}

main(quickappCodePath);

// 快应用卡片删除my-icon里的字体文件
if (env.PLATFORM === 'quickapp-card') {
  let ttf = path.join(__dirname, '../src/components/common/icon/iconfonts.ttf');
  if (fs.existsSync(ttf)) {
    fs.unlinkSync(ttf);
  }
}
