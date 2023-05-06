// /**
//  * 表单store
//  */

// import {get} from '@/utils/helper';
// import {PlainObject} from '@/types';
// import {locale} from '@/utils/validation';

// // 手动声明 state 类型
// export interface State {
//   store: any;
//   id: string;
//   data: PlainObject;
//   validations: PlainObject;
// }

// export function createFormStore(
//   store: any,
//   id: string,
//   defaultValue: PlainObject = {}
// ) {
//   const formStore = defineStore({
//     id,
//     state: () =>
//       ({
//         store,
//         id,
//         data: defaultValue,
//         validations: {}
//       } as State),

//     getters: {
//       getFieldValue: state => {
//         return (field: string) => get(state.data, field);
//       }
//     },

//     actions: {
//       registerValidation(
//         field: string,
//         rules: PlainObject[],
//         required: boolean = false
//       ) {
//         let item = this.validations[field] || {};
//         item.rules = rules;
//         item.required = required;
//         item.status = 'pending';
//         this.validations[field] = item;
//       },

//       unRegisterValidation(field: string) {
//         delete this.validations[field];
//       },

//       validateFieldValue(field: string) {
//         let value = this.getFieldValue(field);
//         let validation = {...this.validations[field]};

//         if (!validation) {
//           return null;
//         }
//         let status = 'resolve';
//         let message = '';
//         if (
//           validation.required &&
//           (value === null || value === undefined || value === '')
//         ) {
//           message = locale['validate.isRequired'];
//           status = 'reject';
//         } else {
//           // TODO
//         }
//         validation.message = message;
//         validation.status = status;

//         this.validations = {
//           ...this.validations,
//           [field]: validation
//         };
//         return status;
//       },

//       validateFields() {
//         let errors: string[] = [];
//         Object.keys(this.validations).forEach(field => {
//           let status = this.validateFieldValue(field);
//           if (status === 'reject') {
//             errors.push(this.validations[field].message);
//           }
//         });
//         return errors;
//       },

//       // 防止报错
//       handleAction() {}
//     }
//   });
//   return formStore();
// }
