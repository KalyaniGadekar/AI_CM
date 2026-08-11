import emailjs from '@emailjs/browser';
import { api, type Contract } from '../api/client';

export const EMAILJS_CONFIG = {
  SERVICE_ID: import.meta.env.VITE_EMAILJS_SERVICE_ID || 'service_fk7d9bp',
  TEMPLATE_ID: import.meta.env.VITE_EMAILJS_TEMPLATE_ID || 'template_yunwgcv',
  PUBLIC_KEY: import.meta.env.VITE_EMAILJS_PUBLIC_KEY || 'IJxjBjS0m-gQq8883',
};

export interface SendEmailParams {
  toEmail: string;
  clientName: string;
  contractTitle: string;
  endDate: string;
  daysLeft: number;
  message?: string;
  employerName?: string;
  companyName?: string;
}

export async function sendBrowserEmailNotification(params: SendEmailParams) {
  const {
    toEmail,
    clientName,
    contractTitle,
    endDate,
    daysLeft,
    message,
    employerName = 'AI Contract Management',
    companyName = 'AI Contract Management',
  } = params;

  const defaultMsg = message || `Hello ${clientName},\n\nThis is a reminder that your contract '${contractTitle}' will expire on ${endDate}.\n\nThere are ${daysLeft} days left for the contract to expire.\n\nRegards,\nAI Contract Management System`;

  const templateParams: Record<string, any> = {
    // Recipient & sender fields
    to_email: toEmail,
    email: toEmail,
    recipient_email: toEmail,
    client_email: toEmail,
    user_email: toEmail,
    to_name: clientName,
    client_name: clientName,
    name: clientName,
    from_name: employerName || 'AI Contract Management',
    reply_to: 'no-reply@contractmgmt.com',
    
    // Contract details
    contract_title: contractTitle,
    contract_name: contractTitle,
    filename: contractTitle,
    end_date: String(endDate),
    expiry_date: String(endDate),
    days_left: String(daysLeft),
    days_until_expiry: String(daysLeft),
    
    // Message contents & Subject
    message: defaultMsg,
    body: defaultMsg,
    subject: `Contract Expiry Reminder: ${contractTitle} (${daysLeft} days left)`,
    employer_name: employerName,
    company_name: companyName,
  };

  const response = await emailjs.send(
    EMAILJS_CONFIG.SERVICE_ID,
    EMAILJS_CONFIG.TEMPLATE_ID,
    templateParams,
    EMAILJS_CONFIG.PUBLIC_KEY
  );

  return response;
}

export async function dispatchContractExpiryNotification(contract: Contract, customMessage?: string) {
  const toEmail = contract.client_email;
  if (!toEmail || !toEmail.trim()) {
    throw new Error('This contract does not have a client email address specified.');
  }

  const contractTitle = contract.filename || `Contract #${contract.id} (${contract.employer_name} - ${contract.client_name})`;

  // 1. Send real email directly from browser via EmailJS (avoids 403 non-browser API restriction)
  const emailRes = await sendBrowserEmailNotification({
    toEmail: toEmail.trim(),
    clientName: contract.client_name,
    contractTitle,
    endDate: contract.end_date,
    daysLeft: contract.days_until_expiry,
    message: customMessage,
    employerName: contract.employer_name,
    companyName: contract.company_name,
  });

  // 2. Notify backend to update database status and record audit log
  try {
    await api.sendExpiryNotification(contract.id);
  } catch (backendErr) {
    console.warn('Backend audit log sync error:', backendErr);
  }

  return { success: true, email: toEmail, status: emailRes.status, text: emailRes.text };
}
