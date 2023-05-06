/* eslint-disable eqeqeq */

import {PlainObject} from '@/types';

const isExisty = (value: any) => value !== null && value !== undefined;
const isEmpty = (value: any) => value === '';

const makeRegexp = (reg: string | RegExp) => {
  if (reg instanceof RegExp) {
    return reg;
  } else if (/^(?:matchRegexp\:)?\/(.+)\/([gimuy]*)$/.test(reg)) {
    return new RegExp(RegExp.$1, RegExp.$2 || '');
  } else if (typeof reg === 'string') {
    return new RegExp(reg);
  }
  return /^$/;
};

export type ValidateFn = (value: any, arg1?: any) => boolean;

export const locale: PlainObject = {
  'validate.equals': '输入的数据与 $1 不一致',
  'validate.equalsField': '输入的数据与 $1 值不一致',
  'validate.gt': '请输入大于 $1 的值',
  'validate.isAlpha': '请输入字母',
  'validate.isAlphanumeric': '请输入字母或者数字',
  'validate.isEmail': 'Email 格式不正确',
  'validate.isFloat': '请输入浮点型数值',
  'validate.isId': '请输入合法的身份证号',
  'validate.isInt': '请输入整型数字',
  'validate.isJson': 'JSON 格式不正确',
  'validate.isLength': '请输入长度为 $1 的内容',
  'validate.isNumeric': '请输入数字',
  'validate.isPhoneNumber': '请输入合法的手机号码',
  'validate.isRequired': '这是必填项',
  'validate.isTelNumber': '请输入合法的电话号码',
  'validate.isUrl': 'URL 格式不正确',
  'validate.isUrlPath': '只能输入字母、数字、`-` 和 `_`.',
  'validate.isWords': '请输入单词',
  'validate.isZipcode': '请输入合法的邮编地址',
  'validate.lt': '请输入小于 $1 的值',
  'validate.matchRegexp': '格式不正确, 请输入符合规则为 `$1` 的内容。',
  'validate.maximum': '当前输入值超出最大值 $1',
  'validate.maxLength': '请控制内容长度, 不要输入 $1 个以上字符',
  'validate.minimum': '当前输入值低于最小值 $1',
  'validate.minLength': '请输入更多的内容，至少输入 $1 个字符。',
  'validate.notEmptyString': '请不要全输入空白字符'
};

