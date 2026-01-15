// packages/actors/src/studio-npc/discovery.ts
import { getRecordOptional, type CharacterProfile } from '@minimal-rpg/schemas';
import type { DiscoveryTopic, SuggestedPrompt } from './types.js';

/**
 * Maps discovery topics to profile fields that would be filled by exploring them.
 */
const TOPIC_TO_FIELDS: Record<DiscoveryTopic, string[]> = {
  'values': ['personalityMap.values'],
  'fears': ['personalityMap.fears'],
  'relationships': ['personalityMap.social.strangerDefault', 'personalityMap.social.warmthRate', 'personalityMap.social.boundaries'],
  'backstory': ['backstory'],
  'stress-response': ['personalityMap.stress.primary', 'personalityMap.stress.secondary', 'personalityMap.stress.threshold'],
  'social-behavior': ['personalityMap.social.preferredRole', 'personalityMap.social.conflictStyle', 'personalityMap.social.criticismResponse'],
  'communication-style': ['personalityMap.speech.vocabulary', 'personalityMap.speech.directness', 'personalityMap.speech.formality'],
  'goals-motivations': ['personalityMap.values', 'summary'],
  'emotional-range': ['personalityMap.emotionalBaseline', 'personalityMap.dimensions.neuroticism'],
};

/**
 * Prompt templates for each discovery topic.
 */
const TOPIC_PROMPTS: Record<DiscoveryTopic, string[]> = {
  'values': [
    "What matters most to you in life?",
    "If you had to choose between loyalty and honesty, which wins?",
    "What would you sacrifice everything for?",
    "What do you think makes a person truly good?",
    "Is there a principle you would never compromise on?",
  ],
  'fears': [
    "What keeps you up at night?",
    "Is there something you avoid thinking about?",
    "What's the worst thing that could happen to you?",
    "Do you have any recurring nightmares?",
    "What situation makes you want to run away?",
  ],
  'relationships': [
    "How do you feel about meeting new people?",
    "Do you let people in easily, or do they have to earn your trust?",
    "Who was the last person you truly trusted?",
    "How do you handle it when someone disappoints you?",
    "Do you prefer to be alone or surrounded by others?",
  ],
  'backstory': [
    "Where did you grow up?",
    "Tell me about your family.",
    "What's your earliest memory?",
    "Was there a moment that changed everything for you?",
    "What did you want to be when you were young?",
  ],
  'stress-response': [
    "What do you do when everything feels like too much?",
    "How do you react when someone threatens you?",
    "Tell me about a time you were truly afraid.",
    "When you're overwhelmed, do you fight back, run, or freeze?",
    "How long does it take you to calm down after something upsets you?",
  ],
  'social-behavior': [
    "Do you prefer to lead or follow?",
    "How do you handle disagreements with others?",
    "What happens when someone criticizes you?",
    "Are you the one who speaks first in a group, or do you wait?",
    "Do you enjoy being the center of attention?",
  ],
  'communication-style': [
    "Do you say what you mean, or do you soften the truth?",
    "Would others describe you as blunt or diplomatic?",
    "Do you use big words or keep things simple?",
    "How formal are you with people you've just met?",
    "Do you joke around much, or are you more serious?",
  ],
  'goals-motivations': [
    "What do you want most in the world?",
    "Where do you see yourself in ten years?",
    "What drives you to get up each morning?",
    "Is there something you're working toward?",
    "What would make you feel like your life was complete?",
  ],
  'emotional-range': [
    "When was the last time you cried?",
    "What makes you truly happy?",
    "How do you express anger?",
    "Do people know when you're upset, or do you hide it?",
    "Would you say you feel things deeply, or do you stay detached?",
  ],
};

export interface DiscoveryGuideConfig {
  profile: Partial<CharacterProfile>;
}

export class DiscoveryGuide {
  private exploredTopics = new Set<DiscoveryTopic>();
  private profile: Partial<CharacterProfile>;

  constructor(config: DiscoveryGuideConfig) {
    this.profile = config.profile;
  }

  /**
   * Update the profile reference.
   */
  updateProfile(profile: Partial<CharacterProfile>): void {
    this.profile = profile;
  }

  /**
   * Mark a topic as explored.
   */
  markExplored(topic: DiscoveryTopic): void {
    this.exploredTopics.add(topic);
  }

  /**
   * Get all explored topics.
   */
  getExploredTopics(): DiscoveryTopic[] {
    return Array.from(this.exploredTopics);
  }

  /**
   * Get unexplored topics.
   */
  getUnexploredTopics(): DiscoveryTopic[] {
    const allTopics: DiscoveryTopic[] = [
      'values', 'fears', 'relationships', 'backstory',
      'stress-response', 'social-behavior', 'communication-style',
      'goals-motivations', 'emotional-range',
    ];
    return allTopics.filter(t => !this.exploredTopics.has(t));
  }

  /**
   * Suggest the next topic to explore based on profile gaps.
   */
  suggestTopic(): DiscoveryTopic {
    const unexplored = this.getUnexploredTopics();

    if (unexplored.length === 0) {
      // All explored, return random for continued conversation
      const allTopics = Object.keys(TOPIC_PROMPTS) as DiscoveryTopic[];
      const randomIndex = Math.floor(Math.random() * allTopics.length);
      const randomTopic = allTopics.at(randomIndex);
      return randomTopic ?? 'backstory';
    }

    // Prioritize topics with empty profile fields
    const prioritized = this.prioritizeByProfileGaps(unexplored);
    return prioritized[0] ?? unexplored[0] ?? 'backstory';
  }

