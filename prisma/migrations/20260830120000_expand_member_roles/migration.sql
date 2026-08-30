-- AlterEnum: add relationship roles to MemberRole
ALTER TYPE "MemberRole" ADD VALUE IF NOT EXISTS 'spouse';
ALTER TYPE "MemberRole" ADD VALUE IF NOT EXISTS 'sibling';
ALTER TYPE "MemberRole" ADD VALUE IF NOT EXISTS 'grandparent';
ALTER TYPE "MemberRole" ADD VALUE IF NOT EXISTS 'uncle';
ALTER TYPE "MemberRole" ADD VALUE IF NOT EXISTS 'aunt';
ALTER TYPE "MemberRole" ADD VALUE IF NOT EXISTS 'cousin';
ALTER TYPE "MemberRole" ADD VALUE IF NOT EXISTS 'friend';
ALTER TYPE "MemberRole" ADD VALUE IF NOT EXISTS 'other';
