import React, { useState } from 'react';
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle, User, Lock, Mail, Sparkles, ArrowRight } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

type LoginTab = 'classic' | 'magic';

const LoginPage = () => {
  const [activeTab, setActiveTab] = useState<LoginTab>('classic');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [signupLoading, setSignupLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  // Magic link state
  const [magicLinkEmail, setMagicLinkEmail] = useState('');
  const [magicLinkLoading, setMagicLinkLoading] = useState(false);

  // Forgot password state
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);

  const { signIn, signUp } = useAuth();

  const handleClassicLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim() || !password.trim()) {
      showMessage('error', 'Veuillez remplir tous les champs');
      return;
    }

    setLoginLoading(true);
    setMessage(null);

    try {
      const { error } = await signIn(email, password);
      if (error) {
        // Check if error is related to OAuth account
        if (error.message.includes('Email link') || error.message.includes('oauth')) {
          showMessage('error', 'Ce compte a été créé avec Google. Veuillez vous connecter avec Google.');
        } else if (error.message === 'Invalid login credentials') {
          showMessage('error', 'Email ou mot de passe incorrect. Si vous vous êtes inscrit avec Google, veuillez utiliser le bouton Google ci-dessous.');
        } else {
          showMessage('error', error.message);
        }
      }
    } catch (error) {
      showMessage('error', 'Une erreur est survenue');
    } finally {
      setLoginLoading(false);
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!forgotPasswordEmail.trim()) {
      showMessage('error', 'Veuillez entrer votre adresse email');
      return;
    }

    setForgotPasswordLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotPasswordEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        showMessage('error', error.message);
      } else {
        showMessage('success', 'Un email de réinitialisation a été envoyé à votre adresse email.');
        setShowForgotPassword(false);
        setForgotPasswordEmail('');
      }
    } catch (error) {
      showMessage('error', 'Une erreur est survenue');
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  const handleMagicLinkLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!magicLinkEmail.trim()) {
      showMessage('error', 'Veuillez entrer votre adresse email');
      return;
    }

    setMagicLinkLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: magicLinkEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/`
        }
      });

      if (error) {
        showMessage('error', error.message);
      } else {
        showMessage('success', 'Un lien de connexion a été envoyé à votre adresse email ! Cliquez sur le lien pour vous connecter.');
        setMagicLinkEmail('');
      }
    } catch (error) {
      showMessage('error', 'Une erreur est survenue');
    } finally {
      setMagicLinkLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`
        }
      });

      if (error) {
        showMessage('error', error.message);
      }
    } catch (error) {
      showMessage('error', 'Erreur lors de la connexion avec Google');
    }
  };

  const handleCreateAccount = async () => {
    if (!email.trim() || !password.trim()) {
      showMessage('error', 'Veuillez remplir tous les champs');
      return;
    }

    setSignupLoading(true);
    setMessage(null);

    try {
      const { error } = await signUp(email, password);
      if (error) {
        if (error.message.includes('already registered') || error.message.includes('User already registered')) {
          showMessage('error', 'Un compte existe déjà avec cet email. Si vous vous êtes inscrit avec Google, veuillez utiliser le bouton Google ci-dessous.');
        } else {
          showMessage('error', error.message);
        }
      } else {
        showMessage('success', 'Compte créé avec succès ! Vous pouvez maintenant vous connecter.');
        setPassword('');
      }
    } catch (error) {
      showMessage('error', 'Une erreur est survenue');
    } finally {
      setSignupLoading(false);
    }
  };

  if (showForgotPassword) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          {/* Header */}
          <div className="text-center mb-8">
            <img 
              src="https://pub-f75ac4351c874e6f945cfc0ccd7d6d35.r2.dev/CloudMenu/CloudMenu.svg" 
              alt="CloudMenu" 
              className="h-20 mx-auto mb-8"
              style={{ width: '390px', height: 'auto' }}
            />
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Mot de passe oublié
            </h2>
            <p className="text-gray-600">
              Entrez votre email pour recevoir un lien de réinitialisation
            </p>
          </div>

          {/* Message */}
          {message && (
            <div className={`mb-6 p-4 rounded-xl flex items-center space-x-2 ${
              message.type === 'success' 
                ? 'bg-green-50 border border-green-200 text-green-800' 
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}>
              {message.type === 'success' ? (
                <CheckCircle className="w-5 h-5 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
              )}
              <span className="text-sm">{message.text}</span>
            </div>
          )}

          {/* Form Card */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
            <form onSubmit={handleForgotPassword} className="space-y-6">
              <div>
                <label htmlFor="forgotEmail" className="block text-sm font-semibold text-gray-700 mb-3">
                  Adresse email
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    id="forgotEmail"
                    name="forgotEmail"
                    type="email"
                    autoComplete="email"
                    required
                    value={forgotPasswordEmail}
                    onChange={(e) => setForgotPasswordEmail(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200"
                    placeholder="votre@email.com"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={forgotPasswordLoading}
                className="w-full flex justify-center items-center py-4 px-6 border border-transparent rounded-xl text-sm font-semibold text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                {forgotPasswordLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <span>Envoyer le lien de réinitialisation</span>
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </>
                )}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotPassword(false);
                    setForgotPasswordEmail('');
                    setMessage(null);
                  }}
                  className="text-sm text-orange-600 hover:text-orange-700 font-medium hover:underline"
                >
                  Retour à la connexion
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <img 
            src="https://pub-f75ac4351c874e6f945cfc0ccd7d6d35.r2.dev/CloudMenu/CloudMenu.svg" 
            alt="CloudMenu" 
            className="mx-auto mb-8"
            style={{ width: '390px', height: 'auto' }}
          />
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-xl flex items-center space-x-2 ${
            message.type === 'success' 
              ? 'bg-green-50 border border-green-200 text-green-800' 
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
            )}
            <span className="text-sm">{message.text}</span>
          </div>
        )}

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          {/* Tabs */}
          <div className="flex bg-gray-50">
            <button
              onClick={() => setActiveTab('classic')}
              className={`flex-1 px-6 py-4 text-sm font-semibold transition-all duration-200 ${
                activeTab === 'classic'
                  ? 'bg-white text-orange-600 border-b-2 border-orange-600'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <Lock className="w-4 h-4" />
                <span>Email & Mot de passe</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('magic')}
              className={`flex-1 px-6 py-4 text-sm font-semibold transition-all duration-200 ${
                activeTab === 'magic'
                  ? 'bg-white text-orange-600 border-b-2 border-orange-600'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <Sparkles className="w-4 h-4" />
                <span>Connexion magique</span>
              </div>
            </button>
          </div>

          <div className="p-8">
            {/* Classic Login Tab */}
            {activeTab === 'classic' && (
              <form onSubmit={handleClassicLogin} className="space-y-6">
                <div>
                  <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-3">
                    Adresse email
                  </label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200"
                      placeholder="demo@restaurant.com"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-3">
                    Mot de passe
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-12 pr-12 py-4 border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200"
                      placeholder="demo123"
                      minLength={6}
                    />
                    <button
                      type="button"
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-sm text-orange-600 hover:text-orange-700 font-medium hover:underline"
                  >
                    Mot de passe oublié ?
                  </button>
                </div>

                <div className="flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:space-x-3">
                  <button
                    type="submit"
                    disabled={loginLoading}
                    className="w-full sm:flex-1 flex justify-center items-center py-4 px-6 border border-transparent rounded-xl text-sm font-semibold text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    {loginLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <span>Se connecter</span>
                        <ArrowRight className="ml-2 w-4 h-4" />
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateAccount}
                    disabled={signupLoading}
                    className="w-full sm:flex-1 flex justify-center items-center py-4 px-6 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    {signupLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <span>Créer un compte</span>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* Magic Link Tab */}
            {activeTab === 'magic' && (
              <form onSubmit={handleMagicLinkLogin} className="space-y-6">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-gradient-to-r from-purple-100 to-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Sparkles className="w-8 h-8 text-orange-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Connexion sans mot de passe</h3>
                  <p className="text-sm text-gray-600">
                    Nous vous enverrons un lien magique par email pour vous connecter instantanément.
                  </p>
                </div>

                <div>
                  <label htmlFor="magicEmail" className="block text-sm font-semibold text-gray-700 mb-3">
                    Adresse email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      id="magicEmail"
                      name="magicEmail"
                      type="email"
                      autoComplete="email"
                      required
                      value={magicLinkEmail}
                      onChange={(e) => setMagicLinkEmail(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200"
                      placeholder="votre@email.com"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={magicLinkLoading}
                  className="w-full flex justify-center items-center py-4 px-6 border border-transparent rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-orange-600 hover:from-purple-700 hover:to-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  {magicLinkLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Sparkles className="mr-2 w-4 h-4" />
                      <span>Envoyer le lien magique</span>
                      <ArrowRight className="ml-2 w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Google Sign In - Common to both tabs */}
            <div className="mt-8">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-gray-500 font-medium">ou</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="mt-6 w-full flex justify-center items-center py-4 px-6 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all duration-200 shadow-sm hover:shadow-md"
              >
                <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span>Continuer avec Google</span>
              </button>
            </div>
          </div>
        </div>

        {/* Demo Account Info */}
        <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-2xl sm:hidden">
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-blue-800 mb-2">Compte de démonstration</h3>
              <div className="text-sm text-blue-700 space-y-1">
                <p><span className="font-medium">Email :</span> demo@restaurant.com</p>
                <p><span className="font-medium">Mot de passe :</span> demo123</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-500">
          <p>
            En vous connectant, vous acceptez nos{' '}
            <a href="#" className="text-orange-600 hover:underline font-medium">conditions d'utilisation</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;