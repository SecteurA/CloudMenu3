export interface ColorScheme {
  primary: string;
  accent: string;
  text: string;
  background: string;
  hero: string;
}

export function getColorClasses(restaurant: {
  primary_color?: string;
  accent_color?: string;
  text_color?: string;
  background_color?: string;
  hero_background_color?: string;
}): ColorScheme {
  return {
    primary: restaurant.primary_color || '#ea580c',
    accent: restaurant.accent_color || '#f97316',
    text: restaurant.text_color || '#1f2937',
    background: restaurant.background_color || '#ffffff',
    hero: restaurant.hero_background_color || '#f3f4f6'
  };
}

export function injectCustomStyles(colors: ColorScheme, styleId: string = 'custom-restaurant-colors'): void {
  // Remove existing style tag if it exists
  const existingStyle = document.getElementById(styleId);
  if (existingStyle) {
    existingStyle.remove();
  }

  // Create new style tag
  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    /* Custom color classes */
    .restaurant-primary-bg { background-color: ${colors.primary} !important; }
    .restaurant-primary-text { color: ${colors.primary} !important; }
    .restaurant-primary-border { border-color: ${colors.primary} !important; }

    .restaurant-accent-bg { background-color: ${colors.accent} !important; }
    .restaurant-accent-text { color: ${colors.accent} !important; }

    .restaurant-text { color: ${colors.text} !important; }
    .restaurant-bg { background-color: ${colors.background} !important; }
    .restaurant-hero-bg { background-color: ${colors.hero} !important; }

    .restaurant-btn {
      background-color: ${colors.primary} !important;
      color: white !important;
    }
    .restaurant-btn:hover {
      background-color: ${colors.accent} !important;
    }

    .restaurant-link {
      color: ${colors.primary} !important;
    }
    .restaurant-link:hover {
      color: ${colors.accent} !important;
    }

    /* Override default orange colors for landing page */
    body {
      background-color: ${colors.background} !important;
      color: ${colors.text} !important;
    }

    .bg-orange-600, .hover\\:bg-orange-700:hover,
    button.bg-orange-600, a.bg-orange-600 {
      background-color: ${colors.primary} !important;
    }

    button.bg-orange-600:hover, a.bg-orange-600:hover {
      background-color: ${colors.accent} !important;
    }

    .bg-orange-500 {
      background-color: ${colors.accent} !important;
    }

    .text-orange-600, .text-orange-700, .text-orange-500 {
      color: ${colors.primary} !important;
    }

    .bg-orange-50 {
      background-color: ${colors.primary}15 !important;
    }

    .bg-orange-100 {
      background-color: ${colors.primary}25 !important;
    }

    .border-orange-500, .hover\\:border-orange-500:hover {
      border-color: ${colors.primary} !important;
    }

    .text-orange-500 {
      color: ${colors.accent} !important;
    }
  `;

  document.head.appendChild(style);
}
