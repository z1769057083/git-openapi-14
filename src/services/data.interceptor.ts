/**
 * data拦截器 处理数据格式 接口错误等
 */

import Page from '@/utils/page';
import Constants from '@/constants/index';
import {LOGIN_FAILURE_LIST} from '@/constants/code';
import toast from '@/utils/toast';
import store from '@/store';
import {clearStorage, setStorage} from '@/utils/tools';

function getCamelKey(str) {
  let newStr = str.split('-');
  for (let i = 0; i < newStr.length; i++) {
    newStr[i] =
      newStr[i].slice(0, 1).toUpperCase() + newStr[i].slice(1).toLowerCase();
  }
  return newStr.join('-');
}

let token = ''; // token缓存

export default function (res) {
  // 先判断状态码
  if (
    LOGIN_FAILURE_LIST?.includes(String(res.statusCode)) ||
    LOGIN_FAILURE_LIST.includes(String(res.data.status))
  ) {
    // 清理本地数据
    clearStorage();
    store.commit('logout');

    // 自动跳转登录页
    return Page.gotoPage(`${Page.getRoutes().auth}`);
  } else if (res.statusCode && res.statusCode !== 200) {
    // 网络请求错误处理
    console.error(`接口异常: ${res.url}`, res.statusCode);
    toast.info(
      res?.data?.msg ||
        res?.data?.errMsg ||
        res.errorMsg ||
        res.error ||
        '请求错误'
    );
  }

  if (res.statusCode && res.statusCode !== 200) {
    toast.showToast({
      type: 'error',
      content: res.errMsg || '请求错误',
      icon: 'none',
      duration: 800
    });
    return;
  }

  // 从header中更新token
  let tokenKey = Constants.APP_TOKEN;
  let headerToken =
    res.header?.[tokenKey] || res.header?.[getCamelKey(tokenKey)];
  if (headerToken && headerToken !== token) {
    token = headerToken;
    setStorage({
      key: tokenKey,
      data: headerToken
    });
  }
}
