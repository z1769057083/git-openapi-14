/**
 * @file 通用方法
 */

import {pick, get, set, isString} from '@/utils/helper';
import prompt from '@system.prompt';
import {IComponent, IOptions, PlainObject} from '../types';
import {APP_CONF} from '@/constants';
import router from '@system.router';

// @if PLATFORM ='quickapp'
import geolocation from '@system.geolocation';
// @endif

// @if PLATFORM ='quickapp-card'
import geolocation from '@system.card.geolocation';
// @endif

export const viewportWidth = 750;

const themeMap: PlainObject = {
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

// TODO 主题色同步
export const parseThemeColor = function (color: string) {
  if (String(color).startsWith('@') && themeMap[color]) {
    return themeMap[color];
  }
  return color;
};

export function toVw(size: number) {
  // return size * 2 + 'px';
  return size + 'dp';
}

export function toPx(size: number | string) {
  const screenWidth = viewportWidth;
  const result = (+size / screenWidth) * 100;
  return Number.isNaN(result) ? undefined : result + 'px';
}

export function getHttpImageUrl(url: string) {
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

export function getBackgroundStyle(background: PlainObject = {}) {
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
    // 快应用不支持动态背景图
    if (background.backgroundImage) {
      newBackground.backgroundImage = getHttpImageUrl(
        background.backgroundImage
      );
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

export function deepClone(node: PlainObject) {
  return JSON.parse(JSON.stringify(node));
}

// 转换小程序组件名
export function transformComponentId(str: string) {
  return `-${str}`.replace(/(-[A-Za-z])/g, m => {
    return m.toUpperCase().replace('-', '');
  });
}

export interface TreeItem {
  [propName: string]: any;
  children?: TreeArray;
}

export type TreeArray = TreeItem[];

// 时间格式化
export function dateFormat(source: string | number | Date, pattern: string) {
  // 快应用是安卓，不用兼容ios的日期bug
  if (
    typeof source === 'string' &&
    /^\d+$/.test(source) &&
    source.length === 13
  ) {
    source = parseInt(source, 10);
  }

  // 兼容之前的小写yyyy
  pattern = String(pattern).replace(/y/g, 'Y').replace(/d/g, 'D');

  let replacer = function (patternPart: RegExp, result: any) {
    pattern = pattern.replace(patternPart, result);
  };
  let pad = function (n: string | number) {
    return String(n).length > 1 ? String(n) : `0${n}`;
  };
  let date = new Date(source);
  let year = date.getFullYear();
  let month = date.getMonth() + 1;
  let date2 = date.getDate();
  let hours = date.getHours();
  let minutes = date.getMinutes();
  let seconds = date.getSeconds();
  replacer(/YYYY/gi, String(year));
  replacer(/YY/gi, pad(year.toString().slice(2)));
  replacer(/MM/g, pad(month));
  replacer(/M/g, month);
  replacer(/DD/g, pad(date2));
  replacer(/D/g, date2);
  replacer(/HH/g, pad(hours));
  replacer(/H/g, hours);
  replacer(/hh/g, pad(hours % 12));
  replacer(/h/g, hours % 12);
  replacer(/mm/g, pad(minutes));
  replacer(/m/g, minutes);
  replacer(/ss/g, pad(seconds));
  replacer(/s/g, seconds);
  return pattern;
}

// 时间格式化，为了节省体积去掉dayjs
// export function dateFormat(source: string | number | Date, pattern: string) {
//   if (
//     typeof source === 'string' &&
//     /^\d+$/.test(source) &&
//     source.length === 13
//   ) {
//     source = parseInt(source, 10);
//   }
//   return dayjs(source).format(pattern);
// }

// 判断字符串或数字是否数字格式
export function isNumberFormat(val: string | number) {
  return /^[-\d.]+$/.test(String(val));
}

/**
 * @desc 获取日期是当年的第几周
 *
 * @param bool sunday 每一周是否从周日开始
 */
export function getWeek(day, sunday = false) {
  const milliseconds = 24 * 3600000;
  let start = new Date(String(day.getFullYear()) + '/01/01');
  let offset = start.getDay() > 0 ? 8 - start.getDay() : 1;
  offset = sunday ? offset - 1 : offset;
  return Math.abs(
    Math.ceil(
      (day.getTime() - start.getTime() - offset * milliseconds) /
        milliseconds /
        7
    )
  );
}

const fns: {
  [propName: string]: (...classes) => string;
} = {};

export function isPlainObject(obj: any): boolean {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  let proto = obj;
  while (Object.getPrototypeOf(proto) !== null) {
    proto = Object.getPrototypeOf(proto);
  }
  // proto = null
  return Object.getPrototypeOf(obj) === proto;
}

export function jsonValueMap(
  json: any,
  mapper: (
    value: any,
    key: string | number,
    host: PlainObject,
    stack: PlainObject[]
  ) => any,
  stack: PlainObject[] = []
) {
  if (Array.isArray(json)) {
    let flag = false;
    let mapped = json.map((value, index) => {
      let maped: any;

      if (isPlainObject(value) || Array.isArray(value)) {
        maped = mapper(
          jsonValueMap(value, mapper, [json].concat(stack)),
          index,
          json,
          [json].concat(stack)
        );
      } else {
        maped = mapper(value, index, json, [json].concat(stack));
      }

      if (maped !== value) {
        flag = true;
        return maped;
      }

      return value;
    });
    return flag ? mapped : json;
  } else if (!isPlainObject(json)) {
    return json;
  }

  let flag = false;
  const toUpdate: any = {};
  Object.keys(json).forEach(key => {
    const value: any = json[key];
    let maped;

    if (isPlainObject(value) || Array.isArray(value)) {
      maped = mapper(
        jsonValueMap(value, mapper, [json].concat(stack)),
        key,
        json,
        [json].concat(stack)
      );
    } else {
      maped = mapper(value, key, json, [json].concat(stack));
    }

    if (maped !== value) {
      flag = true;
      toUpdate[key] = maped;
    }
  });

  return flag
    ? {
        ...json,
        ...toUpdate
      }
    : json;
}

export const afterNextAnimationFrame = callback =>
  requestAnimationFrame(() => requestAnimationFrame(callback));

export function guid() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  }
  return 'a-' + s4() + s4() + s4();
}

/**
 * 命名转驼峰命名
 *
 * @param {string} str 任意字符串
 * @return {string} 驼峰命名
 */
export function kebabToCamel(str) {
  return str.replace(/-[a-z]/g, item => item[1].toUpperCase());
}

export function camelToKebab(str: string) {
  return str.replace(/([A-Z])/g, '-$1').toLowerCase();
}

export function findNodeById(tree, id: any, field = 'id'): IComponent | null {
  function searchNode(list): IComponent | null {
    let node: IComponent | null = null;
    for (let item of list) {
      if (item[field] === id) {
        node = item;
        break;
      }
      if (item.children && item.children.length) {
        let result = searchNode(item.children);
        if (result) {
          node = result;
          break;
        }
      }
    }
    return node;
  }
  return searchNode(tree.children || tree);
}

export function isObject(obj: any) {
  return (typeof obj === 'object' || typeof obj === 'function') && obj !== null;
}

export const isReg = (value: any) => value instanceof RegExp;

// 延迟执行
export function sleep(sec: number) {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve(null);
    }, sec * 1000);
  });
}

