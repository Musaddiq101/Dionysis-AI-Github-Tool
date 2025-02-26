import React from "react";
import {notFound, redirect} from 'next/navigation'
import {auth, clerkClient} from "@clerk/nextjs/server";
import {db} from "@/server/db";


const SyncUser = async () => {
    const {userId} = await auth() //gives user idfrom clerk
    if (!userId) {
        throw new Error("No user found")
    }
    const client = await clerkClient()
    const user = await client.users.getUser(userId) //gives email the firstname and last name within clerk
    if (!user.emailAddresses[0]?.emailAddress){
        return notFound()
    }
    //upsert syas if user exist update it if not create it
    await db.user.upsert({
        where: {
            emailAddress: user.emailAddresses[0]?.emailAddress ?? ""
        },
        update: {
            imgUrl: user.imageUrl,
            firstName: user.firstName,
            lastName: user.lastName
        },
        create: {
            id: userId,
            imgUrl: user.imageUrl,
            emailAddress: user.emailAddresses[0]?.emailAddress ?? "",
            firstName: user.firstName,
            lastName: user.lastName
        },
    })
    return redirect("/dashboard")
}

export default SyncUser