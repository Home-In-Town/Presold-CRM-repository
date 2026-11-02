import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Award, Clock, CheckCircle, X } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function TrainingPopup({ module, onComplete }) {
  const [step, setStep] = useState('intro'); // intro, video, quiz, result
  const [videoWatched, setVideoWatched] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const videoRef = useRef(null);

  // Prevent closing the modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const startVideo = () => {
    setStep('video');
  };

  const handleVideoEnd = async () => {
    setVideoWatched(true);
    
    // Mark video as watched
    try {
      await api.post(`/training/modules/${module.id}/watch`);
    } catch (err) {
      console.error('Failed to mark video as watched:', err);
    }
    
    // Wait a moment before showing quiz button
    setTimeout(() => {
      setStep('video-ended');
    }, 500);
  };

  const startQuiz = () => {
    setStep('quiz');
    setCurrentQuestionIndex(0);
  };

  const selectAnswer = (questionId, optionIndex) => {
    setAnswers({ ...answers, [questionId]: optionIndex });
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < module.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const previousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const submitQuiz = async () => {
    // Check if all questions are answered
    const unanswered = module.questions.filter(q => answers[q.id] === undefined);
    if (unanswered.length > 0) {
      toast.error(`Please answer all questions (${unanswered.length} remaining)`);
      return;
    }

    setLoading(true);
    try {
      const res = await api.post(`/training/modules/${module.id}/submit-quiz`, { answers });
      setResult(res.data);
      setStep('result');
    } catch (err) {
      console.error('Submit quiz error:', err);
      toast.error('Failed to submit quiz');
    } finally {
      setLoading(false);
    }
  };

  const finish = () => {
    onComplete();
  };

  const currentQuestion = module.questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / module.questions.length) * 100;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 backdrop-blur-sm"
    >
      <div className="w-full h-full flex items-center justify-center p-4">
        <AnimatePresence mode="wait">
          {/* Intro Screen */}
          {step === 'intro' && (
            <motion.div
              key="intro"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-card p-8 max-w-2xl w-full text-center"
            >
              <div className="w-20 h-20 rounded-full bg-brand-500/20 flex items-center justify-center mx-auto mb-6">
                <Play size={40} className="text-brand-400" />
              </div>
              
              <h2 className="text-3xl font-bold text-white mb-3">{module.topicName}</h2>
              
              {module.description && (
                <p className="text-gray-300 mb-6">{module.description}</p>
              )}
              
              <div className="flex items-center justify-center gap-6 mb-8 text-sm text-gray-400">
                <div className="flex items-center gap-2">
                  <Clock size={18} className="text-brand-400" />
                  <span>Watch Video</span>
                </div>
                <div className="flex items-center gap-2">
                  <Award size={18} className="text-brand-400" />
                  <span>{module.questionCount} Questions</span>
                </div>
              </div>

              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6">
                <p className="text-yellow-400 text-sm font-medium">
                  ⚠️ This training is mandatory. Please watch the full video and complete the quiz.
                </p>
              </div>

              <button
                onClick={startVideo}
                className="btn-primary w-full py-4 text-lg flex items-center justify-center gap-3"
              >
                <Play size={24} />
                Start Training
              </button>
            </motion.div>
          )}

          {/* Video Screen */}
          {step === 'video' && (
            <motion.div
              key="video"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-5xl"
            >
              <div className="glass-card p-4">
                <h3 className="text-xl font-semibold text-white mb-4">{module.topicName}</h3>
                <div className="aspect-video bg-black rounded-lg overflow-hidden">
                  <video
                    ref={videoRef}
                    src={module.videoUrl}
                    controls
                    controlsList="nodownload"
                    onEnded={handleVideoEnd}
                    className="w-full h-full"
                    autoPlay
                  >
                    Your browser does not support video playback.
                  </video>
                </div>
                <p className="text-sm text-gray-400 mt-4 text-center">
                  Please watch the complete video before proceeding to the quiz
                </p>
              </div>
            </motion.div>
          )}

          {/* Video Ended - Show Quiz Button */}
          {step === 'video-ended' && (
            <motion.div
              key="video-ended"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-card p-8 max-w-2xl w-full text-center"
            >
              <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
                <CheckCircle size={40} className="text-green-400" />
              </div>
              
              <h2 className="text-3xl font-bold text-white mb-3">Video Complete!</h2>
              <p className="text-gray-300 mb-8">
                Great job! Now let's test your understanding with a quick quiz.
              </p>

              <button
                onClick={startQuiz}
                className="btn-primary w-full py-4 text-lg flex items-center justify-center gap-3"
              >
                <Award size={24} />
                Start Quiz ({module.questionCount} Questions)
              </button>
            </motion.div>
          )}

          {/* Quiz Screen */}
          {step === 'quiz' && currentQuestion && (
            <motion.div
              key="quiz"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-card p-8 max-w-3xl w-full"
            >
              {/* Progress Bar */}
              <div className="mb-6">
                <div className="flex items-center justify-between text-sm text-gray-400 mb-2">
                  <span>Question {currentQuestionIndex + 1} of {module.questions.length}</span>
                  <span>{Math.round(progress)}% Complete</span>
                </div>
                <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    className="h-full bg-brand-500"
                  />
                </div>
              </div>

              {/* Question */}
              <h3 className="text-2xl font-bold text-white mb-6">
                {currentQuestion.questionText}
              </h3>

              {/* Options */}
              <div className="space-y-3 mb-8">
                {currentQuestion.options.map((option, index) => {
                  const isSelected = answers[currentQuestion.id] === index;
                  return (
                    <button
                      key={index}
                      onClick={() => selectAnswer(currentQuestion.id, index)}
                      className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                        isSelected
                          ? 'border-brand-500 bg-brand-500/20'
                          : 'border-gray-700 bg-dark-800/50 hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                          isSelected ? 'border-brand-500 bg-brand-500' : 'border-gray-600'
                        }`}>
                          {isSelected && <div className="w-3 h-3 bg-white rounded-full" />}
                        </div>
                        <span className="text-white">{option}</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Navigation */}
              <div className="flex gap-3">
                {currentQuestionIndex > 0 && (
                  <button
                    onClick={previousQuestion}
                    className="btn-secondary flex-1"
                  >
                    Previous
                  </button>
                )}
                
                {currentQuestionIndex < module.questions.length - 1 ? (
                  <button
                    onClick={nextQuestion}
                    className="btn-primary flex-1"
                    disabled={answers[currentQuestion.id] === undefined}
                  >
                    Next
                  </button>
                ) : (
                  <button
                    onClick={submitQuiz}
                    className="btn-primary flex-1"
                    disabled={loading}
                  >
                    {loading ? 'Submitting...' : 'Submit Quiz'}
                  </button>
                )}
              </div>

              {/* Answer Status */}
              <div className="mt-4 text-center">
                <p className="text-sm text-gray-400">
                  {Object.keys(answers).length} of {module.questions.length} questions answered
                </p>
              </div>
            </motion.div>
          )}

          {/* Result Screen */}
          {step === 'result' && result && (
            <motion.div
              key="result"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-card p-8 max-w-2xl w-full text-center"
            >
              <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 ${
                result.percentage >= 70 
                  ? 'bg-green-500/20' 
                  : result.percentage >= 50 
                  ? 'bg-yellow-500/20' 
                  : 'bg-red-500/20'
              }`}>
                <Award size={48} className={
                  result.percentage >= 70 
                    ? 'text-green-400' 
                    : result.percentage >= 50 
                    ? 'text-yellow-400' 
                    : 'text-red-400'
                } />
              </div>

              <h2 className="text-3xl font-bold text-white mb-3">
                {result.percentage >= 70 
                  ? '🎉 Excellent!' 
                  : result.percentage >= 50 
                  ? '👍 Good Job!' 
                  : '📚 Keep Learning!'}
              </h2>

              <p className="text-gray-300 mb-8">
                You scored {result.score} out of {result.totalQuestions} questions correctly
              </p>

              {/* Score Circle */}
              <div className="relative w-40 h-40 mx-auto mb-8">
                <svg className="transform -rotate-90 w-40 h-40">
                  <circle
                    cx="80"
                    cy="80"
                    r="70"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="transparent"
                    className="text-dark-700"
                  />
                  <circle
                    cx="80"
                    cy="80"
                    r="70"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="transparent"
                    strokeDasharray={`${2 * Math.PI * 70}`}
                    strokeDashoffset={`${2 * Math.PI * 70 * (1 - result.percentage / 100)}`}
                    className={
                      result.percentage >= 70 
                        ? 'text-green-400' 
                        : result.percentage >= 50 
                        ? 'text-yellow-400' 
                        : 'text-red-400'
                    }
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-4xl font-bold text-white">{result.percentage}%</span>
                </div>
              </div>

              <button
                onClick={finish}
                className="btn-primary w-full py-4 text-lg"
              >
                Complete Training
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