interface ParamMap {
  targetName: string;
  sourceName: string;
}

export function getTplValue(tpl: string, data: any) {
  tpl = tpl.replace(/{{([^{}]+)}}/g, (...args: string[]) => {
    const replaceStr = get(data, args[1], '');
    return replaceStr;
  });

  return tpl;
}

// 执行参数映射功能
export function makeParmMap(paramMap: ParamMap[], data: PlainObject) {
  let outputData: PlainObject = {};
  for (const param of paramMap) {
    let value = getTplValue(param.sourceName, data);
    if (typeof value === 'undefined' || value === '') {
      continue;
    }
    if (param.targetName) {
      set(outputData, param.targetName, value);
    }
  }
  return outputData;
}

export function isValidUrl(url: string) {
  return url.startsWith('https://') || url.startsWith('http://');
}

export function getCurrentPages() {
  return router.getPages();
}

export function getCurPage() {
  let pages = getCurrentPages();
  let curPage = pages[pages.length - 1];
  return curPage;
}

function checkGeoPermission() {
  return new Promise((resolve, reject) => {
    try {
      geolocation.checkPermission({
        success: function (data) {
          console.log(`checkPermission success: ${data}`);
          resolve(true);
        },
        fail: function (data, code) {
          // 201 用户拒绝 1000 系统系统关闭
          console.info(`checkPermission fail, code = ${code}, data = ${data}`);
          resolve(false);
        },
        complete: function () {
          console.log('checkPermission has completed');
        }
      });
    } catch (e) {
      console.log(`checkPermission error,${e}`);
    }
  });
}

