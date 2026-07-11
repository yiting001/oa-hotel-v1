import { DomainError } from '../errors/domain-error';

const DIGITS = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖'];
const UNITS = ['', '拾', '佰', '仟'];
const SECTIONS = ['', '万', '亿', '万亿'];

export class Money {
  private constructor(readonly cents: number) {}

  static fromCents(cents: number): Money {
    if (!Number.isSafeInteger(cents) || cents < 0) {
      throw new DomainError('INVALID_MONEY', '金额必须是非负整数分');
    }
    return new Money(cents);
  }

  add(other: Money): Money {
    return Money.fromCents(this.cents + other.cents);
  }

  subtract(other: Money): Money {
    if (other.cents > this.cents) {
      throw new DomainError('INSUFFICIENT_AMOUNT', '金额不能小于扣减金额');
    }
    return Money.fromCents(this.cents - other.cents);
  }

  toChineseUppercase(): string {
    if (this.cents === 0) {
      return '零元整';
    }
    const yuan = Math.floor(this.cents / 100);
    const jiao = Math.floor((this.cents % 100) / 10);
    const fen = this.cents % 10;
    const integer = yuan === 0 ? '' : `${this.integerToChinese(yuan)}元`;
    const decimal = `${jiao > 0 ? `${DIGITS[jiao]}角` : ''}${fen > 0 ? `${DIGITS[fen]}分` : ''}`;
    return `${integer}${decimal || '整'}`;
  }

  private integerToChinese(value: number): string {
    const sections: string[] = [];
    let remaining = value;
    let sectionIndex = 0;
    let pendingZero = false;

    while (remaining > 0) {
      const section = remaining % 10_000;
      if (section === 0) {
        pendingZero = sections.length > 0;
      } else {
        const converted = this.sectionToChinese(section);
        sections.unshift(`${pendingZero ? '零' : ''}${converted}${SECTIONS[sectionIndex]}`);
        pendingZero = section < 1000;
      }
      remaining = Math.floor(remaining / 10_000);
      sectionIndex += 1;
    }
    return sections.join('').replace(/零+/g, '零').replace(/零$/, '');
  }

  private sectionToChinese(section: number): string {
    let result = '';
    let zeroPending = false;
    let remaining = section;
    for (let index = 0; index < 4; index += 1) {
      const digit = remaining % 10;
      if (digit === 0) {
        zeroPending = result.length > 0;
      } else {
        result = `${DIGITS[digit]}${UNITS[index]}${zeroPending ? '零' : ''}${result}`;
        zeroPending = false;
      }
      remaining = Math.floor(remaining / 10);
    }
    return result;
  }
}
