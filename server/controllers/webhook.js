import Stripe from "stripe";
import transactionModel from "../models/transactionModel.js";
import userModel from "../models/userModel.js";


const stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY)
export const stripeWebhook = async (request, response) => {
    const sig = request.headers['stripe-signature'];

    let event;

    try {
        event = Stripe.webhooks.constructEvent(request.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    }
    catch (err) {
        response.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    switch (event.type) {
        case 'payment_intent.succeeded':
            const paymentIntent = event.data.object;
            const paymentIntentId = paymentIntent.id;
            const session = await stripeInstance.checkout.sessions.list({
                payment_intent: paymentIntentId
            })
            const { transactionId } = session.data[0].metadata;
            const transactionData = await transactionModel.findById(transactionId);
            if (transactionData.payment) {
                return res.json({ success: false, message: 'Payment Failed' });
            }
            transactionData.payment = true;
            await transactionData.save();

            const { userId } = transactionData;
            const userData = await userModel.findById(userId);
            userData.creditBalance += transactionData.credits;
            await userData.save();

            break;
        case 'payment_intent.payment_failed':
            console.log('Payment Failed!');
            break;

        default:
            console.log(`Unhandled event type ${event.type}`);
    }

    // Return a response to acknowledge receipt of the event
    response.json({ received: true });
}