/**
 * 数据store
 */

import {get, isEmpty, set} from '@/utils/helper';
import {Store} from '@quickapp-eco/qappx';
import {LOGIN_FAILURE_LIST} from '@/constants/code';
import {PlainObject} from '@/types';
import {fetcher} from '@/utils/request';
import {deepClone, isReg} from '@/utils';
// import {locale, validations} from '@/utils/validation';
import Toast from '@/utils/toast';
import {SUCC_LIST} from '@/constants/code';

export type MethodType =
  | 'get'
  | 'post'
  | 'put'
  | 'delete'
  | 'patch'
  | 'jsonp'
  | 'upload';

export interface IDataSource {
  id: string;
  page: number;
  total: number;
  isLoading: boolean;
  isSubmitting: boolean;
  isEnd: boolean;
  data: PlainObject | PlainObject[];
  inputData: PlainObject;
  validations: PlainObject;
  modelOptions: PlainObject;
  store: any;
  initialized: boolean;
  isStandardList: boolean;
  options: PlainObject;
  formInstance: PlainObject;
  isBadNetwork: boolean;
}

export function validateFieldValue(store, field) {
  let {getters, state, commit} = store;
  let value = getters.getFieldValue(field, 0, 'input');
  let validation = {...state.validations[field]};

  if (!validation) {
    return null;
  }
  let status = 'resolve';
  let message = '';
  if (
    validation.required &&
    (value === null || value === undefined || value === '')
  ) {
    // message = locale['validate.isRequired'];
    message = '这是必填项';
    status = 'reject';
  }

  // else {
  //   let rules = validation.rules || [];
  //   for (let i = 0, len = rules.length; i < len; i++) {
  //     let rule = rules[i] || {};
  //     if (isReg(rule.rule)) {
  //       status = rule.rule.test(value) ? 'resolve' : 'reject';
  //       message = rule.message || '校验失败';
  //     } else if (validations[rule.rule]) {
  //       let result = validations[rule.rule]?.(value, rule[rule.rule]);
  //       if (!result) {
  //         status = 'reject';
  //         message = String(
  //           locale[`validate.${rule.rule}`] || '校验失败'
  //         ).replace('$1', rule[rule.rule]);
  //         break;
  //       }
  //     }
  //     if (status === 'reject') {
  //       break;
  //     }
  //   }
  // }
  validation.message = message;
  validation.status = status;

  commit('setState', {
    validations: {
      ...state.validations,
      [field]: validation
    }
  });

  return status;
}

export function validateFields(store) {
  let {state} = store;
  let errors: string[] = [];
  Object.keys(state.validations).forEach(field => {
    let status = validateFieldValue(store, field);
    if (status === 'reject') {
      errors.push(state.validations[field].message);
    }
  });
  return errors;
}

