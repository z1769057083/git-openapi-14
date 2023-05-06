# 快应用运行时


## 如何使用

```bash
yarn && yarn start
# OR
npm i && npm start
```

此模版基于 `babel-loader` 方式，使得可以用 TypeScript 开发快应用；同时，为了做到**开箱即用**，有对模版做了加工处理；具体说明如下：

* **对项目结构进行优化**；如上组织结构所示，将各资源模块，更专业的分门别类，使之可以便捷的去编写、维护、查找，同时也是基于前端开发既定共识去设计，更容易为初接触者所理解 & 上手；
* [X] **更优雅的处理数据请求**；采用 `Promise` 对系统内置请求 `@system.fetch` 进行封装，并抛出至全局，使得可以极简的进行链式调用，同时便捷地处理返回数据，并能够使用 `finally`，设计详情可参见[如何优雅处理「快应用」数据请求 ](https://quickapp.lovejade.cn/how-to-elegantly-handle-quickapp-request/)；
* [X] **内置了样式处理方案**；「快应用」支持 `less`, `sass` 的预编译；这里采取 `less` 方案，并内置了部分变量，以及常用混合方法，使得可以轻松开启样式编写、复用、修改等；
* [X] **封装了常用方法**；在 `helper/utils` 路径下，有对日期、字符串、系统等常用方法，分别进行封装，统一暴露给 `global.$utils`，使得维护方式更加合理且健壮，同时又可以便捷的使用，高效开发；当然，你也可以根据需要自行增删、抑或扩展；
* [X] **集成 [Prettier](https://prettier.io/)；在检测代码中潜在问题的同时，统一团队代码规范、风格（`js`，`less`，`scss` 等），从而促使写出高质量代码，以提升工作效率(尤其针对团队开发)。
* [X] **编写 [prettier-plugin-quickapp](https://github.com/nicejade/prettier-plugin-quickapp) 插件**；为快应用编写 `prettier` 插件，使其可以针对 `.ux`/`.mix` 文件也能很好地工作，从而进一步完善代码风格及规范。
**新增文件监听命令**：引入 [onchange](https://github.com/Qard/onchange) 依赖来监听文件变化；使得在开发时，运行 `yarn prettier-watch` 命令，即可对所修改的 `*.md` `*.ux` `*.js` 等文件，进行 **Prettier** 格式化，从而大幅度提升编写效率。
* ......

如欲了解更多此项目模版的设计，可以参见以下几篇文章：

- [如何基于 Typescript 开发快应用](https://quickapp.vivo.com.cn/how-to-develop-quickapp-based-on-typescript/)
- [快应用脚手架，为优雅而生](https://quickapp.lovejade.cn/quickapp-boilerplate-template/)
- [如何优雅处理「快应用」数据请求](https://quickapp.lovejade.cn/how-to-elegantly-handle-quickapp-request/)
- [Prettier 插件为更漂亮快应用代码](https://quickapp.lovejade.cn/prettier-quickapp-plugin/)


## 代码裁剪

使用preprocess裁剪快应用卡片不需要的功能和组件，在编译前先预处理代码。具体使用参考插件github: https://github.com/jsoverson/preprocess。

js中示例

```
// @if PLATFORM=='quickapp'
  let a = 'test';
// @endif
```

css中示例
```
body {
/* @if PLATFORM=='quickapp' */
  background-color: red;
/* @endif */
}
```

template中示例，注意模板中的等于用的=，不是==
```
<!-- @if PLATFORM='quickapp' -->
  <h1>Debugging mode </h1>
<!-- @endif -->
```


