import { describe, expect, it } from 'vitest';
import { RepoScope, UUID } from '../src/index.js';

describe('RepoScope', () => {
  const userId = new UUID<string>('user-1');
  const orgId = new UUID<string>('org-1');

  describe('factories', () => {
    it('builds a user scope', () => {
      const scope = RepoScope.user(userId);

      expect(scope).toEqual({ kind: 'user', userId });
    });

    it('builds an org scope', () => {
      const scope = RepoScope.org(orgId);

      expect(scope).toEqual({ kind: 'org', organizationId: orgId });
    });

    it('builds a user-in-org scope', () => {
      const scope = RepoScope.userInOrg(userId, orgId);

      expect(scope).toEqual({
        kind: 'user-in-org',
        userId,
        organizationId: orgId,
      });
    });
  });

  describe('guards', () => {
    it('isUser narrows only user scopes', () => {
      expect(RepoScope.isUser(RepoScope.user(userId))).toBe(true);
      expect(RepoScope.isUser(RepoScope.org(orgId))).toBe(false);
      expect(RepoScope.isUser(RepoScope.userInOrg(userId, orgId))).toBe(false);
    });

    it('isOrg narrows only org scopes', () => {
      expect(RepoScope.isOrg(RepoScope.org(orgId))).toBe(true);
      expect(RepoScope.isOrg(RepoScope.user(userId))).toBe(false);
      expect(RepoScope.isOrg(RepoScope.userInOrg(userId, orgId))).toBe(false);
    });

    it('isUserInOrg narrows only user-in-org scopes', () => {
      expect(RepoScope.isUserInOrg(RepoScope.userInOrg(userId, orgId))).toBe(true);
      expect(RepoScope.isUserInOrg(RepoScope.user(userId))).toBe(false);
      expect(RepoScope.isUserInOrg(RepoScope.org(orgId))).toBe(false);
    });

    it('narrows the union so scoped fields are reachable', () => {
      const scope = RepoScope.userInOrg(userId, orgId);

      if (RepoScope.isUserInOrg(scope)) {
        expect(scope.userId.value).toBe('user-1');
        expect(scope.organizationId.value).toBe('org-1');
      } else {
        throw new Error('expected user-in-org scope');
      }
    });
  });
});
