/**
 * @file 样式处理方法
 */

const fs = require('fs');
const conf = JSON.parse(fs.readFileSync(__dirname + '/../src/config.json'));
const APP_CONF = {
  isuda: {
    static: conf.staticHost
  }
};

const themeMap = {
  '@colorOnly': '#000000',
  '@colorPrimary': 'rgba(0,0,0,0.9)',
  '@colorSecondary': 'rgba(0,0,0,0.6)',
  '@colorTertiary': 'rgba(0,0,0,0.38)',
  '@colorBackground': '#FFFFFF',
  '@colorAccent': '#256FFF',
  '@color30': '#3F56EA',
  '@color31': '#00AAEE',
  '@color32': '#00BFC9',
  '@color33': '#41BA41',
  '@color34': '#8CD600',
  '@color35': '#8A2BE2',
  '@color36': '#E40078',
  '@color37': '#FA2A2D',
  '@color38': '#FF7500',
  '@color39': '#FF9800',
  '@color40': '#FFBF00',
  '@color41': '#808080'
};

function pick(obj, ...args) {
  if (!obj) {
    return {};
  }
  return args.reduce(
    (iter, val) => (val in obj && (iter[val] = obj[val]), iter),
    {}
  );
}

function isString(value) {
  return typeof value === 'string';
}

// TODO 主题色同步
const parseThemeColor = function (color) {
  if (String(color).startsWith('@') && themeMap[color]) {
    return themeMap[color];
  }
  return color;
};

function toVw(size) {
  // return size * 2 + 'px';
  return size + 'dp';
}

function getHttpImageUrl(url) {
  if (!isString(url) || !url || String(url).startsWith('internal://')) {
    return url;
  }
  if (!/^http/.test(url)) {
    // 兼容本地图片
    if (url.startsWith('/static') && APP_CONF.isuda.static === '/static') {
      return url;
    }
    // 兼容下前缀是否带/
    if (url.startsWith('/') && APP_CONF.isuda?.static?.endsWith('/')) {
      url = `${APP_CONF.isuda.static}${url.replace('/', '')}`;
    } else {
      url = `${APP_CONF.isuda.static}${url}`;
    }
  }
  // 兼容空格图片地址
  return String(url || '').replace(/\s/g, encodeURIComponent(' '));
}

function getBackgroundStyle(background = {}) {
  let newBackground = Object.assign(
    {
      backgroundRepeat: 'no-repeat',
      backgroundSize: 'cover'
    },
    pick(
      Object.assign({}, background),
      'backgroundImage',
      'backgroundRepeat',
      'backgroundSize',
      'backgroundPosition',
      'backgroundColor'
    )
  );
  if (
    background.backgroundImage &&
    /linear-gradient/g.test(background.backgroundImage)
  ) {
    newBackground.backgroundImage = background.backgroundImage;
  } else {
    if (background.backgroundColor) {
      newBackground.backgroundColor = parseThemeColor(
        background.backgroundColor
      );
    }
    if (background.backgroundImage) {
      newBackground.backgroundImage = `url(${getHttpImageUrl(
        background.backgroundImage
      )})`;
    }
  }

  // 快应用背景不支持0无单位
  if (newBackground.backgroundPosition) {
    let arr = String(newBackground.backgroundPosition)
      .trim()
      .split(/\s+/)
      .map(val => {
        if (/\d+$/.test(val)) {
          return val + 'px';
        }
        return val;
      });

    newBackground.backgroundPosition = arr.join(' ');
  }

  // 兼容之前拉伸设置
  if (newBackground.backgroundSize === '100%') {
    newBackground.backgroundSize = '100% 100%';
  }
  return newBackground;
}

function getFontStyle(rawFont = {}) {
  const font = pick(rawFont, 'color', 'fontFamily', 'textAlign');

  if (/\s+/.test(rawFont.fontFamily)) {
    font.fontFamily = `'${rawFont.fontFamily}'`;
  }

  if (rawFont.opacity) {
    font.opacity = +rawFont.opacity / 100;
  }

  if (font.color) {
    font.color = parseThemeColor(font.color);
  }
  if (rawFont.bold) {
    font.fontWeight = 'bold';
  }
  if (rawFont.italic) {
    font.fontStyle = 'italic';
  }
  if (rawFont.underline) {
    font.textDecoration = 'underline';
  }
  if (rawFont.lineThrough) {
    font.textDecoration = 'line-through';
  }
  if (font.lineHeight > 12) {
    font.lineHeight = toVw(font.lineHeight);
  }
  if (rawFont.lines) {
    font.WebkitLineClamp = `${rawFont.lines}`;
  }
  if (rawFont.fontSize > 0) {
    font.fontSize = toVw(+rawFont.fontSize);
  }

  if (rawFont.letterSpacing > 0) {
    font.letterSpacing = toVw(+rawFont.letterSpacing);
  }
  return font;
}

