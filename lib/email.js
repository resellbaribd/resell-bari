// lib/email.js

export async function sendEmailNotification({ to_email, subject, message }) {
  if (!to_email) {
    console.error('Email error: No recipient email provided.');
    return { success: false, error: 'No email' };
  }

  // ⚠️ এখানে আপনার আসল ৩টি কী কোটেশনের ভেতরে বসিয়ে দিন:
  const SERVICE_ID = 'service_kk7qnzn';    // আপনার EmailJS Service ID
  const TEMPLATE_ID = 'template_x26mtko';  // আপনার EmailJS Template ID
  const PUBLIC_KEY = '5DzWYvsyIkY9884KK'; // আপনার EmailJS Public Key

  try {
    const payload = {
      service_id: SERVICE_ID,
      template_id: TEMPLATE_ID,
      user_id: PUBLIC_KEY,
      template_params: {
        to_email: to_email,
        email: to_email,
        recipient: to_email,
        from_name: 'Resell Bari',
        subject: subject,
        message: message,
      },
    };

    const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('Email sending failed:', errText);
      return { success: false, error: errText };
    }

    console.log(`✓ Notification email successfully sent to ${to_email}`);
    return { success: true };
  } catch (err) {
    console.error('EmailJS fetch error:', err);
    return { success: false, error: err.message };
  }
}