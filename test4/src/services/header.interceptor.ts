/**
 * 头部拦截器 处理请求头的配置
 */

import Constants from '@/constants/index';
import {getStorage} from '@/utils/tools';

export default async function (chain) {
  const requestParams = chain;
  if (!requestParams.header) {
    requestParams.header = {};
  }

  let token = await getStorage(Constants.APP_TOKEN);
  if (token) {
    requestParams.header[Constants.APP_TOKEN] = token;
  }

  return requestParams.header;
}
