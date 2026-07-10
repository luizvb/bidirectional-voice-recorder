import { useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useLanguage } from '../contexts/LanguageContext';
import { motion } from 'framer-motion';

export default function Login() {
  const { t } = useLanguage();
  const { loginWithRedirect } = useAuth0();

  useEffect(() => {
    loginWithRedirect();
  }, [loginWithRedirect]);

  return (
    <div className="relative flex items-center justify-center min-h-screen">
      {/* Animated gradient orbs */}
      <div className="absolute -top-20 -left-20 w-72 h-72 bg-primary/30 rounded-full blur-[120px] animate-pulse pointer-events-none" />
      <div className="absolute -bottom-20 -right-20 w-72 h-72 bg-accent/20 rounded-full blur-[120px] animate-pulse pointer-events-none" style={{ animationDelay: '1s' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-primary/10 rounded-full blur-[80px] animate-pulse pointer-events-none" style={{ animationDelay: '2s' }} />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative flex flex-col items-center z-10"
      >
        <div className="w-10 h-10 rounded-full border-4 border-white/10 border-t-primary animate-spin mb-6" />
        <p className="text-white/60 text-sm">{t('login', 'signingIn') || 'Redirecting to secure login...'}</p>
      </motion.div>
    </div>
  );
}
