export interface UserPreferences {
  age: number;
  gender: 'male' | 'female';
  weight: number;
  height: number;
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'very_active' | 'extra_active';
  dietaryRestrictions: string[];
  healthGoals: string[];
  allergies: string[];
}

export interface NutritionInfo {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

export interface Meal {
  name: string;
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  ingredients: string[];
  nutrition: NutritionInfo;
  prepTime: number;
  instructions: string[];
}

export interface DietPlan {
  date: string;
  meals: Meal[];
  totalNutrition: NutritionInfo;
  notes: string[];
}