function requestGeoPermission() {
  return new Promise((resolve, reject) => {
    try {
      geolocation.requestPermission({
        success: function (data) {
          console.info(`requestPermission success: ${data}`);
          resolve(data === 0);
        },
        fail: function (data, code) {
          // 201 用户拒绝 1000 系统关闭  1101卡包解析异常
          console.info(
            `requestPermission fail, code = ${code}, data = ${data}`
          );
          resolve(false);
        },
        complete: function () {
          console.log('requestPermission has completed');
        }
      });
    } catch (e) {
      console.log(`requestPermission error,${e}`);
    }
  });
}

//  返回城市名称如“南京市”、“上海市”或者空串
function getGeolocation() {
  return new Promise((resolve, reject) => {
    try {
      geolocation.getLocation({
        timeout: 5000,
        success: function (data) {
          // {longitude, latitude, province, city }
          console.log(
            `handling success: longitude = ${data.longitude}, latitude = ${data.latitude}`
          );
          console.log(JSON.stringify(data));
          resolve(data);
        },
        fail: function (data, code) {
          // 200 位置为空， 201 用户拒绝 203 定位异常 204 超时  1000 位置开关关闭
          console.info(
            `handling getLocation fail, code = ${code}, data = ${data}`
          );
          resolve({});
        }
      });
    } catch (e) {
      console.log(`getLocation error,${e}`);
      resolve({});
    }
  });
}

export async function getCurrentLocation() {
  try {
    const isPermitted = await checkGeoPermission();

    if (isPermitted) {
      return getGeolocation();
    }

    const requestResult = await requestGeoPermission();

    if (requestResult) {
      return getGeolocation();
    }
  } catch (e) {
    console.error(e);
    return {};
  }
}

export async function dialogConfirm(options: PlainObject) {
  if (options.confirmButtonText === '') {
    delete options.confirmButtonText;
  }
  if (options.cancelButtonText === '') {
    delete options.cancelButtonText;
  }
  return new Promise((resolve, reject) => {
    prompt.showDialog({
      title: options.title,
      message: options.message,
      buttons: [
        {
          text: options.confirmButtonText || '确认',
          color: '#ee0a24'
        },
        {
          text: options.cancelButtonText || '取消',
          color: '#323233'
        }
      ],
      success: function (data) {
        if (data && +data.index === 0) {
          return resolve({});
        }
        return reject('操作取消');
      },
      cancel: function () {
        return reject('操作取消');
      }
    });
  });
}

export function getBindDataField(conf: PlainObject) {
  let fields = (conf?.fields || []).filter((field: any) =>
    String(field.fieldKey).startsWith('data.')
  );
  if (!fields.length) {
    return null;
  }
  return fields[0].field;
}

export function addNum(num1, num2) {
  let sq1, sq2, m;
  try {
    sq1 = num1.toString().split('.')[1].length;
  } catch (e) {
    sq1 = 0;
  }
  try {
    sq2 = num2.toString().split('.')[1].length;
  } catch (e) {
    sq2 = 0;
  }
  m = Math.pow(10, Math.max(sq1, sq2));
  return (Math.round(num1 * m) + Math.round(num2 * m)) / m;
}

// 获取组件的主class
export function getClasses(props: PlainObject): string {
  let {componentProperties = {}, id} = props;
  let style = componentProperties.styles || {};
  return `node-${id} ${style.className || ''}`;
}
