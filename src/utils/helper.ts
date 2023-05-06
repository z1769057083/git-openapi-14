/**
 * @file 工具方法集合，为了精简代码不使用lodash
 */

// 处理 path， path有三种形式：'a[0].b.c'、'a.0.b.c' 和 ['a','0','b','c']，需要统一处理成数组，便于后续使用
function _basePath(path) {
  // 若是数组，则直接返回
  if (Array.isArray(path)) {
    return path;
  }
  // 若有 '[',']'，则替换成将 '[' 替换成 '.',去掉 ']'
  return path.replace(/\[/g, '.').replace(/\]/g, '').split('.');
}

function pick(obj, ...args) {
  if (!obj) {
    return {};
  }
  return args.reduce(
    (iter, val) => (val in obj && (iter[val] = obj[val]), iter),
    {}
  );
}

function get(source: any, path: string, defaultValue: any = undefined) {
  // translate array case to dot case, then split witth .
  // a[0].b -> a.0.b -> ['a', '0', 'b']
  const keyList = path.replace(/\[(\d+)\]/g, '.$1').split('.');

  const result = keyList.reduce((obj, key) => {
    return Object(obj)[key];
  }, source);
  return result === undefined ? defaultValue : result;
}

function set(object, path, value) {
  if (typeof object !== 'object') return object;
  _basePath(path).reduce((o, k, i, _) => {
    if (i === _.length - 1) {
      // 若遍历结束直接赋值
      o[k] = value;
      return null;
    } else if (k in o) {
      // 若存在对应路径，则返回找到的对象，进行下一次遍历
      return o[k];
    } else {
      // 若不存在对应路径，则创建对应对象，若下一路径是数字，新对象赋值为空数组，否则赋值为空对象
      o[k] = /^[0-9]{1,}$/.test(_[i + 1]) ? [] : {};
      return o[k];
    }
  }, object);
  // 返回object
  return object;
}

function isNumber(value) {
  return typeof value === 'number';
}

function isString(value) {
  return typeof value === 'string';
}

function isObject(value) {
  var type = typeof value;
  return value != null && (type == 'object' || type == 'function');
}

function isEmpty(value) {
  if (value == null || value === undefined) {
    return true;
  }
  if (
    Array.isArray(value) ||
    typeof value == 'string' ||
    typeof value.splice == 'function'
  ) {
    return !value.length;
  }
  for (var key in value) {
    if (Object.prototype.hasOwnProperty.call(value, key)) {
      return false;
    }
  }
  return true;
}

function getUrlParams(url) {
  const arrSearch = url.split('?').pop().split('#').shift().split('&');
  let obj = {};
  if (!String(url).includes('?')) {
    return obj;
  }
  arrSearch.forEach(item => {
    const [k, v] = item.split('=');
    if (k !== '' && v !== undefined) {
      obj[k] = v;
    }
    return obj;
  });
  return obj;
}

export {pick, get, set, isNumber, isString, isObject, isEmpty, getUrlParams};
