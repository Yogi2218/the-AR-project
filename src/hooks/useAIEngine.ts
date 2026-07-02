import { useCallback, useState } from 'react';
import { useSessionStore } from '@/stores/sessionStore';
import { speechEngine } from '@/lib/tts/speechEngine';
import { matchScriptLine } from '@/lib/characters/characterData';

// Shared hook for the Universal AI Engine flow
export function useAIEngine() {
  const [isProcessing, setIsProcessing] = useState(false);
  const store = useSessionStore();

  const handleQuestion = useCallback(async (question: string) => {
    const {
      character, aiModeEnabled, sessionHistory, learningLevel, selectedLanguage, ageGroup, mood, lessonGoal, teacherOverridePrompt, safeMode, selectedTemplate,
      canUseAI, isQuestionSafe, getCachedAnswer, addCachedAnswer, addHistoryMessage, teacherCorrections, incrementSessionQuestion, incrementTokenUsage,
      setSubtitle, setIsSpeaking, setMouthOpen, setCharacterState, addInteraction
    } = store;

    if (!character) return;
    if (!question.trim()) return;

    setIsProcessing(true);
    addInteraction({ speaker: 'student', message: question, inputType: 'text' });
    addHistoryMessage('student', question);

    let answer = '';
    let source = 'unknown';

    try {
      // 0. Template predefined Q&A Match
      if (selectedTemplate?.script?.questions) {
        const qMatch = selectedTemplate.script.questions.find(
          (qa: any) => qa.q.toLowerCase().trim() === question.toLowerCase().trim()
        );
        if (qMatch) {
          answer = qMatch.a;
          source = 'template-qa';
        }
      }

      if (!answer) {
        // 1. Scripted Mode (or AI mode turned off)
        if (!aiModeEnabled) {
        const line = matchScriptLine(question, character);
        answer = line?.answer ?? `That is a great question! Ask me about ${character.subject} and I will do my best to answer.`;
        source = 'script';
      } 
      else {
        // AI MODE
        // 2. Safety Check
        if (!isQuestionSafe(question)) {
          answer = "I appreciate your curiosity, but that topic is not suitable for our educational session. Let us explore something wonderful about my field of expertise instead!";
          source = 'safety-filter';
        }
        else {
          // 3. Teacher Correction Check
          const correction = teacherCorrections.find(c => c.question.toLowerCase() === question.toLowerCase().trim());
          if (correction) {
            answer = correction.correctedAnswer;
            source = 'teacher-correction';
          }
          else {
            // 4. Cache Check
            const cached = getCachedAnswer(character.id, question);
            if (cached) {
              answer = cached;
              source = 'cache';
            }
            else {
              // 5. Cost Control Check
              if (!canUseAI()) {
                answer = "I've reached my daily limit for answering new questions today. Please try again tomorrow, or use my scripted mode!";
                source = 'cost-limit';
              }
              else {
                // 6. Gemini API Call
                const response = await fetch('/api/chat', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    characterId: character.id,
                    characterName: character.name,
                    personality: character.personality,
                    speakingStyle: character.speakingStyle,
                    teachingStyle: character.teachingStyle,
                    knowledgeSummary: character.knowledgeSummary,
                    knowledgeSourceType: character.knowledgeSourceType || 'custom',
                    personalityStrength: character.personalityStrength || 7,
                    question,
                    sessionHistory,
                    learningLevel,
                    language: selectedLanguage,
                    ageGroup,
                    mood,
                    lessonGoal,
                    teacherOverridePrompt: selectedTemplate?.script?.systemPrompt 
                      ? `${teacherOverridePrompt}\n\n[TEACHER TEMPLATE SCRIPT]\n${selectedTemplate.script.systemPrompt}` 
                      : teacherOverridePrompt,
                    safeMode
                  }),
                });

                if (response.ok) {
                  const data = await response.json();
                  answer = data.answer;
                  source = data.source;
                  
                  if (source === 'gemini') {
                    // Update cost usage only if successfully hit Gemini
                    incrementSessionQuestion();
                    incrementTokenUsage();
                    addCachedAnswer(character.id, question, answer);
                  }
                } else {
                  answer = "I seem to be having trouble thinking right now. Please try again in a moment.";
                  source = 'error';
                }
              }
            }
          }
        }
      }
      }

      // Add character response to history and UI
      addInteraction({ speaker: 'character', message: answer, inputType: 'text' });
      addHistoryMessage('character', answer);
      setSubtitle(answer);
      setCharacterState('speaking');

      // Synthesize & Play Speech via the unified SpeechEngine
      speechEngine.speak({
        text: answer,
        characterId: character.id,
        voiceProfile: character.voiceProfile,
        onStart: () => { setIsSpeaking(true); setMouthOpen(0.5); },
        onEnd:   () => { setIsSpeaking(false); setMouthOpen(0); setCharacterState('idle'); },
        onWord:  (word) => {
          const v = word.match(/[aeiouáéíóú]/gi)?.length ?? 1;
          setMouthOpen(Math.min(0.9, v * 0.3));
        },
      });

    } catch (error) {
      console.error("AI Engine error:", error);
      const fallback = "I'm having a technical issue. Let's try again in a moment.";
      setSubtitle(fallback);
      speechEngine.speak({
        text: fallback,
        voiceProfile: character.voiceProfile,
        onStart: () => { setIsSpeaking(true); setMouthOpen(0.5); },
        onEnd:   () => { setIsSpeaking(false); setMouthOpen(0); setCharacterState('idle'); }
      });
    } finally {
      setIsProcessing(false);
    }
  }, [store]);

  return { handleQuestion, isProcessing };
}