export function createDataStore(store: any, options: PlainObject) {
  const dataStore = new Store({
    id: options.id,
    state: {
      id: options.id,
      page: 1,
      total: 0,
      isLoading: false,
      isSubmitting: false,
      isEnd: false,
      data: [],
      inputData: {},
      formInstance: {},
      validations: {},
      modelOptions: [],
      store,
      initialized: false,
      isStandardList: false,
      options: Object.assign(
        {
          dsId: '', // 模型/API ID
          type: '', // 类型，模型数据还是api
          limit: 10, // 每页个数
          method: '', // 请求方法
          api: '', // 默认API
          getAPI: '', // 查询API
          updateAPI: '', // 更新API
          destroyAPI: '', // 删除API
          // scenes: '', // 接口场景
          fetchOnInit:
            !('fetchOnInit' in options) &&
            String(options.scenes).includes('show')
              ? true
              : false, // 是否初始化请求数据
          conditions: {} // 查询条件
        },
        options
      ),
      isBadNetwork: false
    },

    getters: {
      // getPage: state => {
      //   return (id: string) => state.pages.find((page: any) => page.id === id);
      // }

      getHttpConfig(state) {
        return (params: PlainObject = {}) => {
          let httpConfig: {url: string; method: MethodType; data: PlainObject} =
            {
              url: '',
              method: params.method || 'get',
              data: params.data || {}
            };

          // api接口传参，自定义赋值优先
          let inputParams = state.options.inputParams || [];
          if (Array.isArray(params.inputParams)) {
            params.inputParams.forEach(field => {
              let index = inputParams.findIndex(item => item.key === field.key);
              if (index >= 0) {
                inputParams[index] = field;
              } else {
                inputParams.push(field);
              }
            });
          }
          httpConfig = state.store.getters.getAPIConfig(
            params.api || state.options.api,
            {
              ...state.options,
              data: params.data || {}
            }
          );

          // 表单绑定的输入参数
          httpConfig.data = {
            ...httpConfig.data,
            ...state.inputData
          };
          return httpConfig;
        };
      },

      getFieldValue(state) {
        return (field: string, index: number = 0, type: string = 'input') => {
          let result;
          // 列表序号，从1开始
          if (field === '@scopeIndex') {
            return index + 1;
          }

          // api接口有入参
          if (type === 'input' && state.options.type === 'api') {
            result = get(state.inputData, field);
          } else {
            let data = Array.isArray(state.data.slice?.())
              ? (state.data as PlainObject[])?.[index]
              : state.data;
            if (data) {
              result = get(data, field);
            }
          }
          return result;
        };
      }
    },

    mutations: {
      init(state, {data, dataType = 'output'}) {
        if (dataType === 'input') {
          state.inputData = data;
        } else {
          state.data = data;
        }

        // 如果数据源初始化，对应的combo store也重置
        // this.store.resetComboStore(this.id)
      },

      reset(state) {
        state.page = 1;
        state.total = 0;
        // state.data = []; // 请求未成功前不清空之前的数据
        state.isEnd = false;
      },

      setState(state, payload) {
        Object.keys(payload).forEach(key => {
          state[key] = payload[key];
        });
      },

      setFieldValue(state, {field, value, type = 'input', paths = []}) {
        let {scopeIndex = 0, loopIndex = []} =
          state.store.selectIndex?.pop() || {};
        if (type === 'input' && state.options.type === 'api') {
          let inputData = deepClone(state.inputData) || {};
          set(inputData, field, value);
          state.inputData = inputData;
        } else {
          // TODO 嵌套赋值待优化
          let targetPath = paths
            .map((item, index) => {
              return loopIndex[index] >= 0
                ? `${item}[${loopIndex[index]}]`
                : item;
            })
            .join('.');
          if (paths.length) {
            if (state.isStandardList) {
              set(state.data, `[${scopeIndex}].${targetPath}`, value);
            } else {
              set(state.data, targetPath, value);
            }
          } else {
            if (Array.isArray(state.data.slice?.())) {
              if (state.data.length) {
                let data = state.data as PlainObject[];
                if (data[scopeIndex]) {
                  data[scopeIndex] = {
                    ...data[scopeIndex],
                    [field]: value
                  };
                }
              } else {
                state.data.push({[field]: value});
              }
            } else if (state.data) {
              state.data = {
                ...state.data,
                [field]: value
              };
            }
          }
        }
      },

      setValues(state, data) {
        state.data = data;
      },

      initData(state, formData) {
        state.inputData = formData;
        state.data = formData;
      },
      initVm(state, vm) {
        state.formInstance = vm;
      },
      update(state, {field, value}) {
        state.inputData[field] = value;
        state.data[field] = value;
      }
    },

    actions: {
      checkInitial({state, commit, dispatch}) {
        if (state.initialized || !state.options.fetchOnInit) {
          return;
        }

        let store = state.store;
        let {inputParams} = state.options;
        if (inputParams?.length) {
          let ready = inputParams.every(field => {
            let value = store?.getters.getAssignValue(field.value);
            return !field.isRequired || (value !== null && value !== undefined);
          });
          if (ready) {
            dispatch('getData');
          }
        } else {
          dispatch('getData');
        }
      },

      async getData(
        {state, commit, getters},
        {reset = false, append = false, force = false} = {}
      ) {
        if (state.isLoading || (!state.options.fetchOnInit && !force)) {
          console.log('[数据源请求] 忽略，数据源正在加载或非初始化加载');
          return;
        }

        if (reset) {
          commit('reset');
        }
        commit('setState', {isLoading: true, initialized: true});
        //state.store.commit('resetComboStore', id)
        let page = state.page || 1;

        let httpConfig = getters.getHttpConfig({
          data: {page, perPage: state.options.limit}
        });

        if (!httpConfig.url) {
          console.log('[数据源请求] 忽略，请求地址缺失');
          return;
        }

        setTimeout(() => {
          commit('setState', {isLoading: false});
        }, 3000);

        let res;
        try {
          res = await fetcher(httpConfig);
        } catch (e) {
          console.log('接口请求错误', e);
          commit('setState', {isLoading: false});
        }

        let data = res.data || {};
        commit('setState', {isLoading: false});

        // 烂网处理，只有数据为空的时候才认为是烂网
        if (res?.message === 'Failed to fetch' && isEmpty(state.data)) {
          console.log('网络请求故障，设置断网提示');
          commit('setState', {isBadNetwork: true});
        } else {
          commit('setState', {isBadNetwork: false});
        }

        if (
          SUCC_LIST.includes(res?.status) ||
          SUCC_LIST.includes((res as PlainObject)?.code)
        ) {
          let total = data.count || data.total || 0;
          commit('setState', {isEnd: page * state.options.limit >= total});
          let targetData = data;
          if (
            (Array.isArray(data.items) || Array.isArray(data.rows)) &&
            ('total' in data || 'count' in data)
          ) {
            commit('setState', {isStandardList: true});
            targetData = data.items || data.rows;
          }
          if (append && Array.isArray(state.data.slice?.())) {
            commit('setState', {
              data: [...(state.data as PlainObject[]), ...targetData]
            });
          } else {
            commit('setState', {data: targetData});
          }
        } else if (res?.msg) {
          console.log('请求返回失败', httpConfig, res);
          if (!LOGIN_FAILURE_LIST?.includes(String(res.status))) {
            Toast.info(res.msg);
          }
        }
      },

      async loadMore({state, dispatch, commit}) {
        if (state.isLoading || state.isEnd) {
          return;
        }
        commit('setState', {page: state.page + 1});
        await dispatch('getData', {reset: false, append: true});
      },

      async destroy({state, dispatch, getters, commit}, {id, params = {}}) {
        if (state.isSubmitting) {
          return;
        }

        if (['model', 'form'].includes(state.options.type)) {
          params.method = 'delete';
          let httpConfig = getters.getHttpConfig(params);
          httpConfig.url += `/${id}`;

          commit('setState', {isSubmitting: true});
          let res = null;
          try {
            Toast.loading('提交中');
            res = await fetcher(httpConfig);
            commit('setState', {isSubmitting: false});
          } catch (e: any) {
            let msg = e.message || '提交失败';
            Toast.info(msg);
            commit('setState', {isSubmitting: false});
            throw new Error(msg);
          }

          if (
            SUCC_LIST.includes(res?.status) ||
            SUCC_LIST.includes((res as PlainObject)?.code)
          ) {
            Toast.success(params?.successTip || '删除成功');
          } else {
            Toast.info(params?.failTip || res?.msg || '删除失败');
            throw new Error('执行失败');
          }

          commit('setState', {isSubmitting: false});
          if (Array.isArray(state.data.slice?.())) {
            commit('setState', {
              data: state.data.filter((item: any) => item.id !== id)
            });
          } else {
            commit('setState', {data: []});
          }
        }
      },

      // 新增或更新数据
      async upset({state, getters, commit, dispatch}, {params = {}}) {
        let data = Array.isArray(state.data.slice?.())
          ? state.data[0]
          : state.data;
        if (state.isSubmitting) {
          return;
        }
        let errors = validateFields(this);
        if (errors.length) {
          Toast.info('校验失败，请填写完整');
          throw new Error('校验失败，请填写完整');
        }

        if (!params.method) {
          params.method = 'post';
        }
        let httpConfig = getters.getHttpConfig(params);

        if (!httpConfig.url) {
          return;
        }

        httpConfig.data = {
          ...httpConfig.data,
          ...data
        };

        commit('setState', {isSubmitting: true});
        let res = await fetcher(httpConfig, {});

        Toast.hideLoading();
        commit('setState', {isSubmitting: false});

        if (
          SUCC_LIST.includes(res?.status) ||
          SUCC_LIST.includes((res as PlainObject)?.code)
        ) {
          Toast.success(params.successTip || res?.msg || '提交成功');

          // 返回结果输出
          if (params.output) {
            state.store?.commit('setVariableValue', {
              id: params.output,
              value: res?.data
            });
          }
        } else {
          Toast.info(params?.failTip || res?.msg || '提交失败');
          throw new Error('执行失败');
        }
      },

      async getModelOptions({state, commit}) {
        let {company, app} = state.store?.state.rootStore || {};
        if (state.modelOptions.length) {
          return state.modelOptions;
        }

        let modelId = state.options.modelId;
        let appKey = `${app?.key}${app?.env === 'latest' ? '' : `-${app.env}`}`;
        let url = `/api/resource/${company?.key}/${appKey}/model/${modelId}/options`;

        let res = await fetcher(
          {
            url,
            method: 'get'
          },
          {}
        );

        if (
          SUCC_LIST.includes(res?.status) ||
          SUCC_LIST.includes((res as PlainObject)?.code)
        ) {
          let options = (res?.data?.options || []).map(item => ({
            label: item.name,
            value: item
          }));
          commit('setState', {modelOptions: options});
          return options;
        }

        return state.modelOptions;
      },

      clear({commit}) {
        commit('setState', {
          page: 1,
          total: 0,
          data: [],
          inputData: {},
          isSubmitting: false
        });
      },

      registerValidation(
        {state, getters, commit},
        {field, rules = [], required = false}
      ) {
        let validations = {...state.validations};
        let item = validations[field] || {};
        item.rules = rules;
        item.required = required;
        item.status = 'pending';
        validations[field] = item;
        commit('setState', {validations});
      },

      unRegisterValidation({state, commit}, field) {
        let validations = Object.assign({}, state.validations);
        delete validations[field];
        commit('setState', {validations});
      },

      validateFields() {
        return validateFields(this);
      },

      validateFieldValue({state}, field) {
        return validateFieldValue(this, field);
      }
    }
  });
  dataStore.dispatch('checkInitial');
  return dataStore;
}
