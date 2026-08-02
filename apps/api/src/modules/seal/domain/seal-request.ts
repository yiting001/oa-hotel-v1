import { DomainError } from '../../../common/errors/domain-error';

export function validateBorrowPeriod(useDate: string, plannedReturnDate: string): void {
  if (new Date(plannedReturnDate).getTime() < new Date(useDate).getTime()) {
    throw new DomainError('INVALID_RETURN_DATE', '归还日期不能早于使用日期');
  }
}
