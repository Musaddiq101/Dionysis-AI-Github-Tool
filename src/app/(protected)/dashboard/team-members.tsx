'use client'
import React from 'react';
import useProject from '@/hooks/use-project';
import {api} from '@/trpc/react'

const TeamMembers = () => {
    const {projectId} = useProject()
    const {data: members} = api.project.getTeamMembers.useQuery({projectId: projectId})
    return (
        <div className='flex items-centre gap-2'>
            {members?.map(member => (
                    <img src={member.user.imgUrl || ""} key={member.id} alt={member.user.firstName || ""} height={30} width={30} className=' rounded-full' />
            ))}
        </div>
    );
};

export default TeamMembers;