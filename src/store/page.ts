/**
 * 页面store
 */
import {Store} from '@quickapp-eco/qappx';
import clipboard from '@system.clipboard';
// @if PLATFORM ='quickapp'
import geolocation from '@system.geolocation';
// @endif

// @if PLATFORM ='quickapp-card'
import geolocation from '@system.card.geolocation';
// @endif
import media from '@system.media';
import texttoaudio from '@service.texttoaudio';
import router from '@system.router';
import fetch from '@system.fetch';
import share from '@system.share';
import notification from '@system.notification';
import {
  isString,
  isObject,
  get,
  set,
  isNumber,
  isEmpty,
  getUrlParams
} from '@/utils/helper';
import {Config} from '@/constants';
import {LOGIN_FAILURE_LIST} from '@/constants/code';
import {IPage, PlainObject} from '@/types';
import toast from '@/utils/toast';
import {fetcher} from '@/utils/request';
import * as adaptor from '@/services/adaptor';
import {
  findNodeById,
  dateFormat,
  deepClone,
  getWeek,
  jsonValueMap,
  sleep,
  makeParmMap,
  getHttpImageUrl,
  getCurrentLocation,
  dialogConfirm,
  isNumberFormat
} from '@/utils';
import Page from '@/utils/page';
import {Action} from '@/utils/action';
import rpn from '@/utils/rpn';
import {
  createDataStore,
  MethodType,
  validateFields,
  validateFieldValue
} from './data';
import {downloadPicture, startPay} from '@/utils/tools';
import apiAdaptor from './adaptor';

// 手动声明 state 类型
export interface State {
  rootStore: any;
  pageDataList: any[];
  structor: any;
  modal: PlainObject;
  params: PlainObject[];
  variable: any;
  activeModal: string[];
  fixedBlock: PlainObject;
  handler: any;
  comboFormStore: any[];
  selectIndex: PlainObject[];
  id: string;
  search: string;
  isBadNetWorkCondition: boolean;
}

interface loopEventProps {
  id: string;
  maxTime: number;
  interval?: number;
  title: string;
  event: PlainObject;
}

function initPageParams(params: PlainObject[], query?: PlainObject) {
  // 初始化页面参数
  let newParams = params.concat();
  if (query) {
    for (let key of Object.keys(query)) {
      let param = newParams.find(item => item.id === key);
      if (param) {
        param.value = query[key];
      }
    }
  }
  return newParams;
}

let loopRecords = {}; // 分页面的定时器记录
let fetchingAPI = {}; // 正在请求的api

