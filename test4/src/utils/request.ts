/**
 * 请求基类
 */

import fetch from '@system.fetch';
import uploadtask from '@system.uploadtask';
import downloadtask from '@system.downloadtask';
import media from '@system.media';
import Constants, {APP_CONF, Config, HOSTS} from '@/constants/index';
import {LOGIN_FAILURE_LIST, SUCC_LIST} from '@/constants/code';
import {get} from '@/utils/helper';
import toast from '@/utils/toast';
import {PlainObject} from '@/types';
import store from '@/store';
import headerInterceptor from '@/services/header.interceptor';
import dataInterceptor from '@/services/data.interceptor';
import {setStorage} from './tools';

interface IOptions {
  [key: string]: any;
  hostKey: HOSTS;
}

interface IRequestConfig {
  [key: string]: any;
  url: string;
  data?: any;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'UPLOAD';
  responseAdaptor?: (response: any) => any;
  isDownload?: boolean;
  isUpload?: boolean;
  isErrorToast?: boolean;
}

class BaseRequest {
  options: IOptions = {
    hostKey: HOSTS.ISUDA
  };

  apiPrefix: string = '';
  apiPrefixKey: string = '';

  constructor(options?: IOptions) {
    if (options) {
      this.options = Object.assign({}, this.options, options);
    }
    let env = Config.app.env;
    this.apiPrefix = `/api/company/${Config.company?.key}/app/${
      Config.app.key
    }${env === 'latest' ? '' : `-${env}`}`;
    this.apiPrefixKey = `/api/company/${Config.company?.key}`;
  }

  formatUrl(url: string, data: PlainObject) {
    let reg = /{{([^{}]+)}}/g;
    let match = url.match(reg);
    let newUrl = url;
    while ((match = reg.exec(url))) {
      let key = match[1];
      // api中心里query里不会存在动态参数，都统一从输入中获取，不管是否有数据都进行替换
      let val = get({input: data, query: data}, String(key).trim(), '');
      newUrl = newUrl.replace(`{{${key}}}`, val);
    }

    newUrl = newUrl.replace(/(\${)(.*?)(})/g, (...args: string[]) => {
      const replaceStr = data[args[2]] || '';
      return replaceStr;
    });

    return newUrl;
  }

