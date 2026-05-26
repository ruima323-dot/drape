import { useState } from 'react';
import { api } from '../../lib/api';

interface StyleQuestionnaireProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

interface Question {
  id: string;
  text: string;
  options: { value: string; label: string; emoji: string }[];
  multiple?: boolean;
  freeText?: boolean;
}

const questions: Question[] = [
  {
    id: 'aesthetic',
    text: 'Which aesthetic resonates with you most?',
    options: [
      { value: 'minimalist', label: 'Minimalist', emoji: '◻️' },
      { value: 'classic', label: 'Classic', emoji: '🎩' },
      { value: 'bohemian', label: 'Bohemian', emoji: '🌻' },
      { value: 'streetwear', label: 'Streetwear', emoji: '🧢' },
      { value: 'romantic', label: 'Romantic', emoji: '🌸' },
      { value: 'edgy', label: 'Edgy', emoji: '⚡' },
    ],
    multiple: true,
  },
  {
    id: 'colorPreference',
    text: 'What colors do you gravitate toward?',
    options: [
      { value: 'neutrals', label: 'Neutrals', emoji: '🤎' },
      { value: 'earth-tones', label: 'Earth Tones', emoji: '🍂' },
      { value: 'pastels', label: 'Pastels', emoji: '🩷' },
      { value: 'bold', label: 'Bold & Bright', emoji: '🔴' },
      { value: 'monochrome', label: 'Monochrome', emoji: '⬛' },
      { value: 'jewel-tones', label: 'Jewel Tones', emoji: '💎' },
    ],
    multiple: true,
  },
  {
    id: 'comfortLevel',
    text: 'How adventurous are you with fashion?',
    options: [
      { value: 'safe', label: 'I stick to what I know', emoji: '🛡️' },
      { value: 'moderate', label: 'Open to suggestions', emoji: '🌤️' },
      { value: 'adventurous', label: 'Love trying new things', emoji: '🚀' },
    ],
  },
  {
    id: 'prioritize',
    text: 'What matters most in an outfit?',
    options: [
      { value: 'comfort', label: 'Comfort', emoji: '☁️' },
      { value: 'style', label: 'Style', emoji: '✨' },
      { value: 'versatility', label: 'Versatility', emoji: '🔄' },
      { value: 'confidence', label: 'Confidence', emoji: '💪' },
    ],
  },
  {
    id: 'favoriteBrands',
    text: 'Name up to 3 brands whose style you love',
    options: [],
    freeText: true,
  },
];

export default function StyleQuestionnaire({
  isOpen,
  onClose,
  onComplete,
}: StyleQuestionnaireProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const question = questions[currentStep];
  const isLastStep = currentStep === questions.length - 1;
  const currentAnswer = answers[question.id];

  const hasAnswer = question.freeText
    ? Array.isArray(currentAnswer) && currentAnswer.length > 0 && currentAnswer.some((v) => v.trim().length > 0)
    : question.multiple
      ? Array.isArray(currentAnswer) && currentAnswer.length > 0
      : typeof currentAnswer === 'string' && currentAnswer.length > 0;

  const handleSelect = (value: string) => {
    if (question.multiple) {
      const current = (answers[question.id] as string[] | undefined) ?? [];
      const updated = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      setAnswers({ ...answers, [question.id]: updated });
    } else {
      setAnswers({ ...answers, [question.id]: value });
    }
  };

  const isSelected = (value: string): boolean => {
    if (question.multiple) {
      return ((answers[question.id] as string[] | undefined) ?? []).includes(value);
    }
    return answers[question.id] === value;
  };

  const handleNext = async () => {
    if (!isLastStep) {
      setCurrentStep((s) => s + 1);
      return;
    }

    // Submit on last step
    setIsSubmitting(true);
    setError(null);

    try {
      await api.post('/users/style-profile', { preferences: answers });
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save style profile.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="Style questionnaire"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-charcoal/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal content */}
      <div className="relative bg-white rounded-card-lg shadow-card-elevated p-card-lg w-full max-w-lg mx-4">
        {/* Progress */}
        <div className="flex items-center gap-1.5 mb-6">
          {questions.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-pill transition-colors ${
                i <= currentStep ? 'bg-gold' : 'bg-cream-300'
              }`}
            />
          ))}
        </div>

        <p className="text-xs text-charcoal-muted mb-2">
          Question {currentStep + 1} of {questions.length}
        </p>

        <h2 className="text-lg font-display font-semibold text-charcoal mb-5">
          {question.text}
        </h2>

        {question.multiple && !question.freeText && (
          <p className="text-xs text-charcoal-muted mb-3">Select all that apply</p>
        )}

        {/* Free text input for brands */}
        {question.freeText && (
          <div className="space-y-2.5">
            {[0, 1, 2].map((i) => (
              <input
                key={i}
                type="text"
                value={((answers[question.id] as string[] | undefined) ?? [])[i] ?? ''}
                onChange={(e) => {
                  const current = ((answers[question.id] as string[] | undefined) ?? []).slice();
                  current[i] = e.target.value;
                  setAnswers({ ...answers, [question.id]: current });
                }}
                placeholder={`Brand ${i + 1}${i === 0 ? '' : ' (optional)'}`}
                className="w-full rounded-card border border-cream-400 bg-white px-3 py-2.5 text-charcoal text-sm focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-colors"
              />
            ))}
            <p className="text-xs text-charcoal-muted">e.g., Aritzia, Uniqlo, COS</p>
          </div>
        )}

        {/* Options grid */}
        {!question.freeText && (
          <div className="grid grid-cols-2 gap-2.5">
          {question.options.map(({ value, label, emoji }) => (
            <button
              key={value}
              onClick={() => handleSelect(value)}
              className={`flex items-center gap-2.5 px-4 py-3 rounded-card border text-sm font-medium transition-colors text-left ${
                isSelected(value)
                  ? 'border-gold bg-cream-100 text-charcoal'
                  : 'border-cream-300 bg-white text-charcoal-muted hover:border-cream-400 hover:bg-cream-50'
              }`}
            >
              <span className="text-base" aria-hidden="true">
                {emoji}
              </span>
              <span>{label}</span>
            </button>
          ))}
        </div>
        )}

        {error && (
          <p className="mt-4 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between mt-6">
          <button
            onClick={currentStep === 0 ? onClose : handleBack}
            className="px-4 py-2 text-sm text-charcoal-muted hover:text-charcoal transition-colors"
          >
            {currentStep === 0 ? 'Skip' : 'Back'}
          </button>
          <button
            onClick={handleNext}
            disabled={!hasAnswer || isSubmitting}
            className="px-5 py-2.5 bg-charcoal text-cream-50 rounded-pill font-medium text-sm hover:bg-charcoal-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? 'Saving...' : isLastStep ? 'Finish' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}
