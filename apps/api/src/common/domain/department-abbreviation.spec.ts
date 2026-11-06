import { describe, expect, it } from 'vitest';
import { departmentNumberPrefix } from './department-abbreviation';

describe('departmentNumberPrefix', () => {
  it('uses the known abbreviation for the hotel departments', () => {
    expect(departmentNumberPrefix('工程部')).toBe('GCB');
    expect(departmentNumberPrefix('财务部')).toBe('CWB');
    expect(departmentNumberPrefix('办公室')).toBe('BGS');
    expect(departmentNumberPrefix('人力资源部')).toBe('RLZYB');
    expect(departmentNumberPrefix('党群工作部')).toBe('DQGZB');
  });

  it('derives pinyin initials for departments outside the known table', () => {
    expect(departmentNumberPrefix('质检部')).toBe('ZJB');
    expect(departmentNumberPrefix('安保部')).toBe('ABB');
  });

  it('keeps ascii names and falls back for unknown characters', () => {
    expect(departmentNumberPrefix('IT部')).toBe('ITB');
    expect(departmentNumberPrefix('舛部')).toBe('OA');
    expect(departmentNumberPrefix('')).toBe('OA');
    expect(departmentNumberPrefix(null)).toBe('OA');
  });
});
