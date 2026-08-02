import { Inject, Injectable } from '@nestjs/common';
import type {
  PortalAudienceDepartment,
  PortalAudienceDirectory,
  PortalAudienceRole,
  PortalAudienceUser,
} from '@oa/contracts';
import { IamService } from '../../../common/iam/application/iam.service';
import type { DepartmentNode } from '../../../common/iam/application/iam.models';

@Injectable()
export class PortalAudienceDirectoryService {
  constructor(@Inject(IamService) private readonly iam: IamService) {}

  async get(): Promise<PortalAudienceDirectory> {
    const [departmentTree, roles, users] = await Promise.all([
      this.iam.listDepartments(),
      this.iam.listRoles(),
      this.iam.listUsers(),
    ]);
    return {
      departments: flattenDepartments(departmentTree),
      roles: roles.map<PortalAudienceRole>((role) => ({
        code: role.code,
        name: role.name,
        active: role.active,
      })),
      users: users.map<PortalAudienceUser>((user) => ({
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        departmentIds: [
          ...new Set(
            user.memberships
              .filter((membership) => membership.active)
              .map((membership) => membership.departmentId),
          ),
        ],
        active: user.active,
      })),
    };
  }
}

function flattenDepartments(nodes: DepartmentNode[]): PortalAudienceDepartment[] {
  return nodes.flatMap((node) => [
    { id: node.id, name: node.name, parentId: node.parentId, active: node.active },
    ...flattenDepartments(node.children),
  ]);
}
