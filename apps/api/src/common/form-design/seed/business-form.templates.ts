import type { CreateFormDefinitionInput } from '../application/form-design.service';
import { CONTRACT_FORM_TEMPLATES } from './contract-form.templates';
import { SEAL_FORM_TEMPLATES } from './seal-form.templates';
import { SUPPLY_FORM_TEMPLATES } from './supply-form.templates';

export const BUILT_IN_FORM_TEMPLATES: CreateFormDefinitionInput[] = [
  ...CONTRACT_FORM_TEMPLATES,
  ...SEAL_FORM_TEMPLATES,
  ...SUPPLY_FORM_TEMPLATES,
];
