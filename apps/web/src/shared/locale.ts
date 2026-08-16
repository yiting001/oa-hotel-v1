import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';

export function applyChineseDateLocale(): void {
  dayjs.locale('zh-cn');
}
