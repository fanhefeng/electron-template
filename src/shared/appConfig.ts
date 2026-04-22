/**
 * 应用级配置中心
 * 所有项目级常量在此集中管理，后续新增只需在此添加
 */

export type AppEnvironment = "development" | "production";

export const APP_CONFIG = {
  /** 应用标识（与 package.json build.appId 对应） */
  appId: "com.example.electrontemplate",
  /** 产品名称 */
  productName: "ElectronTemplate",

  /** 按环境区分的配置 */
  env: {
    development: {
      appName: "ElectronTemplate-dev",
      deepLinkScheme: "electrontemplate-dev",
    },
    production: {
      appName: "ElectronTemplate",
      deepLinkScheme: "electrontemplate",
    },
  },
} as const;
