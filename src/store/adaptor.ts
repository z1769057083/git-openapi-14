/**
 * @file 状态管理方法桥接，保证跟编辑器h5使用API一致
 */

import {PlainObject} from '@/types';

export default function (store, context) {
  let {getters, dispatch, commit} = context;

  // getter方法
  for (let fn in getters) {
    if (typeof getters[fn] === 'function') {
      store[fn] = getters[fn];
    }
  }

  // 设置变量
  store.setVariableValue = function (id: string, value: any) {
    return commit('setVariableValue', {
      id,
      value
    });
  };

  // 请求接口
  store.callAPI = function (conf: PlainObject = {}, params: PlainObject = {}) {
    return dispatch('callAPI', {conf, params});
  };

  // 触发动作
  store.triggerAction = function (event: PlainObject, props: PlainObject = {}) {
    return dispatch('triggerAction', {event, props});
  };
}
