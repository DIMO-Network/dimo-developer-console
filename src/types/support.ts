export interface IDevSupportForm {
  inquiryType: string;
  message: string;
}

export interface ISupportRequest extends IDevSupportForm {
  userName: string;
  userEmail: string;
  walletAddress: string;
}

export const inquiryOptions = [
  { value: 'general', text: 'General Inquiry' },
  { value: 'technical', text: 'Technical Questions' },
  { value: 'payments', text: 'Payments and Subscriptions' },
];
