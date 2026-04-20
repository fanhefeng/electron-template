export interface DeepLinkPayload {
  /** 原始 URL */
  raw: string;
  /** 目标窗口 ID（main / settings / about） */
  window: string;
  /** 窗口内路径（可多级，如 "updates" 或 "font/preview"） */
  path: string;
  /** 查询参数 */
  params: Record<string, string>;
}
