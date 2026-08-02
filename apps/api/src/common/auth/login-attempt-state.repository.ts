import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, Repository } from 'typeorm';
import { LoginAttemptStateEntity } from './login-attempt-state.entity';

export interface NewLoginAttemptState {
  username: string;
  generation: string;
  attempts: number;
  expiresAt: Date;
  updatedAt: Date;
}

@Injectable()
export class LoginAttemptStateRepository {
  constructor(
    @InjectRepository(LoginAttemptStateEntity)
    private readonly states: Repository<LoginAttemptStateEntity>,
  ) {}

  find(username: string): Promise<LoginAttemptStateEntity | null> {
    return this.states.findOneBy({ username });
  }

  create(input: NewLoginAttemptState): Promise<LoginAttemptStateEntity> {
    return this.states.save(this.states.create(input));
  }

  save(state: LoginAttemptStateEntity): Promise<LoginAttemptStateEntity> {
    return this.states.save(state);
  }

  async deleteExpired(now: Date): Promise<void> {
    await this.states.delete({ expiresAt: LessThanOrEqual(now) });
  }

  count(): Promise<number> {
    return this.states.count();
  }

  async findEarliestExpiry(): Promise<LoginAttemptStateEntity | null> {
    const [state] = await this.states.find({ order: { expiresAt: 'ASC' }, take: 1 });
    return state ?? null;
  }

  async delete(username: string, generation?: string): Promise<void> {
    await this.states.delete(generation === undefined ? { username } : { username, generation });
  }
}
