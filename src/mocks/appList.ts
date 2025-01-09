import { IApp } from '@/types/app';

export const appListMock: IApp[] = [
  {
    name: 'Test App',
    scope: 'sandbox',
    Workspace: {
      id: '338c0066-f747-498d-9c42-3da8272d576f',
      name: '0xlkajsdijoqwe90123kljsda',
      company_id: '66a98327-3146-45ff-babb-9b08adf84b0f',
      client_id: '66a98327-3146-45ff-babb-9b08adf84b0f',
    },
    Signers: [
      {
        id: '29dd90ce-157d-42bb-ad89-eb106141aff6',
        api_key: 'abcdef12345abcdef12345abcdef12345abcdef12345',
        address: 'abcdef12345abcdef12345abcdef12345abcdef12345',
        company_id: '66a98327-3146-45ff-babb-9b08adf84b0f',
        app_id: '9078a08c-5667-4af0-ba38-792097611bbb',
      },
      {
        id: 'd0ba855e-120d-44a7-8c74-18c9ef82f736',
        api_key: 'abcdef12345abcdef12345abcdef12345abcdef12345',
        address: 'abcdef12345abcdef12345abcdef12345abcdef12345',
        company_id: '66a98327-3146-45ff-babb-9b08adf84b0f',
        app_id: '9078a08c-5667-4af0-ba38-792097611bbb',
      },
    ],
    RedirectUris: [
      {
        id: 'f3f67e8f-9d73-4d91-b79e-5df4f275db23',
        uri: 'https://google.com/',
        status: true,
        company_id: '66a98327-3146-45ff-babb-9b08adf84b0f',
        app_id: '9078a08c-5667-4af0-ba38-792097611bbb',
      },
      {
        id: 'b4555eb3-6095-4aff-9b57-1974eec3a7f7',
        uri: 'https://google.com.co/',
        status: false,
        company_id: '66a98327-3146-45ff-babb-9b08adf84b0f',
        app_id: '9078a08c-5667-4af0-ba38-792097611bbb',
      },
    ],
    deleted: false,
  },
];
