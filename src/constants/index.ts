import {IConfig, PlainObject} from '@/types';
import config from '../config.json';

/**
 * 对象key value翻转
 *
 * @param obj 待翻转对象
 */
function invertKeyAndValues(obj: PlainObject) {
  return Object.keys(obj).reduce((prev: PlainObject, key: string) => {
    prev[obj[key]] = key;
    return prev;
  }, {});
}

let pageIdMap = invertKeyAndValues(config.pageMap || {});

export const Config: IConfig = {
  ...config,
  pageIdMap
};

/**
 * 导出常量
 */
const Constants = {
  USER_INFO_KEY: 'app-user-info',

  /**
   * 平台登录token
   */
  APP_TOKEN: Config.token || 'token',

  CSRF_TOKEN: 'x-csrf-token',

  // 默认登录API
  LOGIN_API: Config.loginAPI || '/login',

  TOKEN_API: '/csrfToken'
};

/**
 * 网络链接
 */
export enum HOSTS {
  ISUDA = 'isuda'
}

export default Constants;

export const APP_CONF = {
  isuda: {
    base: Config.host,
    static: Config.staticHost,
    login: Config.loginAPI || '/login'
  }
};
