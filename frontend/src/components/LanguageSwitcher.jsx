import { useTranslation } from 'react-i18next';
import { Switch } from './ui/switch';
import { cn } from '../lib/utils';

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const isEnglish = i18n.language === 'en' || i18n.language.startsWith('en');

  const toggleLanguage = () => {
    const newLang = isEnglish ? 'de' : 'en';
    i18n.changeLanguage(newLang);
  };

  return (
    <div className="flex items-center space-x-2">
      {/* UK Flag for English */}
      <span 
        className={cn(
          "text-xl transition-opacity duration-200",
          isEnglish ? "opacity-100" : "opacity-40"
        )}
        role="img"
        aria-label="English"
      >
        🇬🇧
      </span>
      
      {/* Switch */}
      <Switch
        checked={!isEnglish}
        onCheckedChange={toggleLanguage}
        aria-label="Toggle language"
      />
      
      {/* German Flag for German */}
      <span 
        className={cn(
          "text-xl transition-opacity duration-200",
          !isEnglish ? "opacity-100" : "opacity-40"
        )}
        role="img"
        aria-label="Deutsch"
      >
        🇩🇪
      </span>
    </div>
  );
}

