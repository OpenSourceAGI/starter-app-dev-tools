import { PageHeader } from "@/components/layout/page-header"
import type { Metadata } from "next"

export const metadata: Metadata = {
    title: "Dashboard"
}

export default function DashboardPage() {
    return (
        <div className="space-y-6">
            <PageHeader 
                title="Hi, Welcome back 👋"
                description="Here's what's happening with your account today."
            />
        </div>
    )
}
