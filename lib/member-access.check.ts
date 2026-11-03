import assert from "node:assert/strict";
import { canManageMember } from "./member-access";

const superAdmin = {
  id: "super1",
  email: "super1@nu.edu.eg",
  committee: null,
  isAdmin: true,
  isSuperAdmin: true,
};

const otherSuperAdmin = {
  id: "super2",
  email: "super2@nu.edu.eg",
  committee: "Design",
  isAdmin: true,
  isSuperAdmin: true,
};

const designHead = {
  id: "head1",
  email: "head1@nu.edu.eg",
  committee: "Design",
  isAdmin: true,
  isSuperAdmin: false,
};

const designMember = {
  id: "member1",
  email: "member1@nu.edu.eg",
  committee: "Design",
  isAdmin: false,
  isSuperAdmin: false,
};

const designAdminMember = {
  id: "admin_member",
  email: "admin_member@nu.edu.eg",
  committee: "Design",
  isAdmin: true,
  isSuperAdmin: false,
};

const mediaMember = {
  id: "member2",
  email: "member2@nu.edu.eg",
  committee: "Media",
  isAdmin: false,
  isSuperAdmin: false,
};

const unassignedMember = {
  id: "member3",
  email: "member3@nu.edu.eg",
  committee: null,
  isAdmin: false,
  isSuperAdmin: false,
};

const regularUser = {
  id: "user1",
  email: "user1@nu.edu.eg",
  committee: "Design",
  isAdmin: false,
  isSuperAdmin: false,
};

// 1. Superadmin managing normal members
assert.equal(canManageMember(superAdmin, designMember, "edit"), true);
assert.equal(canManageMember(superAdmin, designMember, "reset-password"), true);
assert.equal(canManageMember(superAdmin, designMember, "delete"), true);
assert.equal(canManageMember(superAdmin, mediaMember, "edit"), true);
assert.equal(canManageMember(superAdmin, mediaMember, "delete"), true);

// 2. Superadmin managing another superadmin
assert.equal(canManageMember(superAdmin, otherSuperAdmin, "edit"), true);
assert.equal(canManageMember(superAdmin, otherSuperAdmin, "reset-password"), false);
assert.equal(canManageMember(superAdmin, otherSuperAdmin, "delete"), false);

// 3. Self-deletion is blocked
assert.equal(canManageMember(superAdmin, superAdmin, "delete"), false);
assert.equal(canManageMember(designHead, designHead, "delete"), false);

// 4. Non-superadmin admin managing member of same committee
assert.equal(canManageMember(designHead, designMember, "edit"), true);
assert.equal(canManageMember(designHead, designMember, "reset-password"), true);
assert.equal(canManageMember(designHead, designMember, "delete"), true);

// 5. Non-superadmin admin managing member of different committee
assert.equal(canManageMember(designHead, mediaMember, "edit"), false);
assert.equal(canManageMember(designHead, mediaMember, "reset-password"), false);
assert.equal(canManageMember(designHead, mediaMember, "delete"), false);

// 6. Non-superadmin admin managing member without committee
assert.equal(canManageMember(designHead, unassignedMember, "edit"), false);
assert.equal(canManageMember(designHead, unassignedMember, "delete"), false);

// 7. Non-superadmin admin managing another admin in same committee
assert.equal(canManageMember(designHead, designAdminMember, "edit"), false);
assert.equal(canManageMember(designHead, designAdminMember, "reset-password"), false);
assert.equal(canManageMember(designHead, designAdminMember, "delete"), false);

// 8. Non-superadmin admin managing superadmin
assert.equal(canManageMember(designHead, superAdmin, "edit"), false);
assert.equal(canManageMember(designHead, superAdmin, "reset-password"), false);
assert.equal(canManageMember(designHead, superAdmin, "delete"), false);

// 9. Admin without committee cannot manage anyone
const adminWithoutCommittee = { ...designHead, committee: null };
assert.equal(canManageMember(adminWithoutCommittee, designMember, "edit"), false);

// 10. Regular user cannot manage anyone
assert.equal(canManageMember(regularUser, designMember, "edit"), false);
assert.equal(canManageMember(regularUser, designMember, "delete"), false);

console.log("member-access checks passed");
