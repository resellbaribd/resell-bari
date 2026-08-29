// lib/email.js

const EMAILJS_SERVICE_ID = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID || 'service_kk7qnzn';
const EMAILJS_TEMPLATE_ID = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID || 'template_x26mtko';
const EMAILJS_PUBLIC_KEY = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY || '5DzWYvsyIkY9884KK';

export async function sendEmailNotification({ to_email, subject, message }) {
  if (!to_email) return;

  try {
    const payload = {
      service_id: EMAILJS_SERVICE_ID,
      template_id: EMAILJS_TEMPLATE_ID,
      user_id: EMAILJS_PUBLIC_KEY,
      publicKey: EMAILJS_PUBLIC_KEY,
      template_params: {
        to_email: to_email,
        email: to_email,
        recipient: to_email,
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
      const errorText = await res.text();
      console.error('Email sending failed:', errorText);
      return { success: false, error: errorText };
    }

    console.log(`Notification email successfully sent to ${to_email}`);
    return { success: true };
  } catch (err) {
    console.error('EmailJS fetch error:', err);
    return { success: false, error: err.message };
  }
}