# Manual Testing Script for Studio NPC

## Setup

1. Start the API server
2. Open Character Studio with a new character
3. Fill in basic profile fields

## Test 1: Basic Conversation

- [ ] Send "Hello, who are you?"
- [ ] Verify character responds with name
- [ ] Verify response matches speech style settings

## Test 2: Values Discovery

- [ ] Ask "What matters most to you?"
- [ ] Check if inferred values appear in pending traits
- [ ] Accept a value and verify it's added to profile

## Test 3: Fears Discovery

- [ ] Ask "What are you afraid of?"
- [ ] Check for fear inference
- [ ] Verify fear matches intensity and category

## Test 4: Social Patterns

- [ ] Simulate meeting: "Imagine we just met. Introduce yourself."
- [ ] Check strangerDefault inference
- [ ] Follow up with personal questions
- [ ] Observe warmthRate behavior

## Test 5: Stress Response

- [ ] Present stressful scenario
- [ ] Observe primary stress response
- [ ] Check if stress indicators are inferred

## Test 6: Speech Style

- [ ] After 10+ messages, check Voice Fingerprint
- [ ] Verify vocabulary level matches setting
- [ ] Check humor detection

## Test 7: Summarization

- [ ] Have 20+ message conversation
- [ ] Verify summarization triggers
- [ ] Check that context is maintained

## Test 8: Session Persistence

- [ ] Refresh the page
- [ ] Verify conversation is restored
- [ ] Continue conversation and verify context
