import { logWhatsAppRequest, logWhatsAppResponse, logWhatsAppError } from './whatsappLog';

// ============================================================
// WhatsApp Business API — Meta Graph API v19.0
// Direct API call — koi backend nahi, direct frontend se
// Network Tab mein graph.facebook.com call visible hogi
// ============================================================

export const sendWhatsAppMessage = async ({
  to,
  name,
  documentName,
  category,
  company,
  type,
  link,
}: {
  to: string;
  name: string;
  documentName: string;
  category: string;
  company: string;
  type: string;
  link: string;
}) => {
  const PHONE_NUMBER_ID = import.meta.env.VITE_WHATSAPP_PHONE_NUMBER_ID;
  const ACCESS_TOKEN = import.meta.env.VITE_WHATSAPP_ACCESS_TOKEN;
  const TEMPLATE_NAME = import.meta.env.VITE_WHATSAPP_TEMPLATE_NAME;
  const LANGUAGE = import.meta.env.VITE_WHATSAPP_TEMPLATE_LANGUAGE;

  const url = `https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`;

  const payload = {
    messaging_product: 'whatsapp',
    to: to, // with country code, e.g. 919876543210
    type: 'template',
    template: {
      name: TEMPLATE_NAME,
      language: {
        code: LANGUAGE,
      },
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: name },            // {{1}} Recipient Name
            { type: 'text', text: documentName },    // {{2}} Document Name
            { type: 'text', text: category },        // {{3}} Category
            { type: 'text', text: company },         // {{4}} Company
            { type: 'text', text: type },            // {{5}} Document Type
            { type: 'text', text: link },            // {{6}} Document Link
          ],
        },
      ],
    },
  };

  // Log full request — visible in Console
  logWhatsAppRequest(url, payload);

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();

  // Log full response — visible in Console
  logWhatsAppResponse(res.status, data);

  if (!res.ok) {
    const err = new Error(data?.error?.message ?? 'WhatsApp send failed');
    logWhatsAppError(err);
    throw err;
  }

  return data;
};