"use client"

import { toast } from "sonner"

export function WelcomeToast() {
    const promise = () => new Promise((resolve) => setTimeout(() => resolve({ name: 'Sonner' }), 2000));

    toast.promise(promise, {
      loading: 'Authenticating...',
      success: 'Welcome 👋 You are now logged in.',
      error: 'Error',
    });
    return null
} 