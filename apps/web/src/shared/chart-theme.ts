/**
 * ECharts 主题 —— MiniMax 单一色系图表
 *
 * 主序列用近黑，第二序列用品牌蓝，其余用中性灰；网格线与坐标轴取浅灰，
 * 提示框走黑底白字。产品色（珊瑚/洋红/紫）只在确有品类含义时作为补充序列，
 * 不作为通用配色，避免业务页面上出现大面积彩色。
 */
import * as echarts from 'echarts';
import { designToken } from './design-tokens';

export const chartThemeName = 'oa-minimax';

let registered = false;

export function registerChartTheme(): void {
  if (registered) return;
  registered = true;

  const ink = designToken('--color-text');
  const blue = designToken('--color-brand-blue');
  const coral = designToken('--color-brand-coral');
  const purple = designToken('--color-brand-purple');
  const muted = designToken('--color-text-tertiary');
  const bodyText = designToken('--color-text-secondary');
  const border = designToken('--color-border');
  const borderSoft = designToken('--color-border-strong');
  const dark = designToken('--color-surface-dark');
  const onDark = designToken('--color-on-dark');
  const surface = designToken('--color-surface');
  const fontBody = designToken('--font-body');

  echarts.registerTheme(chartThemeName, {
    color: [ink, blue, coral, purple, muted],
    backgroundColor: 'transparent',
    textStyle: { fontFamily: fontBody, color: bodyText, fontSize: 12 },
    title: { textStyle: { color: ink, fontFamily: fontBody, fontWeight: 600, fontSize: 16 } },
    legend: {
      textStyle: { color: muted, fontSize: 12 },
      inactiveColor: designToken('--color-text-disabled'),
      icon: 'roundRect',
      itemWidth: 10,
      itemHeight: 10,
    },
    tooltip: {
      backgroundColor: dark,
      borderWidth: 0,
      textStyle: { color: onDark, fontFamily: fontBody, fontSize: 12 },
      extraCssText: 'border-radius: 8px;',
      axisPointer: {
        lineStyle: { color: borderSoft },
        crossStyle: { color: borderSoft },
        label: { backgroundColor: dark },
      },
    },
    axisPointer: { lineStyle: { color: borderSoft }, crossStyle: { color: borderSoft } },
    categoryAxis: {
      axisLine: { show: true, lineStyle: { color: border } },
      axisTick: { show: false },
      axisLabel: { color: muted },
      splitLine: { show: false },
    },
    valueAxis: {
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: muted },
      splitLine: { lineStyle: { color: border, type: 'dashed' } },
    },
    timeAxis: {
      axisLine: { show: true, lineStyle: { color: border } },
      axisTick: { show: false },
      axisLabel: { color: muted },
      splitLine: { show: false },
    },
    logAxis: {
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: muted },
      splitLine: { lineStyle: { color: border, type: 'dashed' } },
    },
    line: {
      symbol: 'circle',
      symbolSize: 7,
      lineStyle: { width: 2 },
      itemStyle: { borderWidth: 2, borderColor: surface },
    },
    bar: { itemStyle: { borderRadius: [4, 4, 0, 0] } },
    pie: {
      itemStyle: { borderColor: '#fff', borderWidth: 2 },
      label: { color: bodyText, fontSize: 12 },
      labelLine: { lineStyle: { color: border } },
    },
    graph: { itemStyle: { borderColor: '#fff', borderWidth: 2 } },
    gauge: {
      axisLine: { lineStyle: { color: [[1, designToken('--color-surface-3')]] } },
      axisLabel: { color: muted },
      title: { color: muted },
      detail: { color: ink, fontFamily: fontBody, fontWeight: 600 },
    },
    toolbox: { iconStyle: { borderColor: muted } },
  });
}
