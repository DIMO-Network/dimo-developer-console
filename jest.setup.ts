import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';

Object.assign(global, { TextDecoder, TextEncoder });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
global.XMLHttpRequest = undefined as any;
