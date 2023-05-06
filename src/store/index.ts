/**
 * 页面store
 */

import Constants, {Config} from '@/constants';
import {Store} from '@quickapp-eco/qappx';
import {createPageStore} from './page';
import {removeStorage, setStorage} from '@/utils/tools';

// 实例化store
const store = new Store({
  state: {
    device: 'quickapp', // 运行时环境，方便自定义动作判断
    foldState: 'fold', // 默认折叠状态，适配直板机
    toastInfo: {}, // toast提示及加载提示
    user: {},
    company: Config.company,
    app: Config.app,
    needReload: false,
    deferReloadPages: [],
    pages: []
  },
  getters: {
    getPageStore: state => {
      return (id: string) =>
        state.pages.find((page: any) => page.state?.id === id);
    }
  },
  mutations: {
    // 设置折叠屏状态
    setFoldState(state, status) {
      state.foldState = status;
    },

    // 更新用户信息
    setUserInfo(state, userInfo) {
      state.user = {
        ...state.user,
        ...userInfo
      };
      setStorage({
        key: Constants.USER_INFO_KEY,
        data: state.user
      });
    },
    // 登出操作
    logout(state) {
      console.log('退出登录');
      state.user = {};

      // 实际是异步的
      removeStorage(Constants.USER_INFO_KEY);
      removeStorage(Constants.APP_TOKEN);
    },
    // 添加延迟刷新页面
    addDeferReloadPage(state, pageId) {
      state.deferReloadPages.push(pageId);
    },
    // 删除延时刷新页面
    removeDeferReloadPage(state) {
      return (pageId: string) => {
        console.log('defer reload---', pageId);
        state.deferReloadPages = state.deferReloadPages.filter(
          id => id !== pageId
        );
      };
    },

    getPage(state, id) {
      return state.pages.find(page => page.id === id);
    },
    setReloadFlag(state) {
      state.needReload = true;
    },
    clearReloadFlag(state) {
      state.needReload = false;
    },
    addPage(state, page) {
      state.pages.push(page);
    },

    setToastInfo(state, toastInfo) {
      console.log('set info', toastInfo);
      state.toastInfo = toastInfo;
    }
  },
  actions: {
    async fetchPage({commit, dispatch, getters}, {pageId, options}) {
      let schema = options.schema;
      let page = getters.getPageStore(pageId);

      if (!page) {
        page = createPageStore(pageId);
        page.commit('init', {store: this, schema, options});
        commit('addPage', page);
        // 页面加载事件
        setTimeout(() => {
          page?.dispatch('handlePageEvent', 'load');
        }, 100);
      } else {
        page.commit('reload', options);
      }
    },
    async initPage(context, {pageId, options}) {
      let page = context.getters.getPageStore(pageId);
      if (page && !options.force) {
        page.commit('reload', options);
      } else {
        await context.dispatch('fetchPage', {pageId, options});
      }
    }
  }
});

// if (Config.runtime === 'web') {
//   (window as any).store = store;
// }

export default store;
