// @flow strict
import React from 'react';
import { Link } from 'gatsby';
import Author from './Author';
import { DiscussionEmbed } from 'disqus-react';
import { useSiteMetadata } from '../../hooks';
import Content from './Content';
import Meta from './Meta';
import Tags from './Tags';
import styles from './Post.module.scss';
import type { Node } from '../../types';

type Props = {
  post: Node
};

const Post = ({ post }: Props) => {
  const { html } = post;
  const { tagSlugs, slug } = post.fields;
  const { tags, title, date } = post.frontmatter;
  const { url, disqusShortname } = useSiteMetadata();

  console.log(process.env);
  
  const disqusConfig = {
    shortname: 'https-suyashb-netlify-app',
    config: { identifier: slug, title: post.frontmatter.title },
  };

  return (
    <div className={styles['post']}>
      <Link className={styles['post__home-button']} to="/">All Articles</Link>

      <div className={styles['post__content']}>
        <Content body={html} title={title} />
      </div>

      <div className={styles['post__footer']}>
        <Meta date={date} />
        {tags && tagSlugs && <Tags tags={tags} tagSlugs={tagSlugs} />}
        <Author />
      </div>

      <div className={styles['post__comments']}>
        <DiscussionEmbed {...disqusConfig} />
      </div>
    </div>
  );
};

export default Post;
