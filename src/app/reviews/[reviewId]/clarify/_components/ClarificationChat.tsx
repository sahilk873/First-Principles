'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { DictationTextarea } from '@/components/ui/DictationTextarea';
import { clsx } from 'clsx';
import {
  ClarificationMessage,
  addClarificationResponse,
  completeClarification,
  addClinicianQuestion,
} from '@/lib/actions/clarifications';

interface ReviewData {
  id: string;
  appropriateness_score: number | null;
  agree_overall_plan_acceptable: boolean | null;
  agree_need_any_surgery_now: boolean | null;
  agree_fusion_plan_acceptable: boolean | null;
  agree_need_any_fusion_now: boolean | null;
  would_personally_prescribe: boolean | null;
  preferred_procedure_text: string | null;
  proposed_nonsurgical_therapies_text: string | null;
  suggested_decompression_text: string | null;
  suggested_fusion_text: string | null;
  final_comments: string | null;
}

interface ClarificationChatProps {
  reviewId: string;
  initialMessages: ClarificationMessage[];
  initialQuestions: string[];
  review: ReviewData;
  userRole: 'REVIEWER' | 'CLINICIAN';
}

export function ClarificationChat({
  reviewId,
  initialMessages,
  initialQuestions,
  review,
  userRole,
}: ClarificationChatProps) {
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<ClarificationMessage[]>(initialMessages);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [response, setResponse] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  // Derive questions from initial messages or use generated questions
  const systemQuestionMessages = messages.filter(
    (m) => m.sender_type === 'SYSTEM' && m.message_type === 'QUESTION'
  );
  const systemQuestions =
    systemQuestionMessages.length > 0 ? systemQuestionMessages.map((m) => m.message) : initialQuestions;
  const reviewerAnswerMessages = messages.filter(
    (m) => m.sender_type === 'REVIEWER' && m.message_type === 'ANSWER'
  );
  const answeredQuestions = reviewerAnswerMessages.length;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    // Set current question index based on answered questions
    setCurrentQuestionIndex(Math.min(answeredQuestions, systemQuestions.length));
  }, [answeredQuestions, systemQuestions.length]);

  const handleSubmitResponse = async (options?: { skipAdvance?: boolean }) => {
    if (!response.trim()) return;

    setIsSubmitting(true);
    try {
      const result = await addClarificationResponse(reviewId, response);
      if (result.success) {
        // Add to local messages
        const newMessage: ClarificationMessage = {
          id: Date.now().toString(),
          review_id: reviewId,
          sender_type: 'REVIEWER',
          sender_id: null,
          message: response,
          message_type: 'ANSWER',
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, newMessage]);
        setResponse('');
        if (!options?.skipAdvance) {
          setCurrentQuestionIndex((prev) => Math.min(prev + 1, systemQuestions.length));
        }
      }
    } catch (error) {
      console.error('Error submitting response:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleComplete = async () => {
    setIsSubmitting(true);
    try {
      const result = await completeClarification(reviewId);
      if (result.success) {
        setIsComplete(true);
        // Redirect after a short delay
        setTimeout(() => {
          router.push('/reviews');
        }, 2000);
      }
    } catch (error) {
      console.error('Error completing clarification:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    setCurrentQuestionIndex((prev) => Math.min(prev + 1, systemQuestions.length));
  };

  const handleClinicianQuestion = async () => {
    if (!response.trim()) return;

    setIsSubmitting(true);
    try {
      const result = await addClinicianQuestion(reviewId, response);
      if (result.success) {
        const newMessage: ClarificationMessage = {
          id: Date.now().toString(),
          review_id: reviewId,
          sender_type: 'CLINICIAN',
          sender_id: null,
          message: response,
          message_type: 'QUESTION',
          created_at: new Date().toISOString(),
        };
        setMessages([...messages, newMessage]);
        setResponse('');
      }
    } catch (error) {
      console.error('Error submitting question:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const allQuestionsAnswered = currentQuestionIndex >= systemQuestions.length;
  const progressPercent = systemQuestions.length > 0 ? (currentQuestionIndex / systemQuestions.length) * 100 : 100;
  const answeredPairsCount = Math.min(currentQuestionIndex, reviewerAnswerMessages.length);
  const surgeryNeededNow = review.agree_overall_plan_acceptable === true
    ? true
    : review.agree_overall_plan_acceptable === false
      ? review.agree_need_any_surgery_now
      : null;
  const fusionNeededNow = review.agree_fusion_plan_acceptable === true
    ? true
    : review.agree_fusion_plan_acceptable === false
      ? review.agree_need_any_fusion_now
      : null;
  const showFusionSummary = review.agree_fusion_plan_acceptable != null || review.agree_need_any_fusion_now != null;

  const createQuestionMessage = (text: string, index: number): ClarificationMessage => ({
    id: `generated-${index}`,
    review_id: reviewId,
    sender_type: 'SYSTEM',
    sender_id: null,
    message: text,
    message_type: 'QUESTION',
    created_at: new Date().toISOString(),
  });

  const answeredPairs = Array.from({ length: answeredPairsCount }, (_, idx) => ({
    question: systemQuestionMessages[idx] ?? createQuestionMessage(systemQuestions[idx] || `Question ${idx + 1}`, idx),
    answer: reviewerAnswerMessages[idx],
  }));
  const usedAnswerIds = new Set(answeredPairs.map((pair) => pair.answer.id));

  const parseTimestamp = (iso: string | null | undefined, fallback: number) => {
    const ts = iso ? Date.parse(iso) : NaN;
    return Number.isNaN(ts) ? fallback : ts;
  };

  type DisplayMessage = {
    key: string;
    role: 'SYSTEM' | 'REVIEWER' | 'CLINICIAN';
    message: ClarificationMessage;
    order: number;
  };

  const displayMessages: DisplayMessage[] = answeredPairs.flatMap((pair, idx) => {
    const answerOrder = parseTimestamp(pair.answer.created_at, idx);
    return [
      {
        key: `question-${pair.question.id}`,
        role: 'SYSTEM' as const,
        message: pair.question,
        order: answerOrder - 0.5,
      },
      {
        key: `answer-${pair.answer.id}`,
        role: 'REVIEWER' as const,
        message: pair.answer,
        order: answerOrder,
      },
    ];
  });

  messages.forEach((msg, idx) => {
    const isSystemQuestion = msg.sender_type === 'SYSTEM' && msg.message_type === 'QUESTION';
    if (isSystemQuestion) {
      // Skip answered/future system questions - current question rendered separately
      return;
    }

    const isReviewerAnswer = msg.sender_type === 'REVIEWER' && msg.message_type === 'ANSWER';
    if (isReviewerAnswer && usedAnswerIds.has(msg.id)) {
      return;
    }

    const order = parseTimestamp(msg.created_at, answeredPairs.length + idx);
    displayMessages.push({
      key: msg.id || `msg-${idx}`,
      role: msg.sender_type,
      message: msg,
      order,
    });
  });

  displayMessages.sort((a, b) => a.order - b.order);

  if (isComplete) {
    return (
      <Card className="max-w-3xl mx-auto">
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Clarification Complete!</h2>
          <p className="text-slate-600 mb-4">
            Your responses have been saved and will be shared with the submitting physician.
          </p>
          <p className="text-sm text-slate-500">Redirecting to reviews...</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Review Summary Card */}
      <Card>
        <CardHeader>Review Summary</CardHeader>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-3 bg-slate-50 rounded-lg text-center">
            <p className="text-xs text-slate-500 mb-1">Score</p>
            <p className={clsx(
              'text-2xl font-bold',
              review.appropriateness_score && review.appropriateness_score >= 7 ? 'text-emerald-600' :
              review.appropriateness_score && review.appropriateness_score >= 4 ? 'text-amber-600' :
              'text-rose-600'
            )}>
              {review.appropriateness_score}/9
            </p>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg text-center">
            <p className="text-xs text-slate-500 mb-1">Overall Plan</p>
            <p className={clsx(
              'text-lg font-semibold',
              review.agree_overall_plan_acceptable ? 'text-emerald-600' : 'text-rose-600'
            )}>
              {review.agree_overall_plan_acceptable ? 'Acceptable' : 'Unacceptable'}
            </p>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg text-center">
            <p className="text-xs text-slate-500 mb-1">Surgery Now</p>
            <p className={clsx(
              'text-lg font-semibold',
              surgeryNeededNow ? 'text-emerald-600' : 'text-rose-600'
            )}>
              {surgeryNeededNow == null ? '—' : surgeryNeededNow ? 'Yes' : 'No'}
            </p>
          </div>
          {showFusionSummary ? (
            <div className="p-3 bg-slate-50 rounded-lg text-center">
              <p className="text-xs text-slate-500 mb-1">Fusion Now</p>
              <p className={clsx(
                'text-lg font-semibold',
                fusionNeededNow ? 'text-emerald-600' : 'text-rose-600'
              )}>
                {fusionNeededNow == null ? '—' : fusionNeededNow ? 'Yes' : 'No'}
              </p>
            </div>
          ) : (
            <div className="p-3 bg-slate-50 rounded-lg text-center">
              <p className="text-xs text-slate-500 mb-1">Would Prescribe</p>
              <p className={clsx(
                'text-lg font-semibold',
                review.would_personally_prescribe ? 'text-emerald-600' : 'text-rose-600'
              )}>
                {review.would_personally_prescribe == null ? '—' : review.would_personally_prescribe ? 'Yes' : 'No'}
              </p>
            </div>
          )}
        </div>
        {review.preferred_procedure_text && (
          <div className="mt-4 p-4 bg-slate-50 rounded-lg">
            <p className="text-xs text-slate-500 font-medium mb-1">Preferred Procedure</p>
            <p className="text-sm text-slate-700">{review.preferred_procedure_text}</p>
          </div>
        )}
        {review.proposed_nonsurgical_therapies_text && (
          <div className="mt-4 p-4 bg-amber-50 rounded-lg">
            <p className="text-xs text-amber-700 font-medium mb-1">Proposed Nonsurgical Therapies</p>
            <p className="text-sm text-amber-800">{review.proposed_nonsurgical_therapies_text}</p>
          </div>
        )}
        {review.suggested_decompression_text && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <p className="text-xs text-blue-600 font-medium mb-1">Suggested Decompression</p>
            <p className="text-sm text-blue-800">{review.suggested_decompression_text}</p>
          </div>
        )}
        {review.suggested_fusion_text && (
          <div className="mt-4 p-4 bg-purple-50 rounded-lg">
            <p className="text-xs text-purple-700 font-medium mb-1">Suggested Fusion</p>
            <p className="text-sm text-purple-800">{review.suggested_fusion_text}</p>
          </div>
        )}
        {review.final_comments && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <p className="text-xs text-blue-600 font-medium mb-1">Final Comments</p>
            <p className="text-sm text-blue-800">{review.final_comments}</p>
          </div>
        )}
      </Card>

      {/* Progress Indicator */}
      <div className="flex items-center gap-3 px-4">
        <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <span className="text-sm text-slate-500">
          {Math.min(currentQuestionIndex, systemQuestions.length)}/{systemQuestions.length} answered
        </span>
      </div>

      {/* Chat Interface */}
      <Card className="min-h-[400px] flex flex-col">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <div>
              <span className="font-semibold">Clarification Assistant</span>
              <p className="text-xs text-slate-500">Help improve your review with additional context</p>
            </div>
          </div>
        </CardHeader>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto space-y-4 p-4 bg-slate-50/50">
          {/* Welcome message */}
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex-shrink-0 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <div className="flex-1 p-4 bg-white rounded-xl rounded-tl-none shadow-sm border border-slate-100">
              <p className="text-sm text-slate-700">
                Thank you for completing your review! I have a few follow-up questions to help provide more context to the submitting physician. Your responses will be shared along with your review.
              </p>
            </div>
          </div>

          {/* Existing messages (question/answer pairs and other updates) */}
          {displayMessages.map((item) => (
            <div
              key={item.key}
              className={clsx('flex gap-3', item.role === 'REVIEWER' && 'flex-row-reverse')}
            >
              <div
                className={clsx(
                  'w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center',
                  item.role === 'SYSTEM' && 'bg-gradient-to-br from-blue-500 to-purple-600',
                  item.role === 'REVIEWER' && 'bg-emerald-500',
                  item.role === 'CLINICIAN' && 'bg-amber-500'
                )}
              >
                {item.role === 'SYSTEM' ? (
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                ) : item.role === 'REVIEWER' ? (
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                )}
              </div>
              <div
                className={clsx(
                  'flex-1 max-w-[80%] p-4 rounded-xl shadow-sm border border-slate-100',
                  item.role === 'REVIEWER'
                    ? 'bg-emerald-50 rounded-tr-none'
                    : item.role === 'CLINICIAN'
                    ? 'bg-amber-50 rounded-tl-none'
                    : 'bg-white rounded-tl-none'
                )}
              >
                <p
                  className={clsx(
                    'text-xs font-medium mb-1',
                    item.role === 'REVIEWER' ? 'text-emerald-600' : item.role === 'CLINICIAN' ? 'text-amber-600' : 'text-blue-600'
                  )}
                >
                  {item.role === 'SYSTEM'
                    ? 'Question'
                    : item.role === 'REVIEWER'
                    ? 'Your Response'
                    : 'Clinician'}
                </p>
                <p className="text-sm text-slate-700">{item.message.message}</p>
              </div>
            </div>
          ))}

          {/* Current question (if not all answered) */}
          {userRole === 'REVIEWER' && !allQuestionsAnswered && currentQuestionIndex < systemQuestions.length && (
            <div className="flex gap-3 animate-fade-in">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex-shrink-0 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1 p-4 bg-white rounded-xl rounded-tl-none shadow-sm border border-slate-100">
                <p className="text-xs text-blue-600 font-medium mb-1">Question {currentQuestionIndex + 1}</p>
                <p className="text-sm text-slate-700">{systemQuestions[currentQuestionIndex]}</p>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-slate-200 bg-white">
          {userRole === 'REVIEWER' && !allQuestionsAnswered ? (
            <>
              <DictationTextarea
                label="Your Response"
                value={response}
                onChange={setResponse}
                placeholder="Type your response or click Dictate to use voice input..."
                rows={3}
              />
              <div className="flex items-center justify-between mt-3">
                <Button variant="secondary" onClick={handleSkip} disabled={isSubmitting}>
                  Skip Question
                </Button>
                <Button onClick={() => handleSubmitResponse()} disabled={isSubmitting || !response.trim()} isLoading={isSubmitting}>
                  Submit Response
                </Button>
              </div>
            </>
          ) : userRole === 'REVIEWER' && allQuestionsAnswered ? (
            <div className="text-center py-4">
              <p className="text-slate-600 mb-4">
                You&apos;ve answered all the clarification questions. Would you like to add any additional comments?
              </p>
              <DictationTextarea
                label="Additional Comments"
                value={response}
                onChange={setResponse}
                placeholder="Any additional comments? (optional)"
                rows={2}
              />
              <div className="flex items-center justify-center gap-3 mt-4">
                {response.trim() && (
                  <Button
                    variant="secondary"
                    onClick={() => handleSubmitResponse({ skipAdvance: true })}
                    disabled={isSubmitting}
                  >
                    Add Comment
                  </Button>
                )}
                <Button onClick={handleComplete} disabled={isSubmitting} isLoading={isSubmitting}>
                  Complete &amp; Submit
                </Button>
              </div>
            </div>
          ) : (
            // Clinician view
            <>
              <DictationTextarea
                label="Follow-up Question"
                value={response}
                onChange={setResponse}
                placeholder="Ask a follow-up question to the reviewer..."
                rows={3}
              />
              <div className="flex items-center justify-end mt-3">
                <Button onClick={handleClinicianQuestion} disabled={isSubmitting || !response.trim()} isLoading={isSubmitting}>
                  Send Question
                </Button>
              </div>
            </>
          )}
        </div>
      </Card>

      {/* Skip all option */}
      {userRole === 'REVIEWER' && !allQuestionsAnswered && (
        <div className="text-center">
          <button
            onClick={handleComplete}
            className="text-sm text-slate-500 hover:text-slate-700 underline"
          >
            Skip all questions and complete review
          </button>
        </div>
      )}
    </div>
  );
}
