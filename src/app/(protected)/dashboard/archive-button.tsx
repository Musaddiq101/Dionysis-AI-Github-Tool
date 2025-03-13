'use client'
import React from 'react';
import {api} from '@/trpc/react'
import { Button } from '@/components/ui/button';
import  useProject  from '@/hooks/use-project';
import { toast } from 'sonner';
import useRefetch from '@/hooks/use-refetch';


const ArchiveButton = () => {
    const archiveProject = api.project.archiveProject.useMutation()
    const {projectId} = useProject()
    const refetch = useRefetch()

    return (
        <Button disabled={archiveProject.isPending} size='sm' variant='destructive' onClick={() => {
            const confirm = window.confirm('Are you sure you want to archive this project?')
            if (confirm) {
                archiveProject.mutate({projectId: projectId}, {
                    onSuccess: () => {
                        toast.success('Project archived successfully')
                        refetch()
                    },
                    onError: () => {
                        toast.error('Failed to archive project')

                    }
                })
            }
        }}>Archive</Button>
    );
};

export default ArchiveButton;