export function createPageStore(pageId: string) {
  const pageStore = new Store({
    state: {
      rootStore: {},
      pageDataList: [],
      structor: {},
      modal: {},
      fixedBlock: {},
      params: [],
      variable: {data: {}},
      activeModal: [],
      handler: {},
      comboFormStore: [],
      selectIndex: [],
      id: pageId,
      query: {},
      isBadNetWorkCondition: false
    },

    getters: {
      fetcher() {
        return fetcher;
      },

      getNodeById: state => {
        return (id: string) => {
          return findNodeById(
            [
              ...(state.structor?.children || []),
              ...(state.modal?.children || []).concat(),
              ...(state.fixedBlock?.children || [].concat())
            ],
            id
          );
        };
      },

      // getComboStore(state) {
      //   return payload => {
      //     let {id, dsId, defaultValues = []} = payload;
      //     let formStore = this.comboFormStore.find(item => item.id === id);
      //     if (!formStore) {
      //       let stores: Store[] = [];
      //       if (Array.isArray(defaultValues?.slice()) && defaultValues.length) {
      //         defaultValues.forEach(value => {
      //           // stores.push(createFormStore(this, id, value));
      //         });
      //       }

      //       this.comboFormStore.push({
      //         id,
      //         dsId,
      //         stores
      //       });
      //     } else if (
      //       defaultValues?.length &&
      //       formStore.stores.length === 0 &&
      //       isEmpty(formStore.stores[0]?.data)
      //     ) {
      //       let stores: Store[] = [];
      //       defaultValues.forEach(value => {
      //         // stores.push(createFormStore(this, id, value));
      //       });
      //       formStore.stores = stores;
      //     }
      //     return formStore;
      //   };
      // },

      getExpressionValue(state, getters) {
        return (conf: PlainObject, params?: PlainObject) => {
          let value = conf.value;
          if (Array.isArray(value?.slice?.())) {
            let hasOperation = value.some(
              (item: PlainObject) => !!rpn.operationMap[item.value]
            );
            let list = value.map((item: PlainObject) =>
              getters.getAssignValue(item, params)
            );
            if (
              !list.some(
                (item: PlainObject) => item === null || item === undefined
              )
            ) {
              let expression = list.length > 1 ? list.join('') : list[0];
              return hasOperation ? rpn.calculate(expression) : expression;
            }
            return undefined;
          }
          return value;
        };
      },

      // 获取赋值实际值
      getAssignValue(state, getters) {
        return (conf, params) => {
          if (!conf) {
            return undefined;
          }
          if (!isObject(conf)) {
            return conf;
          }
          switch (conf?.type) {
            case 'custom':
              return conf?.value || conf?.field?.value;

            case 'variable':
              return getters.getVariableValue(conf.value ?? conf.field?.value);

            case 'params':
              return getters.getParamValue(conf.value);

            case 'datasource':
              return getters.getDataListValue(conf, params);

            // 用户信息
            case 'member':
              return getters.getUserInfo(conf.value);

            // 时间信息
            case 'datetime':
              return getters.getTimeInfo(
                conf.value,
                conf.format || 'yyyy-MM-dd HH:mm:ss'
              );

            // 运算符
            case 'operation':
              return rpn.operationMap[conf.value] || '';

            case 'loop':
              return getters.getLoopValue(conf, params);

            case 'platform':
              return getters.getPlatformValue();

            case 'foldState':
              return conf.status;

            case 'expression':
              return getters.getExpressionValue(conf, params);

            case 'expressions': {
              let value = conf.value;
              if (Array.isArray(value?.value?.slice?.())) {
                return getters.getExpressionValue(value, params);
              }
              return value;
            }

            default:
              return conf.value;
          }
        };
      },

      getDataListValue(state, getters) {
        return (conf, params) => {
          let {item = 'current', value = {}, dataType} = conf;

          let {dsId, field} = value;
          let pageData = state.pageDataList.find(
            list => list.state.id === dsId
          );
          if (!pageData) {
            console.warn(`[数据-获取模型字段] 数据源不存在: ${dsId}`);
            return null;
          }
          let index = 0;
          if (item === 'current' && params) {
            index = params.currentIndex || params.scopeIndex || 0;
          } else if (item === 'last') {
            index = pageData.state.data.length - 1;
          }
          return getters.getDynamicFieldValue(dsId, field, index, dataType);
        };
      },

      // 获取循环数据
      getLoopValue(state) {
        return (conf, params) => {
          let field = conf?.value?.field;

          if (params?.loopData) {
            let val = field ? get(params.loopData, field) : params.loopData;
            return val;
          } else {
            // @ifndef PLATFORM
            console.warn(
              `[数据-获取循环值] 循环对象可能不存在: `,
              params?.loopData
            );
            // @endif
          }
          return null;
        };
      },

      // 获取平台类型
      getPlatformValue() {
        let platform = 'quickapp';
        return platform;
      },

      getVariableValue(state) {
        // id 字符串兼容历史格式，新格式为对象{id, field} 支持获取对象变量的子字段
        return (val: string | PlainObject) => {
          let varableData = state.variable.data;
          let result;
          if (isString(val)) {
            result = varableData[val as string];
          } else {
            result = (val as PlainObject)?.field
              ? get(
                  varableData,
                  `${(val as PlainObject).id}.${(val as PlainObject).field}`
                )
              : varableData[(val as PlainObject).id];
          }
          return result;
        };
      },

      getUserInfo(state) {
        return (id?: string) => {
          let user = state.rootStore?.user || {};
          return id ? user?.[id] : user;
        };
      },

      getPlatformInfo(state) {
        return (id?: string) => {
          switch (id) {
            // 当前终端类型或折叠屏状态
            case 'foldState':
            case 'device':
              return state.rootStore.state[id];

            default:
              break;
          }
        };
      },

      getTimeInfo(state) {
        return (type: string, format: string) => {
          let time = new Date();
          let formatTime: string | number = '';
          switch (type) {
            case 'year':
              formatTime = dateFormat(time, 'yyyy');
              break;

            case 'month':
              formatTime = dateFormat(time, 'M');
              break;

            case 'week':
              formatTime = getWeek(time);
              break;

            case 'day':
              formatTime = dateFormat(time, 'yyyy-MM-dd');
              break;

            case 'now': {
              // 支持10位和13位时间戳格式
              if (format === 'timestamp10') {
                formatTime = Math.round(new Date().getTime() / 1000);
              } else if (format === 'timestamp13') {
                formatTime = new Date().getTime();
              } else {
                formatTime = dateFormat(time, format);
              }
              break;
            }

            default:
              break;
          }

          return formatTime;
        };
      },

      getParamValue(state) {
        return (id: string) => {
          let param = state.params.find(item => item.id === id);
          return param?.value;
        };
      },

      getDynamicFieldValue(state) {
        return (
          dsId: string,
          field: string,
          index: number = 0,
          type = 'output'
        ) => {
          let pageData = state.pageDataList.find(
            item => item.state.id === dsId
          );

          if (!field) {
            console.warn(
              `[数据-获取数据源数据]未提供字段，返回第数据项 ${index}。`,
              pageData?.data
            );
            let data =
              type === 'output'
                ? pageData?.state.data
                : pageData?.state.inputData;
            if (data && Array.isArray(data.slice?.())) {
              return data[index];
            }
            return data;
          }
          return pageData?.getters.getFieldValue(field, index, type);
        };
      },

      getPagePath() {
        return (pageId: string) => {
          let pageIdMap = Config.pageIdMap;
          return pageIdMap[pageId] ? `/${pageIdMap[pageId]}` : undefined;
        };
      },

      getFilterValue(state, getters) {
        return (conf: PlainObject, params: PlainObject) => {
          let index = params.scopeIndex || 0;
          let field = conf?.field;
          if (!field) {
            return null;
          }

          // 自定义赋值
          if (field?.type) {
            return getters.getAssignValue(field, params);
          }

          let arr = String(field).split('.');
          let type = arr[0];
          let fieldKey = arr.slice(2).join('.');
          if (arr[1] === undefined) {
            return null;
          }
          switch (type) {
            case '@param':
              return getters.getParamValue(arr[1]);

            case '@variable':
              return getters.getVariableValue(arr[1]);

            case '@datasource':
              return getters.getDynamicFieldValue(arr[1], fieldKey, index);

            case '@datasource-input':
              return getters.getDynamicFieldValue(
                arr[1],
                fieldKey,
                index,
                'input'
              );

            case '@member':
              return getters.getUserInfo(arr[1]);

            case '@scopeIndex':
              return index + 1;

            case '@platform':
              return getters.getPlatformInfo(arr[1]);

            default:
              return conf.field;
          }
        };
      },

      // 获取爱速搭代理API信息
      getAPIConfig(state, getters) {
        return (api: string, apiParams: PlainObject, params?: PlainObject) => {
          if (!apiParams.method) {
            apiParams.method = 'get';
          }
          let {
            inputParams = [],
            headers = [],
            header = {},
            data = {},
            method = 'get'
          } = apiParams;
          let apiKey = String(api || '')
            .split('//')
            .pop();

          if (!api || !apiKey) {
            return apiParams;
          }
          let apiConfig: {
            url: string;
            method: MethodType;
            data: PlainObject;
            responseAdaptor?: any;
            header: PlainObject;
            isDownload?: boolean;
            isUpload?: boolean;
          } = {
            url: '',
            method,
            data,
            header
          };

          let conf = Config.api?.[apiKey];
          if (!conf) {
            console.warn(
              '找不到API配置，请确认接口是否已删除。 apiKey:' + apiKey
            );
            return apiConfig;
          }

          apiConfig.url = conf.url;
          apiConfig.method =
            conf.contentType === 'upload' ? 'upload' : conf.method;
          apiConfig.isDownload = conf.isDownload;
          apiConfig.isUpload = conf.isUpload;

          // query格式化
          let searchParams = getUrlParams(apiConfig.url);
          if (
            conf.enableCustomQuery &&
            'queryMap' in conf &&
            conf.queryMap.length
          ) {
            const mapResult = makeParmMap(conf.queryMap, {
              input: data,
              query: data
            });
            if (conf.customQueryMerge) {
              for (const key in mapResult) {
                searchParams[key] = mapResult[key];
              }
            } else {
              searchParams = mapResult;
            }
          }

          // inputmap格式化
          if (
            conf.enableCustomInput &&
            'inputMap' in conf &&
            conf.inputMap.length
          ) {
            const mapResult = makeParmMap(conf.inputMap, {
              input: data,
              query: data
            });
            if (conf.customInputMerge !== false) {
              for (const key in mapResult) {
                apiConfig.data[key] = mapResult[key];
              }
            } else {
              apiConfig.data = mapResult;
            }
          }

          // api中心配置的自定义header
          if (
            conf.enableCustomHeader &&
            'headerMap' in conf &&
            conf.headerMap.length
          ) {
            const mapResult = makeParmMap(conf.headerMap, {
              input: data,
              query: data
            });
            if (conf.customHeaderMerge) {
              apiConfig.header = {...apiConfig.header, ...mapResult};
            } else {
              apiConfig.header = mapResult;
            }
          }

          // 添加自定义请求头
          if (headers.length) {
            let headerData: PlainObject = {};
            headers.forEach((item: PlainObject) => {
              headerData[item.key] = getters.getAssignValue(item.value, params);
            });
            apiConfig.header = {
              ...apiConfig.header,
              ...headerData
            };
          }

          if (!isEmpty(searchParams)) {
            let url = apiConfig.url.split('?').shift();
            let searchArr: string[] = [];
            Object.keys(searchParams).forEach(key => {
              searchArr.push(`${key}=${searchParams[key]}`);
            });
            if (searchArr.length) {
              apiConfig.url = `${url}?${searchArr.join('&')}`;
            }
          }

          if (conf.contentType === 'form') {
            apiConfig.header['content-type'] =
              'application/x-www-form-urlencoded';
          }

          let funcKey = `api_${apiKey}_responseAdaptor`;

          if (adaptor[funcKey]) {
            apiConfig.responseAdaptor = adaptor[funcKey];
          }

          if (inputParams.length) {
            let inputData = {};
            inputParams.forEach(field => {
              let val = getters.getAssignValue(field.value, params);
              set(inputData, field.key, val);
            });

            apiConfig.data = {
              ...apiConfig.data,
              ...inputData
            };
          }

          return apiConfig;
        };
      },

      // 检查筛选条件
      checkCondition(state, getters) {
        return (condition: PlainObject, params: PlainObject = {}) => {
          if (!condition || !condition.id) {
            return true;
          }
          let {conjunction, children, left, right, op} = condition;

          if (conjunction === 'and') {
            return children.every(node => getters.checkCondition(node, params));
          } else if (conjunction === 'or') {
            return children.some(node => getters.checkCondition(node, params));
          }

          let leftValue = getters.getFilterValue(left, params);
          let rightValue = getters.getAssignValue(right, params);

          if (
            ['less', 'less_or_equal', 'greater', 'greater_or_equal'].includes(
              op
            )
          ) {
            if (isNumberFormat(leftValue)) {
              leftValue = +leftValue;
            }
            if (isNumberFormat(rightValue)) {
              rightValue = +rightValue;
            }
          }

          // 页面权限校验
          // if (leftValue === 'acl') {
          //   return this.checkPageAcl(rightValue);
          // }

          // 烂网处理
          if (leftValue === '@badNetwork.dataSource') {
            const dsId = right.value.dsId;
            const dataStore = getters.getDataStore({dsId});
            const isBadNetwork = dataStore?.state?.isBadNetwork;
            if (isBadNetwork) {
              rightValue = '@badNetwork.dataSource';
            }
          }

          // @ifndef PLATFORM
          console.log(
            `筛选判断。左侧: ${leftValue} 右侧: ${rightValue} 条件: ${op}`
          );
          // @endif

          switch (op) {
            case 'equal':
              return isNumber(leftValue)
                ? leftValue === +rightValue
                : leftValue === String(rightValue);

            case 'not_equal':
              return isNumber(leftValue)
                ? leftValue !== +rightValue
                : leftValue !== String(rightValue);

            case 'like':
              return String(leftValue).includes(rightValue);

            case 'is_empty':
              return (
                !leftValue ||
                leftValue.length === 0 ||
                (isObject(leftValue) && Object.keys(leftValue).length === 0)
              );

            case 'is_not_empty':
              return (
                leftValue !== null &&
                leftValue !== '' &&
                leftValue !== undefined &&
                (!isObject(leftValue) || Object.keys(leftValue).length > 0)
              );

            case 'not_like':
              return !String(leftValue).includes(rightValue);

            case 'starts_with':
              return String(leftValue).startsWith(rightValue);

            case 'ends_with':
              return String(leftValue).endsWith(rightValue);

            case 'less':
              return leftValue < rightValue;

            case 'less_or_equal':
              return leftValue <= rightValue;

            case 'greater':
              return leftValue > rightValue;

            case 'greater_or_equal':
              return leftValue >= rightValue;

            default:
              break;
          }

          return true;
        };
      },

      getDataStore(state) {
        return (conf?: PlainObject) => {
          let dsId = conf?.dsId;
          let store = state.pageDataList.find(item => item?.state.id === dsId);
          if (!store && dsId === '@variable') {
            store = state.variable;
          }
          return store;
        };
      },

      getDataSource(state, getters) {
        return (dsId: string) => getters.getDataStore({dsId});
      }
    },

    mutations: {
      // 初始化
      init(state, {store, schema, options = {}}) {
        let {
          structor = {},
          modal = {},
          fixedBlock = {}
        } = (schema || {}) as IPage;
        let dsList = get(structor, 'componentProperties.data.dataSource', []);
        let params = get(structor, 'componentProperties.data.params', []);
        let variable = get(structor, 'componentProperties.data.variable', []);

        let initVariable: PlainObject = {};
        variable.forEach((item: PlainObject) => {
          if (item.value === undefined) {
            item.value = null;
          }
          // 数组类型变量
          if (item.type === 'array' || item.type === 'object') {
            try {
              item.value = JSON.parse(item.value);
            } catch (e) {
              item.value = [];
            }
          }
          initVariable[item.id] = item.value;
        });

        params.forEach((item: PlainObject) => {
          // 数组类型参数
          if (item.type === 'array') {
            try {
              item.value = JSON.parse(item.value);
            } catch (e) {
              item.value = [];
            }
          }
        });

        state.rootStore = store;

        // 初始化页面参数
        if (options.query) {
          state.query = options.query;
        }
        params = initPageParams(params, options.query);
        if (options.handler) {
          state.handler = options.handler;
        }

        state.params = params;
        state.variable = {data: initVariable};

        function badNetworkNode(structor: PlainObject, addTag: boolean) {
          if (
            addTag ||
            structor.componentProperties.base?.condition?.children?.some(
              item => item?.left?.field === '@badNetwork.dataSource'
            )
          ) {
            structor.componentProperties.isBadNetworkNode = true;
            state.isBadNetWorkCondition = true;
          }
          for (let item of structor.children || []) {
            badNetworkNode(item, structor.componentProperties.isBadNetworkNode);
          }
        }
        // 添加烂网显示元素标志
        badNetworkNode(structor, false);

        state.structor = deepClone(structor);
        state.modal = deepClone(modal);
        state.fixedBlock = deepClone(fixedBlock);
        state.pageDataList = dsList.map(item => createDataStore(this, item));

        state.comboFormStore = [];
      },

      reload(state, options?: any) {
        // 默认有个时间戳
        if (
          (options?.query && Object.keys(options.query).length > 0) ||
          options.force
        ) {
          state.params = initPageParams(state.params, options?.query);
          state.pageDataList.forEach(ds =>
            ds.dispatch('getData', {reset: true})
          );
        }
      },

      toggleVibility(state, {id, hide}) {
        let node = this.getters.getNodeById(id);
        if (!node) {
          return;
        }

        let hidden =
          hide === undefined
            ? !get(node, 'componentProperties.base.hidden', false)
            : hide;
        set(node, 'componentProperties.base.hidden', hidden);
        state.structor = deepClone(state.structor);
      },

      refreshNode(state, id) {
        let node = this.getters.getNodeById(id);
        if (!node) {
          return;
        }

        let refreshId = get(node, 'componentProperties.base.refreshId', 1);
        set(node, 'componentProperties.base.refreshId', refreshId++);
        state.structor = deepClone(state.structor);
      },

      updateProperties(state, {id, props}) {
        let node = this.getters.getNodeById(id);
        if (!node) {
          return;
        }

        if (Array.isArray(props)) {
          props.forEach(item => {
            set(node!.componentProperties, item.key, item.value);
            // 事件动态赋值后需要清理原先动态绑定数据，否则动态绑定优先
            let fields = node!.componentProperties?.data?.bindInfo?.fields;
            if (fields) {
              node!.componentProperties.data.bindInfo.fields = fields.filter(
                field => field.fieldKey !== item.key
              );
            }
          });
        } else {
          node.componentProperties = Object.assign(
            node.componentProperties,
            props
          );
        }

        state.structor = deepClone(state.structor);
      },

      setActiveModal(state, {nodeId, operation}) {
        let node = this.getters.getNodeById(nodeId);
        if (!node || node.componentId !== 'modal-section') {
          return;
        }
        const activeModal = [...state.activeModal].filter(
          modalId => modalId !== nodeId
        );
        if (operation === 'open') {
          // 打开弹窗，插入到数组最后面
          activeModal.push(nodeId);
        }
        state.activeModal = activeModal;
      },

      // addComboItem(state, id) {
      //   let comboStore = this.getters.getComboStore({ id })
      //   if (!comboStore) {
      //     return
      //   }
      //   // 新增项目前检测之前的项目是否校验通过
      //   if (comboStore.stores.every((store) => store.validateFields().length === 0)) {
      //     // comboStore.stores.push(createFormStore(this, id));
      //     this.changeComboData(id)
      //   } else {
      //     toast.info('子表单校验不通过')
      //   }
      // },

      // removeComboItem(id: string, index: number) {
      //   let comboStore = this.comboFormStore.find((item) => item.id === id)
      //   if (comboStore?.stores?.[index]) {
      //     comboStore.stores.splice(index, 1)
      //     this.changeComboData(id)
      //   }
      // },

      // 赋值到数据源或变量
      setAssignValue(state, {val, conf}) {
        if (!conf || !conf.value || !conf.type) {
          return;
        }
        switch (conf.type) {
          case 'variable':
            return this.commit('setVariableValue', {
              id: conf?.value?.id,
              value: val
            });

          case 'datasource':
            this.commit('setDataSourceValue', {
              bindInfo: {
                dsId: conf.value.dsId,
                fields: [{field: conf.value.field}]
              },
              val
            });
        }
        return;
      },

      setVariableValue(state, {id, value}) {
        state.variable.data[id] = value;
        // @ifndef PLATFORM
        console.log(`[数据-设置变量值] 变量ID: ${id} 设置值:`, value);
        // @endif
        this.dispatch('checkDataSource');
      },

      setUserInfo(state, userInfo: PlainObject) {
        state.rootStore?.commit('setUserInfo', userInfo);
      },

      addDynamicData(state, {node, index = 0, formStore}) {
        // 此方式可能废弃
        let bindInfo = get(node, 'componentProperties.data.bindInfo', {});
        let {
          dsId,
          fields = [],
          useDynamicData,
          loopField, // 指定循环字段
          targetField = 'data.items', // 对应目标字段
          paramType = 'inputParams' // 绑定参数类型
        } = bindInfo;
        fields = fields.filter((item: {field: PlainObject}) => item.field);

        // 这里目前主要用于表单的输入绑定，因此获取动态数据应该是输入，但是循环展示的时候一般是绑定输出？
        if (useDynamicData && Array.isArray(fields) && fields.length) {
          // 循环字段绑定，一般是数据的数组映射到组件内部在的字段
          if (loopField) {
            let loopData = this.getters.getDynamicFieldValue(
              dsId,
              loopField,
              0,
              paramType === 'inputParams' ? 'input' : 'output'
            );
            let formatData: PlainObject[] = [];
            if (loopData?.length) {
              loopData.forEach((val: PlainObject) => {
                let data: PlainObject = {};
                fields.forEach((field: PlainObject) => {
                  set(data, field.fieldKey, get(val, field.field));
                });
                formatData.push(data);
              });
            }
            set(node, `componentProperties.${targetField}`, formatData);
          } else {
            fields.forEach(field => {
              let dynamicValue = null;
              // 页面变量
              if (dsId === '@variable') {
                dynamicValue = this.getters.getVariableValue(field.field);
              } else if (dsId === '@params') {
                dynamicValue = this.getters.getParamValue(field.field);
              }
              // 表单数据源，例如combo明细表内字段
              else if (formStore) {
                dynamicValue = get(formStore.data, field.field);
              }
              // 页面数据源
              else {
                dynamicValue = this.getters.getDynamicFieldValue(
                  dsId,
                  field.field,
                  index,
                  'input'
                );
              }
              set(node, `componentProperties.${field.fieldKey}`, dynamicValue);
            });
          }
        }

        // 组件属性动态绑定
        let bindFields = get(node, 'componentProperties.data.bindFields', {});
        Object.keys(bindFields).forEach(key => {
          let fieldKey = key.replace(/\|/g, '.');
          if (bindFields[key] !== undefined) {
            set(node, `componentProperties.${fieldKey}`, bindFields[key]);
          }
        });

        // 动态列表绑定数据
        if (node.componentId === 'dynamic-list') {
          let pageData = state.pageDataList.find(
            item => item.state.id === dsId
          );
          node.dataSource = pageData;
        }
      },

      // 解析data属性中可能存在的表达式计算
      parseExpress(state, {node, params}) {
        const {isDev = false} = params;
        let originData = node.componentProperties?.data || {};
        let data = jsonValueMap(
          originData,
          (value: any, key: string | number) => {
            if (value?.type === 'expression') {
              if (Array.isArray(value.value) && value.value.length) {
                let hasOperation = value.value.some(
                  item => !!rpn.operationMap[item.value]
                );
                let list = value.value.map((item: PlainObject) =>
                  this.getters.getAssignValue(item, params)
                );
                if (!list.some(item => item === null || item === undefined)) {
                  let expression = list.length > 1 ? list.join('') : list[0];
                  return hasOperation ? rpn.calculate(expression) : expression;
                }
                return '';
              }

              return undefined;
            }
            return value;
          }
        );
        set(node, 'componentProperties.data', data);
      },

      setSelectedIndex(state, {scopeIndex, loopIndex}) {
        // 如果当前是翻页列表，则第一个索引是列表项，loopIndex是循环的索引数组，可能多层循环
        state.selectIndex = [{scopeIndex, loopIndex}];
      },

      setDataSourceValue(state, {bindInfo, value}) {
        if (!bindInfo) {
          return;
        }
        let {dsId, fields} = bindInfo;
        if (!fields.length) {
          return;
        }
        let ds = state.pageDataList.find(item => item.state.id === dsId);
        ds?.commit('setFieldValue', {
          field: fields[0].field,
          value: value
        });
      },

      resetComboStore({state}, dsId: string) {
        // let formStore = state.comboFormStore.find((item) => item.dsId === dsId)
        // if (formStore) {
        //   formStore.stores = []
        // }
      }
    },

    actions: {
      checkDataSource(context) {
        context.state.pageDataList.forEach(data =>
          data.dispatch('checkInitial')
        );
      },

      async handleAction(context, {type, props}) {
        let events =
          props.events || props.componentProperties?.data?.event?.[type] || [];
        if (!Array.isArray(events.slice?.()) || !events.length) {
          return new Promise(resolve => resolve(null));
        }

        // @ifndef PLATFORM
        console.log('handle event', events);
        // @endif

        // 如果是点击操作且存在循环，保留最近一起的点击索引位置，如果后续动作有嵌套赋值，则默认认为是修改此处位置的数据
        if (type === 'click' && props.loopIndex?.length) {
          props?.store?.commit('setSelectedIndex', {
            scopeIndex: props.scopeIndex || 0,
            loopIndex: props.loopIndex
          });
        }

        return context.dispatch('excuteEvents', {events, props});
      },

      async handlePageEvent(context, type) {
        let pageProps = context?.state.structor?.componentProperties || {};
        let events = pageProps.data?.event?.[type] || [];
        if (events.length) {
          context?.dispatch('handleAction', {
            type,
            props: {...pageProps, events}
          });
        }
      },

      async handleEvent(context, {type, props}) {
        let events =
          props.events || props.componentProperties?.data?.event?.[type] || [];

        if (!Array.isArray(events.slice?.()) || !events.length) {
          return new Promise(resolve => resolve(null));
        }

        // 如果绑定了事件，默认不冒泡?
        // e.stopPropagation();
        await context.dispatch('handleAction', {type, props});
      },

      async excuteEvents(context, {events, props}) {
        try {
          let stop = false;
          for (let event of events) {
            // 检查执行条件
            if (context.getters.checkCondition(event?.condition, props)) {
              await context.dispatch('triggerAction', {
                event: deepClone(event),
                props
              });
              if (event?.stopCondition?.children?.length) {
                stop = context.getters.checkCondition(
                  event.stopCondition,
                  props
                );
              }
            }
            // 阻断
            if (stop) {
              console.info('阻断后续动作。当前动作: ', event);
              break;
            }
          }
          return new Promise(resolve => resolve(null));
        } catch (e) {
          console.warn(e);
          return new Promise((resolve, reject) => reject(e));
        }
      },

      async callAPI(context, {conf = {}, params = {}}) {
        let httpConfig: any = context.getters.getAPIConfig(
          conf.api,
          conf,
          params
        );
        // 上传有默认地址
        if (!httpConfig.url && httpConfig.method !== 'upload') {
          console.warn('[请求终止]，可能url缺失', httpConfig);
          return;
        }
        let apiKey = `${context.state.id}-${conf.api}`;
        if (apiKey && fetchingAPI[apiKey]) {
          console.log(`重复请求，API请求取消${httpConfig.url}`);
          return new Promise(resolve => resolve({}));
        }

        fetchingAPI[apiKey] = true;
        let res;
        try {
          res = await fetcher(httpConfig);
        } catch (e) {
          console.log('请求出错', e);
        }
        fetchingAPI[apiKey] = false;

        if (res?.status === 0) {
          // 成功提示
          if (conf.successTip) {
            toast.success(conf.successTip);
          }

          // 返回结果分字段赋值
          if (Array.isArray(conf.output)) {
            conf.output.forEach((item: PlainObject) => {
              let val = get(res?.data || {}, item.key);
              console.log(`[请求返回字段赋值] 字段: ${item.key} 值: ${val}`);
              context.commit('setAssignValue', {val, conf: item.value});
            });
          }

          // 返回结果整体赋值
          if (conf.reloadDsId) {
            context.dispatch('triggerAction', {
              event: {
                action: 'DATA-INIT',
                dsId: conf.reloadDsId,
                dataType: conf.dataType || 'output',
                value: {
                  type: 'custom',
                  value: res?.data || {}
                }
              },
              props: params
            });
          }
        } else if (
          httpConfig.method !== 'upload' &&
          !httpConfig.isDownload &&
          !conf.getData
        ) {
          if (!LOGIN_FAILURE_LIST?.includes(String(res.status))) {
            toast.info(conf?.failTip || res?.msg || '请求失败');
          }
          console.warn(
            `[请求失败]服务端提示：${
              res?.msg
            }，请检查接口服务与传参。返回结果 ${JSON.stringify(
              res
            )}。 接口参数：`,
            httpConfig
          );
          throw new Error('请求API执行失败，动作终止');
        }
        return res;
      },

      async triggerAction(context, {event, params}) {
        if (!event || !event.action) {
          return;
        }
        const rootStore = context.state.rootStore;
        const action = String(event.action).toUpperCase();
        switch (action) {
          case 'REDIRECT-PAGE':
            // 格式化参数值
            let query: PlainObject = {};
            let path = event.path;
            let {pageId} = event.page || {};
            if (!pageId) {
              return;
            }
            let items = event?.page?.params || [];
            items.forEach((param: PlainObject) => {
              if (param.value && param.id) {
                query[param.id] = context.getters.getAssignValue(
                  param.value,
                  params
                );
              }
            });
            path = context.getters.getPagePath(pageId);
            if (!path) {
              console.warn(`[动作-页面跳转]页面不存在 ${pageId}`);
              return;
            }
            Page.gotoPage(path, query, event?.target);
            break;

          // 打开webview页面
          case 'URL': {
            let url = context.getters.getAssignValue(event.url, params);
            console.log('打开链接或deeplink', url);
            if (Config.runtime === 'web') {
              window.location.href = url;
            } else {
              if (/^http/.test(url) && !String(url).includes('://hapjs.org/')) {
                Page.openWebview(url, event.openType);
              } else {
                Page.openDeepLink(url);
              }
            }
            break;
          }

          // 打开小程序
          case 'OPEN-MINIAPP': {
            let deeplink = context.getters.getAssignValue(
              event.deeplink,
              params
            );
            console.log('打开小程序', deeplink);
            Page.openApp('com.tencent.mm', deeplink);
            break;
          }

          // 打开app
          case 'OPEN-APP': {
            let uri = context.getters.getAssignValue(event.uri, params);
            let packageName = context.getters.getAssignValue(
              event.package,
              params
            );
            console.log('打开app', packageName, uri);
            Page.openApp(packageName, uri);
            break;
          }

          case 'BACK':
            Action.goBack();
            break;

          // 刷新当前页面
          case 'RELOAD':
            rootStore.dispatch('initPage', {
              pageId: context.state.id,
              options: {
                query: context.state.query,
                force: true
              }
            });
            break;

          // 刷新非当前页面
          case 'DEFER-RELOAD':
            rootStore.commit('addDeferReloadPage', event.value);
            break;

          case 'VISIBLE': {
            let {nodes, operation} = event;
            if (!nodes) {
              return;
            }
            if (!Array.isArray(nodes)) {
              nodes = nodes.split(',');
            }
            let hide =
              operation === 'visibility-hide'
                ? true
                : operation === 'visibility-show'
                ? false
                : undefined;
            nodes.forEach((id: string) => {
              context.commit('toggleVibility', {id, hide});
            });
            break;
          }

          // 主动刷新组件
          case 'REFRESH-NODE': {
            let {nodes} = event;
            if (!nodes) {
              return;
            }
            if (!Array.isArray(nodes)) {
              nodes = nodes.split(',');
            }
            nodes.forEach((id: string) => {
              context.commit('refreshNode', id);
            });
            break;
          }

          case 'PROPS':
            Action.updateProperties(
              event.nodeId,
              event.operation,
              this,
              params
            );
            break;

          case 'ANCHOR':
            let targetPage = event.pageId;
            if (targetPage === context.state.id) {
              Action.scrollToAnchor(event.elementId);
            } else {
              // 跳转页面再滚动到锚点
              let targetPath = context.getters.getPagePath(targetPage);
              if (!targetPath) {
                return;
              }
              Page.gotoPage(targetPath, {__hash: event.elementId});
            }
            break;

          case 'MODAL':
            context.commit('setActiveModal', event);
            break;

          case 'OPEN-MODAL':
            context.commit('setActiveModal', {
              nodeId: event.nodeId,
              operation: 'open'
            });
            break;

          case 'CLOSE-MODAL':
            context.commit('setActiveModal', {
              nodeId: event.nodeId,
              operation: 'close'
            });
            break;

          // 数据源整体初始化
          case 'DATA-INIT': {
            let ds = context.state.pageDataList.find(
              item => item.state.id === event.dsId
            );
            if (ds) {
              let value = context.getters.getAssignValue(event.value, params);
              ds.commit('init', {
                data: value || {},
                dataType: event.dataType
              });
            } else {
              console.warn(
                `[动作-数据源初始化]数据源${event.dsId}不存在，动作取消`
              );
            }
            break;
          }

          // 数据字段赋值
          case 'DATA-ASSIGN': {
            let ds = context.state.pageDataList.find(
              item => item.state.id === event.dsId
            );
            if (ds) {
              // 输入参数赋值
              (event.inputFields || []).forEach((field: PlainObject) => {
                let fieldValue = context.getters.getAssignValue(
                  field.value,
                  params
                );
                ds?.commit('setFieldValue', {
                  field: field.key,
                  value: fieldValue,
                  type: 'input',
                  paths: field.paths
                });
              });

              // 输出参数赋值
              (event.outputFields || []).forEach((field: PlainObject) => {
                let fieldValue = context.getters.getAssignValue(
                  field.value,
                  params
                );
                ds?.commit('setFieldValue', {
                  field: field.key,
                  value: fieldValue,
                  type: 'output',
                  paths: field.paths
                });
              });
            } else {
              console.warn(
                `[动作-数据字段赋值]数据源${event.dsId}不存在，动作取消`
              );
            }
            break;
          }

          // 数据源校验
          case 'DATA-VALIDATE':
            let dataStore = null;
            let status: any = '';
            if (event.type === 'variable') {
              dataStore = context.state.variable;
              status = validateFieldValue(dataStore, event.dsId);
            } else {
              dataStore = context.getters.getDataSource(event.dsId);
              let errors = validateFields(dataStore);
              if (errors.length) {
                status = 'reject';
              }
            }
            if (status === 'reject') {
              toast.error('校验失败，请填写完整');
              throw new Error('校验失败');
            }
            break;

          // 清空数据源
          case 'DATA-CLEAR': {
            let ds = context.state.pageDataList.find(
              item => item.state.id === event.dsId
            );
            ds?.dispatch('clear');
            break;
          }

          case 'DATA-VARIABLE':
            let value = context.getters.getAssignValue(event.value, params);
            context.commit('setVariableValue', {id: event.id, value});
            break;

          case 'DATA-UPDATE': {
            let ds = context.state.pageDataList.find(
              item => item.state.id === event.dsId
            );
            await ds?.dispatch('upset', {params: event});
            break;
          }

          case 'DATA-RELOAD': {
            let ds = context.state.pageDataList.find(
              item => item.state.id === event.dsId
            );
            await ds?.dispatch('getData', {
              reset: true,
              append: false,
              force: true
            });
            break;
          }

          case 'DATA-DELETE': {
            let {dsId, id, confirm, confirmText} = event;
            let dataId = context.getters.getAssignValue(id, params);
            let ds = context.state.pageDataList.find(
              item => item.state.id === dsId
            );

            if (confirm) {
              try {
                await dialogConfirm({message: confirmText, title: '删除确认'});
                await ds?.dispatch('destroy', {id: dataId, params: event});
              } catch (e) {
                throw new Error(e?.message || '操作失败');
              }
            } else {
              await ds?.dispatch('destroy', {id: dataId, params: event});
            }
            break;
          }

          // 自定义动作
          case 'CODE':
            const args = context.getters.getAssignValue(event.params, params);
            console.info(
              `[动作-代码动作]开始执行动作代码。参数: ${JSON.stringify(
                args || {}
              )}`,
              event
            );
            let fn = context.state.handler[`handler_${event.id}`];
            apiAdaptor(this, context);
            let app = context.state.rootStore;
            if (fn) {
              await (fn as any).call(this, app, {...event, params: args});
            } else {
              console.warn(
                `[动作-代码动作]：代码动作handler_${event.id}不存在`
              );
            }
            break;

          // 延迟执行
          case 'DELAY':
            let num = +event.value;
            if (num > 0 && num <= 60) {
              await sleep(num);
            }
            break;

          case 'DOWNLOAD':
          case 'CALL-API':
            await context.dispatch('callAPI', {conf: event, params});
            break;

          // 确认操作:
          case 'CONFIRM':
            try {
              await dialogConfirm(event);
            } catch (e) {
              console.log(e);
              throw new Error('取消执行');
            }
            break;

          // 拨打电话
          case 'PHONE':
            if (event.value) {
              router.push({uri: `tel:${event.vlaue}`});
            }
            break;

          // 复制内容
          case 'COPY': {
            let content = context.getters.getAssignValue(event.value, params);
            clipboard.set({
              text: content,
              success: () => {}
            });
            break;
          }

          // 消息提示:
          case 'TOAST': {
            let message = context.getters.getAssignValue(event.message, params);
            let duration = event.duration;
            let type = event.type;
            if (['info', 'success', 'error', 'loading'].includes(type)) {
              toast[type as keyof typeof toast](message, duration);
            }
            break;
          }

          case 'REQUEST-PAYMENT':
            let orderInfo = context.getters.getAssignValue(
              event.orderInfo,
              params
            );
            let payUrl = context.getters.getAssignValue(event.payUrl, params);
            try {
              await startPay({
                provider: event.provider,
                orderInfo,
                payUrl
              });
            } catch (e) {
              // 支付失败自定义处理
              if (event.failEvents) {
                await this.excuteEvents(event.failEvents, params);
              }
              throw new Error('支付失败' + e);
            }
            break;

          case 'LOGOUT':
            await context.state.rootStore?.logout();
            break;

          // 保存图片到相册
          case 'SAVE-PICTURE':
            let url = context.getters.getAssignValue(event.value, params);
            if (/^http/.test(url)) {
              // TODO
              downloadPicture(url);
            } else {
              toast.info('图片地址格式错误');
            }
            break;

          // 发起分享
          case 'SHARE':
            let title = context.getters.getAssignValue(event.title, params);
            let summary = context.getters.getAssignValue(event.summary, params);
            let imageUrl = getHttpImageUrl(
              context.getters.getAssignValue(event.imageUrl, params)
            );
            let href = context.getters.getAssignValue(event.href, params);
            if (imageUrl) {
              // 下载图片
              fetch.fetch({
                url: imageUrl,
                success: function (res) {
                  // 分享下载了的文件
                  share.share({
                    type: 'image/jpeg',
                    data: String(res.data),
                    fail: function (data, code) {
                      console.log('handling fail, code = ' + code);
                    }
                  });
                },
                fail: function (data, code) {
                  console.log('下载图片失败, code = ' + code);
                }
              });
            } else {
              share.share({
                type: 'text/html',
                data: `<b>${title}</b>${summary}<a href="${href}">了解详情</a>`,
                fail: function (data, code) {
                  console.log('handling fail, code = ' + code);
                }
              });
            }

            break;

          // app通知
          case 'APP-NOTIFICATION':
            let ntitle = context.getters.getAssignValue(event.title, params);
            let ncontent = context.getters.getAssignValue(
              event.content,
              params
            );
            let nuri = context.getters.getAssignValue(event.uri, params);
            console.log('打开内部页面', nuri);
            notification.show({
              contentTitle: ntitle,
              contentText: ncontent,
              clickAction: {
                uri: nuri
              }
            });
            break;

          // 语音合成
          case 'TEXT-AUDIO': {
            let content = context.getters.getAssignValue(event.content, params);
            return new Promise((resolve, reject) => {
              texttoaudio.speak({
                lang: 'zh_CN',
                content,
                rate: event.rate,
                success: () => {
                  resolve({});
                },
                fail: err => {
                  reject(err);
                }
              });
            });
          }

          // 选择图片
          case 'CHOOSE-PHOTO': {
            let count = context.getters.getAssignValue(event.count, params);
            return new Promise((resolve, reject) => {
              if (!count || +count <= 1) {
                media.pickImage({
                  success: data => {
                    context.commit('setAssignValue', {
                      val: data.uri,
                      conf: event.value
                    });
                    resolve(data);
                  },
                  fail: err => {
                    reject(err);
                  }
                });
              } else {
                media.pickImages({
                  success: data => {
                    context.commit('setAssignValue', {
                      val: data.uris,
                      conf: event.value
                    });
                    resolve(data);
                  },
                  fail: err => {
                    reject(err);
                  }
                });
              }
            });
          }

          case 'CHOOSE-VIDEO': {
            let count = context.getters.getAssignValue(event.count, params);
            return new Promise((resolve, reject) => {
              if (!count || +count <= 1) {
                media.pickVideo({
                  success: data => {
                    context.commit('setAssignValue', {
                      val: data.uri,
                      conf: event.value
                    });
                    resolve(data);
                  },
                  fail: err => {
                    reject(err);
                  }
                });
              } else {
                media.pickVideos({
                  success: data => {
                    context.commit('setAssignValue', {
                      val: data.uris,
                      conf: event.value
                    });
                    resolve(data);
                  },
                  fail: err => {
                    reject(err);
                  }
                });
              }
            });
          }

          case 'GET-LOCATION': {
            let data = (await getCurrentLocation()) as PlainObject;
            context.commit('setAssignValue', {
              val: data.longitude,
              conf: event.longitude
            });
            context.commit('setAssignValue', {
              val: data.latitude,
              conf: event.latitude
            });
            context.commit('setAssignValue', {
              val: data.city,
              conf: event.city
            });
            break;
          }

          case 'OPEN-LOCATION': {
            let longitude = context.getters.getAssignValue(
              event.longitude,
              params
            );
            let latitude = context.getters.getAssignValue(
              event.latitude,
              params
            );
            let name = context.getters.getAssignValue(event.name, params);
            let scale = context.getters.getAssignValue(event.scale, params);
            return new Promise((resolve, reject) => {
              geolocation.openLocation({
                latitude,
                longitude,
                name,
                scale: +scale || 18,
                coordType: 'gcj02',
                success: function () {
                  resolve({});
                },
                fail: function (data, code) {
                  console.log(
                    `open location fail, code = ${code}, errorMsg=${data}`
                  );
                  reject(data);
                }
              });
            });
          }
          default:
            console.warn('未知的动作类型', event);
            break;
        }
      },

      checkPageAcl(context, perm: string) {
        let {app = {}, company = {}} = context.state.rootStore;
        if (!perm) {
          return false;
        }
        const accounts = [company?.trie, app?.trie];

        // 注意权限校验用到了爱速搭store里内置的方法
        return perm.split('|').some((perItem: string) =>
          perItem.split('&').every(item => {
            if (~item.indexOf('?') || ~item.indexOf('$')) {
              return accounts.some(
                account => account && account?.permissions(item).length
              );
            }
            return accounts.some(account => account && account?.check(item));
          })
        );
      },

      getBindDataField(conf?: PlainObject) {
        let fields = (conf?.fields || []).filter((field: any) =>
          String(field.fieldKey).startsWith('data.')
        );
        if (!fields.length) {
          return null;
        }
        return fields[0].field;
      },

      // getComboStore(
      //   id: string,
      //   dsId?: string,
      //   defaultValues: PlainObject[] = []
      // ) {
      //   let formStore = this.comboFormStore.find(item => item.id === id);
      //   if (!formStore) {
      //     let stores: Store[] = [];
      //     if (Array.isArray(defaultValues?.slice()) && defaultValues.length) {
      //       defaultValues.forEach(value => {
      //         // stores.push(createFormStore(this, id, value));
      //       });
      //     }

      //     this.comboFormStore.push({
      //       id,
      //       dsId,
      //       stores
      //     });
      //   } else if (
      //     defaultValues?.length &&
      //     formStore.stores.length === 0 &&
      //     isEmpty(formStore.stores[0]?.data)
      //   ) {
      //     let stores: Store[] = [];
      //     defaultValues.forEach(value => {
      //       // stores.push(createFormStore(this, id, value));
      //     });
      //     formStore.stores = stores;
      //   }
      //   return formStore;
      // },

      // changeComboData(id: string) {
      //   let node = this.getNodeById(id);
      //   if (!node) {
      //     return;
      //   }
      //   let bindInfo = node.componentProperties?.data?.bindInfo || {};
      //   let fieldName = this.getBindDataField(bindInfo);
      //   let formStore = this.getDataStore(bindInfo);
      //   if (fieldName && formStore) {
      //     let comboStore = this.comboFormStore.find(item => item.id === id);
      //     let value = (comboStore?.stores || []).map(item => item.data);
      //     formStore.setFieldValue(fieldName, value);
      //   }
      // },

      checkNeedDeferReload(context) {
        const rootStore = context.state.rootStore;
        let pages = rootStore?.state.deferReloadPages || [];
        let currentRoute = Page.getCurrentRoute();
        if (pages.includes(context.state.id) || pages.includes(currentRoute)) {
          console.log('目标页面激活刷新', currentRoute);
          rootStore.commit('removeDeferReloadPage', context.state.id);
          rootStore.commit('removeDeferReloadPage', currentRoute);
          rootStore.dispatch('initPage', {
            pageId: context.state.id,
            options: {
              query: context.state.query,
              force: true
            }
          });
        }
      },

      handleLoopEvent(context, loopEvent: loopEventProps) {
        let pageProps = context.state.structor?.componentProperties || {};
        const pageId = context.state.id;
        let records = loopRecords[pageId] || {};
        let loopInfo = records[loopEvent.id];
        if (loopEvent.maxTime && loopInfo?.count > loopEvent.maxTime) {
          // @ifndef PLATFORM
          console.log(
            `[定时事件] ${loopEvent.id} 超过最大次数${loopEvent.maxTime} 停止执行`
          );
          // @endif
          return;
        }

        if (loopInfo) {
          loopInfo.count++;
        } else {
          records[loopEvent.id] = {
            count: 1,
            timer: null
          };
          loopInfo = records[loopEvent.id];
        }
        loopRecords[pageId] = records;
        let interval = loopEvent.interval || 5000;

        loopInfo.timer = setTimeout(() => {
          // @ifndef PLATFORM
          console.log(`[定时事件] ${loopEvent.id} 指定第 ${loopInfo.count}次`);
          // @endif
          context.dispatch('handleAction', {
            type: 'loop',
            props: {
              ...pageProps,
              events: loopEvent.event?.loop || []
            }
          });
          context.dispatch('handleLoopEvent', loopEvent);
        }, interval);
      },

      startLoopEvents(context) {
        let loopEvents =
          context.state.structor?.componentProperties?.data?.loopEvent || [];
        if (!loopEvents.length) {
          return;
        }
        context.dispatch('stopLoopEvents');
        for (let loopEvent of loopEvents) {
          context.dispatch('handleLoopEvent', loopEvent as loopEventProps);
        }
      },

      stopLoopEvents(context, reset = false) {
        let pageId = context.state.id;
        let records = loopRecords[pageId] || {};
        Object.keys(records).forEach(key => {
          if (records[key]?.timer) {
            clearTimeout(records[key].timer);
          }
        });
        if (reset) {
          loopRecords[pageId] = {};
          console.log(`清理页面${pageId}定时器`);
        } else {
          console.log(`暂停页面${pageId}定时器`);
        }
      }
    }
  });
  return pageStore;
}
