import type {PlainObject} from '@/types';
import {getCurrentPages} from '.';
import page from './page';

export const Action = {
  // 返回
  goBack: () => {
    let pages = getCurrentPages();
    if (pages.length > 1) {
      page.back();
    } else {
      page.backToHome();
    }
  },

  // 更新组件属性
  updateProperties: (
    nodeId: string,
    operation: any,
    store: any,
    params: PlainObject
  ) => {
    let props = operation.map((item: PlainObject) => {
      let value = store?.getters?.getAssignValue(item.value, params);
      return {
        key: item.attribute,
        value
      };
    });

    store.updateProperties(nodeId, props);
  },

  // 滚动到锚点
  scrollToAnchor(id: string) {}
};