function getBoxStyle(box = {}) {
  const newBox = pick(
    box,
    'borderLeftStyle',
    'borderRightStyle',
    'borderTopStyle',
    'borderBottomStyle',
    'borderLeftColor',
    'borderRightColor',
    'borderTopColor',
    'borderBottomColor'
  );

  ['top', 'left', 'right', 'bottom'].forEach(direction => {
    ['margin', 'padding'].forEach(item => {
      let field = kebabToCamel(`${item}-${direction}`);
      if (/^[-\d.]+$/.test(box[field]) && +box[field] !== 0) {
        newBox[field] = toVw(+box[field]);
      }
    });
  });

  if (+box.borderTopWidth > 0 && box.borderTopStyle !== 'none') {
    newBox.borderTopWidth = toVw(+box.borderTopWidth);
    newBox.borderTopColor = parseThemeColor(box.borderTopColor);
  } else {
    delete newBox.borderTopStyle;
  }

  if (+box.borderLeftWidth > 0 && box.borderLeftStyle !== 'none') {
    newBox.borderLeftWidth = toVw(+box.borderLeftWidth);
    newBox.borderLeftColor = parseThemeColor(box.borderLeftColor);
  } else {
    delete newBox.borderLeftStyle;
  }

  if (+box.borderRightWidth > 0 && box.borderRightStyle !== 'none') {
    newBox.borderRightWidth = toVw(+box.borderRightWidth);
    newBox.borderRightColor = parseThemeColor(box.borderRightColor);
  } else {
    delete newBox.borderRightStyle;
  }

  if (+box.borderBottomWidth > 0 && box.borderBottomStyle !== 'none') {
    newBox.borderBottomWidth = toVw(+box.borderBottomWidth);
    newBox.borderBottomColor = parseThemeColor(box.borderBottomColor);
  } else {
    delete newBox.borderBottomStyle;
  }

  [
    'borderTopLeftRadius',
    'borderTopRightRadius',
    'borderBottomLeftRadius',
    'borderBottomRightRadius'
  ].forEach(item => {
    if (box[item] > 0) {
      newBox[item] = toVw(+box[item]);
    }
  });
  return newBox;
}

function getFlexStyle(style = {}) {
  let result = {};

  // 快应用只支持flex
  result.display = 'flex';

  let flexSetting = style.flexSetting || {};
  result.flexDirection = flexSetting.direction || 'row';
  result.alignItems = flexSetting.align || 'stretch';
  result.justifyContent = flexSetting.justify || 'flex-start';

  if (style.flexSetting?.flexShrink >= 0) {
    result.flexShrink = +style.flexSetting.flexShrink;
  }

  if (style.flexSetting?.flex > 0) {
    result.flexGrow = +style.flexSetting.flex;
  }

  return result;
}

function toWHset(style, label) {
  const unit = style[label + 'Unit'] || 'px';
  if (unit === 'auto' || style[label] <= 0 || style[label] === 'auto') {
    return undefined;
  } else if (unit === 'px') {
    return /\d/.test(style[label]) ? toVw(+style[label]) : undefined;
  }
  return style[label] + unit;
}

