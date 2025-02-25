'use client'
import { Sidebar, SidebarContent ,SidebarGroup, SidebarHeader, SidebarGroupLabel, SidebarGroupContent, SidebarMenuItem, SidebarMenuButton, SidebarMenu } from "@/components/ui/sidebar";
import {LayoutDashboard, Bot, Presentation, CreditCard} from 'lucide-react';
import Link from "next/link";
import {cn} from "@/lib/utils";
import { usePathname } from "next/navigation";
import classnames from 'classnames'

const items = [
    {
    title: 'Dashboard',
    url: '/dashboard',
    icon: LayoutDashboard 
    },
    {
        title: "Q&A",
        url: '/qa',
        icon: Bot,
    },
    {
        title: "Meetings",
        url: '/meetings',
        icon: Presentation
    },
    {
        title: "Billing",
        url: '/billing',
        icon: CreditCard
    }
]

export function AppSidebar() {
    const pathname = usePathname();    
    return (
        <Sidebar collapsible="icon" variant="floating">
            <SidebarHeader>
                Logo
            </SidebarHeader>
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>
                        Application
                    </SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                                {items.map((item => {
                                return (
                                    <SidebarMenuItem key={item.title}>
                                        <SidebarMenuButton asChild>
                                            <Link href={item.url} className={cn({
                                                '!bg-primary  !text-white': pathname == item.url
                                            }, 'list-none')}>
                                                <item.icon />
                                                <span>{item.title}</span>
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                )
                            }))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>
        </Sidebar> 
    )
}