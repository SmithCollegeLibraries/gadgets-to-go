const normalizeBasePath = (basePath = '/') => {
  if (!basePath || basePath === '.') return '/';
  const withLeadingSlash = basePath.startsWith('/') ? basePath : `/${basePath}`;
  return withLeadingSlash.endsWith('/') ? withLeadingSlash : `${withLeadingSlash}/`;
};

const escapeAttribute = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/"/g, '&quot;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;');

export const buildSchoolEmbedUrl = ({ origin, basePath, schoolPath }) => {
  const path = `${normalizeBasePath(basePath)}school/${encodeURIComponent(schoolPath || '')}?view=grid`;
  return `${origin}${path}`;
};

export const buildSchoolEmbedCode = ({
  origin,
  basePath,
  schoolPath,
  width,
  height,
  title,
}) => {
  const src = buildSchoolEmbedUrl({ origin, basePath, schoolPath });

  return `<iframe src="${escapeAttribute(src)}" width="${escapeAttribute(width)}" height="${escapeAttribute(height)}px" frameborder="0" scrolling="auto" title="${escapeAttribute(title)}" style="border: 1px solid #ddd; border-radius: 8px;"></iframe>`;
};