function getBoxPosition(component) {
  if (['page'].includes(component.componentId)) {
    return {};
  }
  let {style = {}, isFlow} = component?.componentProperties || {};
  let pos = (style.justification || 'top left').split(' ');
  let result = {};
  if (isFlow) {
    let width = toWHset(style, 'width');
    let height = toWHset(style, 'height');
    if (width !== undefined) {
      result.width = width;
    }
    if (height !== undefined) {
      result.height = height;
    }
    // result.maxWidth = '100%';
    if (result.width > 0) {
      result.flexShrink = 0;
    }
  } else {
    let x = style[pos[1]] !== undefined ? style[pos[1]] : +style.x;
    let y = style[pos[0]] !== undefined ? style[pos[0]] : +style.y;
    if (isNumberFormat(x)) {
      result[`margin-${pos[1]}`] = toVw(x);
    }
    if (isNumberFormat(y)) {
      result[`margin-${pos[0]}`] = toVw(y);
    }
    // style.x !== undefined ? (result.marginLeft = toVw(style.x)) : undefined;
    // style.y !== undefined ? (result.marginTop = toVw(style.y)) : undefined;
    result.height = toWHset(style, 'height');
    result.width = toWHset(style, 'width');
  }
  if (style.opacity >= 0) {
    result.opacity = +style.opacity / 100;
  }
  if (style.display) {
    result.display = style.display;
  }
  return result;
}

function getBoxShadow(config = {}) {
  const {angle = 0, x, y, blur, size, color, distance = 0} = config;
  const shadowX =
    typeof x !== 'undefined'
      ? x
      : Math.round(Math.sin(angle * (Math.PI / 180)) * distance);
  const shadowY =
    typeof y !== 'undefined'
      ? y
      : -Math.round(Math.cos(angle * (Math.PI / 180)) * distance);
  // 移除boxshadow
  if (!x && !y && !blur && !size && !distance) {
    return {};
  }
  if (isNumberFormat(shadowX) && isNumberFormat(shadowY)) {
    return {
      boxShadow: `${toVw(shadowX)}px ${toVw(shadowY)}px ${toVw(
        blur || 0
      )}px ${toVw(size || 0)}px ${parseThemeColor(color)}`
    };
  }
  return {};
}

// 判断字符串或数字是否数字格式
function isNumberFormat(val) {
  return /^[-\d.]+$/.test(String(val));
}

function transformStyle(style = {}) {
  delete style.left;
  delete style.top;

  let result = {};
  Object.keys(style).forEach(key => {
    switch (key) {
      case 'box':
        result = Object.assign(result, getBoxStyle(style.box));
        break;

      case 'background':
        result = Object.assign(result, getBackgroundStyle(style.background));
        break;

      case 'font':
        result = Object.assign(result, getFontStyle(style.font));
        break;

      case 'lineHeight':
        if (style[key] >= 12) {
          result.lineHeight = toVw(+style[key]);
        }
        break;

      case 'boxShadow':
        result = Object.assign(result, getBoxShadow(style.boxShadow));
        break;

      case 'opacity':
        result.opacity = +style[key] / 100;
        break;

      case 'width':
        let width = style.autoWidth ? 'auto' : toWHset(style, 'width');
        if (width !== undefined) {
          result.width = width;
        }
        break;

      case 'flexSetting':
        result = Object.assign(result, getFlexStyle(style));
        break;

      case 'height':
        result.height = toWHset(style, 'height');
        break;

      case 'color':
        result.color = parseThemeColor(style[key]);
        break;

      case 'display':
        if (style[key] === 'block') {
          result.display = 'flex';
        }
        break;

      default:
        if (isObject(style[key])) {
          result = Object.assign(result, {[key]: transformStyle(style[key])});
        } else if (
          ![
            'x',
            'y',
            'left',
            'top',
            'right',
            'bottom',
            'css',
            'lineClamp',
            'columns',
            'flex',
            'display',
            'scrollX',
            'widthUnit',
            'heightUnit',
            'autoWidth',
            'mode',
            'activeColor',
            'bgColor',
            'shape'
          ].includes(key) &&
          style[key] !== '' &&
          style[key] !== undefined &&
          style[key] !== null
        ) {
          result[key] = isNumberFormat(style[key])
            ? toVw(style[key])
            : style[key];
        }
        break;
    }
  });
  return result;
}

/**
 * 命名转驼峰命名
 *
 * @param {string} str 任意字符串
 * @return {string} 驼峰命名
 */
function kebabToCamel(str) {
  return str.replace(/-[a-z]/g, item => item[1].toUpperCase());
}

function camelToKebab(str) {
  return str.replace(/([A-Z])/g, '-$1').toLowerCase();
}

function isObject(obj) {
  return (typeof obj === 'object' || typeof obj === 'function') && obj !== null;
}

function getCssStyle(styles) {
  let css = '';
  Object.keys(styles).forEach(item => {
    if (
      styles[item] !== undefined &&
      styles[item] !== '' &&
      !isObject(styles[item])
    ) {
      css += `\t${camelToKebab(item)}: ${styles[item]};\n`;
    }
  });
  return css;
}

