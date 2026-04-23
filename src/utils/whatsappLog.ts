// ============================================================
// WhatsApp Logging Utility
// Sab WhatsApp API calls ke detailed logs — console + network tab
// ============================================================

export const logWhatsApp = (type: string, data: any) => {
  const timestamp = new Date().toISOString();
  const icons: Record<string, string> = {
    SENT: '✅',
    BATCH_SENT: '✅',
    ERROR: '❌',
    REQUEST: '📤',
    RESPONSE: '📥',
    INFO: 'ℹ️',
  };
  const icon = icons[type] ?? '🟢';

  console.group(`${icon} [WhatsApp ${type}] — ${timestamp}`);
  if (data && typeof data === 'object') {
    Object.entries(data).forEach(([key, val]) => {
      console.log(`  ${key}:`, val);
    });
  } else {
    console.log(data);
  }
  console.groupEnd();
};

export const logWhatsAppRequest = (url: string, payload: object) => {
  const timestamp = new Date().toISOString();
  console.group(`📤 [WhatsApp REQUEST] — ${timestamp}`);
  console.log('🔗 URL:', url);
  console.log('📦 Payload (Full):');
  console.log(JSON.stringify(payload, null, 2));
  console.groupEnd();
};

export const logWhatsAppResponse = (status: number, data: any) => {
  const timestamp = new Date().toISOString();
  const ok = status >= 200 && status < 300;
  const icon = ok ? '✅' : '❌';
  console.group(`📥 [WhatsApp RESPONSE ${icon}] — HTTP ${status} — ${timestamp}`);
  console.log('📨 Response Data:', data);
  if (!ok) {
    console.error('❌ Error Detail:', data?.error);
  }
  console.groupEnd();
};

export const logWhatsAppError = (error: any) => {
  const timestamp = new Date().toISOString();
  console.group(`❌ [WhatsApp ERROR] — ${timestamp}`);
  console.error('Error Message:', error?.message ?? error);
  console.error('Full Error:', error);
  console.groupEnd();
};