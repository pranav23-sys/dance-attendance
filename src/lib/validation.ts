// lib/validation.ts

import React from "react";

export interface ValidationResult {
  isValid: boolean;
  message?: string;
}

export interface ValidationRules {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: string) => ValidationResult;
}

export function validateField(value: string, rules: ValidationRules): ValidationResult {
  // Required validation
  if (rules.required && (!value || value.trim() === "")) {
    return { isValid: false, message: "This field is required" };
  }

  // Skip other validations if empty and not required
  if (!value || value.trim() === "") {
    return { isValid: true };
  }

  const trimmedValue = value.trim();

  // Min length validation
  if (rules.minLength && trimmedValue.length < rules.minLength) {
    return {
      isValid: false,
      message: `Must be at least ${rules.minLength} characters long`
    };
  }

  // Max length validation
  if (rules.maxLength && trimmedValue.length > rules.maxLength) {
    return {
      isValid: false,
      message: `Must be no more than ${rules.maxLength} characters long`
    };
  }

  // Pattern validation
  if (rules.pattern && !rules.pattern.test(trimmedValue)) {
    return { isValid: false, message: "Invalid format" };
  }

  // Custom validation
  if (rules.custom) {
    return rules.custom(trimmedValue);
  }

  return { isValid: true };
}

export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, "") // Remove potential HTML tags
    .replace(/\s+/g, " ") // Normalize whitespace
    .slice(0, 500); // Limit length
}

// Specific validation rules for the app
export const validationRules = {
  studentName: {
    required: true,
    minLength: 1,
    maxLength: 50,
    custom: (value: string) => {
      if (value.length < 2) {
        return { isValid: false, message: "Name must be at least 2 characters" };
      }
      if (!/^[a-zA-Z\s\-']+$/.test(value)) {
        return { isValid: false, message: "Name can only contain letters, spaces, hyphens, and apostrophes" };
      }
      return { isValid: true };
    }
  } as ValidationRules,

  className: {
    required: true,
    minLength: 1,
    maxLength: 30,
    custom: (value: string) => {
      if (value.length < 2) {
        return { isValid: false, message: "Class name must be at least 2 characters" };
      }
      if (!/^[a-zA-Z0-9\s\-&]+$/.test(value)) {
        return { isValid: false, message: "Class name can only contain letters, numbers, spaces, hyphens, and ampersands" };
      }
      return { isValid: true };
    }
  } as ValidationRules,

  classColor: {
    required: true,
    pattern: /^#[0-9A-Fa-f]{6}$/,
    custom: (value: string) => {
      if (!value.startsWith("#")) {
        return { isValid: false, message: "Color must start with #" };
      }
      return { isValid: true };
    }
  } as ValidationRules,

  pointsValue: {
    required: true,
    custom: (value: string) => {
      const num = parseInt(value);
      if (isNaN(num)) {
        return { isValid: false, message: "Must be a valid number" };
      }
      if (num < 0) {
        return { isValid: false, message: "Points cannot be negative" };
      }
      if (num > 100) {
        return { isValid: false, message: "Points cannot exceed 100" };
      }
      return { isValid: true };
    }
  } as ValidationRules,

  reasonText: {
    required: true,
    minLength: 1,
    maxLength: 100,
    custom: (value: string) => {
      if (value.length < 2) {
        return { isValid: false, message: "Reason must be at least 2 characters" };
      }
      return { isValid: true };
    }
  } as ValidationRules,
};

// Hook for form validation
export function useFormValidation() {
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const validate = (fieldName: string, value: string, rules: ValidationRules) => {
    const result = validateField(value, rules);
    setErrors(prev => ({
      ...prev,
      [fieldName]: result.isValid ? "" : (result.message || "Invalid value")
    }));
    return result.isValid;
  };

  const clearError = (fieldName: string) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
  };

  const hasErrors = Object.values(errors).some(error => error !== "");

  return {
    errors,
    validate,
    clearError,
    hasErrors,
    setErrors
  };
}