export const validations: {
  [propsName: string]: ValidateFn;
} = {
  isRequired: function (value: any) {
    return (
      value !== undefined &&
      value !== '' &&
      value !== null &&
      (!Array.isArray(value) || !!value.length)
    );
  },
  isExisty: function (value) {
    return isExisty(value);
  },
  matchRegexp: function (value, regexp) {
    return !isExisty(value) || isEmpty(value) || makeRegexp(regexp).test(value);
  },
  isUndefined: function (value) {
    return value === undefined;
  },
  isEmptyString: function (value) {
    return isEmpty(value);
  },
  isEmail: function (value) {
    return validations.matchRegexp(
      value,
      // eslint-disable-next-line max-len
      /^((([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+(\.([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+)*)|((\x22)((((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(([\x01-\x08\x0b\x0c\x0e-\x1f\x7f]|\x21|[\x23-\x5b]|[\x5d-\x7e]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(\\([\x01-\x09\x0b\x0c\x0d-\x7f]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))))*(((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(\x22)))@((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))$/i
    );
  },
  isUrl: function (value) {
    let pattern = new RegExp(
      '^(https?:\\/\\/)?' + // protocol
        '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|' + // domain name
        '((\\d{1,3}\\.){3}\\d{1,3}))' + // OR ip (v4) address
        '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*' + // port and path
        '(\\?[;&a-z\\d%_.~+=-]*)?' + // query string
        '(\\#[-a-z\\d_]*)?$',
      'i'
    ); // fragment locator
    return !!pattern.test(value);
  },
  isTrue: function (value) {
    return value === true;
  },
  isFalse: function (value) {
    return value === false;
  },
  isNumeric: function (value) {
    if (typeof value === 'number') {
      return true;
    }
    return validations.matchRegexp(value, /^[-+]?(?:\d*[.])?\d+$/);
  },
  isAlpha: function (value) {
    return validations.matchRegexp(value, /^[A-Z]+$/i);
  },
  isAlphanumeric: function (value) {
    return validations.matchRegexp(value, /^[0-9A-Z]+$/i);
  },
  isInt: function (value) {
    return validations.matchRegexp(value, /^(?:[-+]?(?:0|[1-9]\d*))$/);
  },
  isFloat: function (value) {
    return validations.matchRegexp(
      value,
      /^(?:[-+]?(?:\d+))?(?:\.\d*)?(?:[eE][\+\-]?(?:\d+))?$/
    );
  },
  isWords: function (value) {
    return validations.matchRegexp(value, /^[A-Z\s]+$/i);
  },
  isSpecialWords: function (value) {
    return validations.matchRegexp(value, /^[A-Z\s\u00C0-\u017F]+$/i);
  },
  isLength: function (value, length) {
    return !isExisty(value) || isEmpty(value) || value.length === length;
  },
  equals: function (value, eql) {
    return !isExisty(value) || isEmpty(value) || value == eql;
  },
  maxLength: function (value, length) {
    // 此方法应该判断文本长度，如果传入数据为number，导致 maxLength 和 maximum 表现一致了，默认转成string
    if (typeof value === 'number') {
      value = String(value);
    }
    return !isExisty(value) || value.length <= length;
  },
  minLength: function (value, length) {
    return !isExisty(value) || isEmpty(value) || value.length >= length;
  },
  isUrlPath: function (value, regexp) {
    return !isExisty(value) || isEmpty(value) || /^[a-z0-9_\\-]+$/i.test(value);
  },
  maximum: function (value, maximum) {
    return (
      !isExisty(value) ||
      isEmpty(value) ||
      (parseFloat(value) || 0) <= (parseFloat(maximum) || 0)
    );
  },
  lt: function (value, maximum) {
    return (
      !isExisty(value) ||
      isEmpty(value) ||
      (parseFloat(value) || 0) < (parseFloat(maximum) || 0)
    );
  },
  minimum: function (value, minimum) {
    return (
      !isExisty(value) ||
      isEmpty(value) ||
      (parseFloat(value) || 0) >= (parseFloat(minimum) || 0)
    );
  },
  gt: function (value, minimum) {
    return (
      !isExisty(value) ||
      isEmpty(value) ||
      (parseFloat(value) || 0) > (parseFloat(minimum) || 0)
    );
  },
  isJson: function (value, minimum) {
    if (isExisty(value) && !isEmpty(value) && typeof value === 'string') {
      try {
        const result = JSON.parse(value);
        if (typeof result === 'object' && result) {
          return true;
        }
        return false;
      } catch (e) {
        return false;
      }
    }
    return true;
  },
  isPhoneNumber: function (value) {
    return (
      !isExisty(value) || isEmpty(value) || /^[1]([3-9])[0-9]{9}$/.test(value)
    );
  },
  isTelNumber: function (value) {
    return (
      !isExisty(value) ||
      isEmpty(value) ||
      /^(\(\d{3,4}\)|\d{3,4}-|\s)?\d{7,14}$/.test(value)
    );
  },
  isZipcode: function (value) {
    return (
      !isExisty(value) || isEmpty(value) || /^[1-9]{1}(\d+){5}$/.test(value)
    );
  },
  isId: function (value) {
    return (
      !isExisty(value) ||
      isEmpty(value) ||
      // eslint-disable-next-line max-len
      /(^[1-9]\d{5}(18|19|([23]\d))\d{2}((0[1-9])|(10|11|12))(([0-2][1-9])|10|20|30|31)\d{3}[0-9Xx]$)|(^[1-9]\d{5}\d{2}((0[1-9])|(10|11|12))(([0-2][1-9])|10|20|30|31)\d{3}$)/.test(
        value
      )
    );
  },
  notEmptyString: function (value) {
    return !isExisty(value) || !(String(value) && String(value).trim() === '');
  }
};
