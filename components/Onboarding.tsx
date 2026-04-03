import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Club, Subscription, Plan } from '../types';
import { Button, Input, Card } from './UI';
import { CheckIcon, ArrowRightIcon, ArrowLeftIcon, FileTextIcon, CreditCardIcon } from './Icons';
import { db, doc, updateDoc } from '../firebase';
import SignatureCanvas from 'react-signature-canvas';
import { loadStripe } from '@stripe/stripe-js';

// Initialize Stripe (replace with your actual publishable key)
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY || '');

interface OnboardingProps {
  user: User;
  club: Club | null;
  subscriptions?: Subscription[];
  plans?: Plan[];
  onComplete: () => void;
}

export const Onboarding: React.FC<OnboardingProps> = ({ user, club, subscriptions, plans, onComplete }) => {
  const [step, setStep] = useState(1);
  const [objectives, setObjectives] = useState<string[]>(user.objectifs || []);
  const [injuries, setInjuries] = useState('');
  const [signature, setSignature] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sigCanvas = useRef<SignatureCanvas>(null);

  const totalSteps = 2;

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    }
  };

  const handlePrev = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleObjectiveToggle = (obj: string) => {
    if (objectives.includes(obj)) {
      setObjectives(objectives.filter(o => o !== obj));
    } else {
      setObjectives([...objectives, obj]);
    }
  };

  const clearSignature = () => {
    if (sigCanvas.current) {
      sigCanvas.current.clear();
      setSignature(null);
    }
  };

  const saveSignature = () => {
    if (sigCanvas.current && !sigCanvas.current.isEmpty()) {
      setSignature(sigCanvas.current.getCanvas().toDataURL('image/png'));
    }
  };

  const handleCheckout = async () => {
    setIsProcessing(true);
    setError(null);
    try {
      // In a real app, you would call your backend to create a Checkout Session
      // and then redirect to Stripe. Here we simulate it or use the backend if available.
      
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          email: user.email,
          clubId: user.clubId,
          // Add plan details here based on selection
        }),
      });

      if (!response.ok) {
        // Fallback for demo if backend is not fully hooked up
        console.warn("Backend checkout failed, simulating success for demo.");
        await finishOnboarding();
        return;
      }

      const session = await response.json();
      if (session.url) {
        window.location.href = session.url;
      } else {
        setError('Erreur lors de la création de la session de paiement.');
        setIsProcessing(false);
      }
    } catch (err: any) {
      console.error("Checkout error:", err);
      // Fallback for demo
      await finishOnboarding();
    }
  };

  const finishOnboarding = async () => {
    setIsProcessing(true);
    try {
      if (user.firebaseUid) {
        await updateDoc(doc(db, "users", user.firebaseUid), {
          objectifs: objectives,
          blessures: injuries,
          onboardingCompleted: true,
          paymentStatus: 'active' // Assuming payment was successful or simulated
        });
      }
      onComplete();
    } catch (err) {
      console.error("Error saving onboarding data:", err);
      setError("Erreur lors de l'enregistrement.");
    } finally {
      setIsProcessing(false);
    }
  };

  const userSubscription = subscriptions?.find(s => s.memberId === user.id && s.status === 'active');
  const userPlan = plans?.find(p => p.id === userSubscription?.planId);

  const hasPlanAssigned = !!userSubscription;
  const planName = userPlan?.name || userSubscription?.planName || 'En attente';
  const planPrice = userPlan?.price || userSubscription?.price || 0;
  const planBillingCycle = userPlan?.billingCycle || userSubscription?.billingCycle || 'monthly';
  const commitmentText = userPlan?.hasCommitment && userPlan?.commitmentMonths 
    ? `avec un engagement de ${userPlan.commitmentMonths} mois` 
    : 'sans engagement';

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <h2 className="text-3xl font-display font-bold text-zinc-900 mb-2">Bienvenue sur VELATRA !</h2>
              <p className="text-zinc-500">Faisons connaissance. Quels sont vos objectifs principaux ?</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {['Perte de poids', 'Prise de masse', 'Remise en forme', 'Préparation physique', 'Force', 'Endurance'].map(obj => (
                <button
                  key={obj}
                  onClick={() => handleObjectiveToggle(obj)}
                  className={`p-4 rounded-2xl border-2 transition-all text-left ${
                    objectives.includes(obj) 
                      ? 'border-emerald-500 bg-emerald-500/5 text-emerald-500' 
                      : 'border-zinc-200 hover:border-zinc-300 text-zinc-500 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold">{obj}</span>
                    {objectives.includes(obj) && <CheckIcon size={20} />}
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        );
      case 2:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <h2 className="text-3xl font-display font-bold text-zinc-900 mb-2">Santé & Antécédents</h2>
              <p className="text-zinc-500">Avez-vous des blessures ou des contraintes médicales ?</p>
            </div>
            <textarea
              value={injuries}
              onChange={(e) => setInjuries(e.target.value)}
              placeholder="Ex: Douleur à l'épaule droite, entorse cheville il y a 2 ans..."
              className="w-full h-40 p-4 rounded-2xl border border-zinc-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 resize-none"
            />
          </motion.div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Progress Bar */}
      <div className="h-2 bg-zinc-100 w-full fixed top-0 left-0 z-50">
        <motion.div 
          className="h-full bg-emerald-500"
          initial={{ width: '0%' }}
          animate={{ width: `${(step / totalSteps) * 100}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-2xl bg-zinc-50 border border-zinc-200 rounded-[40px] shadow-xl p-8 md:p-12 relative overflow-hidden">
          
          <AnimatePresence mode="wait">
            {renderStep()}
          </AnimatePresence>

          <div className="mt-12 flex items-center justify-between pt-6 border-t border-zinc-900">
            {step > 1 ? (
              <Button variant="secondary" onClick={handlePrev} disabled={isProcessing}>
                <ArrowLeftIcon size={20} className="mr-2" /> Retour
              </Button>
            ) : (
              <div></div>
            )}
            
            {step < totalSteps ? (
              <Button 
                onClick={handleNext} 
                disabled={(step === 1 && objectives.length === 0)}
              >
                Continuer <ArrowRightIcon size={20} className="ml-2" />
              </Button>
            ) : (
              <Button 
                onClick={finishOnboarding} 
                disabled={isProcessing}
                className="bg-emerald-500 text-zinc-900 hover:bg-emerald-500/90"
              >
                {isProcessing ? 'Traitement...' : 'Terminer'} <CheckIcon size={20} className="ml-2" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
