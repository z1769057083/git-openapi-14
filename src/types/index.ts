export interface PlainObject {
  [propsName: string]: any;
}

export interface IOptions {
  label: string;
  value?: string;
  icon?: string;
  disabled?: boolean;
}

export interface ILayout {
  width?: number;
  height?: number;
  x?: number;
  y?: number;
}

export interface IComponentProps {
  base: any;
  data: PlainObject;
  style: any;
  isFlow?: boolean;
}

export interface IComponent {
  id: string;
  componentId: string;
  componentProperties: IComponentProps;
  children: IComponent[];
  enableEvent?: boolean;
  devMode?: boolean;
  scopeIndex?: number;
  isElementDragging?: boolean;
  dataSource?: PlainObject;
  store: any;
  formStore?: any;
}

export interface IPage {
  id: string;
  [props: string]: any;
}

export interface IConfig {
  isStandalone?: boolean;
  host: string;
  runtime?: string;
  staticHost?: string;
  token?: string;
  company: PlainObject;
  app: PlainObject;
  pageMap: PlainObject;
  pageIdMap: PlainObject;
  pages: string[];
  api?: PlainObject;
  loginAPI?: string;
  loginPage?: string;
  loginErrorCode?: string[];
  cookie?: string;
}
