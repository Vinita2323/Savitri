import React from 'react';
import YourDocuments from '../../../components/YourDocuments';
import { documentPageBySlug } from '../../../utils/documentPages';

/** One "My Documents" page (all documents, or one document type). Private to the signed-in admin. */
export default function AdminDocumentsPage({ slug = 'all' }) {
  const page = documentPageBySlug(slug) || documentPageBySlug('all');
  return (
    <div className="space-y-4 pb-10" data-testid={`documents-page-${page.slug}`}>
      <YourDocuments key={page.slug} categories={page.categories} title={page.title} subtitle={page.hint ? `Private: only you can see these. ${page.hint}.` : ''} />
    </div>
  );
}
