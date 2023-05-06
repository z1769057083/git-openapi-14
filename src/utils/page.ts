import router from '@system.router';
import webview from '@system.webview';
import prompt from '@system.prompt';
import pkg from '@system.package';
import {Config} from '@/constants';
import {PlainObject} from '@/types';
import {getCurrentPages} from '.';

class Pages {
  constructor() {}

  homepage = `/${Config.pages[0]}`;

  /**
   * 页面枚举
   */
  getRoutes() {
    let login = 'pages/login/index';
    // 自定义登录页
    if (Config.loginPage && Config.pageIdMap[Config.loginPage]) {
      login = Config.pageIdMap[Config.loginPage];
    }
    return {
      /**
       * 首页
       */
      home: Config.pages[0],

      /**
       * 授权页
       */
      auth: login,

      /**
       * 401 跳转白名单
       */
      noRedirectPage: []
    };
  }

  // 获取当前路由
  getCurrentRoute() {
    let pages = getCurrentPages(); //获取加载的页面
    let currentPage = pages[pages.length - 1]; //获取当前页面的对象
    return currentPage?.path;
  }

  getCurrentInstance() {
    const curPages = getCurrentPages();
    return curPages[curPages.length - 1]!;
  }

  isPageInTabBar(path: string = '') {
    let tabBar = Config.tabBar?.list || [];
    if (!tabBar.length) {
      return false;
    }
    return tabBar.find(
      item => item.pagePath.replace(/^\//, '') === path.replace(/^\//, '')
    );
  }

  gotoPage(path: string, query?: PlainObject, target?: string) {
    let pagePath = !path.startsWith('/') ? `/${path}` : path;

    let currentPage = this.getCurrentRoute();
    if (pagePath === currentPage || pagePath === `/${currentPage}`) {
      return;
    }

    console.info(`[动作-页面跳转] 跳转 ${pagePath}`);
    if (target === '_self') {
      return router.replace({uri: pagePath, params: query});
    }
    return router.push({uri: pagePath, params: query});
  }

  openWebview(url: string, openType?: string) {
    console.log(`[动作-打开网页]${url}`);
    if (openType === 'webview') {
      webview.loadUrl({
        url,
        allowthirdpartycookies: true
      });
    } else {
      router.push({
        uri: `hnquick://browser//parameter?url=${encodeURIComponent(url)}`
      });
    }
  }

  openApp(packageName: string, uri: string) {
    pkg.hasInstalled({
      package: packageName, // 目标包名（微信包名）
      success: function (data) {
        // 接口调用成功，CP根据自身情况判断是否进行APP跳转
        console.log('handling success: ' + data.result);
        if (data.result) {
          router.push({
            uri
          });
        } else {
          prompt.showToast({
            message: '没有安装此APP'
          });
        }
      },
      fail: function (data, code) {
        console.log('handling fail, code=' + code + 'data=' + data);
      }
    });
  }

  openDeepLink(uri: string) {
    router.push({
      uri
    });
  }

  // 获取当前页面ID
  getCurrentPageId(route: string) {
    return Config.pageMap[route];
  }

  backToHome(query?: PlainObject) {
    return this.gotoPage(this.homepage, query);
  }

  // 返回上一页
  back(delta = {}) {
    return router.back(delta);
  }

  redirectToHome() {
    router.push({
      uri: this.homepage
    });
  }

  goToLogin() {
    router.push({
      uri: '/pages/login/index'
    });
  }
}

export default new Pages();
