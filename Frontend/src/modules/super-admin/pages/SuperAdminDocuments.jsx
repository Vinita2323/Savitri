import React from 'react';
import { Navigate, useParams } from 'react-router-dom';
import YourDocuments from '../../../components/YourDocuments';
import { documentPageBySlug } from '../../../utils/documentPages';

/** One "My Documents" page (all documents, or one document type). Private to the signed-in account. */
export const SuperAdminDocuments = () => {
  const { type } = useParams();
  const page = documentPageBySlug(type || 'all');
  if (!page) return <Navigate to="/super-admin/documents/all" replace />;
  return (
    <div className="space-y-4 pb-10" data-testid={`documents-page-${page.slug}`}>
      <YourDocuments key={page.slug} categories={page.categories} title={page.title} subtitle={page.hint ? `Private: only you can see these. ${page.hint}.` : ''} />
    </div>
  );
};

export default SuperAdminDocuments;
