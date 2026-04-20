/**
 * 应用级配置中心
 * 所有项目级常量在此集中管理，后续新增只需在此添加
 */
export const APP_CONFIG = {
  /** 应用标识（与 package.json build.appId 对应） */
  appId: "com.example.electrontemplate",
  /** 产品名称 */
  productName: "ElectronTemplate",
  /** Deep link 自定义协议名（修改此处即全局生效） */
  deepLinkScheme: "electrontemplate",
} as const;
