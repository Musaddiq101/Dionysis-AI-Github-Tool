// /api/webhook/stripe

import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { db } from "@/server/db";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-02-24.acacia',
})

export async function POST(request: Request){
    const body = await request.text()
    const signature = (await headers()).get('Stripe-Signature') as string
    let event: Stripe.Event
    

    try {
        event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!)
    } catch(error) {
        return NextResponse.json({error: 'Invalid Signature'}, {status: 400})
    }

    const session = event.data.object as Stripe.Checkout.Session
    console.log(event.type)
    console.log(session)

    if (event.type === 'checkout.session.completed') {
        const userId = session.client_reference_id
        const credits = Number(session.metadata?.['credits'])
        if (!userId || !credits) {
            return NextResponse.json({error: 'Mising user id or credits'}, {status: 400})
        }

        await db.stripeTransaction.create({
            data: {
                userId,
                credits,
            }
        })
        await db.user.update({
            where: {
                id: userId
            },
            data: {
                credits: {
                    increment: credits
                }
            }
        })
        return NextResponse.json({message: 'Credits added successfully'}, {status: 200})
    }

    return NextResponse.json({received: true})
}