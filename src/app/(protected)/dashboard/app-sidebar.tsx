'use client'
import { Sidebar, SidebarContent ,SidebarGroup, SidebarHeader, SidebarGroupLabel, SidebarGroupContent, SidebarMenuItem, SidebarMenuButton, SidebarMenu } from "@/components/ui/sidebar";
import {LayoutDashboard, Bot, Presentation, CreditCard, Plus} from 'lucide-react';
import Link from "next/link";
import {cn} from "@/lib/utils";
import { usePathname } from "next/navigation";
import { title } from "process";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { useSidebar } from "@/components/ui/sidebar";
import useProject from "@/hooks/use-project";



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
    const {projects, projectId, setProjectId} = useProject();
    console.log(projects);
    const pathname = usePathname();    
    const { open } = useSidebar();
    return (
        <Sidebar collapsible="icon" variant="floating">
            <SidebarHeader>
                <div className="flex items-center gap-2">
                    <Image src='/logo.png' alt="logo" width={40} height={40} />
                   {open && <h1 className="text-xl font-bold text-primary/80"> Dionysis </h1>}
                </div>
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

                <SidebarGroup>
                    <SidebarGroupLabel>
                        Your Projects
                    </SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {projects?.map((project) => {
                                return (
                                    <SidebarMenuItem key={project.name}>
                                        <SidebarMenuButton asChild>
                                            <div onClick= {() => setProjectId(project.id)}>
                                                <div className={cn('rounded-sm size-6 flex  items-center justify-center text-sm bg-white text-primary', {
                                                    ' bg-primary text-white': project.id === projectId
                                                })}>
                                                    {project.name[0]}
                                                </div>
                                                <span>{project.name}</span>
                                            </div>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                )
                            })}
                            <div className="h-2"></div>
                            {open &&
                            <SidebarMenuItem>
                                <Link href='/create'>
                                    <Button variant={"outline"} className="w-fit">
                                        <Plus />
                                        Create Project
                                    </Button>
                                </Link>
                            </SidebarMenuItem>}
                        </SidebarMenu>
                            

                    </SidebarGroupContent>
                </SidebarGroup>


            </SidebarContent>
        </Sidebar> 
    )
}