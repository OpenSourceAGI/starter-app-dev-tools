"use client"

import {
    RiCodeSSlashLine,
    RiLineChartLine,
    RiToolsFill,
    RiSettingsLine,
    RiSpeedUpLine,
    RiBankCardLine
} from "@remixicon/react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import type * as React from "react"
import { NavUser } from "@/components/layout/nav-user"
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem
} from "@/components/ui/sidebar"
import { site } from "@/config/site"

const data = {
    navMain: [
        {
            title: "General",
            items: [
                {title: "Dashboard",url: "/dashboard",icon: RiSpeedUpLine},
                {title: "Analytics",url: "/dashboard/analytics",icon: RiLineChartLine},
                {title: "Integrations",url: "/dashboard/integrations",icon: RiToolsFill},
                {title: "Settings",url: "/dashboard/settings",icon: RiSettingsLine},
                {title: "Billing",url: "/dashboard/billing",icon: RiBankCardLine},
                {title: "API",url: "/dashboard/api",icon: RiCodeSSlashLine},
            ]
        }
    ]
}



function SidebarLogo() {
    return (
        <div className="flex gap-2 px-2 transition-[padding] duration-300 ease-out group-data-[collapsible=icon]:px-0">
            <Link
                className="group/logo inline-flex items-center gap-2 transition-all duration-300 ease-out"
                href="/dashboard"
            >
                <span className="sr-only">{site.name}</span>
                <Image
                    src={site.logo}
                    alt={site.name}
                    width={30}
                    height={30}
                    className="transition-transform duration-300 ease-out group-data-[collapsible=icon]:scale-110"
                />
                <span className="group-data-[collapsible=icon]:-ml-2 truncate font-bold text-lg transition-[margin,opacity,transform,width] duration-300 ease-out group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:scale-95 group-data-[collapsible=icon]:opacity-0">
                    {site.name}
                </span>
            </Link>
        </div>
    )
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    const pathname = usePathname()

    return (
        <Sidebar collapsible="icon" variant="inset" {...props}>
            <SidebarHeader className="mb-4 h-13 justify-center max-md:mt-2">
                <SidebarLogo />
            </SidebarHeader>
            <SidebarContent className="-mt-2">
                {data.navMain.map((item) => (
                    <SidebarGroup key={item.title}>
                        <SidebarGroupLabel className="text-muted-foreground/65 uppercase">
                            {item.title}
                        </SidebarGroupLabel>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                {item.items.map((item) => {
                                    const isActive = pathname === item.url

                                    return (
                                        <SidebarMenuItem key={item.title}>
                                            <SidebarMenuButton
                                                asChild
                                                className="group/menu-button group-data-[collapsible=icon]:!px-[5px] h-9 gap-3 font-medium transition-all duration-300 ease-out [&>svg]:size-auto"
                                                tooltip={item.title}
                                                isActive={isActive}
                                            >
                                                <Link
                                                    href={item.url}
                                                    className="flex items-center gap-3"
                                                >
                                                    {item.icon && (
                                                        <item.icon
                                                            className="text-muted-foreground/65 group-data-[active=true]/menu-button:text-primary"
                                                            size={22}
                                                            aria-hidden="true"
                                                        />
                                                    )}
                                                    <span>{item.title}</span>
                                                </Link>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    )
                                })}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                ))}
            </SidebarContent>
            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    )
}
