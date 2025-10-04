import React, { useState, useEffect } from 'react';
import { Globe, Plus, Trash2, Loader2, Check, X, Pencil, Save } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface MenuTranslationsProps {
  menuId: string;
  defaultLanguage: string;
  menuName: string;
}

interface MenuLanguage {
  id: string;
  language_code: string;
  is_default: boolean;
  menu_title: string;
}

const AVAILABLE_LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'pt', name: 'Português', flag: '🇵🇹' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  { code: 'nl', name: 'Nederlands', flag: '🇳🇱' },
];

const MenuTranslations: React.FC<MenuTranslationsProps> = ({ menuId, defaultLanguage, menuName }) => {
  const [languages, setLanguages] = useState<MenuLanguage[]>([]);
  const [loading, setLoading] = useState(true);
  const [translating, setTranslating] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [showAddLanguage, setShowAddLanguage] = useState(false);
  const [editingTitle, setEditingTitle] = useState<string | null>(null);
  const [titleEditValue, setTitleEditValue] = useState('');

  useEffect(() => {
    loadLanguages();
  }, [menuId]);

  const loadLanguages = async () => {
    try {
      const { data, error } = await supabase
        .from('menu_languages')
        .select('*')
        .eq('menu_id', menuId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setLanguages(data || []);
    } catch (error) {
      console.error('Error loading languages:', error);
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const translateMenu = async (languageCode: string, languageName: string) => {
    setTranslating(languageCode);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/translate-menu`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            menuId,
            targetLanguage: languageCode,
            languageName,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Translation failed');
      }

      const result = await response.json();
      showMessage('success', `Traduction en ${languageName} réussie`);
      await loadLanguages();
      setShowAddLanguage(false);
    } catch (error: any) {
      console.error('Translation error:', error);
      showMessage('error', error.message || 'Erreur lors de la traduction');
    } finally {
      setTranslating(null);
    }
  };

  const startEditingTitle = (languageId: string, currentTitle: string) => {
    setEditingTitle(languageId);
    setTitleEditValue(currentTitle);
  };

  const cancelEditingTitle = () => {
    setEditingTitle(null);
    setTitleEditValue('');
  };

  const saveMenuTitle = async (languageId: string) => {
    if (!titleEditValue.trim()) {
      showMessage('error', 'Le titre ne peut pas être vide');
      return;
    }

    try {
      const { error } = await supabase
        .from('menu_languages')
        .update({ menu_title: titleEditValue.trim() })
        .eq('id', languageId);

      if (error) throw error;

      showMessage('success', 'Titre mis à jour');
      await loadLanguages();
      setEditingTitle(null);
      setTitleEditValue('');
    } catch (error) {
      console.error('Error updating menu title:', error);
      showMessage('error', 'Erreur lors de la mise à jour');
    }
  };

  const deleteLanguage = async (languageId: string, languageCode: string) => {
    if (!confirm('Voulez-vous vraiment supprimer cette traduction ?')) return;

    try {
      // Delete translations first
      const { data: categories } = await supabase
        .from('categories')
        .select('id')
        .eq('menu_id', menuId);

      if (categories) {
        const categoryIds = categories.map(c => c.id);

        // Delete category translations
        await supabase
          .from('category_translations')
          .delete()
          .in('category_id', categoryIds)
          .eq('language_code', languageCode);

        // Delete item translations
        const { data: items } = await supabase
          .from('menu_items')
          .select('id')
          .in('category_id', categoryIds);

        if (items) {
          await supabase
            .from('menu_item_translations')
            .delete()
            .in('menu_item_id', items.map(i => i.id))
            .eq('language_code', languageCode);
        }
      }

      // Delete language entry
      const { error } = await supabase
        .from('menu_languages')
        .delete()
        .eq('id', languageId);

      if (error) throw error;

      showMessage('success', 'Traduction supprimée');
      await loadLanguages();
    } catch (error) {
      console.error('Error deleting language:', error);
      showMessage('error', 'Erreur lors de la suppression');
    }
  };

  const availableToAdd = AVAILABLE_LANGUAGES.filter(
    lang => !languages.some(l => l.language_code === lang.code) && lang.code !== defaultLanguage
  );

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 flex items-center space-x-2">
          <Globe size={20} />
          <span>Traductions</span>
        </h2>
        {!showAddLanguage && availableToAdd.length > 0 && (
          <button
            onClick={() => setShowAddLanguage(true)}
            className="flex items-center space-x-2 px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm"
          >
            <Plus size={16} />
            <span>Ajouter une langue</span>
          </button>
        )}
      </div>

      {message && (
        <div
          className={`mb-4 p-3 rounded-lg flex items-center space-x-2 ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {message.type === 'success' ? (
            <Check size={16} />
          ) : (
            <X size={16} />
          )}
          <span className="text-sm">{message.text}</span>
        </div>
      )}

      {showAddLanguage && (
        <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-gray-900">Sélectionner une langue</h3>
            <button
              onClick={() => setShowAddLanguage(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={18} />
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {availableToAdd.map(lang => (
              <button
                key={lang.code}
                onClick={() => translateMenu(lang.code, lang.name)}
                disabled={translating !== null}
                className="flex items-center space-x-2 p-3 border border-gray-200 rounded-lg hover:bg-white hover:border-orange-300 transition-colors disabled:opacity-50"
              >
                <span className="text-2xl">{lang.flag}</span>
                <span className="text-sm font-medium text-gray-700">{lang.name}</span>
                {translating === lang.code && (
                  <Loader2 className="w-4 h-4 animate-spin text-orange-600" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
        {languages.length === 0 ? (
          <p className="text-sm text-gray-600 py-4 text-center">
            Aucune traduction ajoutée. Ajoutez des langues pour traduire automatiquement votre menu.
          </p>
        ) : (
          languages.map(lang => {
            const languageInfo = AVAILABLE_LANGUAGES.find(l => l.code === lang.language_code);
            const isEditing = editingTitle === lang.id;

            return (
              <div
                key={lang.id}
                className="p-3 sm:p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start space-x-3 flex-1 min-w-0">
                    <span className="text-2xl flex-shrink-0">{languageInfo?.flag || '🌐'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 mb-1">
                        {languageInfo?.name || lang.language_code}
                      </div>
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={titleEditValue}
                            onChange={(e) => setTitleEditValue(e.target.value)}
                            placeholder="Titre du menu"
                            className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                            autoFocus
                          />
                          <button
                            onClick={() => saveMenuTitle(lang.id)}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Sauvegarder"
                          >
                            <Save size={16} />
                          </button>
                          <button
                            onClick={cancelEditingTitle}
                            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Annuler"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <span className="truncate">
                            {lang.menu_title || menuName}
                          </span>
                          <button
                            onClick={() => startEditingTitle(lang.id, lang.menu_title || menuName)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors flex-shrink-0"
                            title="Modifier le titre"
                          >
                            <Pencil size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  {!isEditing && (
                    <button
                      onClick={() => deleteLanguage(lang.id, lang.language_code)}
                      className="text-red-600 hover:text-red-700 p-2 rounded hover:bg-red-50 flex-shrink-0"
                      title="Supprimer cette traduction"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-xs sm:text-sm text-blue-800">
          <strong>Note :</strong> Les traductions sont générées automatiquement par IA.
          Vous pouvez ensuite les modifier directement dans la page de gestion des articles.
        </p>
      </div>
    </div>
  );
};

export default MenuTranslations;
