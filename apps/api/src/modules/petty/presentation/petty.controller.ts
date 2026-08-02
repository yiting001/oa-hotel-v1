import { Body, Controller, Delete, Get, Inject, Param, Patch, Post } from '@nestjs/common';
import { BUSINESS_MODULE_PERMISSIONS, type SessionUser } from '@oa/contracts';
import { CurrentUser } from '../../../common/auth/current-user.decorator';
import { RequirePermissions } from '../../../common/auth/required-permissions.decorator';
import { IAM_PERMISSION } from '../../../common/iam/domain/iam-permission';
import { PettyApplicationService } from '../application/petty-application.service';
import {
  PettyItemQuantityDto,
  PettyMaterialDto,
  PettyMaterialImportDto,
  PettyProcurementDto,
} from './petty.dto';

const permission = BUSINESS_MODULE_PERMISSIONS.PETTY;

@Controller('petty')
export class PettyController {
  constructor(@Inject(PettyApplicationService) private readonly service: PettyApplicationService) {}

  @Get('materials')
  @RequirePermissions('DOCUMENT_VIEW', permission.VIEW)
  listMaterials() {
    return this.service.listMaterials();
  }

  @Post('materials')
  @RequirePermissions(IAM_PERMISSION.MANAGE)
  createMaterial(@Body() dto: PettyMaterialDto) {
    return this.service.saveMaterial(dto);
  }

  @Patch('materials/:id')
  @RequirePermissions(IAM_PERMISSION.MANAGE)
  updateMaterial(@Param('id') id: string, @Body() dto: PettyMaterialDto) {
    return this.service.saveMaterial(dto, id);
  }

  @Delete('materials/:id')
  @RequirePermissions(IAM_PERMISSION.MANAGE)
  removeMaterial(@Param('id') id: string) {
    return this.service.removeMaterial(id);
  }

  @Post('materials/import')
  @RequirePermissions(IAM_PERMISSION.MANAGE)
  importMaterials(@Body() dto: PettyMaterialImportDto) {
    return this.service.importMaterials(dto.materials);
  }

  @Post('procurements')
  @RequirePermissions('DOCUMENT_CREATE', permission.CREATE)
  create(@Body() dto: PettyProcurementDto, @CurrentUser() user: SessionUser) {
    return this.service.save(dto, user);
  }

  @Patch('procurements/:id')
  @RequirePermissions('DOCUMENT_CREATE', permission.CREATE)
  update(
    @Param('id') id: string,
    @Body() dto: PettyProcurementDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.service.save(dto, user, id);
  }

  @Get('procurements/:id')
  @RequirePermissions('DOCUMENT_VIEW', permission.VIEW)
  get(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    return this.service.get(id, user);
  }

  @Patch('procurements/:id/items/:itemId')
  @RequirePermissions('DOCUMENT_VIEW', permission.VIEW)
  updateItemQuantity(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() dto: PettyItemQuantityDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.service.updateItemQuantity(id, itemId, dto, user);
  }

  @Delete('procurements/:id/items/:itemId')
  @RequirePermissions('DOCUMENT_VIEW', permission.VIEW)
  removeItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @CurrentUser() user: SessionUser,
  ) {
    return this.service.removeItem(id, itemId, user);
  }
}
