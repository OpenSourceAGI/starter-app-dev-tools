"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator
} from "@/components/ui/breadcrumb"

interface BreadcrumbSegment {
    label: string
    href: string
    isCurrentPage: boolean
}

function formatSegmentToTitle(segment: string): string {
    // Handle dynamic route parameters [id] -> ID, [slug] -> Slug, etc.
    if (segment.startsWith('[') && segment.endsWith(']')) {
        const param = segment.slice(1, -1)
        return param.charAt(0).toUpperCase() + param.slice(1)
    }
    
    // Handle special cases and acronyms
    const specialCases: Record<string, string> = {
        'api': 'API',
        'ui': 'UI',
        'ux': 'UX',
        'seo': 'SEO',
        'cms': 'CMS',
        'crm': 'CRM',
        'ai': 'AI',
        'ml': 'ML'
    }
    
    const lowerSegment = segment.toLowerCase()
    if (specialCases[lowerSegment]) {
        return specialCases[lowerSegment]
    }
    
    // Convert kebab-case, snake_case, or camelCase to Title Case
    return segment
        .replace(/[-_]/g, ' ') // Replace hyphens and underscores with spaces
        .replace(/([a-z])([A-Z])/g, '$1 $2') // Add space before capital letters (camelCase)
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ')
}

function generateDynamicBreadcrumbs(pathname: string): BreadcrumbSegment[] {
    // Split pathname and filter out empty segments
    const segments = pathname.split('/').filter(Boolean)
    const breadcrumbs: BreadcrumbSegment[] = []
    
    // Build breadcrumbs from URL segments
    let currentPath = ''
    
    segments.forEach((segment, index) => {
        currentPath += `/${segment}`
        
        // Generate readable label from segment
        const label = formatSegmentToTitle(segment)
        
        breadcrumbs.push({
            label,
            href: currentPath,
            isCurrentPage: currentPath === pathname
        })
    })
    
    return breadcrumbs
}

export function DynamicBreadcrumb() {
    const pathname = usePathname()
    
    // Don't show breadcrumbs for root path only
    if (pathname === '/') {
        return null
    }
    
    const breadcrumbs = generateDynamicBreadcrumbs(pathname)
    
    // Don't render if no meaningful breadcrumbs
    if (breadcrumbs.length === 0) {
        return null
    }

    return (
        <Breadcrumb>
            <BreadcrumbList>
                {breadcrumbs.map((crumb, index) => (
                    <div key={crumb.href} className="contents">
                        {index > 0 && (
                            <BreadcrumbSeparator className="hidden md:block" />
                        )}
                        <BreadcrumbItem className="hidden md:block">
                            {crumb.isCurrentPage ? (
                                <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                            ) : (
                                <BreadcrumbLink asChild>
                                    <Link href={crumb.href}>{crumb.label}</Link>
                                </BreadcrumbLink>
                            )}
                        </BreadcrumbItem>
                    </div>
                ))}
            </BreadcrumbList>
        </Breadcrumb>
    )
}
