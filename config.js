'use strict';

module.exports = {
  url: 'https://suyashb.netlify.app',
  pathPrefix: '/',
  title: 'Suyash\'s blog',
  subtitle: 'A blog where I write about tech, my projects and learnings',
  copyright: '© All rights reserved.',
  disqusShortname: `${process.env.GATSBY_DISQUS_NAME}`,
  postsPerPage: 4,
  googleAnalyticsId: 'UA-73379983-2',
  useKatex: false,
  menu: [
    {
      label: 'Articles',
      path: '/'
    },
    {
      label: 'Book Summaries',
      path: '/category/summary'
    },
    {
      label: 'Now',
      path: '/pages/now'
    },    
    {
      label: 'About me',
      path: '/pages/about'
    }
  ],
  author: {
    name: 'Suyash Behera',
    photo: '/photo.jpg',
    bio: 'Hi! Welcome to my blog',
    contacts: {
      email: 'behera [dot] suyash@gmail.com',
      telegram: 'bsuyash',
      twitter: 'suyashb95',
      github: 'suyashb95',
      linkedin: 'suyash-behera',
      instagram: 'suyashb95',
    }
  }
};
