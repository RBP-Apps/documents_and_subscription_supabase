import supabase from "./supabase";
import { logWhatsAppRequest, logWhatsAppResponse, logWhatsAppError } from './whatsappLog';

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
  const payload = {
    to,
    name,
    documentName,
    category,
    company,
    type,
    link,
  };

  // Log request
  logWhatsAppRequest("Supabase Edge Function", payload);

  const { data, error } = await supabase.functions.invoke("send-whatsapp", {
    body: payload,
  });

  if (error) {
    logWhatsAppError(error);
    throw new Error(error.message || "WhatsApp send failed");
  }

  // Log response
  logWhatsAppResponse(200, data);

  return data;
};