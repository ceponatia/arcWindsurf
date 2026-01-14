# INVESTIGATION-003 - Prompt Efficiency

## Summary

Currently, many fields in the character's prompt are sentences which increase token cost. Fields such as gender, age, appearance, etc. could instead be JSON or similarly parsed data. Explore if this would negatively impact the quality of responses. We would keep the longer prompt sections such as embodiment and behavior-based personality traits as sentences.
