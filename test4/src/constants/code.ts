// 接口返回code

import { Config } from '.';

// 成功code
export const SUCC_LIST = [0, 200, '0', '200'];

// 登录失效code
export const LOGIN_FAILURE_LIST = Config.loginErrorCode || ['401'];
