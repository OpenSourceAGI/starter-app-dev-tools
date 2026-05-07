import { APIKeysCard } from '@daveyplate/better-auth-ui'
import type { Metadata } from "next"
import { PageHeader } from "@/components/layout/page-header"

export const metadata: Metadata = {
    title: "API"
}

export default function APIKeysSettingsPage() {
  return (
    <div className="space-y-6">
        <PageHeader 
            title="API page"
            description="Manage your API keys."
        />
        <APIKeysCard className="max-w-xl" />
    </div>
  )
}