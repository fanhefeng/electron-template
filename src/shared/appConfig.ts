/**
 * 应用级配置中心
 * 所有项目级常量在此集中管理，后续新增只需在此添加
 */

export type AppEnvironment = "development" | "production";

// appId/productName 的唯一事实来源是 package.json 的 build 字段 —— 此处不再
// 重复维护一份运行时永远读不到的副本（双源会悄悄漂移）。
export const APP_CONFIG = {
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
