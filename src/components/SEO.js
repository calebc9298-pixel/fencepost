import React from 'react';
import { Platform } from 'react-native';
import { Helmet } from 'react-helmet-async';

const DOMAIN = 'https://fencepost.net';
const DEFAULT_TITLE = 'FencePost | Farmer Social Network';
const DEFAULT_DESC =
  'FencePost helps farmers share field activities, compare costs, and connect with their community.';
const DEFAULT_IMAGE = `${DOMAIN}/icon.svg`;

const normalizeUrl = path => {
  if (!path) return DOMAIN;
  if (path.startsWith('http')) return path;
  return `${DOMAIN}${path.startsWith('/') ? path : `/${path}`}`;
};

export function SEO({
  title = DEFAULT_TITLE,
  description = DEFAULT_DESC,
  url,
  canonical,
  image = DEFAULT_IMAGE,
  type = 'website',
  twitterCard = 'summary_large_image',
}) {
  if (Platform.OS !== 'web') return null;
  const resolvedUrl = normalizeUrl(canonical || url || '/');
  const resolvedImage = normalizeUrl(image);
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={resolvedUrl} />

      {/* Open Graph */}
      <meta property="og:type" content={type} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={resolvedImage} />
      <meta property="og:url" content={resolvedUrl} />
      <meta property="og:site_name" content="FencePost" />

      {/* Twitter */}
      <meta name="twitter:card" content={twitterCard} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={resolvedImage} />
      <meta name="twitter:url" content={resolvedUrl} />
    </Helmet>
  );
}

export function DefaultSEO() {
  return <SEO />;
}
