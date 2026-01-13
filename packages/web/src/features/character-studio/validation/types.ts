export type StudioFieldKey = 'name' | 'summary' | 'backstory' | 'race' | 'age' | 'gender';

export type StudioFieldErrors = Partial<Record<StudioFieldKey, string>>;
