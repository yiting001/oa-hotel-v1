import { SetMetadata } from '@nestjs/common';

export const allowPasswordChangeRequiredKey = 'allow-password-change-required';

/** Allows account-recovery endpoints while normal access is locked pending a password change. */
export const AllowPasswordChangeRequired = (): MethodDecorator & ClassDecorator =>
  SetMetadata(allowPasswordChangeRequiredKey, true);
