import React, { createContext, useState, useEffect } from 'react';

// Create the theme context
export const ThemeContext = createContext({
  darkMode: false,
  toggleDarkMode: () => {}
});

// Create a theme provider component
export const ThemeProvider = ({ children }) => {
  // Initialize theme from localStorage or default to user's system preference
  const [darkMode, setDarkMode] = useState(() => {
    // Check if there's a saved preference in localStorage
    const savedTheme = localStorage.getItem('darkMode');
    
    if (savedTheme !== null) {
      return savedTheme === 'true';
    } else {
      // Use system preference as default
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
  });

  // Function to toggle between dark and light mode
  const toggleDarkMode = () => {
    setDarkMode(prevMode => !prevMode);
  };

  // Save theme preference to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('darkMode', darkMode.toString());
    
    // Apply the theme to the document
    if (darkMode) {
      document.documentElement.setAttribute('data-bs-theme', 'dark');
      document.body.classList.add('dark-mode');
    } else {
      document.documentElement.setAttribute('data-bs-theme', 'light');
      document.body.classList.remove('dark-mode');
    }
  }, [darkMode]);

  // Provide the theme context to all children
  return (
    <ThemeContext.Provider value={{ darkMode, toggleDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
};
