import userModel from "../models/userModel.js";
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import transactionModel from "../models/transactionModel.js";
import Stripe from "stripe";

export const registerUser = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password) {
            return res.json({ success: false, message: "Missing Details" });
        }
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const userData = {
            name,
            email,
            password: hashedPassword,
        }
        const newUser = new userModel(userData);
        const user = await newUser.save();
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
        res.json({ success: true, token, user: { name: user.name } });

    } catch (error) {
        console.error(error);
        res.json({ success: false, message: error.message });
    }
}

export const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await userModel.findOne({ email });
        if (!user) {
            return res.json({ success: false, message: "User does not exist" });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.json({ success: false, message: "Invalid Credentials" });
        } else {
            const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
            return res.json({ success: true, token, user: { name: user.name } });
        }


    } catch (error) {
        console.error(error);
        res.json({ success: false, message: error.message });
    }
}

export const userCredits = async (req, res) => {
    try {
        const { userId } = req.body;
        const user = await userModel.findById(userId);
        res.json({ success: true, credits: user.creditBalance, user: { name: user.name } });

    } catch (error) {
        console.error(error);
        res.json({ success: false, message: error.message });
    }
}

// API to make payment for credits
export const paymentStripe = async (req, res) => {
    try {
        const { userId, planId } = req.body;
        const { origin } = req.headers;
        const user = await userModel.findById(userId);
        if (!user || !planId) {
            return res.json({ success: false, message: 'Invalid Credentials' });
        }
        let credits, plan, amount, date;
        switch (planId) {
            case 'Basic':
                plan = 'Basic';
                credits = 100;
                amount = 10;
                break;
            case 'Advanced':
                plan = 'Advanced';
                credits = 500;
                amount = 50;
                break;
            case 'Business':
                plan = 'Business';
                credits = 5000;
                amount = 250;
                break;
            default:
                break;
        }
        date = Date.now();
        // Creating Transaction
        const transactionData = {
            userId,
            plan,
            amount,
            credits,
            date,
        }
        const newTransaction = await transactionModel.create(transactionData);
        // Stripe Gateway Initialize
        const stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY);
        const currency = process.env.CURRENCY.toLowerCase();
        // Creating line items for Stripe
        const line_items = [{
            price_data: {
                currency,
                product_data: {
                    name: newTransaction.plan,
                },
                unit_amount: Math.floor(newTransaction.amount) * 100
            },
            quantity: 1
        }];
        const session = await stripeInstance.checkout.sessions.create({
            success_url: `${origin}/`,
            cancel_url: `${origin}/buy`,
            line_items: line_items,
            mode: 'payment',
            metadata: {
                transactionId: newTransaction._id.toString(),
            }
        })
        res.json({ success: true, session_url: session.url });

    } catch (error) {
        res.json({ success: false, message: error.message });
    }
}