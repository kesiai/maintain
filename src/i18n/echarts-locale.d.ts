/**
 * echarts 语言包模块类型声明（echarts/i18n/*.js 未附带 .d.ts）
 */
declare module 'echarts/i18n/*' {
  const locale: Record<string, unknown>
  export default locale
}
