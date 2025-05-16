import React, { useContext } from 'react';
import { Button } from 'react-bootstrap';
import { ThemeContext } from './ThemeContext';

const ThemeSwitcher = () => {
  const { darkMode, toggleDarkMode } = useContext(ThemeContext);

  return (
    <Button
      variant={darkMode ? "light" : "dark"}
      size="sm"
      onClick={toggleDarkMode}
      className="theme-toggle"
      aria-label="Toggle theme"
    >
      {darkMode ? (
        <span role="img" aria-label="Light mode">☀️</span>
      ) : (
        <span role="img" aria-label="Dark mode">🌙</span>
      )}
    </Button>
  );
};

export default ThemeSwitcher;
