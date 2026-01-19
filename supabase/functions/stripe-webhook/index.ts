
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.25.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.1";

declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!stripeKey || !webhookSecret || !supabaseUrl || !supabaseServiceKey) {
        throw new Error('Missing Environment Variables');
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    });

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const signature = req.headers.get('Stripe-Signature');
    const body = await req.text(); 

    if (!signature) {
       throw new Error("Missing Stripe signature");
    }

    let event;
    try {
      event = await stripe.webhooks.constructEventAsync(
        body,
        signature,
        webhookSecret
      );
    } catch (err: any) {
      console.error(`Webhook signature verification failed: ${err.message}`);
      return new Response(`Webhook Error: ${err.message}`, { status: 400 });
    }

    console.log(`Processing event: ${event.type}`);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const userId = session.metadata?.user_id;

      if (userId) {
        console.log(`Payment success for user: ${userId}`);

        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 30); 

        const { error } = await supabaseAdmin
          .from('users')
          .update({
            subscription_status: 'active',
            subscription_end_date: endDate.toISOString(),
            stripe_customer_id: session.customer 
          })
          .eq('id', userId);

        if (error) {
            console.error('Database update failed:', error);
            throw error;
        }
        console.log('User subscription updated successfully');
      } else {
          console.warn('No user_id found in session metadata');
      }
    } 
    
    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error(`Webhook handler failed: ${error.message}`);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
