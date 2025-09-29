import React, { useState, useEffect, useRef } from 'react';
import { Download, Copy, Check, Loader2, QrCode, Palette, Link2 } from 'lucide-react';
import QRCode from 'qrcode';
import { supabase, Menu } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

const QRCodePage = () => {
  const { user } = useAuth();
  const [menu, setMenu] = useState<Menu | null>(null);
  const [loading, setLoading] = useState(true);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [qrCodeColor, setQrCodeColor] = useState('#000000');
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const colorPresets = [
    { name: 'Noir classique', color: '#000000', bg: '#ffffff' },
    { name: 'Bleu marine', color: '#1e3a8a', bg: '#ffffff' },
    { name: 'Vert foncé', color: '#064e3b', bg: '#ffffff' },
    { name: 'Rouge bordeaux', color: '#7f1d1d', bg: '#ffffff' },
    { name: 'Violet', color: '#581c87', bg: '#ffffff' },
    { name: 'Orange', color: '#ea580c', bg: '#ffffff' }
  ];

  useEffect(() => {
    if (user) {
      loadUserMenu();
    }
  }, [user]);

  useEffect(() => {
    if (menu) {
      generateQRCode();
    }
  }, [menu, qrCodeColor, backgroundColor]);

  const loadUserMenu = async () => {
    try {
      const { data, error } = await supabase
        .from('menus')
        .select('*')
        .eq('user_id', user!.id)
        .maybeSingle();

      if (error) {
        console.error('Erreur lors du chargement du menu:', error);
        return;
      }

      setMenu(data);
    } catch (error) {
      console.error('Erreur lors du chargement du menu:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateQRCode = async () => {
    if (!menu) return;

    setGenerating(true);
    try {
      const menuUrlWithTracking = `https://a.cloudmenu.fr/m/${menu.slug}?ref=qr`;
      const dataUrl = await QRCode.toDataURL(menuUrlWithTracking, {
        width: 400,
        margin: 2,
        color: {
          dark: qrCodeColor,
          light: backgroundColor
        },
        errorCorrectionLevel: 'M'
      });
      
      setQrCodeDataUrl(dataUrl);
    } catch (error) {
      console.error('Erreur lors de la génération du QR code:', error);
    } finally {
      setGenerating(false);
    }
  };

  const downloadQRCode = () => {
    if (!qrCodeDataUrl || !menu) return;

    const link = document.createElement('a');
    link.download = `qr-code-${menu.slug}.png`;
    link.href = qrCodeDataUrl;
    link.click();
  };

  const copyMenuLink = async () => {
    if (!menu) return;

    try {
      await navigator.clipboard.writeText(`${menuUrl}?ref=qr`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Erreur lors de la copie:', error);
    }
  };

  const applyColorPreset = (preset: typeof colorPresets[0]) => {
    setQrCodeColor(preset.color);
    setBackgroundColor(preset.bg);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center space-x-2 text-gray-600">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Chargement...</span>
        </div>
      </div>
    );
  }

  if (!menu) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center py-12">
          <QrCode className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Configurez d'abord votre menu</h2>
          <p className="text-gray-600 mb-6">
            Vous devez d'abord configurer votre menu pour générer son QR code.
          </p>
          <button 
            onClick={() => window.location.href = '/mon-menu'}
            className="bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700"
          >
            Aller à la configuration
          </button>
        </div>
      </div>
    );
  }

  const menuUrl = `https://a.cloudmenu.fr/m/${menu.slug}`;

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">QR Code de votre menu</h1>
        <p className="text-sm sm:text-base text-gray-600">
          Téléchargez votre QR code personnalisé pour afficher dans votre établissement
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        {/* Configuration Panel */}
        <div className="space-y-6">
          {/* URL du menu */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
              <Link2 className="w-5 h-5" />
              <span>URL de votre menu</span>
            </h2>
            
            <div className="space-y-3">
              <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg border">
                <input
                  type="text"
                  value={`${menuUrl}?ref=gmb`}
                  readOnly
                  className="flex-1 bg-transparent border-none outline-none text-sm text-gray-700"
                />
                <button
                  onClick={copyMenuLink}
                  className={`px-3 py-1.5 text-sm font-medium rounded transition-all duration-200 flex items-center space-x-1 ${
                    copied 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                  }`}
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Copié !</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copier</span>
                    </>
                  )}
                </button>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-700">
                  🔗 <strong>Lien pour Google My Business</strong> - Utilisez cette URL avec le paramètre ?ref=gmb pour suivre les visites depuis GMB.
                </p>
              </div>
            </div>
          </div>

          {/* Personnalisation des couleurs */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
              <Palette className="w-5 h-5" />
              <span>Personnalisation</span>
            </h2>
            
            {/* Presets de couleurs */}
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">Couleurs prédéfinies</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {colorPresets.map((preset, index) => (
                    <button
                      key={index}
                      onClick={() => applyColorPreset(preset)}
                      className={`p-3 border-2 rounded-lg transition-all duration-200 flex items-center space-x-2 text-left ${
                        qrCodeColor === preset.color
                          ? 'border-orange-400 bg-orange-50'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className="flex space-x-1">
                        <div 
                          className="w-4 h-4 rounded-full border border-gray-200"
                          style={{ backgroundColor: preset.color }}
                        />
                        <div 
                          className="w-4 h-4 rounded-full border border-gray-200"
                          style={{ backgroundColor: preset.bg }}
                        />
                      </div>
                      <span className="text-xs font-medium text-gray-700">{preset.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Couleurs personnalisées */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Couleur du QR code
                  </label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="color"
                      value={qrCodeColor}
                      onChange={(e) => setQrCodeColor(e.target.value)}
                      className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={qrCodeColor}
                      onChange={(e) => setQrCodeColor(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Couleur d'arrière-plan
                  </label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="color"
                      value={backgroundColor}
                      onChange={(e) => setBackgroundColor(e.target.value)}
                      className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={backgroundColor}
                      onChange={(e) => setBackgroundColor(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* QR Code Preview & Download */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
              <QrCode className="w-5 h-5" />
              <span>Aperçu du QR Code</span>
            </h2>
            
            <div className="text-center">
              {generating ? (
                <div className="flex items-center justify-center h-80">
                  <div className="flex items-center space-x-2 text-gray-600">
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <span>Génération...</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="inline-block p-4 bg-gray-50 rounded-lg">
                    {qrCodeDataUrl && (
                      <img 
                        src={qrCodeDataUrl} 
                        alt="QR Code du menu"
                        className="w-80 h-80 max-w-full"
                      />
                    )}
                  </div>
                  
                  <div className="flex justify-center">
                    <button
                      onClick={downloadQRCode}
                      disabled={!qrCodeDataUrl}
                      className="bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2 font-medium"
                    >
                      <Download className="w-5 h-5" />
                      <span>Télécharger le QR Code</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-3">💡 Comment utiliser votre QR Code</h3>
            <ul className="space-y-2 text-sm text-blue-800">
              <li className="flex items-start space-x-2">
                <span className="text-blue-600 font-bold">1.</span>
                <span>Téléchargez le QR code en cliquant sur le bouton ci-dessus</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-blue-600 font-bold">2.</span>
                <span>Imprimez-le et placez-le sur vos tables, comptoir ou vitrine</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-blue-600 font-bold">3.</span>
                <span>Vos clients scannent le QR code avec leur téléphone</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-blue-600 font-bold">4.</span>
                <span>Ils accèdent directement à votre menu en ligne !</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRCodePage;