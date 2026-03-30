const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const { paymentMethodId, email } = await request.json();
    if (!paymentMethodId || !email) {
      return new Response(JSON.stringify({ error: 'メールアドレスとカード情報は必須です' }), { status: 400, headers: CORS });
    }
    const stripeSecret = env.STRIPE_SECRET_KEY;
    const priceId = env.STRIPE_PRICE_ID;
    if (!stripeSecret) {
      return new Response(JSON.stringify({ error: 'STRIPE_SECRET_KEY未設定' }), { status: 500, headers: CORS });
    }
    if (!priceId) {
      return new Response(JSON.stringify({ error: 'STRIPE_PRICE_ID未設定' }), { status: 500, headers: CORS });
    }
    const custRes = await fetch('https://api.stripe.com/v1/customers', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeSecret}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        email,
        payment_method: paymentMethodId,
        'invoice_settings[default_payment_method]': paymentMethodId,
      }),
    });
    const customer = await custRes.json();
    if (customer.error) {
      return new Response(JSON.stringify({ error: customer.error.message }), { status: 400, headers: CORS });
    }
    const subRes = await fetch('https://api.stripe.com/v1/subscriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeSecret}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        customer: customer.id,
        'items[0][price]': priceId,
        trial_period_days: '30',
        'expand[]': 'latest_invoice.payment_intent',
      }),
    });
    const subscription = await subRes.json();
    if (subscription.error) {
      return new Response(JSON.stringify({ error: subscription.error.message }), { status: 400, headers: CORS });
    }
    return new Response(
      JSON.stringify({ success: true, subscriptionId: subscription.id }),
      { status: 200, headers: CORS }
    );
  } catch (e) {
    console.error('subscribe error:', e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: CORS });
  }
}
