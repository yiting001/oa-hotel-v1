import { DomainError } from '../errors/domain-error';

const SCALE = 1000n;

export class Quantity {
  private constructor(readonly scaled: bigint) {}

  static parse(value: string, allowZero = false): Quantity {
    if (!/^\d+(\.\d{1,3})?$/.test(value)) {
      throw new DomainError('INVALID_QUANTITY', '数量最多支持三位小数');
    }
    const [integer, decimals = ''] = value.split('.');
    const scaled = BigInt(integer) * SCALE + BigInt(decimals.padEnd(3, '0'));
    if (allowZero ? scaled < 0n : scaled <= 0n) {
      throw new DomainError('INVALID_QUANTITY', allowZero ? '数量不能为负数' : '数量必须大于零');
    }
    return new Quantity(scaled);
  }

  multiplyCents(unitPriceCents: number): number {
    const total = (this.scaled * BigInt(unitPriceCents)) / SCALE;
    const numeric = Number(total);
    if (!Number.isSafeInteger(numeric)) {
      throw new DomainError('AMOUNT_OVERFLOW', '金额超出系统安全范围');
    }
    return numeric;
  }

  subtract(other: Quantity): Quantity {
    if (other.scaled > this.scaled) {
      throw new DomainError('INSUFFICIENT_STOCK', '库存数量不足');
    }
    return new Quantity(this.scaled - other.scaled);
  }

  toString(): string {
    const integer = this.scaled / SCALE;
    const decimal = (this.scaled % SCALE).toString().padStart(3, '0').replace(/0+$/, '');
    return decimal ? `${integer}.${decimal}` : integer.toString();
  }
}
