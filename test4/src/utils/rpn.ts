/**
 * @file 简单四则运算，目前只支持加减乘除与括号
 */

const rpn = {
  operationMap: {
    ADD: '+',
    SUB: '-',
    MUL: '*',
    DIV: '/',
    LB: '(',
    RB: ')'
  },

  _precedence: {'%': 3, '/': 2, '*': 2, '-': 1, '+': 1, '#': 0},

  /**
   * operations
   * @private
   */
  _operation: {
    '+': (a: string, b: string) => +a + +b,
    '-': (a: string, b: string) => +a - +b,
    '*': (a: string, b: string) => +a * +b,
    '/': (a: string, b: string) => +a / +b
  },

  /**
   * split expression to array
   * @private
   * @param exp - infix expression
   * @returns {Array|null}
   */
  _splitExp: function (exp: string) {
    exp = exp
      .replace(/[a-zA-Z]/g, '')
      .replace(/([\d%!])\-(\d)/g, '$1 - $2')
      .replace(/([+\-\*\/^])\-(\d)/g, '$1 -$2');
    return /^[+*\/]|\d\(|[\d\)]√|%[\d\(]|![\d\(]|%%|[+\-*\/^]{2,}|[+\-*\/√^]$/.test(
      exp
    )
      ? null
      : exp.match(/(-?(?:\d+\.?\d*|-?\.\d*))|[()+\-*\/√!^%]/gi);
  },

  /**
   * check character, is or not a operator
   * @private
   * @param char - character
   * @returns {boolean}
   */
  _isOperator: function (char: string) {
    return /^[√%!^\/\*\-\+#]$/.test(char);
  },

  /**
   * check character, is or not a unary operator
   * @private
   * @param char - character
   * @returns {boolean}
   */
  _isUnaryOperator: function (char: string) {
    return /^[√%!]$/.test(char);
  },

  /**
   * check character, is or not a bracket
   * @private
   * @param char - character
   * @returns {boolean}
   */
  _isBrackets: function (char) {
    return /^[\(\)]$/.test(char);
  },

  /**
   * check string, is or not a number
   * @private
   * @param str - character
   * @returns {boolean}
   */
  _isNumber: function (str) {
    return /^-?\d+\.\d+$|^-?\d+$/.test(str);
  },

  /**
   * transfer infix expression to reverse polish notation
   * @param exp - infix expression
   * @returns {string|null}
   */
  infix2rpn: function (exp: string) {
    let arrExp = rpn._splitExp(exp);
    let expStack: string[] = [];
    let opStack: string[] = [];
    let stackItem;

    if (!arrExp) {
      return null;
    }
    arrExp = arrExp.concat('#');
    for (let opItem of arrExp) {
      if (rpn._isNumber(opItem)) {
        expStack.push(opItem);
      } else if (rpn._isOperator(opItem)) {
        while (opStack.length) {
          stackItem = opStack.pop();
          if (
            (opItem !== '√' || stackItem !== '√') &&
            rpn._precedence[stackItem] >= rpn._precedence[opItem]
          ) {
            expStack.push(stackItem);
          } else {
            opStack.push(stackItem);
            break;
          }
        }
        opStack.push(opItem);
      } else if (rpn._isBrackets(opItem)) {
        if (opItem === '(') {
          opStack.push(opItem);
        } else {
          while (opStack.length) {
            stackItem = opStack.pop();
            if (stackItem !== '(') {
              expStack.push(stackItem);
            } else {
              break;
            }
          }
        }
      }
    }
    return expStack.length ? expStack.join(' ') : null;
  },

  /**
   * calculate reverse polish notation
   * @param exp - reverse polish notation
   * @returns {number}
   */
  rpnCalculate: function (exp: string | null) {
    if (!exp) {
      return '';
    }
    let arrExp = exp.split(' ');
    let calcStack: string[] = [];
    let param1;
    let param2;

    for (let opItem of arrExp) {
      if (rpn._isNumber(opItem)) {
        calcStack.push(opItem);
      } else if (rpn._isOperator(opItem)) {
        param2 = calcStack.pop();
        param1 = calcStack.pop();
        calcStack.push(rpn._operation[opItem](param1, param2));
      }
    }
    let val = calcStack.pop();
    let result = val
      ? String(val).includes('.')
        ? parseFloat(val).toFixed(2)
        : val
      : 0;
    return result;
  },

  /**
   * calculate expression
   * @param exp - expression string
   * @returns {number|null}
   */
  calculate: function (exp: string) {
    return rpn.rpnCalculate(rpn.infix2rpn(exp));
  }
};

export default rpn;