function getImageMode(mode) {
  switch (mode) {
    case 'scaleToFill':
      return 'fill';
    case 'aspectFit':
      return 'contain';
    case 'aspectFill':
      return 'cover';
  }
  return 'cover';
}

function getNodeCss(node, cln) {
  if (!node || !node.id) {
    return '';
  }
  let style = node?.componentProperties?.style || {};

  let styles = {
    ...getBoxPosition(node),
    ...transformStyle(style)
  };

  if (node.componentId === 'flow-section') {
    styles = Object.assign({}, styles, getFlexStyle(style));
  }

  if (node.componentId === 'search') {
    styles.borderRadius =
      style.shape === 'round' ? toVw((style.height || 32) / 2) : 0;
  }

  if (node.componentId === 'column') {
    styles = {
      flex: style.flex,
      ...transformStyle(style)
    };
  }

  if (node.componentId === 'marquee') {
    styles.display = 'flex';
  }

  if (node.component === 'dynamic-list') {
    styles = {
      ...getBoxStyle(style.containerBox),
      columns: node.componentProperties?.style?.layout?.columns || 1
    };
  }

  if (['lines'].includes(node.componentId)) {
    styles = {
      width: style.width,
      height: style.height
    };
  }

  // 删除css中自定义属性
  delete styles.justification;
  delete styles.tabBackgroundColor;
  delete styles.activeTabColor;
  delete styles.tabColor;
  delete styles.tabFontSize;

  let css = '';
  let className = cln || `.node-${node.id}`;
  if (style.css) {
    css = style.css
      .replace(/:root/gm, className)
      .replace(/(\d+)px\s?[;|)]/gm, match => match.replace('px', 'dp'))
      .replace(/@color([a-zA-Z0-9]+)/gm, match => parseThemeColor(match));
  } else {
    css = getCssStyle(styles);
    if (css) {
      css = `${className} {\n${css}}\n`;
    }
  }

  // 部分组件需要生成子元素样式
  if (['button', 'text'].includes(node.componentId)) {
    let textCss = getCssStyle(transformStyle({font: style.font}));
    if (textCss) {
      css += `${className} text {\n${textCss}}\n`;
    }
  }

  if (node.componentId === 'lines') {
    let lineStyles = {
      height: toVw(style.lineWidth || 1),
      borderBottomWidth: toVw(+style.lineWidth || 1),
      borderBottomColor: parseThemeColor(style.lineColor),
      borderStyle: style.type || 'dashed'
    };
    let subCss = getCssStyle(lineStyles);
    if (subCss) {
      css += `${className} .ap-line-content {\n${subCss}}\n`;
    }
  }

  if (node.componentId === 'dynamic-list') {
    let isFlow = style.mode === 'flow';
    let itemStyle = {
      overflow: 'hidden',
      height: isFlow ? 'auto' : toVw(+style.height),
      minHeight: toVw(+style.height),
      ...getBackgroundStyle(style.background),
      ...getBoxStyle(style.box)
    };

    let subCss = getCssStyle(itemStyle);
    if (subCss) {
      css += `${className} .dynamic-item {\n${subCss}}\n`;
    }
  }

  if (node.componentId === 'image') {
    let box = pick(
      style.box || {},
      'borderBottomLeftRadius',
      'borderBottomRightRadius',
      'borderTopLeftRadius',
      'borderTopRightRadius'
    );

    let imageCss = getCssStyle({
      ...transformStyle({box}),
      objectFit: getImageMode(style.mode)
    });
    if (imageCss) {
      css += `${className} .content {\n${imageCss}}\n`;
    }
  }

  let removeCss = [
    'x',
    'y',
    'left',
    'top',
    'right',
    'bottom',
    'width',
    'height',
    'font',
    'box',
    'boxShadow',
    'widthUnit',
    'heightUnit',
    'display',
    'flex',
    'flexSetting',
    'autoWidth',
    'opacity',
    'css',
    'lineClamp'
  ];

  if (node.componentId !== 'slider-section') {
    removeCss.push('background');
  }

  removeCss.forEach(item => {
    delete style[item];
  });

  return css;
}

module.exports = {
  transformStyle,
  getBoxPosition,
  camelToKebab,
  getNodeCss
};
