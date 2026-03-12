import localFont from 'next/font/local';

export const dimoFont = localFont({
  src: [
    {
      path: './../assets/fonts/Universal-Sans-Display-525.ttf',
      weight: 'normal',
      style: 'normal',
    },
    {
      path: './../assets/fonts/Universal-Sans-Display-525Italic.ttf',
      weight: 'normal',
      style: 'italic',
    },
    {
      path: './../assets/fonts/Universal-Sans-Display-900.ttf',
      weight: 'bold',
      style: 'normal',
    },
    {
      path: './../assets/fonts/Universal-Sans-Display-900Italic.ttf',
      weight: 'bold',
      style: 'italic',
    },
  ],
});

export const gtSuper = localFont({
  src: [
    {
      path: './../assets/fonts/GT-Super-Text-Bold-Italic.ttf',
      weight: 'bold',
      style: 'italic',
    },
    {
      path: './../assets/fonts/GT-Super-Text-Bold.ttf',
      weight: 'bold',
      style: 'normal',
    },
    {
      path: './../assets/fonts/GT-Super-Text-Book-Italic.ttf',
      weight: 'normal',
      style: 'italic',
    },
    {
      path: './../assets/fonts/GT-Super-Text-Book.ttf',
      weight: 'normal',
      style: 'normal',
    },
  ],
});
