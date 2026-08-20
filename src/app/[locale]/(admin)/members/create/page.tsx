"use client";

import { MemberForm } from "@/components/members/MemberForm";
import { useTranslations } from "next-intl";
import { PermissionGuard } from "@/hooks/useRequirePermission";

export default function CreateMemberPage() {
  const t = useTranslations("members");

  
  return (
  <PermissionGuard module="members" action="view">
          
  
        <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">{t("newMember")}</h1>
      </div>

      <MemberForm />
    </div>
  </PermissionGuard>
  );
}