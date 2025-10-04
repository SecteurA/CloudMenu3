import React from 'react';
import { Star, ExternalLink } from 'lucide-react';

interface GoogleBusinessRatingProps {
  googleBusinessUrl: string;
  selectedLanguage: string;
}

export default function GoogleBusinessRating({ googleBusinessUrl, selectedLanguage }: GoogleBusinessRatingProps) {
  if (!googleBusinessUrl) return null;

  const getTranslation = (lang: string) => {
    const translations: Record<string, { title: string; cta: string }> = {
      fr: {
        title: 'Laissez-nous un avis',
        cta: 'Écrire un avis sur Google'
      },
      en: {
        title: 'Leave us a review',
        cta: 'Write a review on Google'
      },
      es: {
        title: 'Déjanos una reseña',
        cta: 'Escribir una reseña en Google'
      },
      de: {
        title: 'Hinterlassen Sie uns eine Bewertung',
        cta: 'Bewertung auf Google schreiben'
      },
      it: {
        title: 'Lasciaci una recensione',
        cta: 'Scrivi una recensione su Google'
      }
    };

    return translations[lang] || translations.fr;
  };

  const { title, cta } = getTranslation(selectedLanguage);

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
        href={googleBusinessUrl}
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
