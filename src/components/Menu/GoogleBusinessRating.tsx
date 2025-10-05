import React from 'react';
import { Star, ExternalLink } from 'lucide-react';
import { getTranslation } from '../../hooks/useInterfaceTranslations';

interface GoogleBusinessRatingProps {
  googleBusinessUrl: string;
  selectedLanguage: string;
  translations: Record<string, string>;
}

export default function GoogleBusinessRating({ googleBusinessUrl, selectedLanguage, translations }: GoogleBusinessRatingProps) {
  if (!googleBusinessUrl) return null;

  const getReviewUrl = (url: string) => {
    const reviewParam = '/review';
    if (url.includes('g.page')) {
      return url.endsWith('/') ? `${url}review` : `${url}/review`;
    }
    if (url.includes('maps')) {
      return url.includes('?') ? `${url}&reviews=true` : `${url}?reviews=true`;
    }
    return url.endsWith('/') ? `${url}review` : `${url}/review`;
  };

  const title = getTranslation(translations, 'leave_review', 'Laissez-nous un avis');
  const cta = getTranslation(translations, 'write_review_google', 'Écrire un avis sur Google');
  const reviewUrl = getReviewUrl(googleBusinessUrl);

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <div className="flex">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                size={20}
                className="text-yellow-400 fill-yellow-400"
              />
            ))}
          </div>
          <span className="text-sm font-medium text-gray-700">Google</span>
        </div>
      </div>

      <h3 className="text-lg font-semibold text-gray-900 mb-3">{title}</h3>

      <a
        href={reviewUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center space-x-2 w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
      >
        <Star size={18} />
        <span>{cta}</span>
        <ExternalLink size={16} />
      </a>
    </div>
  );
}
