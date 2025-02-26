import React from 'react';
import {SidebarProvider} from '@/components/ui/sidebar';
import { UserButton } from '@clerk/nextjs';
import {AppSidebar} from './dashboard/app-sidebar';

type Props = {
    children: React.ReactNode
}
const SidebarLayout = ({children} : Props) => {
    return (
       <SidebarProvider>
            <AppSidebar />
            <main className='w-full m-2'>
                <div className='flex items-center gap 2 border-sidebar bg-sidebar border shadow rounded-md p-2 px-4'>
                    {/*<SearchBar />*/}
                    <div className='ml-auto'>
                        <UserButton />
                    </div>
                </div>
                <div className="h-4"></div>
                {/** Main content */}
                <div className='border-sidebar-border bg-sidebar border shadow rounded-md  h-[calc(100vh-6rem)] p-4'>
                    {children} {/* This is where the page content will be rendered */}
                </div>
            </main>
       </SidebarProvider>
    );
};

export default SidebarLayout;