  async request({
    url,
    data,
    method,
    header = {
      'Content-Type': 'application/json'
    },
    responseType = 'json',
    isDownload = false,
    isUpload = false,
    isErrorToast = false,
    responseAdaptor
  }: IRequestConfig) {
    // 添加自定义请求头，用于host和header处理
    const hostKey = this.options.hostKey;
    header = await headerInterceptor({header});

    if (!header['Content-Type']) {
      header['Content-Type'] = 'application/json';
    }

    if (!APP_CONF[hostKey]) {
      throw `请补充${hostKey}环境配置`;
    }
    // 如果传入url自带域名则不做处理 否则加上对应的域名

    if (!(url.startsWith('https://') || url.startsWith('http://'))) {
      url = `${APP_CONF[hostKey].base}${url}`;
    }
    // 格式化url动态参数{{env.xxx}} {{input.xxx}}
    url = this.formatUrl(url, data);

    // 下载文件单独处理
    if (isDownload) {
      return new Promise((resolve, reject) => {
        return downloadtask.downloadFile({
          url,
          data,
          header,
          success(res) {
            toast.success('文件下载成功');
            let filePath = res.filePath;
            console.log('下载文件存储地址', filePath);
            resolve(filePath);
          },
          fail(err) {
            toast.info(err?.errMsg || '下载出错');
            console.log('uploadFile err', err);
            reject(err);
          }
        });
      });
    }

    if (method === 'UPLOAD' || isUpload) {
      // UPLOAD方法特殊处理
      return new Promise((resolve, reject) => {
        // 文件上传竟然不走全局拦截器
        header = headerInterceptor({header});
        media.pickImage({
          success: async chooseImageRes => {
            toast.loading('正在上传');

            uploadtask.uploadFile({
              url,
              filePath: chooseImageRes.uri,
              name: 'file',
              header: header,
              timeout: 60000,
              success(res) {
                const resultData = res.data;
                let result = JSON.parse(resultData);

                // 自定义返回适配
                console.log('上传返回', result);
                if (responseAdaptor) {
                  result = responseAdaptor(result);
                  console.log('upload 格式化返回结果----', result);
                }

                if (SUCC_LIST.includes(result.status)) {
                  resolve(result);
                } else {
                  toast.info(result.msg || '上传出错');
                  reject(result);
                }
                toast.hideLoading();
              },
              fail(err) {
                console.log('uploadFile err', err);
                toast.hideLoading();
                reject(err);
              }
            });
          }
        });
      });
    }

    // 通用loading可能不需要，TODO改成配置
    // toast.loading();

    let res: any = await new Promise((resolve, reject) => {
      fetch.fetch({
        url,
        data,
        method,
        header,
        responseType,
        success: (res: any) => {
          toast.hideLoading();
          // 判断 请求api 格式是否正确
          dataInterceptor(res);

          // 错误处理
          if (isErrorToast && res.data.status !== 0) {
            toast.info(res.data.msg);
          }
          // 将结果抛出
          resolve(res.data);
        },
        //请求失败
        fail: e => {
          toast.hideLoading();
          resolve(e);
        }
      });
    });

    // 自定义返回适配
    if (responseAdaptor) {
      res = responseAdaptor(res);
      console.log('请求返回适配器处理结果', res);
    } else {
      console.log('无请求返回格式化配置', res);
    }

    const statusCode = res?.status;

    // 登录后保存token
    if (url.includes(Constants.LOGIN_API)) {
      if (['0', '302'].includes(String(statusCode))) {
        // 存储可能的登录token，此处token的key没有暴露配置，需要返回token字段
        let resData = res?.data || {};
        if (resData.token) {
          setStorage({
            key: Constants.APP_TOKEN,
            data: resData.token
          });
        }

        // 登录接口都默认认为返回用户信息
        if (Object.keys(resData).length > 1) {
          console.log('更新用户信息', resData);
          store.commit('setUserInfo', resData);
        }
        return res;
      } else {
        console.warn(
          `登录失败，状态码${statusCode}。是否登录接口未进行返回格式化？`
        );
      }
    }

    // 4. 登录失效前端逻辑处理
    if (LOGIN_FAILURE_LIST.includes(String(statusCode))) {
      store.commit('logout');
    }

    return res;
  }

  get(payload: {url: string; data: any; showToast?: boolean; header?: any}) {
    return this.request({
      method: 'GET',
      ...payload
    });
  }

  post(payload: {url: string; data?: any; header?: any; showToast?: boolean}) {
    return this.request({
      method: 'POST',
      ...payload
    });
  }

  put(payload: {url: string; data: any; header?: any; showToast?: boolean}) {
    return this.request({
      method: 'PUT',
      ...payload
    });
  }

  delete(payload: {url: string; data: any; header?: any}) {
    return this.request({
      method: 'DELETE',
      ...payload
    });
  }

  jsonp(payload: {url: string; data: any; header?: any}) {
    return this.request({
      method: 'GET',
      jsonp: true,
      ...payload
    });
  }

  /**
   * 上传文件
   */
  upload(payload: {url?: string; data: any; header?: any}) {
    return this.request({
      ...payload,
      url: payload.url || `${this.apiPrefix}/object-upload/default`,
      method: 'UPLOAD',
      header: {}
    });
  }

  /**
   * 下载文件
   */
  download(payload: {url: string; data: any; header?: any}) {
    return this.request({
      ...payload,
      method: 'GET',
      isDownload: true
    });
  }
}

export const baseReq = new BaseRequest();

export const fetcher = ({
  url,
  method,
  data,
  header,
  responseAdaptor,
  isDownload,
  isUpload,
  isErrorToast
}: any) => {
  method = method.toLowerCase();
  if (isDownload) {
    method = 'download';
  }
  return baseReq[method]({
    url,
    data,
    header,
    responseAdaptor,
    isDownload,
    isUpload,
    isErrorToast
  });
};
