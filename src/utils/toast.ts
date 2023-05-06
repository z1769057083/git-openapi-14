/**
 * taro toast封装简化
 */

import store from '@/store';
import {PlainObject} from '@/types';

class Toast {
  /**
   * 展示加载动画
   * @param title 加载文字
   * @param mask 是否展示遮罩
   */
  loading(title?: string, duration: number = 2000, mask = true) {
    store.commit('setToastInfo', {
      type: 'loading',
      content: title || '加载中',
      duration: duration / 1000,
      mask
    });
  }

  /**
   * 隐藏loading
   */
  hideLoading() {
    store.commit('setToastInfo', {});
  }

  /**
   * 弹出成功信息
   * @param title 标题
   */
  success(title: string, duration: number = 2000) {
    store.commit('setToastInfo', {
      type: 'success',
      content: title,
      duration: duration / 1000
    });
  }

  /**
   * 弹出错误提示
   * @param title 标题
   */
  error(title: string, duration: number = 2000) {
    store.commit('setToastInfo', {
      type: 'error',
      content: title,
      duration: duration / 1000
    });
  }

  /**
   * 弹出错误信息 无图标
   */
  info(title: string, duration = 1800, mask = true) {
    store.commit('setToastInfo', {
      content: title,
      mask,
      duration: duration / 1000
    });
  }

  showToast(toastInfo: PlainObject) {
    if (toastInfo.duration > 0) {
      toastInfo.duration = toastInfo.duration / 1000;
    }
    store.commit('setToastInfo', toastInfo);
  }

  /**
   * 隐藏toast
   */
  hide() {
    store.commit('setToastInfo', {});
  }
}

export default new Toast();
