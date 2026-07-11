import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { ContractRepository } from '../domain/contract.repository';
import { ContractEntity } from './contract.entity';
import { ContractPaymentEntity } from './contract-payment.entity';
import { ContractRequestEntity } from './contract-request.entity';

@Injectable()
export class TypeOrmContractRepository implements ContractRepository {
  constructor(
    @InjectRepository(ContractRequestEntity)
    private readonly requests: Repository<ContractRequestEntity>,
    @InjectRepository(ContractEntity)
    private readonly contracts: Repository<ContractEntity>,
    @InjectRepository(ContractPaymentEntity)
    private readonly payments: Repository<ContractPaymentEntity>,
  ) {}

  saveRequest(entity: ContractRequestEntity): Promise<ContractRequestEntity> {
    return this.requests.save(entity);
  }

  findRequest(id: string): Promise<ContractRequestEntity | null> {
    return this.requests.findOneBy({ id });
  }

  saveContract(entity: ContractEntity): Promise<ContractEntity> {
    return this.contracts.save(entity);
  }

  findContract(id: string): Promise<ContractEntity | null> {
    return this.contracts.findOneBy({ id });
  }

  listContracts(): Promise<ContractEntity[]> {
    return this.contracts.find({ order: { name: 'ASC' } });
  }

  savePayment(entity: ContractPaymentEntity): Promise<ContractPaymentEntity> {
    return this.payments.save(entity);
  }

  findPayment(id: string): Promise<ContractPaymentEntity | null> {
    return this.payments.findOneBy({ id });
  }
}
