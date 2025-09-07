import React, { useState, useEffect, useRef } from 'react';

/**
 * Composant pour afficher un score avec des animations
 * @param {number} value - Valeur du score à afficher
 * @param {string} type - Type de score ('goal' ou 'gamelle')
 * @param {string} className - Classes CSS supplémentaires
 */
function AnimatedScore({ value, type = 'goal', className = '' }) {
  const [displayValue, setDisplayValue] = useState(value);
  const [animationClass, setAnimationClass] = useState('');
  const [isAnimating, setIsAnimating] = useState(false);
  const previousValue = useRef(value);
  const animationTimeout = useRef(null);

  /**
   * Détermine la classe d'animation selon le type et la direction du changement
   */
  const getAnimationClass = (oldValue, newValue, scoreType) => {
    if (newValue > oldValue) {
      return scoreType === 'goal' ? 'score-increase-goal' : 'score-increase-gamelle';
    } else if (newValue < oldValue) {
      return scoreType === 'goal' ? 'score-decrease-goal' : 'score-decrease-gamelle';
    }
    return '';
  };

  /**
   * Lance l'animation et met à jour la valeur affichée
   */
  const animateValue = (newValue) => {
    if (isAnimating) return;

    const oldValue = previousValue.current;
    const animation = getAnimationClass(oldValue, newValue, type);

    if (animation) {
      setIsAnimating(true);
      setAnimationClass(animation);
      setDisplayValue(newValue);

      if (animationTimeout.current) {
        clearTimeout(animationTimeout.current);
      }

      animationTimeout.current = setTimeout(() => {
        setAnimationClass('');
        setIsAnimating(false);
        animationTimeout.current = null;
      }, 600);
    } else {
      setDisplayValue(newValue);
    }

    previousValue.current = newValue;
  };

  // Effet pour détecter les changements de valeur
  useEffect(() => {
    if (value !== previousValue.current) {
      animateValue(value);
    }
  }, [value, type]);

  // Nettoyage au démontage du composant
  useEffect(() => {
    return () => {
      if (animationTimeout.current) {
        clearTimeout(animationTimeout.current);
      }
    };
  }, []);

  return (
    <span 
      className={`animated-score ${animationClass} ${className}`}
      data-type={type}
      data-value={displayValue}
    >
      {displayValue}
    </span>
  );
}

export default AnimatedScore;
