import type { SessionUser } from '@oa/contracts';
import type { PortalContentListItem } from './portal.types';

/** Applies publication windows and audience rules without depending on persistence concerns. */
export class PortalVisibilityPolicy {
  isVisible(content: PortalContentListItem, user: SessionUser, at: Date): boolean {
    if (
      content.status !== 'PUBLISHED' ||
      !content.publishedAt ||
      content.publishedAt.getTime() > at.getTime()
    ) {
      return false;
    }
    if (content.offlineAt && content.offlineAt.getTime() <= at.getTime()) {
      return false;
    }

    switch (content.audienceType) {
      case 'ALL':
        return true;
      case 'DEPARTMENT':
        return this.matchesDepartment(content.audienceIds, user);
      case 'ROLE':
        return content.audienceIds.some((id) => user.roleCodes.includes(id));
      case 'USER':
        return content.audienceIds.includes(user.id);
    }
    return false;
  }

  private matchesDepartment(audienceIds: string[], user: SessionUser): boolean {
    const activeMemberships = user.memberships.filter((membership) => membership.active);
    const departmentIds = new Set(
      activeMemberships.length > 0
        ? activeMemberships.map((membership) => membership.departmentId)
        : [user.departmentId],
    );
    return audienceIds.some((id) => departmentIds.has(id));
  }
}
