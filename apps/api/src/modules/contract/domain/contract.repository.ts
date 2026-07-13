import { ContractEntity } from '../infrastructure/contract.entity';
import { ContractPaymentEntity } from '../infrastructure/contract-payment.entity';
import { ContractRequestEntity } from '../infrastructure/contract-request.entity';

export const CONTRACT_REPOSITORY = Symbol('CONTRACT_REPOSITORY');

export interface ContractRepository {
  saveRequest(entity: ContractRequestEntity): Promise<ContractRequestEntity>;
  findRequest(id: string): Promise<ContractRequestEntity | null>;
  saveContract(entity: ContractEntity): Promise<ContractEntity>;
  findContract(id: string): Promise<ContractEntity | null>;
  listContracts(): Promise<ContractEntity[]>;
  savePayment(entity: ContractPaymentEntity): Promise<ContractPaymentEntity>;
  findPayment(id: string): Promise<ContractPaymentEntity | null>;
}
