import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../contexts/LanguageContext';
import { Mic, Sparkles, AudioWaveform } from 'lucide-react';
import clsx from 'clsx';

interface OnboardingProps {
  onComplete: () => void;
}

export default function Onboarding({ onComplete }: OnboardingProps) {
  const { t } = useLanguage();
  const [step, setStep] = useState(0);

  const steps = [
    {
      id: 'welcome',
      icon: <Sparkles className="w-12 h-12 text-orange-400" />,
      title: t('onboarding', 'welcome'),
      desc: t('onboarding', 'welcomeDesc'),
    },
    {
      id: 'record',
      icon: <Mic className="w-12 h-12 text-blue-400" />,
      title: t('onboarding', 'record'),
      desc: t('onboarding', 'recordDesc'),
    },
    {
      id: 'analyze',
      icon: <AudioWaveform className="w-12 h-12 text-green-400" />,
      title: t('onboarding', 'analyze'),
      desc: t('onboarding', 'analyzeDesc'),
    }
  ];

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      onComplete();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-md bg-[#121212] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col relative"
      >
        <div className="p-8 pb-10 flex flex-col items-center text-center relative h-[320px] justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col items-center gap-6"
            >
              <div className="w-24 h-24 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-2">
                {steps[step].icon}
              </div>
              
              <div className="space-y-3">
                <h2 className="text-2xl font-bold text-white tracking-tight">
                  {steps[step].title}
                </h2>
                <p className="text-white/60 text-sm leading-relaxed max-w-[280px]">
                  {steps[step].desc}
                </p>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="p-6 bg-white/5 border-t border-white/10 flex items-center justify-between">
          <div className="flex gap-2">
            {steps.map((_, i) => (
              <div 
                key={i} 
                className={clsx(
                  "h-1.5 rounded-full transition-all duration-300",
                  i === step ? "w-6 bg-orange-500" : "w-1.5 bg-white/20"
                )}
              />
            ))}
          </div>

          <button
            onClick={handleNext}
            className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl text-sm transition-all duration-200 shadow-[0_0_15px_rgba(249,115,22,0.3)] hover:shadow-[0_0_25px_rgba(249,115,22,0.5)]"
          >
            {step === steps.length - 1 ? t('onboarding', 'start') : t('onboarding', 'next')}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
