/**
 * @file 自定义工具函数
 */

import storage from '@system.storage';
import {isObject} from '@/utils/helper';
import downloadtask from '@system.downloadtask';
import media from '@system.media';
import toast from './toast';
import pay from '@service.pay';
import {PlainObject} from '@/types';

// 读取存储
export async function getStorage(key: string) {
  return new Promise((resolve, reject) => {
    storage.get({
      key,
      success: function (data) {
        let result;
        try {
          result = JSON.parse(data);
        } catch (e) {
          result = data;
        }
        resolve(result);
      },
      fail: function (data, code) {
        console.log(`get fail, code = ${code}`);
        resolve(null);
      }
    });
  });
}

// 设置存储
export async function setStorage({key, data}: {key: string; data: any}) {
  return new Promise((resolve, reject) => {
    storage.set({
      key,
      value: isObject(data) ? JSON.parse(data) : data,
      success: function (data) {
        resolve({});
      },
      fail: function (data, code) {
        console.log(`set fail, code = ${code}`);
        reject('设置存储失败' + code);
      }
    });
  });
}

// 删除存储
export async function removeStorage(key: string) {
  return new Promise((resolve, reject) => {
    storage.delete({
      key,
      success: function (data) {
        resolve({});
      },
      fail: function (data, code) {
        console.log(`delete storage fail, code = ${code}`);
        reject('删除存储失败' + code);
      }
    });
  });
}

// 清空存储
export function clearStorage() {
  return new Promise((resolve, reject) => {
    storage.clear({
      success: function (data) {
        console.log('clear success');
        resolve({});
      },
      fail: function (data, code) {
        console.log(`handling fail, code = ${code}`);
        reject('清空失败' + code);
      }
    });
  });
}

// 下载图片到相册
export async function downloadPicture(url: string) {
  return new Promise((resolve, reject) => {
    toast.loading();
    downloadtask.downloadFile({
      url,
      success: res => {
        if (res.statusCode === 200) {
          media.saveToPhotosAlbum({
            uri: res.filePath,
            success: function () {
              toast.success('保存成功');
              resolve('保存成功');
            },
            fail: function (e) {
              toast.error('保存失败' + e);
              reject('保存失败');
            }
          });
        } else {
          toast.showToast({
            icon: 'none',
            content: '保存失败'
          });
          reject('保存失败');
        }
      },
      fail: function () {
        toast.hideLoading();
        toast.showToast({
          icon: 'none',
          content: '保存失败'
        });
        reject('保存失败');
      }
    });
  });
}

export function startPay(options: PlainObject) {
  return new Promise((resolve, reject) => {
    pay.pay({
      orderInfo: options.orderInfo,
      success: function (res) {
        console.log('支付成功:' + JSON.stringify(res));
        resolve(res);
      },
      fail: function (err) {
        console.log('支付错误:' + JSON.stringify(err));
        reject(err);
      }
    });
  });
}