  /**
   * Generate suggested prompts for a topic.
   */
  generatePrompts(topic: DiscoveryTopic, count = 3): SuggestedPrompt[] {
    const prompts = getRecordOptional(TOPIC_PROMPTS, topic) ?? [];

    // Shuffle and take requested count
    const shuffled = [...prompts].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, count);

    return selected.map(prompt => ({
      prompt,
      topic,
      rationale: this.getTopicRationale(topic),
    }));
  }

  /**
   * Generate prompts for multiple topics.
   */
  generateMixedPrompts(count = 3): SuggestedPrompt[] {
    const result: SuggestedPrompt[] = [];
    const unexplored = this.getUnexploredTopics();
    const prioritized = this.prioritizeByProfileGaps(unexplored);

    // Take prompts from top priority topics
    for (const topic of prioritized) {
      if (result.length >= count) break;
      const topicPrompts = this.generatePrompts(topic, 1);
      result.push(...topicPrompts);
    }

    // If still need more, take from unexplored that weren't prioritized
    if (result.length < count) {
      const remaining = unexplored.filter(u => !prioritized.includes(u));
      for (const topic of remaining) {
        if (result.length >= count) break;
        const topicPrompts = this.generatePrompts(topic, 1);
        result.push(...topicPrompts);
      }
    }

    return result.slice(0, count);
  }

  /**
   * Infer which topic a user message relates to.
   */
  inferTopicFromMessage(message: string): DiscoveryTopic | null {
    const lower = message.toLowerCase();

    const keywords: Record<DiscoveryTopic, string[]> = {
      'values': ['value', 'believe', 'important', 'principle', 'moral', 'right', 'wrong'],
      'fears': ['fear', 'afraid', 'scared', 'nightmare', 'dread', 'worry', 'anxious'],
      'relationships': ['friend', 'family', 'trust', 'love', 'relationship', 'people', 'alone'],
      'backstory': ['past', 'childhood', 'grew up', 'memory', 'history', 'origin', 'born'],
      'stress-response': ['stress', 'pressure', 'overwhelm', 'panic', 'react', 'cope'],
      'social-behavior': ['group', 'leader', 'follow', 'conflict', 'argue', 'disagree'],
      'communication-style': ['speak', 'talk', 'say', 'words', 'express', 'tell'],
      'goals-motivations': ['want', 'goal', 'dream', 'ambition', 'future', 'hope'],
      'emotional-range': ['feel', 'emotion', 'happy', 'sad', 'angry', 'cry', 'laugh'],
    };

    for (const entry of Object.entries(keywords)) {
      const topic = entry[0] as DiscoveryTopic;
      const words = entry[1];
      if (words.some(word => lower.includes(word))) {
        return topic;
      }
    }

    return null;
  }

  /**
   * Clear explored topics.
   */
  clear(): void {
    this.exploredTopics.clear();
  }

  private prioritizeByProfileGaps(topics: DiscoveryTopic[]): DiscoveryTopic[] {
    const scored = topics.map(topic => ({
      topic,
      score: this.calculateGapScore(topic),
    }));

    scored.sort((a, b) => b.score - a.score);
    return scored.map(s => s.topic);
  }

  private calculateGapScore(topic: DiscoveryTopic): number {
    const fields = getRecordOptional(TOPIC_TO_FIELDS, topic) ?? [];
    let emptyFields = 0;

    for (const field of fields) {
      const value = this.getValueAtPath(this.profile, field);
      if (this.isEmpty(value)) {
        emptyFields++;
      }
    }

    return emptyFields / Math.max(fields.length, 1);
  }

  private getValueAtPath(obj: unknown, path: string): unknown {
    const parts = path.split('.');
    let current: unknown = obj;

    for (const part of parts) {
      if (current === null || current === undefined || typeof current !== 'object') {
        return undefined;
      }
      const record = current as Record<string, unknown>;
      if (Object.prototype.hasOwnProperty.call(record, part)) {
        const entry = Object.getOwnPropertyDescriptor(record, part);
        if (!entry || part === '__proto__' || part === 'constructor') {
          return undefined;
        }
        current = entry.value;
      } else {
        return undefined;
      }
    }

    return current;
  }

  private isEmpty(value: unknown): boolean {
    if (value === undefined || value === null) return true;
    if (typeof value === 'string' && value.trim() === '') return true;
    if (Array.isArray(value) && value.length === 0) return true;
    return false;
  }

  private getTopicRationale(topic: DiscoveryTopic): string {
    const defaultRationale = 'Explore this aspect of the character';
    const rationales: Record<DiscoveryTopic, string> = {
      'values': 'Understanding core values shapes moral decisions',
      'fears': 'Fears reveal vulnerabilities and motivations',
      'relationships': 'Social patterns define how they interact with others',
      'backstory': 'History provides context for who they are today',
      'stress-response': 'Stress reveals true character under pressure',
      'social-behavior': 'Social roles show how they navigate groups',
      'communication-style': 'Speech patterns make dialogue authentic',
      'goals-motivations': 'Goals drive the character forward',
      'emotional-range': 'Emotional depth creates compelling characters',
    };

    return getRecordOptional(rationales, topic) ?? defaultRationale;
  }
}
