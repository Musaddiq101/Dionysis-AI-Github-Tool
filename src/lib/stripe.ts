'use server'
import Stripe from 'stripe';
import {auth} from '@clerk/nextjs/server'
import { redirect } from 'next/navigation';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-02-24.acacia',
})

export async function createCheckoutSession(credits: number) {
    const {userId} = await auth()
    if (!userId) {
        throw new Error('User not authorized')
    }
    const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
            {
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: `${credits} Dionysis Credits`,
                    },
                    unit_amount: Math.round((credits / 50) * 100),
                },
                quantity: 1,
            },
        ],
        customer_creation: 'always',
        mode: 'payment',
        success_url: `${process.env.NEXT_PUBLIC_APP_URL}/create`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing`,
        client_reference_id: userId.toString(),
        metadata: {
            credits,
        }
    })

    return redirect(session.url as string)
}