import { reddit } from '@devvit/web/server';

export const createPost = async () => {
  return await reddit.submitCustomPost({
    title: 'snoodrop',
    entry: 'default',
    styles: {
      heightPixels: 512,
    },
  });
};
