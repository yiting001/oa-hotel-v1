import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import type { MenuInput, SessionUser } from '@oa/contracts';
import { CurrentUser } from '../../auth/current-user.decorator';
import { RequirePermissions } from '../../auth/required-permissions.decorator';
import { IamService } from '../application/iam.service';
import { IAM_PERMISSION } from '../domain/iam-permission';
import {
  CreateRoleDto,
  MenuWriteDto,
  UpdateRoleDto,
  UpdateRoleMenusDto,
  UpdateRolePermissionsDto,
  UpdateUserAssignmentsDto,
} from './access.dto';
import {
  CreateDepartmentDto,
  CreatePositionDto,
  UpdateDepartmentDto,
  UpdatePositionDto,
} from './organization.dto';

function toMenuInput(dto: MenuWriteDto): MenuInput {
  return {
    parentId: dto.parentId ?? null,
    name: dto.name,
    type: dto.type,
    path: dto.path ?? null,
    permissionCode: dto.permissionCode ?? null,
    icon: dto.icon ?? null,
    orderNum: dto.orderNum,
    visible: dto.visible,
    active: dto.active,
  };
}

@Controller('iam')
export class IamController {
  constructor(@Inject(IamService) private readonly iamService: IamService) {}

  @Get('departments')
  @RequirePermissions(IAM_PERMISSION.VIEW)
  listDepartments() {
    return this.iamService.listDepartments();
  }

  @Post('departments')
  @RequirePermissions(IAM_PERMISSION.MANAGE)
  createDepartment(@Body() dto: CreateDepartmentDto) {
    return this.iamService.createDepartment(dto);
  }

  @Patch('departments/:id')
  @RequirePermissions(IAM_PERMISSION.MANAGE)
  updateDepartment(@Param('id') id: string, @Body() dto: UpdateDepartmentDto) {
    return this.iamService.updateDepartment(id, dto);
  }

  @Get('positions')
  @RequirePermissions(IAM_PERMISSION.VIEW)
  listPositions(@Query('departmentId') departmentId?: string) {
    return this.iamService.listPositions(departmentId);
  }

  @Post('positions')
  @RequirePermissions(IAM_PERMISSION.MANAGE)
  createPosition(@Body() dto: CreatePositionDto) {
    return this.iamService.createPosition(dto);
  }

  @Patch('positions/:id')
  @RequirePermissions(IAM_PERMISSION.MANAGE)
  updatePosition(@Param('id') id: string, @Body() dto: UpdatePositionDto) {
    return this.iamService.updatePosition(id, dto);
  }

  @Get('roles')
  @RequirePermissions(IAM_PERMISSION.VIEW)
  listRoles() {
    return this.iamService.listRoles();
  }

  @Post('roles')
  @RequirePermissions(IAM_PERMISSION.MANAGE)
  createRole(@Body() dto: CreateRoleDto) {
    return this.iamService.createRole(dto);
  }

  @Patch('roles/:roleId')
  @RequirePermissions(IAM_PERMISSION.MANAGE)
  updateRole(@Param('roleId') roleId: string, @Body() dto: UpdateRoleDto) {
    return this.iamService.updateRole(roleId, dto);
  }

  @Get('permissions')
  @RequirePermissions(IAM_PERMISSION.VIEW)
  listPermissions() {
    return this.iamService.listPermissions();
  }

  @Get('users')
  @RequirePermissions(IAM_PERMISSION.VIEW)
  listUsers() {
    return this.iamService.listUsers();
  }

  @Get('menus')
  @RequirePermissions(IAM_PERMISSION.VIEW)
  menuTree() {
    return this.iamService.menuTree();
  }

  @Get('menus/mine')
  myMenuTree(@CurrentUser() user: SessionUser) {
    return this.iamService.menuTreeForUser(user);
  }

  @Get('menus/roles')
  @RequirePermissions(IAM_PERMISSION.VIEW)
  listRoleMenuAssignments() {
    return this.iamService.listRoleMenuAssignments();
  }

  @Post('menus')
  @RequirePermissions(IAM_PERMISSION.MANAGE)
  createMenu(@Body() dto: MenuWriteDto) {
    return this.iamService.createMenu(toMenuInput(dto));
  }

  @Patch('menus/:id')
  @RequirePermissions(IAM_PERMISSION.MANAGE)
  updateMenu(@Param('id') id: string, @Body() dto: MenuWriteDto) {
    return this.iamService.updateMenu(id, toMenuInput(dto));
  }

  @Delete('menus/:id')
  @RequirePermissions(IAM_PERMISSION.MANAGE)
  deleteMenu(@Param('id') id: string) {
    return this.iamService.deleteMenu(id);
  }

  @Put('roles/:roleId/menus')
  @RequirePermissions(IAM_PERMISSION.MANAGE)
  updateRoleMenus(@Param('roleId') roleId: string, @Body() dto: UpdateRoleMenusDto) {
    return this.iamService.updateRoleMenus(roleId, dto.menuIds);
  }

  @Put('roles/:roleId/permissions')
  @RequirePermissions(IAM_PERMISSION.MANAGE)
  updateRolePermissions(@Param('roleId') roleId: string, @Body() dto: UpdateRolePermissionsDto) {
    return this.iamService.updateRolePermissions(roleId, dto.permissionIds);
  }

  @Put('users/:userId/assignments')
  @RequirePermissions(IAM_PERMISSION.MANAGE)
  updateUserAssignments(@Param('userId') userId: string, @Body() dto: UpdateUserAssignmentsDto) {
    return this.iamService.updateUserAssignments(userId, dto);
  }
}
